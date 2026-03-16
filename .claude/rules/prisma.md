---
paths:
  - '**/*.prisma'
  - '**/prisma/**'
  - '**/repositories/**'
  - '**/entities/**'
---

# Prisma Rules

## Schema Conventions

```prisma
model Department {
  id        String   @id @default(uuid()) @db.Uuid
  code      String   @unique @db.VarChar(50)
  name      String   @db.VarChar(255)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("departments")
}
```

**Conventions:**

- `@map("snake_case")` for column names
- `@@map("table_name")` for table names
- `@db.Timestamptz` for all timestamps
- `@default(uuid())` with `@db.Uuid` for IDs
- `@db.VarChar(N)` for string length limits
- Indexes on frequently queried fields

## Repository Pattern

**Domain layer** defines the interface (port):

```typescript
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(options: PaginationOptions): Promise<PaginatedResult<User>>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}
```

**Infrastructure layer** implements it (adapter):

```typescript
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

## Nested Creates

Use relation names, not FK columns:

```typescript
// Good
await prisma.employee.create({
  data: {
    name: 'John',
    department: { connect: { id: departmentId } },
  },
});

// Bad -- FK column directly
await prisma.employee.create({
  data: { name: 'John', departmentId: id },
});
```

## Nullable Fields

- **Schema**: `Type.Union([T, Type.Null()])` (NOT `Type.Optional()`)
- **Entity toResponse()**: Use `?? null` (NOT `?.`)

```typescript
toResponse() {
  return {
    description: this.props.description ?? null,
  };
}
```

## Schema Sync Commands

```bash
pnpm db:push          # Push schema to database (development)
pnpm db:migrate:dev   # Create migration (development)
pnpm db:migrate:deploy # Apply migrations (production)
pnpm db:generate      # Regenerate Prisma client
pnpm db:studio        # Open Prisma Studio GUI
```
