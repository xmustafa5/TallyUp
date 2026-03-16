# Prisma ORM Best Practices

Enterprise-grade reference for using Prisma ORM with TypeScript, Fastify, and PostgreSQL in a DDD + Hexagonal Architecture codebase.

---

## Table of Contents

1. [Schema Design](#schema-design)
2. [Client Usage and Singleton](#client-usage-and-singleton)
3. [Querying](#querying)
4. [Transactions](#transactions)
5. [Error Handling](#error-handling)
6. [Performance](#performance)
7. [Migrations](#migrations)
8. [Security](#security)
9. [Repository Pattern](#repository-pattern)

---

## Schema Design

### Model Naming and Mapping

Use PascalCase for model names that reflect your domain language. Map to snake_case table and column names in the database for PostgreSQL conventions.

```prisma
model Employee {
  id           String    @id @default(uuid()) @db.Uuid
  employeeCode String    @unique @map("employee_code") @db.VarChar(20)
  firstName    String    @map("first_name") @db.VarChar(100)
  lastName     String    @map("last_name") @db.VarChar(100)
  email        String    @unique @db.VarChar(255)
  hireDate     DateTime  @map("hire_date") @db.Date
  terminatedAt DateTime? @map("terminated_at") @db.Timestamptz
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  departmentId String     @map("department_id") @db.Uuid
  department   Department @relation(fields: [departmentId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([departmentId])
  @@index([email])
  @@index([deletedAt])
  @@map("employees")
}
```

### Primary Keys

Use `cuid()` or `uuid()` for primary keys. Never use auto-increment integers in distributed systems -- they create coordination bottlenecks and expose record counts.

```prisma
// Preferred: UUID for PostgreSQL
id String @id @default(uuid()) @db.Uuid

// Alternative: CUID for globally unique, sortable IDs
id String @id @default(cuid())
```

### Natural Identifiers with @unique

Apply `@unique` to business-meaningful fields that serve as natural identifiers. These fields are what humans use to look up records.

```prisma
model Organization {
  id   String @id @default(uuid()) @db.Uuid
  slug String @unique @db.VarChar(100)  // URL-friendly identifier
  code String @unique @db.VarChar(20)   // Internal business code
  name String @db.VarChar(255)

  @@map("organizations")
}
```

### Explicit Relations

Always define `onDelete` and `onUpdate` behavior. Never rely on defaults -- make referential integrity rules explicit.

```prisma
model Order {
  id         String   @id @default(uuid()) @db.Uuid
  orderNumber String  @unique @map("order_number") @db.VarChar(30)
  status     OrderStatus @default(DRAFT)
  totalAmount Decimal @map("total_amount") @db.Decimal(12, 2)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz

  customerId String   @map("customer_id") @db.Uuid
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  items OrderItem[]

  @@index([customerId])
  @@index([status])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(uuid()) @db.Uuid
  quantity  Int
  unitPrice Decimal @map("unit_price") @db.Decimal(10, 2)

  orderId   String  @map("order_id") @db.Uuid
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade, onUpdate: Cascade)

  productId String  @map("product_id") @db.Uuid
  product   Product @relation(fields: [productId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}
```

Use these referential actions deliberately:

| Action     | When to Use                                             |
| ---------- | ------------------------------------------------------- |
| `Cascade`  | Child records are meaningless without the parent        |
| `Restrict` | Prevent deletion when related records exist             |
| `SetNull`  | Allow orphaned records (requires nullable FK)           |
| `NoAction` | Handle constraint violations in application code        |

### Compound Uniqueness

Use `@@unique` for multi-column uniqueness constraints that enforce business rules at the database level.

```prisma
model TeamMembership {
  id     String @id @default(uuid()) @db.Uuid
  role   String @db.VarChar(50)

  userId String @map("user_id") @db.Uuid
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  teamId String @map("team_id") @db.Uuid
  team   Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([userId, teamId])
  @@index([teamId])
  @@map("team_memberships")
}
```

### Indexing Strategy

Index every foreign key column and every field used frequently in `WHERE` or `ORDER BY` clauses. Use composite indexes for queries that filter on multiple columns together.

```prisma
model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  action     String   @db.VarChar(50)
  entityType String   @map("entity_type") @db.VarChar(100)
  entityId   String   @map("entity_id") @db.Uuid
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  userId     String   @map("user_id") @db.Uuid
  user       User     @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([action, createdAt])
  @@map("audit_logs")
}
```

### Soft Delete Pattern

Add a `deletedAt` field for soft deletes. Filter on this field in every query at the repository layer, not in individual route handlers.

```prisma
model Customer {
  id        String    @id @default(uuid()) @db.Uuid
  name      String    @db.VarChar(255)
  email     String    @unique @db.VarChar(255)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  @@index([deletedAt])
  @@map("customers")
}
```

### Enum Types

Use Prisma enums for fixed sets of values that are unlikely to change frequently. If the set changes often or is user-configurable, use a lookup table instead.

```prisma
enum OrderStatus {
  DRAFT
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

enum UserRole {
  ADMIN
  MANAGER
  EMPLOYEE
  VIEWER
}
```

### Native Type Decorators

Always use native type decorators to control the exact database column type. This prevents oversized columns and improves query performance.

```prisma
model Product {
  id          String  @id @default(uuid()) @db.Uuid
  sku         String  @unique @db.VarChar(50)
  name        String  @db.VarChar(255)
  description String? @db.Text                    // Unbounded text
  price       Decimal @db.Decimal(10, 2)           // Exact decimal math
  weight      Float?  @db.DoublePrecision          // Approximate floating point
  isActive    Boolean @default(true) @map("is_active")
  metadata    Json?                                // JSONB in PostgreSQL
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("products")
}
```

---

## Client Usage and Singleton

### Single Global PrismaClient

Never create a PrismaClient instance per request. Each instance opens its own connection pool, and doing so per request will exhaust your database connections within seconds under load.

```typescript
// BAD -- creates a new pool on every request
app.get('/users', async () => {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany();
  await prisma.$disconnect();
  return users;
});
```

### Fastify Plugin Pattern

Register Prisma as a Fastify plugin that decorates the server instance. This guarantees a single client throughout the application lifecycle, with proper cleanup on shutdown.

```typescript
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(
  async (fastify) => {
    const prisma = new PrismaClient({
      log:
        fastify.config.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'error' },
              { emit: 'stdout', level: 'warn' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });

    await prisma.$connect();
    fastify.log.info('Prisma client connected to database');

    // Attach query logging in development
    if (fastify.config.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        if (e.duration > 100) {
          fastify.log.warn(
            { duration: e.duration, query: e.query },
            'Slow query detected',
          );
        }
      });
    }

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async () => {
      await prisma.$disconnect();
      fastify.log.info('Prisma client disconnected');
    });
  },
  { name: 'prisma-plugin' },
);
```

### Select vs Include

Use `select` when you need a subset of fields. Use `include` when you need all scalar fields plus related records. Never combine `select` and `include` on the same query -- Prisma will throw a validation error.

```typescript
// GOOD -- select only what you need for a list view
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
  },
});

// GOOD -- include related data when you need full records
const userWithOrders = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    orders: {
      where: { status: 'CONFIRMED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
});

// GOOD -- nested select within include for surgical data fetching
const userWithOrderSummaries = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    orders: {
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
      },
    },
  },
});

// BAD -- select and include cannot be used together at the same level
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { email: true },
  include: { orders: true }, // Prisma throws PrismaClientValidationError
});
```

---

## Querying

### Existence Assertions

Use `findUniqueOrThrow` and `findFirstOrThrow` when the record must exist. These throw `PrismaClientKnownRequestError` with code `P2025` if the record is not found, eliminating manual null checks.

```typescript
// When a missing record is an error condition
const user = await prisma.user.findUniqueOrThrow({
  where: { id: userId },
});

// When you need the first match and absence is an error
const activeSubscription = await prisma.subscription.findFirstOrThrow({
  where: {
    userId,
    status: 'ACTIVE',
    expiresAt: { gt: new Date() },
  },
});
```

Use `findUnique` (returning `null`) when the caller needs to handle the "not found" case with custom logic.

```typescript
// When absence is a valid state, not an error
const existingUser = await prisma.user.findUnique({
  where: { email: input.email },
});

if (existingUser) {
  throw new ConflictError('A user with this email already exists');
}
```

### Cursor-Based Pagination

Use cursor-based pagination for large datasets. Offset-based pagination (`skip`) degrades as the offset grows because the database still scans all skipped rows.

```typescript
interface CursorPaginationParams {
  cursor?: string;
  take: number;
}

interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

async function getOrdersPaginated(
  prisma: PrismaClient,
  params: CursorPaginationParams,
): Promise<CursorPaginatedResult<Order>> {
  const { cursor, take } = params;

  const orders = await prisma.order.findMany({
    take: take + 1, // Fetch one extra to determine if there are more
    ...(cursor
      ? {
          skip: 1, // Skip the cursor record itself
          cursor: { id: cursor },
        }
      : {}),
    orderBy: { createdAt: 'desc' },
    where: { deletedAt: null },
  });

  const hasMore = orders.length > take;
  const data = hasMore ? orders.slice(0, take) : orders;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor, hasMore };
}
```

For simpler use cases where total counts matter (admin dashboards, small datasets), offset pagination is acceptable:

```typescript
interface OffsetPaginationParams {
  page: number;
  pageSize: number;
}

interface OffsetPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function getUsersPaginated(
  prisma: PrismaClient,
  params: OffsetPaginationParams,
): Promise<OffsetPaginatedResult<User>> {
  const { page, pageSize } = params;

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({
      where: { deletedAt: null },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

### Avoiding N+1 Queries

The N+1 problem occurs when you fetch a list and then make a separate query for each item's relations. Use `include` or nested `select` to load related data in a single query.

```typescript
// BAD -- N+1: one query for orders, then one query per order for items
const orders = await prisma.order.findMany();
for (const order of orders) {
  const items = await prisma.orderItem.findMany({
    where: { orderId: order.id },
  });
  order.items = items;
}

// GOOD -- single query with included relations
const orders = await prisma.order.findMany({
  include: {
    items: {
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    },
    customer: {
      select: { id: true, name: true, email: true },
    },
  },
});
```

### Distinct Results

Use `distinct` to retrieve unique combinations without post-processing in application code.

```typescript
// Get unique cities where we have active customers
const cities = await prisma.customer.findMany({
  where: { deletedAt: null },
  distinct: ['city'],
  select: { city: true, country: true },
  orderBy: { city: 'asc' },
});
```

### Batch Operations

Use `createMany`, `updateMany`, and `deleteMany` for bulk operations. These execute as a single SQL statement, avoiding per-record round trips.

```typescript
// Bulk insert
await prisma.auditLog.createMany({
  data: events.map((event) => ({
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    userId: event.userId,
    metadata: event.metadata,
  })),
  skipDuplicates: true, // Ignore rows that violate unique constraints
});

// Bulk update
await prisma.notification.updateMany({
  where: {
    userId,
    readAt: null,
  },
  data: {
    readAt: new Date(),
  },
});

// Bulk soft delete
await prisma.session.updateMany({
  where: {
    userId,
    expiresAt: { lt: new Date() },
  },
  data: {
    deletedAt: new Date(),
  },
});
```

### Filtering Patterns

```typescript
// Dynamic filter building
interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

function buildUserWhereClause(filters: UserFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    deletedAt: null, // Always exclude soft-deleted records
  };

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.createdAfter || filters.createdBefore) {
    where.createdAt = {};
    if (filters.createdAfter) where.createdAt.gte = filters.createdAfter;
    if (filters.createdBefore) where.createdAt.lte = filters.createdBefore;
  }

  return where;
}
```

---

## Transactions

### Array Transactions (Batched)

Use array-style transactions when operations are independent and you want them to succeed or fail together atomically. Prisma executes these in a single database transaction.

```typescript
// Independent operations that must be atomic
const [user, welcomeNotification, auditEntry] = await prisma.$transaction([
  prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'EMPLOYEE',
    },
  }),
  prisma.notification.create({
    data: {
      type: 'WELCOME',
      title: 'Welcome to the platform',
      userId: undefined as unknown as string, // See interactive tx below for dependent ops
    },
  }),
  prisma.auditLog.create({
    data: {
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: undefined as unknown as string,
      userId: 'SYSTEM',
    },
  }),
]);
```

Note: Array transactions cannot reference results from other operations in the batch. When queries depend on each other, use interactive transactions.

### Interactive Transactions

Use interactive transactions when subsequent queries depend on the results of earlier ones.

```typescript
// Transfer funds between accounts -- operations depend on each other
async function transferFunds(
  prisma: PrismaClient,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // 1. Check source account balance
      const source = await tx.account.findUniqueOrThrow({
        where: { id: fromAccountId },
      });

      if (source.balance.toNumber() < amount) {
        throw new InsufficientFundsError(
          `Account ${fromAccountId} has insufficient funds`,
        );
      }

      // 2. Debit source account
      await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } },
      });

      // 3. Credit destination account
      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } },
      });

      // 4. Record the transfer
      await tx.transfer.create({
        data: {
          fromAccountId,
          toAccountId,
          amount,
          status: 'COMPLETED',
        },
      });
    },
    {
      maxWait: 5000,  // Max time to wait for a connection from the pool
      timeout: 10000, // Max time the transaction can run
    },
  );
}
```

### Optimistic Concurrency Control

Use a `version` field to detect concurrent modifications. This prevents lost updates without holding database locks.

```prisma
model Inventory {
  id        String   @id @default(uuid()) @db.Uuid
  productId String   @unique @map("product_id") @db.Uuid
  quantity  Int
  version   Int      @default(0)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("inventory")
}
```

```typescript
async function decrementStock(
  prisma: PrismaClient,
  productId: string,
  quantity: number,
  maxRetries: number = 3,
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: { productId },
    });

    if (inventory.quantity < quantity) {
      throw new InsufficientStockError(
        `Product ${productId} has only ${inventory.quantity} units in stock`,
      );
    }

    const updated = await prisma.inventory.updateMany({
      where: {
        productId,
        version: inventory.version, // Only update if version matches
      },
      data: {
        quantity: { decrement: quantity },
        version: { increment: 1 },
      },
    });

    if (updated.count > 0) {
      return; // Success -- our update was applied
    }

    // Another process modified this record; retry
    if (attempt === maxRetries - 1) {
      throw new ConcurrencyError(
        `Failed to update inventory for product ${productId} after ${maxRetries} attempts`,
      );
    }
  }
}
```

---

## Error Handling

### Prisma Error Types

Prisma throws specific error classes. Handle them in a centralized error handler rather than in every route.

```typescript
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
  PrismaClientInitializationError,
} from '@prisma/client/runtime/library';

