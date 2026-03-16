# PostgreSQL Best Practices

Comprehensive enterprise-grade reference for PostgreSQL usage in Node.js/Prisma applications. Every recommendation here is actionable and grounded in production experience.

---

## Table of Contents

1. [Schema Design](#schema-design)
2. [Indexing Strategy](#indexing-strategy)
3. [Query Optimization](#query-optimization)
4. [Connection Management](#connection-management)
5. [Transactions](#transactions)
6. [Data Integrity](#data-integrity)
7. [Performance Tuning](#performance-tuning)
8. [Security](#security)
9. [Backup and Recovery](#backup--recovery)
10. [Monitoring](#monitoring)

---

## Schema Design

### Primary Keys

Use `gen_random_uuid()` or application-generated CUIDs for primary keys. Auto-incrementing integers leak information (row count, insertion order) and create contention in distributed systems.

```sql
-- Preferred: UUID generated at the database level
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

In Prisma:

```prisma
model Employee {
  id        String   @id @default(cuid())
  email     String   @unique @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
}
```

Trade-offs to understand:

- **UUID v4**: Fully random, poor B-tree locality, causes index bloat on very large tables. Consider UUID v7 (time-ordered) when available.
- **CUID/CUID2**: Time-sortable, URL-safe, generated at the application layer. Good default for Prisma applications.
- **Auto-increment**: Still acceptable for internal tables that will never be exposed or distributed.

### Nullability

Default to `NOT NULL`. Every nullable column is a source of three-valued logic bugs. Allow `NULL` only when a value is genuinely optional or unknown at insertion time.

```sql
-- Good: explicit about what can and cannot be null
CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  total       NUMERIC(12, 2) NOT NULL,
  notes       TEXT,                              -- intentionally nullable
  shipped_at  TIMESTAMPTZ,                       -- null means "not yet shipped"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

In Prisma, an optional field maps to a nullable column:

```prisma
model Order {
  id         String    @id @default(cuid())
  customerId String    @map("customer_id")
  total      Decimal   @db.Decimal(12, 2)
  notes      String?                          // nullable
  shippedAt  DateTime? @map("shipped_at")     // nullable
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  customer Customer @relation(fields: [customerId], references: [id])
}
```

### Data Types

Choose the narrowest correct type. This affects storage, index size, and query performance.

| Use case | Correct type | Avoid |
|---|---|---|
| Short strings with known max length | `VARCHAR(255)` | `TEXT` when you know the bound |
| Arbitrary-length text | `TEXT` | `VARCHAR` without a limit (identical to TEXT but misleading) |
| Timestamps | `TIMESTAMPTZ` | `TIMESTAMP` (loses timezone info) |
| Money / financial values | `NUMERIC(precision, scale)` | `FLOAT` / `DOUBLE PRECISION` (rounding errors) |
| Boolean flags | `BOOLEAN` | `SMALLINT` or `CHAR(1)` |
| IP addresses | `INET` | `VARCHAR` |
| JSON documents | `JSONB` | `JSON` (no indexing, no equality checks) |
| Enumerated values | `CREATE TYPE ... AS ENUM` | `VARCHAR` with CHECK |

```sql
-- TIMESTAMPTZ: always stores in UTC, converts on display
CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action     VARCHAR(50) NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NUMERIC for financial data: never use FLOAT
CREATE TABLE invoices (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtotal  NUMERIC(12, 2) NOT NULL,
  tax       NUMERIC(12, 2) NOT NULL,
  total     NUMERIC(12, 2) NOT NULL GENERATED ALWAYS AS (subtotal + tax) STORED
);
```

### ENUM Types

Use PostgreSQL enums for fixed, rarely-changing value sets. They are type-safe and stored efficiently (4 bytes).

```sql
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

CREATE TABLE orders (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status order_status NOT NULL DEFAULT 'PENDING'
);

-- Adding a value (non-destructive, no table rewrite):
ALTER TYPE order_status ADD VALUE 'REFUNDED' AFTER 'CANCELLED';
```

Caveat: you cannot remove or rename enum values without recreating the type. If values change frequently, use a reference table or a `VARCHAR` with a `CHECK` constraint instead.

### CHECK Constraints

Enforce business rules at the database level. Application-level validation can be bypassed; database constraints cannot.

```sql
CREATE TABLE products (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(200) NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  sku   VARCHAR(50) NOT NULL CHECK (sku ~ '^[A-Z0-9-]+$'),
  weight_kg NUMERIC(8, 3) CHECK (weight_kg > 0)
);

-- Table-level constraint spanning multiple columns
CREATE TABLE reservations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);
```

---

## Indexing Strategy

Indexes are the single most impactful performance lever in PostgreSQL. Understand the trade-off: every index speeds reads but slows writes and consumes storage.

### B-tree (Default)

The workhorse index. Handles equality (`=`), range (`<`, `>`, `BETWEEN`), sorting (`ORDER BY`), prefix matching (`LIKE 'foo%'`), and `IN` queries.

```sql
-- Single column: accelerates WHERE, ORDER BY, JOIN on this column
CREATE INDEX idx_orders_customer_id ON orders (customer_id);

-- Composite: column order matters
-- This index supports: WHERE status = 'X' AND created_at > '...'
-- It also supports: WHERE status = 'X' (leftmost prefix)
-- It does NOT efficiently support: WHERE created_at > '...' (skips first column)
CREATE INDEX idx_orders_status_created ON orders (status, created_at);
```

In Prisma:

```prisma
model Order {
  id         String      @id @default(cuid())
  status     OrderStatus
  customerId String      @map("customer_id")
  createdAt  DateTime    @default(now()) @map("created_at") @db.Timestamptz

  @@index([customerId])
  @@index([status, createdAt])
}
```

### GIN (Generalized Inverted Index)

For JSONB queries, array containment, and full-text search. GIN indexes are larger and slower to build than B-tree, but dramatically faster for containment queries.

```sql
-- JSONB: index all keys and values
CREATE INDEX idx_audit_payload ON audit_logs USING GIN (payload);

-- Now this is fast:
SELECT * FROM audit_logs WHERE payload @> '{"userId": "abc-123"}';
SELECT * FROM audit_logs WHERE payload ? 'errorCode';

-- Full-text search with tsvector
ALTER TABLE articles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;

CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

SELECT * FROM articles WHERE search_vector @@ to_tsquery('english', 'postgresql & performance');

-- Array containment
CREATE INDEX idx_tags ON posts USING GIN (tags);
SELECT * FROM posts WHERE tags @> ARRAY['backend', 'postgresql'];
```

### GiST (Generalized Search Tree)

Best for geometric data, range types, and as an alternative to GIN for full-text search (smaller but slower).

```sql
-- Range types: useful for scheduling, availability
CREATE TABLE room_bookings (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id  UUID NOT NULL,
  duration TSTZRANGE NOT NULL,
  EXCLUDE USING GIST (room_id WITH =, duration WITH &&)
);

-- This exclusion constraint prevents overlapping bookings for the same room
INSERT INTO room_bookings (room_id, duration)
VALUES ('...', '[2026-03-12 09:00, 2026-03-12 10:00)');
```

### BRIN (Block Range Index)

Extremely compact indexes for large tables where data is physically ordered (append-only tables with timestamp columns). A BRIN index can be 1000x smaller than a B-tree.

```sql
-- Perfect for time-series or log tables where rows arrive in chronological order
CREATE INDEX idx_logs_created_brin ON application_logs USING BRIN (created_at)
  WITH (pages_per_range = 32);

-- Effective for queries like:
SELECT * FROM application_logs
WHERE created_at BETWEEN '2026-03-01' AND '2026-03-12';
```

BRIN is unsuitable for randomly ordered data. If you update or delete rows frequently, the correlation between physical order and column value degrades, making BRIN ineffective.

### Partial Indexes

Index only the rows that matter. Smaller index, faster scans, lower maintenance cost.

```sql
-- Only index active (non-deleted) records
CREATE INDEX idx_employees_active_email
  ON employees (email)
  WHERE deleted_at IS NULL;

-- Only index pending orders (the ones you actually query)
CREATE INDEX idx_orders_pending
  ON orders (created_at)
  WHERE status = 'PENDING';

-- Unique constraint only on active records
CREATE UNIQUE INDEX idx_unique_active_email
  ON employees (email)
  WHERE deleted_at IS NULL;
```

### Covering Indexes (INCLUDE)

Add non-key columns to an index so PostgreSQL can satisfy the query entirely from the index (index-only scan) without visiting the table heap.

```sql
-- The query: SELECT email, name FROM employees WHERE department_id = '...'
-- Without INCLUDE: index lookup + heap fetch for email and name
-- With INCLUDE: index-only scan
CREATE INDEX idx_employees_dept_covering
  ON employees (department_id)
  INCLUDE (email, name);
```

Use `INCLUDE` for columns that appear in `SELECT` but not in `WHERE`/`ORDER BY`. Do not include large or frequently updated columns.

### Indexing Rules of Thumb

1. **Always index foreign keys.** PostgreSQL does not auto-index them. Without an index, cascading deletes and joins perform sequential scans.
2. **Index columns in WHERE, JOIN ON, and ORDER BY clauses** that appear in frequent or slow queries.
3. **Composite index column order**: place equality conditions first, then range conditions. If you query `WHERE status = 'ACTIVE' AND created_at > '...'`, the index should be `(status, created_at)`.
4. **Do not over-index.** Each index adds overhead to INSERT, UPDATE, and DELETE. Monitor `pg_stat_user_indexes` to find unused indexes and drop them.
5. **Rebuild bloated indexes** periodically: `REINDEX INDEX CONCURRENTLY idx_name;`

---

## Query Optimization

### EXPLAIN ANALYZE

This is your primary diagnostic tool. Always use `ANALYZE` to get actual execution times, not just estimates.

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'PENDING'
  AND o.created_at > now() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 20;
```

What to look for in the output:

| Symptom | Likely cause | Fix |
|---|---|---|
| `Seq Scan` on a large table | Missing index | Add appropriate index |
| High `actual rows` vs `estimated rows` | Stale statistics | Run `ANALYZE table_name` |
| `Sort Method: external merge` | `work_mem` too low | Increase `work_mem` or add index matching ORDER BY |
| `Nested Loop` with high row count | Missing index on join column | Index the foreign key |
| `Hash Join` with large hash table | Large intermediate result | Filter earlier, add index |

### Avoid SELECT *

Select only the columns you need. This reduces I/O, network transfer, and can enable index-only scans.

```typescript
// Bad: fetches all columns
const orders = await prisma.order.findMany({
  where: { status: 'PENDING' },
});

// Good: fetches only what you need
const orders = await prisma.order.findMany({
  where: { status: 'PENDING' },
  select: { id: true, total: true, createdAt: true },
});
```

### EXISTS vs COUNT

When checking if rows exist, `EXISTS` short-circuits after finding the first match. `COUNT(*)` scans all matching rows.

```sql
-- Bad: counts ALL matching rows just to check existence
SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END
FROM orders WHERE customer_id = '...' AND status = 'PENDING';

-- Good: stops at first match
SELECT EXISTS (
  SELECT 1 FROM orders WHERE customer_id = '...' AND status = 'PENDING'
);
```

In Prisma, use `findFirst` instead of `count` for existence checks:

```typescript
// Bad
const count = await prisma.order.count({
  where: { customerId, status: 'PENDING' },
});
const exists = count > 0;

// Good
const exists = await prisma.order.findFirst({
  where: { customerId, status: 'PENDING' },
  select: { id: true },
});
const hasPending = exists !== null;
```

### ANY vs Multiple OR

Replace chains of OR conditions with `ANY(ARRAY[...])` for cleaner queries and sometimes better plans.

```sql
-- Instead of:
SELECT * FROM products WHERE category = 'A' OR category = 'B' OR category = 'C';

-- Use:
SELECT * FROM products WHERE category = ANY(ARRAY['A', 'B', 'C']);
```

Prisma handles this with `in`:

```typescript
const products = await prisma.product.findMany({
  where: { category: { in: ['A', 'B', 'C'] } },
});
```

### Batch Operations

Insert multiple rows in a single statement. Each individual INSERT has overhead (parsing, planning, WAL, network round-trip).

```sql
-- Bad: N separate INSERT statements
INSERT INTO events (type, payload) VALUES ('click', '{}');
INSERT INTO events (type, payload) VALUES ('view', '{}');

-- Good: single multi-row INSERT
INSERT INTO events (type, payload) VALUES
  ('click', '{}'),
  ('view', '{}'),
  ('scroll', '{}');
```

In Prisma:

```typescript
await prisma.event.createMany({
  data: [
    { type: 'click', payload: {} },
    { type: 'view', payload: {} },
    { type: 'scroll', payload: {} },
  ],
  skipDuplicates: true,
});
```

### CTEs (Common Table Expressions)

CTEs improve readability for complex queries. Since PostgreSQL 12, the optimizer can inline non-recursive CTEs, so they are no longer optimization fences by default.

```sql
WITH recent_orders AS (
  SELECT id, customer_id, total, created_at
  FROM orders
  WHERE created_at > now() - INTERVAL '30 days'
),
customer_totals AS (
  SELECT customer_id, SUM(total) AS total_spent, COUNT(*) AS order_count
  FROM recent_orders
  GROUP BY customer_id
)
SELECT c.name, ct.total_spent, ct.order_count
FROM customer_totals ct
JOIN customers c ON c.id = ct.customer_id
WHERE ct.total_spent > 1000
ORDER BY ct.total_spent DESC;
```

If you need to force materialization (prevent inlining), use `AS MATERIALIZED`:

```sql
WITH heavy_computation AS MATERIALIZED (
  SELECT ...
)
SELECT * FROM heavy_computation WHERE ...;
```

---

## Connection Management

### Connection Pooling Is Mandatory

Each PostgreSQL connection consumes roughly 5-10 MB of RAM. Without pooling, a Node.js application under load will exhaust `max_connections` (default: 100) and crash.

**Option 1: Prisma connection pool (built-in)**

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10"
```

**Option 2: PgBouncer (external pooler)**

Recommended for production. Sits between your application and PostgreSQL, multiplexing hundreds of application connections over a small number of database connections.

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction        ; release connection after each transaction
max_client_conn = 400
default_pool_size = 20
reserve_pool_size = 5
reserve_pool_timeout = 3
```

Use `transaction` pool mode with Prisma. Session mode is required only if you use prepared statements or session-level features (advisory locks, temp tables).

### Pool Sizing

The optimal pool size is smaller than most developers expect. More connections means more CPU context switching and lock contention.

```
pool_size = (2 * CPU_cores) + effective_spindle_count
```

For a 4-core server with SSDs: `(2 * 4) + 1 = 9`. Round up to 10. For a container with 2 vCPUs: 5-7 connections.

Do not set the pool size to 50 or 100 "just in case." A pool of 10-20 connections can handle thousands of requests per second if queries are fast.

### Timeouts

Set timeouts to prevent a single bad query from consuming a connection forever.

```sql
-- Kill queries running longer than 30 seconds
ALTER DATABASE mydb SET statement_timeout = '30s';

-- Kill idle transactions after 60 seconds
ALTER DATABASE mydb SET idle_in_transaction_session_timeout = '60s';

-- Per-session override for a known long-running operation
SET LOCAL statement_timeout = '5min';
```

In Prisma, you cannot set per-query timeouts natively. Use `$queryRaw` with `SET LOCAL` if you need them, or set database-level defaults.

---

## Transactions

### Isolation Levels

PostgreSQL supports four isolation levels. Use the lowest level that meets your requirements.

| Level | Dirty reads | Non-repeatable reads | Phantom reads | Use case |
|---|---|---|---|---|
| READ COMMITTED (default) | No | Possible | Possible | Most CRUD operations |
| REPEATABLE READ | No | No | No (in PG) | Reports, analytics queries |
| SERIALIZABLE | No | No | No | Financial transactions, inventory |

```typescript
// Default: READ COMMITTED
await prisma.$transaction(async (tx) => {
  const account = await tx.account.findUnique({ where: { id: fromId } });
  // Another transaction could modify this account between reads
});

// SERIALIZABLE: for financial operations
await prisma.$transaction(
  async (tx) => {
    const from = await tx.account.findUniqueOrThrow({ where: { id: fromId } });
    const to = await tx.account.findUniqueOrThrow({ where: { id: toId } });

    if (from.balance.lessThan(amount)) {
      throw new Error('Insufficient funds');
    }

    await tx.account.update({ where: { id: fromId }, data: { balance: { decrement: amount } } });
    await tx.account.update({ where: { id: toId }, data: { balance: { increment: amount } } });
  },
  { isolationLevel: 'Serializable' }
);
```

With SERIALIZABLE, PostgreSQL may abort transactions due to serialization conflicts. Your application must be prepared to retry.

### Keep Transactions Short

A transaction holds locks and a database connection for its entire duration. Long transactions cause:

- Lock contention and deadlocks
- Connection pool exhaustion
- WAL bloat (prevents cleanup of old row versions)
- Replication lag

```typescript
// BAD: HTTP call inside a transaction
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await fetch('https://payment-api.example.com/charge', { ... }); // holds connection for seconds
  await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
});

// GOOD: external I/O outside the transaction
const order = await prisma.order.create({ data: { ...orderData, status: 'PENDING' } });
const paymentResult = await fetch('https://payment-api.example.com/charge', { ... });

if (paymentResult.ok) {
  await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
} else {
  await prisma.order.update({ where: { id: order.id }, data: { status: 'PAYMENT_FAILED' } });
}
```

### Advisory Locks

For application-level mutual exclusion without row-level locking. Useful for preventing duplicate processing of jobs or events.

```sql
-- Acquire a lock (blocks until available)
SELECT pg_advisory_lock(hashtext('process-order-123'));

-- ... do work ...

-- Release the lock
SELECT pg_advisory_unlock(hashtext('process-order-123'));

-- Try to acquire without blocking (returns boolean)
SELECT pg_try_advisory_lock(hashtext('process-order-123'));
```

In a Prisma application:

```typescript
const lockId = hashCode('process-order-' + orderId);

const [{ pg_try_advisory_lock: acquired }] = await prisma.$queryRaw<
  [{ pg_try_advisory_lock: boolean }]
>`SELECT pg_try_advisory_lock(${lockId})`;

if (!acquired) {
  throw new Error('Order is already being processed');
}

try {
  // ... process the order ...
} finally {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(${lockId})`;
}
```

### Deadlock Prevention

Deadlocks occur when two transactions wait for each other's locks. Prevent them by always acquiring locks in a consistent order.

```typescript
// BAD: inconsistent lock order leads to deadlocks
// Transaction 1: locks account A, then B
// Transaction 2: locks account B, then A

// GOOD: always lock in ID order
const [firstId, secondId] = [fromId, toId].sort();

await prisma.$transaction(async (tx) => {
  await tx.account.update({ where: { id: firstId }, data: { ... } });
  await tx.account.update({ where: { id: secondId }, data: { ... } });
});
```

---

## Data Integrity

### Foreign Key Constraints

Every relationship must have a foreign key constraint. Choose the `ON DELETE` behavior carefully.

```sql
-- CASCADE: delete children when parent is deleted (audit logs, line items)
CREATE TABLE order_items (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ...
);

-- SET NULL: preserve the child, clear the reference (optional relationships)
CREATE TABLE employees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ...
);

-- RESTRICT (default): prevent parent deletion if children exist (critical references)
CREATE TABLE payments (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  ...
);
```

In Prisma:

```prisma
model OrderItem {
  id      String @id @default(cuid())
  orderId String @map("order_id")
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
}
```

### Unique Constraints

Enforce uniqueness at the database level, not just the application level.

```sql
-- Simple unique
ALTER TABLE employees ADD CONSTRAINT uq_employees_email UNIQUE (email);

-- Composite unique (business rule: one review per user per product)
ALTER TABLE reviews ADD CONSTRAINT uq_reviews_user_product
  UNIQUE (user_id, product_id);
```

In Prisma:

```prisma
model Review {
  id        String @id @default(cuid())
  userId    String @map("user_id")
  productId String @map("product_id")

  @@unique([userId, productId])
}
```

### Exclusion Constraints

Prevent overlapping ranges. More powerful than unique constraints.

```sql
-- Requires btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping shifts for the same employee
CREATE TABLE shifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  duration    TSTZRANGE NOT NULL,
  EXCLUDE USING GIST (employee_id WITH =, duration WITH &&)
);
```

### CHECK Constraints for Validation

```sql
-- Email format (basic)
ALTER TABLE users ADD CONSTRAINT chk_users_email
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Percentage between 0 and 100
ALTER TABLE discounts ADD CONSTRAINT chk_discounts_percentage
  CHECK (percentage >= 0 AND percentage <= 100);

-- At least one contact method
ALTER TABLE contacts ADD CONSTRAINT chk_contacts_has_contact
  CHECK (phone IS NOT NULL OR email IS NOT NULL);
```

---

## Performance Tuning

### Memory Configuration

These settings have the largest impact on query performance. Tune them based on available RAM.

```ini
# postgresql.conf -- for a server with 16 GB RAM

# Shared buffer cache: 25% of system RAM
shared_buffers = 4GB

# Planner's estimate of OS cache: 50-75% of RAM
effective_cache_size = 12GB

# Per-operation memory for sorts, hash joins, hash aggregates
# Be careful: this is per-sort, and a single query can have multiple sorts
work_mem = 64MB

# Memory for VACUUM, CREATE INDEX, ALTER TABLE ADD FK
maintenance_work_mem = 1GB

# WAL configuration
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB
```

### SSD Tuning

If your storage is SSD (which it should be for any production database), lower the random page cost so the planner favors index scans over sequential scans.

```ini
# Default is 4.0 (calibrated for spinning disks)
# For SSDs, random reads are nearly as fast as sequential reads
random_page_cost = 1.1

# Also adjust effective_io_concurrency for SSDs
effective_io_concurrency = 200
```

### Autovacuum Tuning

Autovacuum reclaims dead rows and updates planner statistics. It must be running. If it falls behind, tables bloat, indexes degrade, and queries slow down.

```ini
# Defaults are conservative. For write-heavy workloads, tune these:
autovacuum_max_workers = 4                    # default: 3
autovacuum_naptime = 30s                      # default: 1min (how often to check)
autovacuum_vacuum_cost_limit = 1000           # default: 200 (how aggressively to vacuum)
autovacuum_vacuum_scale_factor = 0.05         # default: 0.2 (vacuum after 5% dead rows)
autovacuum_analyze_scale_factor = 0.02        # default: 0.1 (analyze after 2% changed rows)
```

For individual high-churn tables, set per-table autovacuum parameters:

```sql
ALTER TABLE events SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 10
);
```

### Table Partitioning

For tables exceeding tens of millions of rows, partitioning improves query performance by allowing PostgreSQL to skip entire partitions (partition pruning).

```sql
-- Range partitioning by date (most common)
CREATE TABLE events (
  id         UUID NOT NULL DEFAULT gen_random_uuid(),
  type       VARCHAR(50) NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE events_2026_01 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE events_2026_02 PARTITION OF events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE events_2026_03 PARTITION OF events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Indexes are created per partition
CREATE INDEX idx_events_2026_03_type ON events_2026_03 (type);

-- Or create an index on the parent (PostgreSQL 11+ creates it on all partitions)
CREATE INDEX idx_events_type ON events (type);

-- Queries automatically prune partitions:
SELECT * FROM events WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01';
-- Only scans events_2026_03
```

Automate partition creation with `pg_partman` or a cron job. Do not partition tables under a few million rows; the overhead is not worth it.

---

## Security

### Parameterized Queries

SQL injection is the most common and dangerous database vulnerability. Never interpolate user input into SQL strings.

```typescript
// BAD: SQL injection vulnerability
const users = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = '${userInput}'`
);

// GOOD: parameterized query (Prisma tagged template)
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

Prisma's standard query methods (`findMany`, `create`, etc.) always use parameterized queries. SQL injection is only a risk when using `$queryRawUnsafe` or `$executeRawUnsafe`.

### Principle of Least Privilege

Create separate database roles for different purposes. Your application should never connect as a superuser.

```sql
-- Application role: can read/write data but not modify schema
CREATE ROLE app_user WITH LOGIN PASSWORD 'strong-password-here';
GRANT CONNECT ON DATABASE mydb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Migration role: can modify schema (used by Prisma migrate only)
CREATE ROLE migration_user WITH LOGIN PASSWORD 'different-strong-password';
GRANT ALL PRIVILEGES ON DATABASE mydb TO migration_user;

-- Read-only role: for reporting, dashboards
CREATE ROLE readonly_user WITH LOGIN PASSWORD 'another-password';
GRANT CONNECT ON DATABASE mydb TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO readonly_user;
```

### Row-Level Security (RLS)

For multi-tenant applications, RLS ensures that queries can only access rows belonging to the current tenant. Even a bug in your application code cannot leak data across tenants.

```sql
-- Enable RLS on the table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create a policy: users can only see their organization's projects
CREATE POLICY tenant_isolation ON projects
  USING (organization_id = current_setting('app.current_org_id')::UUID);

-- Force RLS even for table owners (important!)
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
```

Set the tenant context at the beginning of each request:

```typescript
// In a Fastify hook or middleware
app.addHook('preHandler', async (request, reply) => {
  const orgId = request.user.organizationId;
  await prisma.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;
});
```

Note: RLS with Prisma requires careful session management. With connection pooling (especially PgBouncer in transaction mode), `set_config` with `is_local = true` scopes the setting to the current transaction only.

### SSL/TLS Connections

Always encrypt database connections in production.

```
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&sslcert=/path/to/client-cert.pem&sslkey=/path/to/client-key.pem&sslrootcert=/path/to/ca-cert.pem"
```

Minimum for production: `sslmode=require`. For maximum security: `sslmode=verify-full`.

---

## Backup and Recovery

### Logical Backups with pg_dump

For databases under 100 GB. Produces SQL or custom-format dumps that can be restored selectively.

```bash
# Custom format (compressed, supports parallel restore)
pg_dump -Fc -j 4 -f /backups/mydb_$(date +%Y%m%d_%H%M%S).dump mydb

# Restore (parallel)
pg_restore -d mydb -j 4 --clean --if-exists /backups/mydb_20260312.dump

# Dump specific tables only
pg_dump -Fc -t orders -t order_items -f /backups/orders.dump mydb

# Schema only (useful for documentation or migration verification)
pg_dump --schema-only -f /backups/schema.sql mydb
```

### WAL Archiving for Point-in-Time Recovery (PITR)

For production databases of any size. Combines a base backup with continuous WAL archiving to recover to any point in time.

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/wal/%f'
```

```bash
# Take a base backup
pg_basebackup -D /backups/base -Ft -z -P

# To recover to a specific point in time:
# 1. Restore the base backup
# 2. Create recovery.signal
# 3. Set restore_command and recovery_target_time in postgresql.conf
restore_command = 'cp /archive/wal/%f %p'
recovery_target_time = '2026-03-12 14:30:00+00'
```

### Backup Verification

A backup that has never been tested is not a backup. Automate restore testing.

```bash
# Weekly automated restore test (run in CI or a dedicated environment)
#!/bin/bash
set -euo pipefail

BACKUP_FILE=$(ls -t /backups/*.dump | head -1)
TEST_DB="restore_test_$(date +%s)"

createdb "$TEST_DB"
pg_restore -d "$TEST_DB" --no-owner "$BACKUP_FILE"

# Verify critical tables have data
psql -d "$TEST_DB" -c "SELECT COUNT(*) FROM customers;" | grep -q '[1-9]'
psql -d "$TEST_DB" -c "SELECT COUNT(*) FROM orders;" | grep -q '[1-9]'

dropdb "$TEST_DB"
echo "Backup verification passed: $BACKUP_FILE"
```

### Replicas

Use streaming replication for high availability and read scaling.

```ini
# Primary server
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1GB

# Replica (set up with pg_basebackup)
primary_conninfo = 'host=primary-host port=5432 user=replicator password=...'
hot_standby = on
```

Direct read-heavy queries (reports, dashboards, search) to replicas to reduce load on the primary.

---

## Monitoring

### Essential Views

```sql
-- Active connections and their state
SELECT pid, state, query, age(clock_timestamp(), query_start) AS duration,
       wait_event_type, wait_event
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Table-level statistics: dead rows, last vacuum, last analyze
SELECT schemaname, relname,
       n_live_tup, n_dead_tup,
       ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) AS dead_pct,
       last_vacuum, last_autovacuum,
       last_analyze, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Index usage: find unused indexes (candidates for removal)
SELECT schemaname, relname, indexrelname,
       idx_scan, idx_tup_read, idx_tup_fetch,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Table and index sizes
SELECT relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
       pg_size_pretty(pg_relation_size(relid)) AS table_size,
       pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

### pg_stat_statements

The single most valuable extension for query performance analysis. It tracks execution statistics for all SQL statements.

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top queries by total time (the most impactful to optimize)
SELECT
  queryid,
  LEFT(query, 100) AS query_preview,
  calls,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Queries with high variance (inconsistent performance)
SELECT
  LEFT(query, 100) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(min_exec_time::numeric, 2) AS min_ms,
  ROUND(max_exec_time::numeric, 2) AS max_ms,
  ROUND(stddev_exec_time::numeric, 2) AS stddev_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY stddev_exec_time DESC
LIMIT 20;

-- Reset statistics periodically to keep data relevant
SELECT pg_stat_statements_reset();
```

### Long-Running Query Detection

```sql
-- Find queries running longer than 5 minutes
SELECT pid, age(clock_timestamp(), query_start) AS duration,
       usename, query, state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - INTERVAL '5 minutes'
ORDER BY query_start;

-- Terminate a specific long-running query (graceful)
SELECT pg_cancel_backend(pid);

-- Force-kill if pg_cancel_backend does not work
SELECT pg_terminate_backend(pid);
```

### Bloat Monitoring

Table and index bloat occurs when dead rows accumulate faster than autovacuum can clean them. This wastes storage, degrades cache efficiency, and slows queries.

```sql
-- Estimate table bloat
SELECT
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS bloat_pct,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

If bloat exceeds 20-30%, investigate why autovacuum is falling behind. Common causes:

- Autovacuum settings too conservative (see Performance Tuning section)
- Long-running transactions preventing dead row cleanup
- Heavy write workload overwhelming the vacuum workers

For severe bloat, use `pg_repack` to reclaim space without locking the table:

```bash
# Requires pg_repack extension
pg_repack -d mydb -t bloated_table
```

### Automated Monitoring Checklist

Set up alerts for these conditions:

| Metric | Warning threshold | Critical threshold |
|---|---|---|
| Active connections | 80% of max_connections | 90% of max_connections |
| Long-running queries | > 5 minutes | > 30 minutes |
| Dead tuples ratio | > 10% | > 30% |
| Replication lag | > 1 minute | > 10 minutes |
| Disk usage | > 70% | > 85% |
| Cache hit ratio | < 99% | < 95% |
| Transaction ID wraparound | 50% of limit | 75% of limit |

Check your cache hit ratio (should be 99%+ for OLTP workloads):

```sql
SELECT
  sum(heap_blks_read) AS heap_read,
  sum(heap_blks_hit) AS heap_hit,
  ROUND(sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100, 2)
    AS cache_hit_ratio
FROM pg_statio_user_tables;
```

---

## Summary of Rules

1. Use `TIMESTAMPTZ`, never `TIMESTAMP`.
2. Use `NUMERIC` for money, never `FLOAT`.
3. Default to `NOT NULL`.
4. Always index foreign keys.
5. Use `EXPLAIN ANALYZE` before and after adding indexes.
6. Connection pool size should be small (5-20), not large.
7. Keep transactions short -- no external I/O inside transactions.
8. Use parameterized queries exclusively.
9. Set `statement_timeout` and `idle_in_transaction_session_timeout`.
10. Enable `pg_stat_statements` on every database.
11. Test your backups. An untested backup is not a backup.
12. Monitor dead tuples, cache hit ratio, and long-running queries.
