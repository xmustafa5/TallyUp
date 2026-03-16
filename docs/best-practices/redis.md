# Redis Best Practices (ioredis)

Comprehensive enterprise-grade reference for Redis usage with ioredis in TypeScript (ESM). All patterns are designed for production workloads with high availability, observability, and correctness as primary goals.

---

## Table of Contents

1. [Connection Management](#connection-management)
2. [Error Handling](#error-handling)
3. [Caching Patterns](#caching-patterns)
4. [Data Structures](#data-structures)
5. [Pipelining](#pipelining)
6. [Pub/Sub](#pubsub)
7. [Lua Scripting](#lua-scripting)
8. [Key Management](#key-management)
9. [Security](#security)
10. [Monitoring](#monitoring)

---

## Connection Management

### Single Shared Connection Instance (Fastify Plugin Pattern)

Never create ad-hoc Redis connections throughout the codebase. Encapsulate connection lifecycle in a Fastify plugin and decorate the instance so every route and service shares the same connection.

```ts
import fp from "fastify-plugin"
import Redis from "ioredis"
import type { FastifyInstance } from "fastify"

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis
  }
}

export default fp(
  async function redisPlugin(fastify: FastifyInstance) {
    const redis = new Redis({
      host: fastify.config.REDIS_HOST,
      port: fastify.config.REDIS_PORT,
      password: fastify.config.REDIS_PASSWORD || undefined,
      db: fastify.config.REDIS_DB ?? 0,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000)
        fastify.log.warn({ attempt: times, delay }, "Redis reconnecting")
        return delay
      },
      enableReadyCheck: true,
      showFriendlyErrorStack: process.env.NODE_ENV !== "production",
    })

    // Attach event handlers before connecting
    redis.on("connect", () => {
      fastify.log.info("Redis TCP connection established")
    })

    redis.on("ready", () => {
      fastify.log.info("Redis connection ready, commands can be processed")
    })

    redis.on("error", (err) => {
      fastify.log.error({ err }, "Redis connection error")
    })

    redis.on("close", () => {
      fastify.log.warn("Redis connection closed")
    })

    redis.on("reconnecting", (delayMs: number) => {
      fastify.log.warn({ delayMs }, "Redis reconnecting after delay")
    })

    // Connect explicitly since lazyConnect is true
    await redis.connect()

    fastify.decorate("redis", redis)

    fastify.addHook("onClose", async () => {
      await redis.quit()
      fastify.log.info("Redis connection closed gracefully")
    })
  },
  {
    name: "redis",
    dependencies: ["config"],
  }
)
```

### Reconnection Strategy with Exponential Backoff

The `retryStrategy` function controls how ioredis reconnects after a connection loss. Return a number (milliseconds) to schedule a retry, or `null` to stop retrying.

```ts
retryStrategy(times: number) {
  if (times > 20) {
    // After 20 attempts, stop retrying and let the process crash
    // so the orchestrator (Docker, Kubernetes) can restart it
    return null
  }
  const delay = Math.min(times * 50, 2000)
  return delay
}
```

Key considerations:

- **Backoff ceiling**: Cap the delay at 2000ms to avoid excessively long gaps.
- **Retry limit**: After a threshold (e.g., 20 attempts), return `null` to stop retrying. In container environments, crashing the process allows the orchestrator to restart it cleanly.
- **Jitter** (advanced): For clusters with many clients, add randomized jitter to prevent thundering herd reconnections.

```ts
retryStrategy(times: number) {
  if (times > 20) return null
  const base = Math.min(times * 50, 2000)
  const jitter = Math.floor(Math.random() * 100)
  return base + jitter
}
```

### maxRetriesPerRequest

This setting controls how many times a single command will be retried before rejecting with an error. The correct value depends on the use case:

| Use Case | Value | Reason |
|---|---|---|
| General commands | `3` | Fail fast so HTTP requests do not hang |
| BullMQ workers | `null` | Workers must block indefinitely on `BRPOPLPUSH`; a finite retry count causes premature `MaxRetriesPerRequestError` |

```ts
// For BullMQ worker connections
const bullmqConnection = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: null,
})
```

Never share a single Redis instance between application commands and BullMQ. BullMQ requires `maxRetriesPerRequest: null`, which would cause application commands to hang indefinitely on connection loss.

### lazyConnect for Startup Optimization

With `lazyConnect: true`, ioredis does not open a TCP connection until the first command is sent or `redis.connect()` is called explicitly. This is useful for:

- Controlling connection order during plugin registration.
- Running health checks or pre-flight logic before establishing the connection.
- Avoiding connection failures during module import time.

Always call `await redis.connect()` explicitly in the plugin so that connection errors surface during startup rather than at first use.

### Separate Connections for Pub/Sub

When a Redis connection enters subscriber mode (via `SUBSCRIBE` or `PSUBSCRIBE`), it can no longer issue regular commands. Always create a dedicated connection for subscriptions.

```ts
import Redis from "ioredis"

// Main connection for commands
const redis = new Redis({ host: "localhost", port: 6379 })

// Dedicated connection for subscriptions (never use this for GET/SET/etc.)
const subscriber = new Redis({ host: "localhost", port: 6379 })

subscriber.subscribe("orders:created", (err, count) => {
  if (err) {
    console.error("Failed to subscribe:", err)
    return
  }
  console.log(`Subscribed to ${count} channel(s)`)
})

subscriber.on("message", (channel, message) => {
  // Handle the message
})

// This works because `redis` is not in subscriber mode
await redis.set("key", "value")
```

### Connection Event Handlers

Always attach the following event handlers to every Redis connection. At minimum, the `error` handler is mandatory to prevent unhandled exceptions from crashing the process.

| Event | When It Fires | Typical Action |
|---|---|---|
| `connect` | TCP connection established | Log informational message |
| `ready` | Connection authenticated and ready | Log, update health check status |
| `error` | Any connection-level error | Log error, update health check status |
| `close` | Connection closed (intentional or not) | Log warning |
| `reconnecting` | Reconnection attempt scheduled | Log with delay information |

---

## Error Handling

### Always Attach an Error Event Listener

This is the single most important rule. In Node.js, an `EventEmitter` that emits an `error` event with no listener will throw an uncaught exception and crash the process.

```ts
const redis = new Redis()

// MANDATORY: prevents unhandled exceptions
redis.on("error", (err) => {
  logger.error({ err }, "Redis error")
})
```

Even if you have a global `process.on('uncaughtException')` handler, always attach per-connection error listeners. The global handler is a last resort, not a primary strategy.

### showFriendlyErrorStack

When enabled, ioredis captures a stack trace at the call site of every command, making errors much easier to debug. However, this has a measurable performance cost because it creates an `Error` object for every command even when no error occurs.

```ts
const redis = new Redis({
  showFriendlyErrorStack: process.env.NODE_ENV !== "production",
})
```

- **Development/staging**: Enable it. The debugging value far outweighs the performance cost.
- **Production**: Disable it. The cost per command adds up under high throughput.

### Pipeline Error Handling

When using `pipeline.exec()`, the return value is an array of `[error, result]` tuples. A pipeline does not short-circuit on individual command failures; every command runs regardless.

```ts
const pipeline = redis.pipeline()
pipeline.set("key1", "value1")
pipeline.incr("key1") // This will fail: WRONGTYPE
pipeline.get("key2")

const results = await pipeline.exec()
if (!results) {
  throw new Error("Pipeline returned null (connection lost)")
}

for (const [index, [err, result]] of results.entries()) {
  if (err) {
    logger.error({ err, commandIndex: index }, "Pipeline command failed")
    continue
  }
  logger.info({ commandIndex: index, result }, "Pipeline command succeeded")
}
```

Never assume all pipeline commands succeeded. Always check each tuple.

### Transaction (MULTI) Error Handling

Transactions group commands atomically. If any command within a `MULTI/EXEC` block has a syntax error, Redis will abort the entire transaction with an `EXECABORT` error.

```ts
async function transferBalance(
  redis: Redis,
  from: string,
  to: string,
  amount: number
): Promise<void> {
  const multi = redis.multi()
  multi.decrby(`balance:${from}`, amount)
  multi.incrby(`balance:${to}`, amount)

  try {
    const results = await multi.exec()
    if (!results) {
      throw new Error("Transaction aborted (EXECABORT), possibly due to WATCH")
    }

    for (const [err] of results) {
      if (err) {
        throw new Error(`Command within transaction failed: ${err.message}`)
      }
    }
  } catch (err) {
    logger.error({ err, from, to, amount }, "Balance transfer transaction failed")
    throw err
  }
}
```

Key differences between pipelines and transactions:

| Aspect | Pipeline | Transaction (MULTI) |
|---|---|---|
| Atomicity | None -- commands interleave with other clients | Atomic -- all or nothing execution |
| Error behavior | Individual failures, other commands still run | Syntax errors abort entire batch |
| Use case | Bulk operations, performance | Data consistency, invariants |

### Handling Connection Loss During Commands

When a connection drops while commands are in-flight, ioredis will reject those commands with a connection error. Use try/catch around every Redis call in application code, or wrap calls in a utility function.

```ts
async function safeGet(redis: Redis, key: string): Promise<string | null> {
  try {
    return await redis.get(key)
  } catch (err) {
    logger.error({ err, key }, "Redis GET failed, returning null")
    return null
  }
}
```

For cache operations, failing open (returning `null` and falling through to the database) is typically the correct behavior. For operations where Redis is the source of truth (rate limiting, distributed locks), failing closed (rejecting the request) is safer.

---

## Caching Patterns

### Cache-Aside (Lazy Loading)

The most common caching pattern. The application checks the cache first, falls back to the database on a miss, and populates the cache for subsequent requests.

```ts
interface CacheOptions {
  ttlSeconds: number
}

async function getCachedUser(
  redis: Redis,
  prisma: PrismaClient,
  userId: string,
  options: CacheOptions = { ttlSeconds: 300 }
): Promise<User | null> {
  const cacheKey = `user:${userId}:profile`

  // Step 1: Check cache
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached) as User
  }

  // Step 2: Cache miss -- fetch from database
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return null
  }

  // Step 3: Populate cache with TTL
  const serialized = JSON.stringify(user)
  await redis.setex(cacheKey, options.ttlSeconds, serialized)

  return user
}
```

Advantages:

- Only caches data that is actually requested (no wasted memory).
- Database is the source of truth; cache is disposable.

Disadvantages:

- First request after a miss or expiration is slower (cache-miss penalty).
- Stale data is possible between the DB update and cache expiration.

### Write-Through

Update the cache synchronously whenever the database is updated. This eliminates staleness at the cost of slightly slower writes.

```ts
async function updateUser(
  redis: Redis,
  prisma: PrismaClient,
  userId: string,
  data: UpdateUserInput
): Promise<User> {
  // Step 1: Update database (source of truth)
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  })

  // Step 2: Update cache (synchronous with the write)
  const cacheKey = `user:${userId}:profile`
  await redis.setex(cacheKey, 300, JSON.stringify(user))

  return user
}
```

Use write-through when:

- Read frequency is much higher than write frequency.
- Staleness is unacceptable (financial data, permissions).
- You can tolerate a slightly slower write path.

### Cache Invalidation Strategies

#### TTL-Based Invalidation

The simplest approach. Every cached entry expires after a fixed duration. Appropriate when eventual consistency is acceptable.

```ts
// Cache for 5 minutes
await redis.setex("user:123:profile", 300, serialized)

// Cache for 1 hour
await redis.setex("config:feature-flags", 3600, serialized)

// Cache for 24 hours (relatively static data)
await redis.setex("catalog:categories", 86400, serialized)
```

#### Event-Driven Invalidation

Invalidate cache entries immediately when the underlying data changes. More complex but eliminates staleness windows.

```ts
async function deleteUser(
  redis: Redis,
  prisma: PrismaClient,
  userId: string
): Promise<void> {
  await prisma.user.delete({ where: { id: userId } })

  // Invalidate all cache entries related to this user
  const pipeline = redis.pipeline()
  pipeline.del(`user:${userId}:profile`)
  pipeline.del(`user:${userId}:preferences`)
  pipeline.del(`user:${userId}:permissions`)
  await pipeline.exec()
}
```

#### Hybrid Approach (Recommended)

Combine TTL-based expiration with event-driven invalidation. TTL acts as a safety net in case an invalidation event is missed.

```ts
// Write: set cache with TTL AND invalidate on updates
await redis.setex("user:123:profile", 300, serialized)

// On update: explicitly delete, next read will repopulate with TTL
await redis.del("user:123:profile")
```

### Key Naming Conventions

Use a consistent, hierarchical naming scheme. Colons (`:`) are the standard delimiter in the Redis ecosystem.

| Pattern | Example | Use Case |
|---|---|---|
| `entity:id` | `user:123` | Simple key-value |
| `entity:id:field` | `user:123:profile` | Specific aspect of an entity |
| `entity:id:relation` | `user:123:orders` | Related collection |
| `namespace:entity:id` | `cache:user:123:profile` | Distinguishing cache from other uses |
| `tenant:entity:id` | `acme:user:123` | Multi-tenant isolation |

```ts
function cacheKey(entity: string, id: string, field?: string): string {
  const base = `${entity}:${id}`
  return field ? `${base}:${field}` : base
}

// Usage
const key = cacheKey("user", userId, "profile") // "user:abc123:profile"
```

### TTL Guidelines

Never cache without a TTL unless you have a deliberate strategy for eviction or the data is truly permanent.

| Data Type | Suggested TTL | Rationale |
|---|---|---|
| Session tokens | 15-30 minutes | Security: limit session hijack window |
| User profiles | 5-15 minutes | Changes infrequently, staleness is tolerable |
| Configuration / feature flags | 1-5 minutes | Should reflect changes quickly |
| Product catalog | 1-24 hours | Relatively static |
| Computed aggregations | 30-60 seconds | Expensive to compute, changes frequently |
| Rate limit counters | Matches the rate limit window | Must expire to reset the window |

### Serialization

For simple string or numeric values, store them directly. For complex objects, choose between JSON serialization and Redis hashes.

```ts
// Simple value: store directly
await redis.set("counter:page-views", "0")
await redis.incr("counter:page-views")

// Complex object: JSON serialization
const user = { id: "123", name: "Alice", email: "alice@example.com" }
await redis.setex("user:123:profile", 300, JSON.stringify(user))
const parsed = JSON.parse((await redis.get("user:123:profile")) ?? "{}")

// Complex object: Hash (avoids serialization, allows partial reads/writes)
await redis.hset("user:123:profile", {
  id: "123",
  name: "Alice",
  email: "alice@example.com",
})
await redis.expire("user:123:profile", 300)

// Read a single field without deserializing the whole object
const email = await redis.hget("user:123:profile", "email")
```

When to use JSON vs. hashes:

| Factor | JSON (Strings) | Hashes |
|---|---|---|
| Partial reads | Must deserialize entire object | Read individual fields with `HGET` |
| Partial writes | Must read-modify-write | Update individual fields with `HSET` |
| Nested objects | Supported natively | Must flatten or serialize nested values |
| Atomic TTL | `SETEX` sets key + TTL atomically | Requires separate `EXPIRE` call |
| Memory efficiency | Generally smaller for small objects | More efficient for objects with many fields |

### Batch Operations with MGET/MSET

When reading or writing multiple keys, use `MGET` and `MSET` to reduce round trips.

```ts
// Batch read
const keys = userIds.map((id) => `user:${id}:profile`)
const values = await redis.mget(...keys)
const users = values
  .filter((v): v is string => v !== null)
  .map((v) => JSON.parse(v) as User)

// Batch write
const entries: string[] = []
for (const user of users) {
  entries.push(`user:${user.id}:profile`, JSON.stringify(user))
}
await redis.mset(...entries)

// Note: MSET does not support TTL. Use a pipeline for bulk writes with TTL.
const pipeline = redis.pipeline()
for (const user of users) {
  pipeline.setex(`user:${user.id}:profile`, 300, JSON.stringify(user))
}
await pipeline.exec()
```

---

## Data Structures

### Strings

The most basic data type. Use for simple key-value pairs, counters, and short-lived locks.

```ts
// Simple key-value
await redis.set("app:version", "2.4.1")
const version = await redis.get("app:version")

// Counters (atomic increment/decrement)
await redis.incr("stats:requests:total")
await redis.incrby("stats:bytes:received", 4096)
await redis.decr("inventory:product:42:stock")

// Distributed lock (simplified -- see Redlock for production)
const lockKey = "lock:order:process:789"
const lockValue = crypto.randomUUID()
const acquired = await redis.set(lockKey, lockValue, "EX", 30, "NX")

if (acquired === "OK") {
  try {
    await processOrder("789")
  } finally {
    // Release only if we still own the lock (Lua script for atomicity)
    await redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then
         return redis.call("del", KEYS[1])
       else
         return 0
       end`,
      1,
      lockKey,
      lockValue
    )
  }
}
```

### Hashes

Store objects as field-value maps. Ideal when you need to read or update individual fields without serializing the entire object.

```ts
// Store a user profile
await redis.hset("user:123", {
  name: "Alice",
  email: "alice@example.com",
  role: "admin",
  loginCount: "0",
})
await redis.expire("user:123", 3600)

// Read specific fields
const name = await redis.hget("user:123", "name")
const fields = await redis.hmget("user:123", "name", "email")

// Read all fields
const profile = await redis.hgetall("user:123")
// Returns: { name: "Alice", email: "alice@example.com", role: "admin", loginCount: "0" }

// Atomic field increment
await redis.hincrby("user:123", "loginCount", 1)

// Check if a field exists
const exists = await redis.hexists("user:123", "email")
```

### Sets

Unordered collections of unique strings. Useful for membership checks, tagging, and set operations.

```ts
// Track unique visitors
await redis.sadd("visitors:2026-03-12", "user:123", "user:456")
await redis.sadd("visitors:2026-03-12", "user:123") // No duplicate added

// Check membership
const isVisitor = await redis.sismember("visitors:2026-03-12", "user:123")

// Get all members
const visitors = await redis.smembers("visitors:2026-03-12")

// Count unique members
const count = await redis.scard("visitors:2026-03-12")

// Set operations: find users who visited on both days
await redis.sadd("visitors:2026-03-11", "user:123", "user:789")
const both = await redis.sinter("visitors:2026-03-11", "visitors:2026-03-12")
// ["user:123"]

// Union: all visitors across both days
const all = await redis.sunion("visitors:2026-03-11", "visitors:2026-03-12")

// Difference: visited on the 12th but not the 11th
const newVisitors = await redis.sdiff(
  "visitors:2026-03-12",
  "visitors:2026-03-11"
)
```

### Sorted Sets

Like sets, but every member has a numeric score. Members are ordered by score. Critical for leaderboards, priority queues, and sliding-window rate limiting.

```ts
// Leaderboard
await redis.zadd("leaderboard:weekly", 1500, "player:alice")
await redis.zadd("leaderboard:weekly", 2300, "player:bob")
await redis.zadd("leaderboard:weekly", 1800, "player:carol")

// Top 3 (highest scores first)
const top3 = await redis.zrevrange("leaderboard:weekly", 0, 2, "WITHSCORES")
// ["player:bob", "2300", "player:carol", "1800", "player:alice", "1500"]

// Player rank (0-based, highest score = rank 0)
const rank = await redis.zrevrank("leaderboard:weekly", "player:carol")

// Increment score
await redis.zincrby("leaderboard:weekly", 200, "player:alice")

// Sliding-window rate limiter
async function isRateLimited(
  redis: Redis,
  userId: string,
  windowMs: number,
  maxRequests: number
): Promise<boolean> {
  const key = `ratelimit:${userId}`
  const now = Date.now()
  const windowStart = now - windowMs

  const pipeline = redis.pipeline()
  // Remove entries outside the window
  pipeline.zremrangebyscore(key, 0, windowStart)
  // Add current request
  pipeline.zadd(key, now, `${now}:${crypto.randomUUID()}`)
  // Count requests in window
  pipeline.zcard(key)
  // Set TTL so the key auto-expires
  pipeline.expire(key, Math.ceil(windowMs / 1000))

  const results = await pipeline.exec()
  if (!results) return true // Fail closed on error

  const [, , [countErr, count]] = results
  if (countErr) return true

  return (count as number) > maxRequests
}
```

### Lists

Ordered sequences. Useful for queues, stacks, and activity feeds.

```ts
// Queue pattern: producers push, consumers pop
// Producer
await redis.lpush("queue:emails", JSON.stringify({
  to: "alice@example.com",
  subject: "Welcome",
}))

// Consumer (non-blocking)
const item = await redis.rpop("queue:emails")

// Consumer (blocking -- waits up to 5 seconds for an item)
// Use a separate connection for blocking operations
const [listName, value] = (await redis.brpop("queue:emails", 5)) ?? []

// Recent activity feed (keep last 100 items)
await redis.lpush("feed:user:123", JSON.stringify({
  action: "comment",
  target: "post:456",
  timestamp: Date.now(),
}))
await redis.ltrim("feed:user:123", 0, 99)

// Read the 20 most recent items
const recent = await redis.lrange("feed:user:123", 0, 19)
const activities = recent.map((item) => JSON.parse(item))
```

---

## Pipelining

Pipelines batch multiple commands into a single network round trip. The commands are not atomic (unlike transactions), but the throughput improvement is dramatic for bulk operations.

### Basic Pipeline Usage

```ts
const pipeline = redis.pipeline()
pipeline.set("key1", "value1")
pipeline.set("key2", "value2")
pipeline.get("key3")
pipeline.incr("counter:visits")

const results = await pipeline.exec()
// results: [[null, "OK"], [null, "OK"], [null, "somevalue"], [null, 42]]
```

### Bulk Operations

Pipelines are essential for imports, migrations, and cache warming where thousands of commands must execute efficiently.

```ts
async function warmUserCache(
  redis: Redis,
  users: User[],
  batchSize = 500
): Promise<void> {
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    const pipeline = redis.pipeline()

    for (const user of batch) {
      pipeline.setex(
        `user:${user.id}:profile`,
        300,
        JSON.stringify(user)
      )
    }

    const results = await pipeline.exec()
    if (!results) {
      throw new Error("Pipeline execution returned null")
    }

    const failures = results.filter(([err]) => err !== null)
    if (failures.length > 0) {
      logger.warn(
        { failureCount: failures.length, batchIndex: i },
        "Some pipeline commands failed during cache warming"
      )
    }
  }
}
```

### Pipeline vs. Transaction

| Aspect | Pipeline | Transaction (MULTI/EXEC) |
|---|---|---|
| Network round trips | 1 | 1 |
| Atomicity | No -- other clients can interleave | Yes -- all commands execute as a unit |
| Performance | Slightly faster (no MULTI/EXEC overhead) | Slightly slower |
| Use case | Bulk reads/writes, cache warming | Data integrity, invariants |

If you need both atomicity and batching, use `redis.multi()` which internally pipelines the commands within the transaction.

---

## Pub/Sub

### Separate Connection for Subscriber

Once a connection calls `SUBSCRIBE`, it enters subscriber mode and can only issue subscription-related commands. Always use a dedicated connection.

```ts
import fp from "fastify-plugin"
import Redis from "ioredis"
import type { FastifyInstance } from "fastify"

declare module "fastify" {
  interface FastifyInstance {
    redisSub: Redis
  }
}

export default fp(async function redisPubSubPlugin(fastify: FastifyInstance) {
  const subscriber = new Redis({
    host: fastify.config.REDIS_HOST,
    port: fastify.config.REDIS_PORT,
    password: fastify.config.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  subscriber.on("error", (err) => {
    fastify.log.error({ err }, "Redis subscriber error")
  })

  await subscriber.connect()

  fastify.decorate("redisSub", subscriber)

  fastify.addHook("onClose", async () => {
    subscriber.disconnect()
  })
})
```

### Channel Naming Conventions

Use the `domain:event` pattern for channel names. This provides natural grouping and supports pattern-based subscriptions.

```
orders:created
orders:updated
orders:cancelled
users:registered
users:deactivated
notifications:email:sent
notifications:sms:sent
```

### Publishing Messages

Use the main (non-subscriber) Redis connection to publish.

```ts
interface OrderCreatedEvent {
  orderId: string
  customerId: string
  total: number
  createdAt: string
}

async function publishOrderCreated(
  redis: Redis,
  event: OrderCreatedEvent
): Promise<void> {
  const channel = "orders:created"
  const message = JSON.stringify(event)
  const subscriberCount = await redis.publish(channel, message)
  logger.info(
    { channel, subscriberCount, orderId: event.orderId },
    "Published order created event"
  )
}
```

### Subscribing to Channels

```ts
// Subscribe to specific channels
subscriber.subscribe("orders:created", "orders:cancelled", (err, count) => {
  if (err) {
    logger.error({ err }, "Subscribe failed")
    return
  }
  logger.info({ subscribedChannels: count }, "Subscribed to order channels")
})

subscriber.on("message", (channel: string, message: string) => {
  try {
    const event = JSON.parse(message)

    switch (channel) {
      case "orders:created":
        handleOrderCreated(event)
        break
      case "orders:cancelled":
        handleOrderCancelled(event)
        break
      default:
        logger.warn({ channel }, "Received message on unhandled channel")
    }
  } catch (err) {
    logger.error({ err, channel, message }, "Failed to handle pub/sub message")
  }
})
```

### Pattern Subscriptions

Use `PSUBSCRIBE` to subscribe to channels matching a glob pattern. The `pmessage` event provides the pattern, the actual channel name, and the message.

```ts
// Subscribe to all order-related events
subscriber.psubscribe("orders:*", (err, count) => {
  if (err) {
    logger.error({ err }, "Pattern subscribe failed")
    return
  }
  logger.info({ subscribedPatterns: count }, "Subscribed to order patterns")
})

subscriber.on("pmessage", (pattern: string, channel: string, message: string) => {
  try {
    const event = JSON.parse(message)
    logger.info({ pattern, channel, event }, "Received pattern message")
    // channel will be the specific channel, e.g. "orders:created"
    // pattern will be "orders:*"
  } catch (err) {
    logger.error({ err, pattern, channel }, "Failed to handle pattern message")
  }
})
```

### Error Handling in Message Handlers

Message handlers must never throw unhandled exceptions. Always wrap handler logic in try/catch, and consider dead-letter patterns for messages that consistently fail processing.

```ts
subscriber.on("message", async (channel: string, message: string) => {
  try {
    const event = JSON.parse(message)
    await processEvent(channel, event)
  } catch (err) {
    logger.error({ err, channel, rawMessage: message }, "Message handler error")

    // Optionally: push to a dead-letter list for manual inspection
    try {
      await redis.lpush("dead-letter:pubsub", JSON.stringify({
        channel,
        message,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      }))
    } catch (dlqErr) {
      logger.error({ err: dlqErr }, "Failed to push to dead-letter queue")
    }
  }
})
```

---

## Lua Scripting

Lua scripts execute atomically on the Redis server. They are essential for operations that require multiple commands to be executed without interleaving from other clients.

### defineCommand for Reusable Scripts

ioredis provides `defineCommand` to register custom commands that use Lua scripts under the hood. The script is automatically cached via `EVALSHA` after the first execution.

```ts
import Redis from "ioredis"

const redis = new Redis()

// Define a "rate limit check and increment" command
redis.defineCommand("rateLimitCheck", {
  numberOfKeys: 1,
  lua: `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])

    local current = tonumber(redis.call("GET", key) or "0")
    if current >= limit then
      return 0
    end

    local newCount = redis.call("INCR", key)
    if newCount == 1 then
      redis.call("EXPIRE", key, window)
    end

    return 1
  `,
})

// TypeScript type augmentation for the custom command
declare module "ioredis" {
  interface RedisCommander<Context> {
    rateLimitCheck(
      key: string,
      limit: number | string,
      windowSeconds: number | string
    ): Result<number, Context>
  }
}

// Usage
const allowed = await redis.rateLimitCheck(
  "ratelimit:user:123:api",
  100,   // max 100 requests
  60     // per 60-second window
)
if (!allowed) {
  throw new TooManyRequestsError()
}
```

### KEYS and ARGV Separation

Redis requires that all keys accessed by a Lua script are passed in the `KEYS` array. This is mandatory for Redis Cluster compatibility, where keys are sharded across nodes.

```ts
// CORRECT: all keys passed via KEYS array
redis.defineCommand("swapValues", {
  numberOfKeys: 2,
  lua: `
    local val1 = redis.call("GET", KEYS[1])
    local val2 = redis.call("GET", KEYS[2])
    redis.call("SET", KEYS[1], val2)
    redis.call("SET", KEYS[2], val1)
    return 1
  `,
})

// Usage: keys come first, then arguments
await redis.swapValues("key:a", "key:b")
```

Rules:

- `KEYS[n]` -- all Redis keys the script will read or write.
- `ARGV[n]` -- all non-key parameters (values, limits, timestamps).
- Never construct key names inside the Lua script from `ARGV` values. Always pass them as `KEYS`.

### Atomic Compare-and-Set

A common use case for Lua scripts: compare the current value and update only if the condition holds.

```ts
redis.defineCommand("compareAndSet", {
  numberOfKeys: 1,
  lua: `
    local current = redis.call("GET", KEYS[1])
    if current == ARGV[1] then
      redis.call("SET", KEYS[1], ARGV[2])
      return 1
    end
    return 0
  `,
})

declare module "ioredis" {
  interface RedisCommander<Context> {
    compareAndSet(
      key: string,
      expectedValue: string,
      newValue: string
    ): Result<number, Context>
  }
}

const swapped = await redis.compareAndSet("config:version", "v1", "v2")
```

### Script Caching

ioredis handles script caching automatically. On the first call, it sends `EVAL` with the full script. Redis returns a SHA1 hash. On subsequent calls, ioredis uses `EVALSHA` with just the hash, avoiding the overhead of transmitting the script body repeatedly. No manual intervention is needed.

---

## Key Management

### Namespaced Prefixes for Multi-Tenant Applications

In multi-tenant systems, prefix every key with a tenant identifier to ensure complete isolation.

```ts
class TenantRedis {
  constructor(
    private readonly redis: Redis,
    private readonly tenantId: string
  ) {}

  private prefixed(key: string): string {
    return `t:${this.tenantId}:${key}`
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(this.prefixed(key))
  }

  async setex(key: string, ttl: number, value: string): Promise<string> {
    return this.redis.setex(this.prefixed(key), ttl, value)
  }

  async del(key: string): Promise<number> {
    return this.redis.del(this.prefixed(key))
  }
}

// Usage
const tenantRedis = new TenantRedis(redis, "acme-corp")
await tenantRedis.setex("user:123:profile", 300, serialized)
// Actual key: "t:acme-corp:user:123:profile"
```

### Always Set TTL on Cache Keys

Keys without a TTL live until explicitly deleted or until Redis runs out of memory and triggers eviction. This is a memory leak waiting to happen.

```ts
// WRONG: no TTL -- this key lives forever
await redis.set("cache:user:123", serialized)

// CORRECT: explicit TTL
await redis.setex("cache:user:123", 300, serialized)

// CORRECT: set TTL separately (when using HSET or other commands)
await redis.hset("cache:user:123", userData)
await redis.expire("cache:user:123", 300)
```

### Never Use KEYS in Production

The `KEYS` command scans the entire keyspace in a single blocking operation. On a database with millions of keys, this blocks all other operations for seconds or longer.

```ts
// NEVER DO THIS IN PRODUCTION
const keys = await redis.keys("user:*:profile")

// USE SCAN INSTEAD -- iterates the keyspace incrementally
async function scanKeys(
  redis: Redis,
  pattern: string,
  batchSize = 100
): Promise<string[]> {
  const found: string[] = []
  let cursor = "0"

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      batchSize
    )
    cursor = nextCursor
    found.push(...keys)
  } while (cursor !== "0")

  return found
}

// Usage
const userProfileKeys = await scanKeys(redis, "user:*:profile")
```

`SCAN` is cursor-based and non-blocking. Each iteration returns a small batch of keys and a cursor for the next iteration. The `COUNT` hint suggests how many keys to return per iteration (Redis may return more or fewer).

### Key Expiration Strategies (maxmemory-policy)

Configure the Redis server's eviction policy to match your workload. This is a server-level setting, not a client-level one.

| Policy | Behavior | Use Case |
|---|---|---|
| `noeviction` | Returns errors when memory is full | When data loss is unacceptable |
| `allkeys-lru` | Evicts least recently used keys | General caching workloads |
| `volatile-lru` | Evicts LRU keys that have a TTL set | Mixed cache + persistent data |
| `allkeys-lfu` | Evicts least frequently used keys | Workloads with hot/cold data |
| `volatile-ttl` | Evicts keys with shortest remaining TTL | When TTL reflects priority |

For pure caching workloads, `allkeys-lru` or `allkeys-lfu` are the best choices. For mixed workloads where some keys are persistent (rate limiters, locks) and others are cache, use `volatile-lru` and ensure all cache keys have a TTL set.

---

## Security

### Authentication

Always require authentication in production. Use the Redis `requirepass` directive or, in Redis 6+, ACL users with fine-grained permissions.

```ts
// Password authentication
const redis = new Redis({
  host: "redis.internal.example.com",
  port: 6379,
  password: process.env.REDIS_PASSWORD,
})

// Redis 6+ ACL authentication (username + password)
const redis = new Redis({
  host: "redis.internal.example.com",
  port: 6379,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
})
```

Never hard-code credentials. Always load them from environment variables or a secrets manager.

### TLS in Production

Encrypt traffic between the application and Redis, especially when traversing a network boundary.

```ts
import { readFileSync } from "node:fs"

const redis = new Redis({
  host: "redis.internal.example.com",
  port: 6380,
  tls: {
    ca: readFileSync("/path/to/ca-cert.pem"),
    cert: readFileSync("/path/to/client-cert.pem"),
    key: readFileSync("/path/to/client-key.pem"),
    rejectUnauthorized: true,
  },
})
```

For managed Redis services (AWS ElastiCache, Azure Cache, GCP Memorystore), TLS configuration varies. Consult the provider's documentation for the correct `tls` options.

### Disable Dangerous Commands

Rename or disable commands that could cause data loss or security issues. This is a server-side configuration (redis.conf):

```
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN ""
```

If you need `CONFIG` for monitoring, rename it to a secret name rather than disabling it entirely.

### Network Isolation

- **Bind to specific interfaces**: Set `bind 127.0.0.1` or `bind 10.0.0.5` in redis.conf. Never bind to `0.0.0.0` in production.
- **Use private networks**: Redis should only be accessible from the application tier, never from the public internet.
- **Firewall rules**: Restrict port 6379 to known application server IPs.
- **Docker networks**: Use internal Docker networks so Redis is not exposed to the host or external traffic.

---

## Monitoring

### INFO Command

The `INFO` command returns a comprehensive dump of server statistics, organized into sections.

```ts
// Get all sections
const info = await redis.info()

// Get a specific section
const memoryInfo = await redis.info("memory")
const statsInfo = await redis.info("stats")
const clientsInfo = await redis.info("clients")
```

Key metrics to track:

| Metric | Section | What It Tells You |
|---|---|---|
| `used_memory` | memory | Current memory usage in bytes |
| `used_memory_peak` | memory | Highest memory usage since startup |
| `mem_fragmentation_ratio` | memory | Ratio > 1.5 indicates fragmentation issues |
| `connected_clients` | clients | Number of open connections |
| `blocked_clients` | clients | Clients blocked on BRPOP/BLPOP |
| `instantaneous_ops_per_sec` | stats | Current operations per second |
| `keyspace_hits` / `keyspace_misses` | stats | Cache hit ratio |
| `evicted_keys` | stats | Keys evicted due to maxmemory |
| `rejected_connections` | stats | Connections rejected (maxclients reached) |

```ts
async function getRedisHealthMetrics(redis: Redis) {
  const info = await redis.info()
  const lines = info.split("\r\n")

  const metrics: Record<string, string> = {}
  for (const line of lines) {
    if (line.includes(":")) {
      const [key, value] = line.split(":")
      metrics[key] = value
    }
  }

  const hits = parseInt(metrics["keyspace_hits"] ?? "0", 10)
  const misses = parseInt(metrics["keyspace_misses"] ?? "0", 10)
  const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0

  return {
    memoryUsedBytes: parseInt(metrics["used_memory"] ?? "0", 10),
    memoryPeakBytes: parseInt(metrics["used_memory_peak"] ?? "0", 10),
    connectedClients: parseInt(metrics["connected_clients"] ?? "0", 10),
    opsPerSecond: parseInt(metrics["instantaneous_ops_per_sec"] ?? "0", 10),
    cacheHitRate: hitRate,
    evictedKeys: parseInt(metrics["evicted_keys"] ?? "0", 10),
    uptimeSeconds: parseInt(metrics["uptime_in_seconds"] ?? "0", 10),
  }
}
```

### SLOWLOG

The slow log captures commands that exceed a configured execution time threshold. This is invaluable for finding performance bottlenecks.

```ts
// Server configuration (redis.conf or CONFIG SET):
// slowlog-log-slower-than 10000  (microseconds, so 10ms)
// slowlog-max-len 128

// Read the slow log
const slowLog = await redis.slowlog("GET", 10) // last 10 entries

// Each entry: [id, timestamp, executionTimeMicroseconds, commandArray, clientIp, clientName]
for (const entry of slowLog) {
  const [id, timestamp, duration, command] = entry as [
    number,
    number,
    number,
    string[]
  ]
  logger.warn({
    slowlogId: id,
    timestamp: new Date(timestamp * 1000).toISOString(),
    durationMs: duration / 1000,
    command: command.join(" "),
  }, "Slow Redis command detected")
}
```

Set the threshold based on your latency requirements. For most applications, 10ms (10000 microseconds) is a reasonable starting point.

### Memory Usage Monitoring

```ts
// Check memory usage of a specific key
const usage = await redis.memory("USAGE", "user:123:profile")
logger.info({ key: "user:123:profile", bytes: usage }, "Key memory usage")

// Get overall database size (number of keys)
const dbSize = await redis.dbsize()

// Get key count per database from INFO
const keyspaceInfo = await redis.info("keyspace")
```

### Connection Count Monitoring

Monitor connection counts to detect connection leaks (connections that are opened but never closed).

```ts
async function checkConnectionHealth(redis: Redis): Promise<{
  healthy: boolean
  connectedClients: number
  warning: string | null
}> {
  const clientsInfo = await redis.info("clients")
  const match = clientsInfo.match(/connected_clients:(\d+)/)
  const connected = match ? parseInt(match[1], 10) : 0

  const maxClientsMatch = clientsInfo.match(/maxclients:(\d+)/)
  const maxClients = maxClientsMatch ? parseInt(maxClientsMatch[1], 10) : 10000

  const usageRatio = connected / maxClients

  let warning: string | null = null
  if (usageRatio > 0.8) {
    warning = `Connection usage at ${(usageRatio * 100).toFixed(1)}% of maxclients (${connected}/${maxClients})`
  }

  return {
    healthy: usageRatio < 0.9,
    connectedClients: connected,
    warning,
  }
}
```

### Health Check Endpoint Integration

Integrate Redis health into your Fastify health check endpoint.

```ts
fastify.get("/health/ready", async (request, reply) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {}

  // Redis ping check with latency measurement
  try {
    const start = performance.now()
    const pong = await fastify.redis.ping()
    const latencyMs = Math.round(performance.now() - start)

    checks.redis = {
      status: pong === "PONG" ? "healthy" : "degraded",
      latencyMs,
    }
  } catch (err) {
    checks.redis = { status: "unhealthy" }
  }

  const allHealthy = Object.values(checks).every(
    (c) => c.status === "healthy"
  )

  reply.status(allHealthy ? 200 : 503).send({
    status: allHealthy ? "ready" : "not_ready",
    checks,
  })
})
```

---

## Summary of Critical Rules

1. **One shared connection** per purpose (commands, subscribers, BullMQ workers).
2. **Always attach an error event listener** on every Redis connection.
3. **Set `maxRetriesPerRequest: null`** only for BullMQ connections.
4. **Always set TTL** on cache keys.
5. **Never use `KEYS`** in production; use `SCAN` instead.
6. **Separate connections** for pub/sub subscribers.
7. **Use pipelines** for bulk operations to reduce round trips.
8. **Use Lua scripts** for atomic multi-command operations.
9. **Enable TLS and authentication** in production.
10. **Monitor** memory, connections, hit rates, and slow commands continuously.