interface MappedError {
  statusCode: number;
  message: string;
  code: string;
}

function mapPrismaError(error: unknown): MappedError | null {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const fields = (error.meta?.target as string[]) ?? ['unknown'];
        return {
          statusCode: 409,
          message: `A record with this ${fields.join(', ')} already exists`,
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
        };
      }

      case 'P2025':
        return {
          statusCode: 404,
          message: 'The requested record was not found',
          code: 'RECORD_NOT_FOUND',
        };

      case 'P2003': {
        const field = (error.meta?.field_name as string) ?? 'unknown';
        return {
          statusCode: 422,
          message: `Related record not found for field: ${field}`,
          code: 'FOREIGN_KEY_VIOLATION',
        };
      }

      case 'P2034':
        return {
          statusCode: 409,
          message: 'Transaction conflict. Please retry the operation',
          code: 'TRANSACTION_CONFLICT',
        };

      default:
        return {
          statusCode: 500,
          message: 'An unexpected database error occurred',
          code: 'DATABASE_ERROR',
        };
    }
  }

  if (error instanceof PrismaClientValidationError) {
    return {
      statusCode: 400,
      message: 'Invalid query parameters',
      code: 'VALIDATION_ERROR',
    };
  }

  if (error instanceof PrismaClientInitializationError) {
    return {
      statusCode: 503,
      message: 'Database service is unavailable',
      code: 'SERVICE_UNAVAILABLE',
    };
  }

  return null;
}
```

### Fastify Error Handler Integration

Wire the Prisma error mapper into a Fastify error handler plugin.

```typescript
import fp from 'fastify-plugin';

