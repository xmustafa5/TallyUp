# BullMQ Best Practices

Enterprise-grade reference for building reliable, scalable background job processing with BullMQ, Redis, and TypeScript.

---

## Table of Contents

1. [Queue Design](#queue-design)
2. [Workers](#workers)
3. [Job Configuration](#job-configuration)
4. [Rate Limiting](#rate-limiting)
5. [Job Flows (Parent-Child Dependencies)](#job-flows-parent-child-dependencies)
6. [Repeatable Jobs (Cron)](#repeatable-jobs-cron)
7. [Stalled Jobs](#stalled-jobs)
8. [Graceful Shutdown](#graceful-shutdown)
9. [Connection Management](#connection-management)
10. [Error Handling](#error-handling)
11. [Monitoring and Events](#monitoring-and-events)

---

## Queue Design

### One Queue Per Domain Concern

Each queue should represent a single domain responsibility. Mixing unrelated job types into a single queue makes it impossible to tune concurrency, rate limits, and retry strategies per concern.

```typescript
import { Queue } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

// Good: separate queues per domain concern
const emailQueue = new Queue('email-sending', { connection });
const orderQueue = new Queue('order-processing', { connection });
const reportQueue = new Queue('report-generation', { connection });
const notificationQueue = new Queue('notification-dispatch', { connection });

// Bad: one queue for everything
const everythingQueue = new Queue('jobs', { connection }); // Do not do this
```

### Naming Conventions

Use the pattern `domain-action` for queue names. This makes queues self-documenting in monitoring dashboards and Redis key inspection.

| Queue Name              | Purpose                              |
| ----------------------- | ------------------------------------ |
| `email-sending`         | Transactional and marketing emails   |
| `order-processing`      | Order lifecycle state transitions    |
| `invoice-generation`    | PDF invoice creation and storage     |
| `webhook-delivery`      | Outbound webhook HTTP calls          |
| `data-export`           | Large dataset export to CSV/Excel    |
| `image-processing`      | Thumbnail generation, format conversion |

### Default Job Options

Configure sensible defaults at the queue level so every job inherits baseline behavior. Individual jobs can override these defaults.

```typescript
import { Queue } from 'bullmq';

const emailQueue = new Queue('email-sending', {
  connection: { host: 'localhost', port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 1000,  // Keep last 1000 completed jobs for debugging
      age: 3600,    // Remove completed jobs older than 1 hour
    },
    removeOnFail: {
      count: 5000,  // Keep last 5000 failed jobs for post-mortem
      age: 86400,   // Remove failed jobs older than 24 hours
    },
  },
});
```

### Automatic Cleanup

Without `removeOnComplete` and `removeOnFail`, Redis memory grows unboundedly. Always configure cleanup, either as a boolean, a count, or an object with `count` and `age`.

```typescript
// Option A: Remove immediately after completion
removeOnComplete: true

// Option B: Keep last N jobs
removeOnComplete: 500
removeOnFail: 2000

// Option C: Keep by count and age (recommended for production)
removeOnComplete: { count: 1000, age: 3600 }
removeOnFail: { count: 5000, age: 86400 }
```

For additional periodic cleanup, use `queue.clean()`:

```typescript
// Remove completed jobs older than 1 hour, up to 100 at a time
const removed = await emailQueue.clean(3600 * 1000, 100, 'completed');
console.log(`Cleaned ${removed.length} old completed jobs`);

// Remove failed jobs older than 24 hours
await emailQueue.clean(86400 * 1000, 100, 'failed');
```

---

## Workers

### Basic Worker Setup

A worker pulls jobs from a queue and processes them. The processor function receives a `Job` instance with typed data.

```typescript
import { Worker, Job } from 'bullmq';

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
}

const emailWorker = new Worker<EmailJobData>(
  'email-sending',
  async (job: Job<EmailJobData>) => {
    const { to, subject, body } = job.data;

    await job.updateProgress(10);

    const result = await sendEmail({ to, subject, body });

    await job.updateProgress(100);

    // Return value is stored in job.returnvalue
    return { messageId: result.messageId, sentAt: new Date().toISOString() };
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null, // Required for workers
    },
    concurrency: 5,
  },
);
```

### Concurrency Tuning

Concurrency controls how many jobs a single worker processes in parallel. The right value depends on the workload type.

| Workload Type      | Recommended Concurrency | Rationale                                       |
| ------------------ | ----------------------- | ----------------------------------------------- |
| I/O-bound (HTTP, DB) | 10-50                 | Mostly waiting on network; high parallelism safe |
| CPU-bound (PDF, image) | 1-2                 | Saturates CPU; use sandboxed processors instead  |
| Mixed               | 5-10                  | Balance between CPU and I/O                      |
| External API (rate-limited) | 1-5            | Match the API's rate limit                       |

```typescript
// I/O-bound: many concurrent HTTP calls
const webhookWorker = new Worker('webhook-delivery', processor, {
  connection,
  concurrency: 20,
});

// CPU-bound: limit concurrency, prefer sandboxed processors
const pdfWorker = new Worker('report-generation', processor, {
  connection,
  concurrency: 2,
});
```

### Event Listeners

Every worker should attach event listeners for observability.

```typescript
import { Worker, Job } from 'bullmq';

const worker = new Worker('email-sending', processor, { connection });

worker.on('completed', (job: Job, returnvalue: unknown) => {
  logger.info({ jobId: job.id, returnvalue }, 'Job completed');
});

worker.on('failed', (job: Job | undefined, error: Error) => {
  logger.error({ jobId: job?.id, error: error.message, stack: error.stack }, 'Job failed');
});

worker.on('progress', (job: Job, progress: number | object) => {
  logger.debug({ jobId: job.id, progress }, 'Job progress updated');
});

worker.on('error', (error: Error) => {
  // This fires for connection errors and unexpected worker-level errors.
  // It does NOT fire for individual job failures.
  logger.error({ error: error.message }, 'Worker error');
});

worker.on('stalled', (jobId: string) => {
  logger.warn({ jobId }, 'Job stalled -- check for long-running processors or crashes');
});
```

### Sandboxed Processors

For CPU-intensive work (PDF generation, image processing, data transformation), use sandboxed processors. These run in a separate Node.js process, preventing the main worker thread from being blocked.

```typescript
// src/infrastructure/jobs/processors/report-processor.ts
// This file is the sandboxed processor -- it runs in its own process.
import { Job } from 'bullmq';

interface ReportJobData {
  reportId: string;
  format: 'pdf' | 'csv';
  filters: Record<string, unknown>;
}

export default async function (job: Job<ReportJobData>) {
  const { reportId, format, filters } = job.data;

  await job.updateProgress(10);
  const data = await fetchReportData(filters);

  await job.updateProgress(50);
  const file = await generateReport(data, format);

  await job.updateProgress(90);
  await uploadToStorage(file, `reports/${reportId}.${format}`);

  await job.updateProgress(100);
  return { reportId, url: `https://storage.example.com/reports/${reportId}.${format}` };
}
```

```typescript
// src/infrastructure/jobs/workers/report-worker.ts
import { Worker } from 'bullmq';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const reportWorker = new Worker(
  'report-generation',
  path.join(__dirname, '../processors/report-processor.js'),
  {
    connection: {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    },
    concurrency: 2, // Limit CPU-bound concurrency
  },
);
```

### Worker Naming for Monitoring

Assign names to workers for identification in monitoring tools and log aggregation.

```typescript
const worker = new Worker('email-sending', processor, {
  connection,
  name: `email-worker-${process.env.HOSTNAME || 'local'}`,
});
```

---

## Job Configuration

### Retry Strategies

BullMQ supports fixed, exponential, and custom backoff strategies. Choose based on failure characteristics.

#### Fixed Backoff

Retries at a constant interval. Use when the failure is likely transient and recovery time is predictable.

```typescript
await emailQueue.add('send-welcome', { userId: '123' }, {
  attempts: 5,
  backoff: {
    type: 'fixed',
    delay: 3000, // Retry every 3 seconds
  },
});
```

#### Exponential Backoff

Each retry waits longer than the last: `delay * 2^(attempt - 1)`. Use for external service calls where repeated immediate retries are harmful.

```typescript
await webhookQueue.add('deliver', { url, payload }, {
  attempts: 6,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s, 8s, 16s, 32s
  },
});
```

#### Custom Backoff Strategy

Define a custom function in the worker settings. The function receives the attempt count and can return any delay in milliseconds.

```typescript
import { Worker } from 'bullmq';

const worker = new Worker('api-calls', processor, {
  connection,
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      // Exponential with jitter to prevent thundering herd
      const baseDelay = Math.min(1000 * Math.pow(2, attemptsMade - 1), 30000);
      const jitter = Math.random() * 1000;
      return baseDelay + jitter;
    },
  },
});
```

To add the corresponding job:

```typescript
await apiQueue.add('fetch-data', { endpoint: '/users' }, {
  attempts: 5,
  backoff: {
    type: 'custom', // Triggers the worker's backoffStrategy function
  },
});
```

#### Jitter to Prevent Thundering Herd

When many jobs fail simultaneously (e.g., a downstream service outage), they all retry at the same moment, causing a thundering herd. Add randomized jitter to spread retries.

```typescript
settings: {
  backoffStrategy: (attemptsMade: number) => {
    const exponentialDelay = 1000 * Math.pow(2, attemptsMade - 1);
    const cappedDelay = Math.min(exponentialDelay, 60000); // Cap at 60s
    const jitter = Math.floor(Math.random() * cappedDelay * 0.3); // 0-30% jitter
    return cappedDelay + jitter;
  },
}
```

### Priority

Lower number means higher priority. Jobs with lower priority values are processed first when multiple jobs are waiting.

```typescript
// Critical: process immediately
await emailQueue.add('password-reset', data, { priority: 1 });

// Normal: standard processing order
await emailQueue.add('weekly-digest', data, { priority: 5 });

// Low: process when nothing else is pending
await emailQueue.add('analytics-sync', data, { priority: 10 });
```

### Delayed Execution

Schedule a job to become eligible for processing after a specified delay.

```typescript
// Send a follow-up email 24 hours from now
await emailQueue.add('follow-up', { userId: '123' }, {
  delay: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
});

// Delay retry of a rate-limited API call
await apiQueue.add('sync-user', { userId: '456' }, {
  delay: 60000, // Wait 60 seconds before processing
});
```

### Recommended Job Options for Production

```typescript
const productionJobDefaults = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    count: 1000,
    age: 3600,
  },
  removeOnFail: {
    count: 5000,
    age: 86400,
  },
};

// Apply as queue defaults
const queue = new Queue('order-processing', {
  connection,
  defaultJobOptions: productionJobDefaults,
});

// Or per-job, overriding defaults where needed
await queue.add('high-priority-order', orderData, {
  ...productionJobDefaults,
  priority: 1,
  attempts: 5, // Override: more retries for critical orders
});
```

---

## Rate Limiting

### Worker-Level Rate Limiting

The `limiter` option controls the maximum number of jobs processed within a time window.

```typescript
import { Worker } from 'bullmq';

// Process at most 10 jobs per second
const worker = new Worker('webhook-delivery', processor, {
  connection,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

// Process at most 100 jobs per minute
const batchWorker = new Worker('data-sync', processor, {
  connection,
  limiter: {
    max: 100,
    duration: 60000,
  },
});
```

### Manual Rate Limiting Based on API Responses

When an external API returns HTTP 429 (Too Many Requests), use `Worker.RateLimitError()` to move the job back to the waiting state instead of counting it as a failure.

```typescript
import { Worker, Queue, RateLimitError, UnrecoverableError } from 'bullmq';

const apiQueue = new Queue('api-calls', { connection });

const worker = new Worker(
  'api-calls',
  async (job) => {
    const response = await fetch(job.data.url, {
      method: 'POST',
      body: JSON.stringify(job.data.payload),
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      await apiQueue.rateLimit(retryAfter * 1000);

      // If we have exhausted all attempts, fail permanently
      if (job.attemptsStarted >= (job.opts.attempts ?? 1)) {
        throw new UnrecoverableError('Rate limited with no remaining attempts');
      }

      // Move job back to wait -- this does NOT count as a failed attempt
      throw new RateLimitError();
    }

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },
  {
    connection,
    limiter: {
      max: 1,
      duration: 500, // Required: limiter must be set for manual rate limiting
    },
  },
);
```

### Checking Rate Limit Status

```typescript
// Check if the queue is currently rate-limited
const ttl = await apiQueue.getRateLimitTtl(10);
if (ttl > 0) {
  console.log(`Queue is rate limited for another ${ttl}ms`);
}

// Manually remove the rate limit (e.g., after confirming the API is available)
await apiQueue.removeRateLimitKey();
```

---

## Job Flows (Parent-Child Dependencies)

### FlowProducer Basics

`FlowProducer` creates job hierarchies where a parent job waits for all its children to complete before being processed. The entire flow is added atomically via Redis MULTI/EXEC.

```typescript
import { FlowProducer } from 'bullmq';

const flowProducer = new FlowProducer({ connection });

const flow = await flowProducer.add({
  name: 'assemble-order',
  queueName: 'order-processing',
  data: { orderId: 'ORD-001' },
  children: [
    {
      name: 'validate-payment',
      queueName: 'payment-processing',
      data: { orderId: 'ORD-001', amount: 99.99 },
    },
    {
      name: 'reserve-inventory',
      queueName: 'inventory-management',
      data: { orderId: 'ORD-001', items: ['SKU-A', 'SKU-B'] },
    },
    {
      name: 'calculate-shipping',
      queueName: 'shipping-calculation',
      data: { orderId: 'ORD-001', destination: 'US-CA' },
    },
  ],
});

// flow.job is the parent job
// flow.children contains the child job references
```

### Accessing Child Results

In the parent job's processor, use `getChildrenValues()` to retrieve results from all child jobs.

```typescript
import { Worker, Job } from 'bullmq';

const orderWorker = new Worker(
  'order-processing',
  async (job: Job) => {
    // This runs only after ALL children have completed
    const childResults = await job.getChildrenValues();

    // childResults is keyed by `queueName:jobId`
    // e.g., { 'payment-processing:123': { verified: true }, ... }
    const results = Object.values(childResults);

    const paymentResult = results.find((r: any) => r.paymentVerified);
    const inventoryResult = results.find((r: any) => r.reserved);
    const shippingResult = results.find((r: any) => r.shippingCost);

    return {
      orderId: job.data.orderId,
      status: 'assembled',
      paymentVerified: paymentResult?.paymentVerified,
      itemsReserved: inventoryResult?.reserved,
      shippingCost: shippingResult?.shippingCost,
    };
  },
  { connection },
);
```

### Nested Flows

Children can themselves have children, creating multi-level dependency trees.

```typescript
const flow = await flowProducer.add({
  name: 'generate-monthly-report',
  queueName: 'report-generation',
  data: { month: '2026-03' },
  children: [
    {
      name: 'aggregate-sales',
      queueName: 'data-aggregation',
      data: { type: 'sales', month: '2026-03' },
      children: [
        {
          name: 'fetch-region-data',
          queueName: 'data-fetch',
          data: { region: 'NA', month: '2026-03' },
        },
        {
          name: 'fetch-region-data',
          queueName: 'data-fetch',
          data: { region: 'EU', month: '2026-03' },
        },
      ],
    },
    {
      name: 'aggregate-expenses',
      queueName: 'data-aggregation',
      data: { type: 'expenses', month: '2026-03' },
    },
  ],
});
```

### Queue Options in Flows

Apply default job options to specific queues within a flow.

```typescript
const flow = await flowProducer.add(
  {
    name: 'process-batch',
    queueName: 'batch-processing',
    data: { batchId: 'B-100' },
    children: [
      { name: 'item-1', queueName: 'item-processing', data: { id: 1 } },
      { name: 'item-2', queueName: 'item-processing', data: { id: 2 } },
    ],
  },
  {
    queuesOptions: {
      'item-processing': {
        defaultJobOptions: {
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      },
    },
  },
);
```

---

## Repeatable Jobs (Cron)

### Interval-Based Repeatable Jobs

Use `every` for jobs that run at a fixed interval in milliseconds.

```typescript
import { Queue } from 'bullmq';

const maintenanceQueue = new Queue('maintenance', { connection });

// Run health check every 60 seconds
await maintenanceQueue.add(
  'health-check',
  { services: ['database', 'redis', 'external-api'] },
  {
    repeat: {
      every: 60000,
    },
  },
);

// Sync data every 5 minutes
await maintenanceQueue.add(
  'data-sync',
  { source: 'external-crm' },
  {
    repeat: {
      every: 300000,
    },
  },
);
```

### Cron-Based Repeatable Jobs

Use `pattern` for cron expressions. The format is standard 5-field or 6-field cron.

```typescript
// Run at midnight every day
await maintenanceQueue.add(
  'daily-cleanup',
  { olderThanDays: 30 },
  {
    repeat: {
      pattern: '0 0 * * *',
    },
  },
);

// Run at 9:00 AM every Monday
await maintenanceQueue.add(
  'weekly-report',
  { reportType: 'summary' },
  {
    repeat: {
      pattern: '0 9 * * 1',
    },
  },
);

// Run every 15 minutes during business hours (9 AM - 6 PM, Mon-Fri)
await maintenanceQueue.add(
  'lead-sync',
  { source: 'crm' },
  {
    repeat: {
      pattern: '*/15 9-17 * * 1-5',
    },
  },
);
```

### Preventing Duplicate Repeatable Jobs

Repeatable jobs are identified by their name and repeat configuration. Adding the same repeatable job multiple times (e.g., on every server restart) does not create duplicates -- BullMQ deduplicates them automatically.

However, if you change the cron pattern, the old schedule persists alongside the new one. Clean up stale repeatables explicitly.

```typescript
// List all repeatable jobs
const repeatableJobs = await maintenanceQueue.getRepeatableJobs();
for (const job of repeatableJobs) {
  console.log(`${job.name} | key: ${job.key} | next: ${new Date(job.next).toISOString()}`);
}

// Remove a specific repeatable job by key
await maintenanceQueue.removeRepeatableByKey(repeatableJobs[0].key);

// Safe pattern: remove old schedule before adding updated one
async function upsertRepeatableJob(
  queue: Queue,
  name: string,
  data: Record<string, unknown>,
  pattern: string,
) {
  const existing = await queue.getRepeatableJobs();
  const stale = existing.filter((j) => j.name === name);
  for (const job of stale) {
    await queue.removeRepeatableByKey(job.key);
  }
  await queue.add(name, data, { repeat: { pattern } });
}
```

---

## Stalled Jobs

### What Are Stalled Jobs

A job is marked as "stalled" when a worker acquires its lock but fails to renew it within the `stalledInterval`. This happens when:

- The worker process crashes or is killed (SIGKILL)
- The event loop is blocked for too long (CPU-intensive synchronous code)
- The system runs out of memory
- A network partition separates the worker from Redis

Stalled jobs are automatically moved back to the waiting state and retried, up to `maxStalledCount` times.

### Configuration

```typescript
import { Worker } from 'bullmq';

const worker = new Worker('order-processing', processor, {
  connection,
  // How long a worker can hold a job lock without renewing
  lockDuration: 30000, // 30 seconds (default)

  settings: {
    // How often to check for stalled jobs (ms)
    stalledInterval: 30000, // 30 seconds (default)

    // Maximum times a job can be stalled before being marked as failed
    maxStalledCount: 2, // Default is 1
  },
});
```

### Tuning for Long-Running Jobs

If your jobs legitimately take a long time, increase `lockDuration` to prevent false stall detection. The lock is automatically renewed while the processor is running, but only if the event loop is not blocked.

```typescript
// For jobs that may take up to 10 minutes
const longRunningWorker = new Worker('report-generation', processor, {
  connection,
  lockDuration: 300000, // 5 minutes
  settings: {
    stalledInterval: 300000,
    maxStalledCount: 2,
  },
});
```

### Monitoring Stalled Events

```typescript
worker.on('stalled', (jobId: string, prev: string) => {
  logger.warn(
    { jobId, previousState: prev },
    'Job stalled -- investigate worker health and event loop latency',
  );

  // Alert your monitoring system
  metrics.increment('bullmq.stalled_jobs', { queue: 'order-processing' });
});
```

---

## Graceful Shutdown

### Basic Shutdown

`worker.close()` stops the worker from picking up new jobs and waits for all currently active jobs to finish processing. It does not impose a timeout by default, so if a job runs indefinitely, the shutdown hangs indefinitely.

```typescript
import { Worker, Queue } from 'bullmq';

const worker = new Worker('email-sending', processor, { connection });
const queue = new Queue('email-sending', { connection });

async function shutdown() {
  console.log('Shutting down gracefully...');

  // Stop accepting new jobs and wait for active jobs to complete
  await worker.close();
  console.log('Worker closed');

  // Close the queue connection
  await queue.close();
  console.log('Queue closed');

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

### Shutdown with Timeout

In production, enforce a maximum shutdown duration. If jobs do not finish within the timeout, they will be marked as stalled and retried by another worker.

```typescript
async function shutdownWithTimeout(timeoutMs: number = 30000) {
  console.log(`Graceful shutdown initiated (timeout: ${timeoutMs}ms)`);

  const shutdownPromise = Promise.all([
    worker.close(),
    queue.close(),
  ]);

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Shutdown timed out')), timeoutMs);
  });

  try {
    await Promise.race([shutdownPromise, timeoutPromise]);
    console.log('Graceful shutdown complete');
  } catch (error) {
    console.error('Shutdown timed out, forcing exit. Active jobs will be marked as stalled.');
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdownWithTimeout(30000));
process.on('SIGINT', () => shutdownWithTimeout(10000));
```

### Multi-Worker Shutdown

When running multiple workers in a single process, shut them all down together.

```typescript
const workers: Worker[] = [
  new Worker('email-sending', emailProcessor, { connection }),
  new Worker('order-processing', orderProcessor, { connection }),
  new Worker('report-generation', reportProcessor, { connection }),
];

const queues: Queue[] = [
  new Queue('email-sending', { connection }),
  new Queue('order-processing', { connection }),
  new Queue('report-generation', { connection }),
];

async function shutdownAll() {
  console.log(`Closing ${workers.length} workers and ${queues.length} queues...`);

  // Close all workers in parallel
  await Promise.all(workers.map((w) => w.close()));
  console.log('All workers closed');

  // Close all queue connections
  await Promise.all(queues.map((q) => q.close()));
  console.log('All queues closed');

  process.exit(0);
}

process.on('SIGTERM', shutdownAll);
process.on('SIGINT', shutdownAll);
```

---

## Connection Management

### Share Configuration, Not Instances

BullMQ internally creates its own Redis connections. Pass a connection options object, not an existing IORedis instance. Each Queue, Worker, and QueueEvents instance creates its own connection.

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';

// Good: share the configuration object
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  enableReadyCheck: false,
};

const queue = new Queue('email-sending', { connection: redisConfig });
const worker = new Worker('email-sending', processor, { connection: redisConfig });
const events = new QueueEvents('email-sending', { connection: redisConfig });

// Bad: sharing an IORedis instance leads to unexpected behavior
// import IORedis from 'ioredis';
// const sharedConnection = new IORedis(redisConfig);
// const queue = new Queue('email-sending', { connection: sharedConnection }); // Do not do this
```

### Worker Connection Requirement

Workers MUST set `maxRetriesPerRequest: null` on their Redis connection. Without this, the worker will throw an error. This is because BullMQ uses blocking Redis commands (`BRPOPLPUSH`) that should not time out.

```typescript
const workerConnection = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null, // Required for workers
};

const worker = new Worker('email-sending', processor, {
  connection: workerConnection,
});
```

Queues and QueueEvents do not require `maxRetriesPerRequest: null`, but it does not hurt to include it.

### Centralized Connection Factory

For larger applications, create a connection factory to ensure consistent configuration.

```typescript
// src/infrastructure/redis/connection.ts

interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: null;
  enableReadyCheck?: boolean;
}

function createRedisConfig(): RedisConnectionOptions {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    enableReadyCheck: false,
  };
}

export function getQueueConnection(): RedisConnectionOptions {
  return createRedisConfig();
}

export function getWorkerConnection(): RedisConnectionOptions {
  return {
    ...createRedisConfig(),
    maxRetriesPerRequest: null,
  };
}
```

```typescript
// Usage
import { getQueueConnection, getWorkerConnection } from './infrastructure/redis/connection';

const queue = new Queue('email-sending', { connection: getQueueConnection() });
const worker = new Worker('email-sending', processor, { connection: getWorkerConnection() });
```

---

## Error Handling

### Job-Level Error Handling

Wrap your processor logic in try/catch for granular error control. Throw errors to trigger BullMQ's retry mechanism; return normally to mark the job as complete.

```typescript
import { Worker, Job, UnrecoverableError } from 'bullmq';

const worker = new Worker(
  'order-processing',
  async (job: Job) => {
    try {
      const order = await fetchOrder(job.data.orderId);

      if (!order) {
        // UnrecoverableError skips all remaining retries and fails immediately
        throw new UnrecoverableError(`Order ${job.data.orderId} not found`);
      }

      await processOrder(order);
      return { orderId: order.id, status: 'processed' };
    } catch (error) {
      if (error instanceof UnrecoverableError) {
        throw error; // Re-throw to bypass retries
      }

      // Log with context for debugging
      logger.error({
        jobId: job.id,
        orderId: job.data.orderId,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
        error: (error as Error).message,
      }, 'Order processing failed');

      throw error; // Re-throw to trigger retry
    }
  },
  { connection },
);
```

### Global Worker Error Handler

The `error` event on a worker fires for unexpected errors such as Redis connection failures. This is distinct from individual job failures.

```typescript
worker.on('error', (error: Error) => {
  logger.error(
    { error: error.message, stack: error.stack },
    'Worker encountered an unexpected error',
  );
  // Alert your ops team -- this is a systemic issue, not a job failure
  alerting.critical('BullMQ worker error', { queue: 'order-processing', error: error.message });
});
```

### Post-Failure Actions

Use the `failed` event to trigger side effects after a job exhausts all retries.

```typescript
worker.on('failed', (job: Job | undefined, error: Error) => {
  if (!job) return;

  const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);

  if (isLastAttempt) {
    logger.error(
      { jobId: job.id, data: job.data, error: error.message },
      'Job permanently failed after all retry attempts',
    );

    // Send notification to ops team
    notifyOps({
      subject: `Job permanently failed: ${job.name}`,
      body: `Job ${job.id} in queue "${job.queueName}" failed after ${job.attemptsMade} attempts.\nError: ${error.message}`,
    });
  }
});
```

### Custom Backoff: Stop Retrying on Specific Errors

Return `-1` from a custom backoff strategy to stop retrying immediately, without using `UnrecoverableError`.

```typescript
const worker = new Worker('api-calls', processor, {
  connection,
  settings: {
    backoffStrategy: (attemptsMade: number, type: string, error: Error) => {
      // Stop retrying on 4xx client errors (except 429)
      if (error.message.includes('HTTP 4') && !error.message.includes('HTTP 429')) {
        return -1; // Stop retrying
      }

      // Exponential backoff for all other errors
      return Math.min(1000 * Math.pow(2, attemptsMade - 1), 60000);
    },
  },
});
```

---

## Monitoring and Events

### QueueEvents for External Monitoring

`QueueEvents` is a dedicated listener class that uses Redis Streams to receive events for all jobs in a queue, regardless of which worker processed them. Use this for dashboards, logging pipelines, and alerting systems.

```typescript
import { QueueEvents } from 'bullmq';

const queueEvents = new QueueEvents('order-processing', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

queueEvents.on('waiting', ({ jobId }) => {
  metrics.increment('bullmq.jobs.waiting', { queue: 'order-processing' });
});

queueEvents.on('active', ({ jobId, prev }) => {
  metrics.increment('bullmq.jobs.active', { queue: 'order-processing' });
  logger.debug({ jobId, previousState: prev }, 'Job became active');
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  metrics.increment('bullmq.jobs.completed', { queue: 'order-processing' });
  metrics.timing('bullmq.jobs.duration', Date.now() - parseInt(returnvalue?.startedAt || '0'));
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  metrics.increment('bullmq.jobs.failed', { queue: 'order-processing' });
  logger.error({ jobId, reason: failedReason }, 'Job failed (via QueueEvents)');
});

queueEvents.on('stalled', ({ jobId }) => {
  metrics.increment('bullmq.jobs.stalled', { queue: 'order-processing' });
  logger.warn({ jobId }, 'Job stalled (via QueueEvents)');
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug({ jobId, progress: data }, 'Job progress update');
});

queueEvents.on('deduplicated', ({ jobId, deduplicationId }) => {
  logger.info({ jobId, deduplicationId }, 'Job deduplicated');
});
```

### Dashboard Metrics with getJobCounts

Poll `getJobCounts()` periodically to populate monitoring dashboards.

```typescript
import { Queue } from 'bullmq';

const queue = new Queue('order-processing', { connection });

async function collectQueueMetrics() {
  const counts = await queue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused',
  );

  // Push to your metrics system
  metrics.gauge('bullmq.queue.waiting', counts.waiting, { queue: 'order-processing' });
  metrics.gauge('bullmq.queue.active', counts.active, { queue: 'order-processing' });
  metrics.gauge('bullmq.queue.completed', counts.completed, { queue: 'order-processing' });
  metrics.gauge('bullmq.queue.failed', counts.failed, { queue: 'order-processing' });
  metrics.gauge('bullmq.queue.delayed', counts.delayed, { queue: 'order-processing' });
  metrics.gauge('bullmq.queue.paused', counts.paused, { queue: 'order-processing' });

  return counts;
}

// Run every 30 seconds
setInterval(collectQueueMetrics, 30000);
```

### Periodic Cleanup

Schedule periodic cleanup of old jobs to keep Redis memory under control. This complements `removeOnComplete` and `removeOnFail` by catching any jobs that slip through.

```typescript
async function cleanupOldJobs(queue: Queue) {
  const oneHourAgo = 3600 * 1000;
  const oneDayAgo = 86400 * 1000;
  const batchSize = 500;

  const completedRemoved = await queue.clean(oneHourAgo, batchSize, 'completed');
  const failedRemoved = await queue.clean(oneDayAgo, batchSize, 'failed');

  logger.info({
    queue: queue.name,
    completedRemoved: completedRemoved.length,
    failedRemoved: failedRemoved.length,
  }, 'Queue cleanup completed');
}

// Run cleanup for all queues every hour
setInterval(async () => {
  for (const queue of allQueues) {
    await cleanupOldJobs(queue);
  }
}, 3600 * 1000);
```

### Full Lifecycle Event Reference

| Event           | Source        | Description                                      |
| --------------- | ------------- | ------------------------------------------------ |
| `waiting`       | QueueEvents   | Job added to queue, waiting for a worker          |
| `active`        | QueueEvents   | Worker picked up the job                          |
| `progress`      | QueueEvents, Worker | Job reported progress via `job.updateProgress()` |
| `completed`     | QueueEvents, Worker | Job processor returned successfully              |
| `failed`        | QueueEvents, Worker | Job processor threw an error                     |
| `stalled`       | QueueEvents, Worker | Job lock expired without renewal                 |
| `delayed`       | QueueEvents   | Job moved to delayed state                        |
| `deduplicated`  | QueueEvents   | Job was deduplicated based on deduplication ID    |
| `error`         | Worker        | Systemic worker error (connection issues, etc.)   |

---

## Quick Reference: Production Checklist

| Concern                | Recommendation                                                |
| ---------------------- | ------------------------------------------------------------- |
| Queue naming           | `domain-action` pattern                                       |
| Cleanup                | `removeOnComplete` and `removeOnFail` on every queue          |
| Retries                | Exponential backoff with jitter; 3-5 attempts                 |
| Concurrency            | 10-50 for I/O; 1-2 for CPU-bound                             |
| Rate limiting          | Worker `limiter` option; handle 429 with `RateLimitError`     |
| Connection             | Share config objects, not IORedis instances                    |
| Workers                | `maxRetriesPerRequest: null` on worker connections             |
| Stalled detection      | Tune `lockDuration` and `stalledInterval` for your workload   |
| Shutdown               | `SIGTERM`/`SIGINT` handlers calling `worker.close()`          |
| Monitoring             | `QueueEvents` for cross-worker visibility; `getJobCounts()`   |
| CPU-bound work         | Sandboxed processors (separate process file)                  |
| Periodic cleanup       | `queue.clean()` on a timer as a safety net                    |
| Error handling         | `UnrecoverableError` for non-retryable failures               |
