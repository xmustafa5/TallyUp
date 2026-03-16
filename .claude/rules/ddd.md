---
paths:
  - '**/domains/**'
  - '**/domain/**'
  - '**/infrastructure/**'
  - '**/presentation/**'
---

# Domain-Driven Design Rules

We use **DDD with Hexagonal Architecture** -- organizing code by business domains with clear layer separation.

## Project Structure

```
src/
├── main.ts                          # Entry point
├── app/
│   ├── app.ts                       # Main app plugin
│   ├── plugins/                     # Fastify plugins (auto-loaded)
│   ├── config/                      # Environment & configuration
│   ├── common/                      # Shared utilities, errors, types
│   │   ├── schemas/                 # Shared TypeBox schemas
│   │   └── types/                   # Type augmentations
│   └── domains/                     # BUSINESS DOMAINS (Bounded Contexts)
│       └── <domain-name>/
│           ├── index.ts             # Domain entry point (registers routes)
│           ├── domain/              # Core business logic (no dependencies)
│           │   ├── entities/        # Domain entities & aggregates
│           │   ├── value-objects/   # Immutable value objects
│           │   ├── services/        # Domain services
│           │   ├── repositories/    # Repository interfaces (ports)
│           │   └── events/          # Domain events
│           ├── presentation/        # API layer (adapters - inbound)
│           │   ├── routes/          # Fastify route handlers
│           │   └── schemas/         # TypeBox request/response schemas
│           └── infrastructure/      # External integrations (adapters - outbound)
│               ├── repositories/    # Repository implementations (Prisma)
│               └── jobs/            # Background jobs/workers (BullMQ)
```

## DDD Layer Rules

| Layer              | Purpose                              | Dependencies         |
| ------------------ | ------------------------------------ | -------------------- |
| **Domain**         | Pure business logic, entities, rules | None (isolated core) |
| **Presentation**   | HTTP routes, request validation      | -> Domain            |
| **Infrastructure** | DB, external APIs, queues            | -> Domain            |

**Key Principles:**

- Domain layer has **zero external dependencies** -- easily testable
- Infrastructure implements domain interfaces (Dependency Inversion)
- Presentation transforms HTTP <-> Domain objects
- Each domain is a **Bounded Context** that can become a microservice

## Adding a New Domain

```bash
# 1. Create domain directory structure
mkdir -p src/app/domains/<domain-name>/{domain/{entities,services,repositories},presentation/{routes,schemas},infrastructure/repositories}

# 2. Create domain index.ts (registers routes with prefix)
# 3. Create entity in domain/entities/<name>.entity.ts
# 4. Create repository interface in domain/repositories/<name>.repository.ts
# 5. Create Prisma repository in infrastructure/repositories/prisma-<name>.repository.ts
# 6. Create route file in presentation/routes/<name>.routes.ts
# 7. Create schemas in presentation/schemas/<name>.schemas.ts
# 8. Add model to prisma/schema.prisma
# 9. Run: pnpm db:push (or docker compose restart app)
```

## Autoload Order (2 stages)

1. **Plugins** from `src/app/plugins/` -- Shared functionality (prisma, redis, bullmq)
2. **Domain modules** from `src/app/domains/` -- Each domain's `index.ts` registers its routes