export default fp(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    const mappedError = mapPrismaError(error);

    if (mappedError) {
      request.log.warn(
        { err: error, statusCode: mappedError.statusCode },
        mappedError.message,
      );

      return reply.status(mappedError.statusCode).send({
        statusCode: mappedError.statusCode,
        error: mappedError.code,
        message: mappedError.message,
      });
    }

    // Fall through to default Fastify error handling for non-Prisma errors
    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      statusCode: 500,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });
});
```

---

## Performance

### Connection Pool Sizing

Configure the connection pool in your `DATABASE_URL`. The default pool size is `num_physical_cpus * 2 + 1`. For serverless or containerized deployments, set it explicitly.

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30"
```

General guidance:
- For a single application server: `connection_limit = (available_connections / number_of_app_instances)`
- Never exceed the PostgreSQL `max_connections` setting across all clients
- In Docker, set this based on expected concurrency, not CPU count (containers often report host CPU count)

### Slow Query Logging

Add query event listeners to detect performance issues during development and staging.

```typescript
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

prisma.$on('query', (e) => {
  if (e.duration > 200) {
    console.warn('[SLOW QUERY]', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  }
});
```

### Query Profiling with EXPLAIN ANALYZE

Use raw queries to profile slow queries and understand the execution plan.

```typescript
async function profileQuery(
  prisma: PrismaClient,
  query: string,
): Promise<void> {
  const plan = await prisma.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
    `EXPLAIN ANALYZE ${query}`,
  );

  for (const row of plan) {
    console.log(row['QUERY PLAN']);
  }
}

// Usage during development/debugging
await profileQuery(
  prisma,
  `SELECT * FROM orders WHERE customer_id = '...' ORDER BY created_at DESC LIMIT 20`,
);
```

### Reducing Data Transfer

Always use `select` in list endpoints to avoid transferring unnecessary columns over the wire. This is especially important for models with `Text`, `Json`, or `Bytes` fields.

```typescript
// List endpoint -- only transfer what the UI needs
const products = await prisma.product.findMany({
  select: {
    id: true,
    sku: true,
    name: true,
    price: true,
    isActive: true,
    // Deliberately exclude: description (Text), metadata (Json)
  },
  where: { deletedAt: null },
  orderBy: { name: 'asc' },
  take: 50,
});

// Detail endpoint -- include everything
const product = await prisma.product.findUniqueOrThrow({
  where: { id: productId },
  include: {
    category: true,
    images: { orderBy: { sortOrder: 'asc' } },
  },
});
```

### Batch Related Queries in Transactions

When a route needs data from multiple tables, batch the queries in an array transaction. This uses a single database round trip instead of multiple sequential ones.

```typescript
const [user, recentOrders, notifications] = await prisma.$transaction([
  prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  }),
  prisma.order.findMany({
    where: { customerId: userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
    },
  }),
  prisma.notification.count({
    where: { userId, readAt: null },
  }),
]);
```

---

## Migrations

### Naming Conventions

Use descriptive, action-oriented migration names that communicate the change clearly.

```bash
# Good -- descriptive and specific
pnpm db:migrate:dev --name create_orders_table
pnpm db:migrate:dev --name add_email_index_to_users
pnpm db:migrate:dev --name add_deleted_at_to_customers
pnpm db:migrate:dev --name create_team_membership_unique_constraint

# Bad -- vague and uninformative
pnpm db:migrate:dev --name update
pnpm db:migrate:dev --name fix
pnpm db:migrate:dev --name changes
```

### Migration Rules

1. **Never modify an existing migration file.** Once a migration has been applied to any environment, it is immutable. Create a new migration to make further changes.

2. **Review generated SQL before applying.** Always inspect the generated SQL in the migration file to verify it matches your intent.

3. **Use `db push` for prototyping, `migrate` for production.** During early development, `db push` is faster for iterating on schema changes. Once the schema stabilizes, switch to `migrate` for a versioned migration history.

```bash
# Prototyping phase -- fast iteration, no migration history
pnpm db:push

# Production-ready -- versioned, reviewable, deployable
pnpm db:migrate:dev --name add_inventory_table

# Production deployment -- apply pending migrations
pnpm db:migrate:deploy
```

4. **Handle data migrations separately.** If a schema change requires transforming existing data, create the migration first, then write a separate script for the data transformation. Never mix DDL and complex DML in the same migration.

5. **Keep migrations idempotent where possible.** Use `CREATE INDEX IF NOT EXISTS` and similar patterns in custom SQL migrations to avoid failures on re-runs.

### Docker Integration

After changing `schema.prisma`, restart the application container. The startup script automatically runs `prisma db push` in development.

```bash
docker compose restart app
```

---

## Security

### Never Expose Raw Prisma Results

Always map Prisma results to domain entities or DTOs before returning them from your API. Raw Prisma results may include internal fields, relation metadata, or fields that should not be visible to the client.

```typescript
// BAD -- leaks internal fields and database structure
app.get('/users/:id', async (request) => {
  return prisma.user.findUnique({ where: { id: request.params.id } });
});

// GOOD -- map to a response DTO
app.get('/users/:id', async (request) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: request.params.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
});
```

### Input Validation

Validate and sanitize all inputs before they reach the database layer. Prisma uses parameterized queries and is immune to SQL injection, but input validation prevents logical errors, oversized data, and abuse.

```typescript
import { Type, Static } from '@sinclair/typebox';

const CreateUserSchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 255 }),
  firstName: Type.String({ minLength: 1, maxLength: 100 }),
  lastName: Type.String({ minLength: 1, maxLength: 100 }),
  role: Type.Enum(UserRole),
});

type CreateUserInput = Static<typeof CreateUserSchema>;
```

### Row-Level Filtering

Implement row-level access control in the repository layer, not in route handlers. This ensures that access rules are consistently applied regardless of where the repository is called from.

```typescript
class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCustomer(
    customerId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<Order[]> {
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
    };

    // Non-admin users can only see their own orders
    if (requestingUserRole !== 'ADMIN') {
      where.customerId = requestingUserId;
    } else {
      where.customerId = customerId;
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

---

## Repository Pattern

In DDD + Hexagonal Architecture, the domain layer defines repository interfaces (ports) that describe what persistence operations exist. The infrastructure layer provides Prisma-based implementations (adapters). The domain layer never imports from `@prisma/client`.

### Domain Layer: Interface and Entity

```typescript
// src/domains/user/domain/entities/user.entity.ts

interface UserProps {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  toResponse(): UserResponse {
    return {
      id: this.props.id,
      email: this.props.email,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      role: this.props.role,
      isActive: this.props.isActive,
      deletedAt: this.props.deletedAt ?? null,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
```

```typescript
// src/domains/user/domain/repositories/user.repository.ts

import { User } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  filters?: UserFilters;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(options: PaginationOptions): Promise<PaginatedResult<User>>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
```

### Infrastructure Layer: Prisma Implementation

```typescript
// src/domains/user/infrastructure/repositories/prisma-user.repository.ts

import { PrismaClient, Prisma, User as PrismaUser } from '@prisma/client';
import { User } from '../../domain/entities/user.entity';
import {
  UserRepository,
  CreateUserData,
  UpdateUserData,
  PaginationOptions,
  PaginatedResult,
} from '../../domain/repositories/user.repository';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    return record ? this.toDomain(record) : null;
  }

  async findAll(options: PaginationOptions): Promise<PaginatedResult<User>> {
    const { page, pageSize, filters } = options;
    const where = this.buildWhereClause(filters);

    const [records, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toDomain(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(data: CreateUserData): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    });

    return this.toDomain(record);
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const record = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.toDomain(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private buildWhereClause(
    filters?: UserFilters,
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (!filters) return where;

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    return where;
  }

  private toDomain(record: PrismaUser): User {
    return User.create({
      id: record.id,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      role: record.role as UserRole,
      isActive: record.isActive,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
```

### Key Principles

- **The domain layer never imports from `@prisma/client`.** Repository interfaces use domain types only.
- **The `toDomain` method is the boundary.** It converts Prisma's generated types into domain entities, isolating the domain from ORM changes.
- **Soft delete filtering lives in the repository.** Every query includes `deletedAt: null` so callers do not need to remember it.
- **Use relation names in nested creates, not FK columns.** Write `department: { connect: { id } }` instead of `departmentId: id`.
- **Map nullable fields with `?? null` in `toResponse()`.** Use `value ?? null` instead of `value?.something` to ensure the field is always present in the response with an explicit `null`.

---

## Quick Reference: Common Prisma Error Codes

| Code  | Description                    | HTTP Status |
| ----- | ------------------------------ | ----------- |
| P2000 | Value too long for column      | 400         |
| P2002 | Unique constraint violation    | 409         |
| P2003 | Foreign key constraint failed  | 422         |
| P2014 | Relation violation             | 422         |
| P2025 | Record not found               | 404         |
| P2034 | Transaction conflict/deadlock  | 409         |

---

## Quick Reference: Schema Checklist

For every new model, verify:

- [ ] UUID primary key with `@db.Uuid`
- [ ] `createdAt` and `updatedAt` timestamps with `@db.Timestamptz`
- [ ] `deletedAt` if soft deletes are needed
- [ ] `@map("snake_case")` on every field
- [ ] `@@map("table_name")` on the model
- [ ] `@db.VarChar(N)` or `@db.Text` on every String field
- [ ] `@unique` on natural identifiers
- [ ] Explicit `@relation` with `onDelete` and `onUpdate`
- [ ] `@@index` on every foreign key column
- [ ] `@@index` on fields used in `WHERE` and `ORDER BY`
