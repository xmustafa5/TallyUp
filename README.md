# Fastify Template

Enterprise-grade Fastify backend template with DDD + Hexagonal Architecture.

## Stack

### Backend

- **Fastify 5** -- Web framework
- **TypeScript** -- Type safety with strict mode
- **Prisma** -- Database ORM with PostgreSQL
- **TypeBox** -- JSON Schema validation (Fastify-native)
- **BullMQ** -- Background job processing
- **ioredis** -- Redis client
- **Swagger/OpenAPI** -- Auto-generated API documentation

### Infrastructure

- **Docker Compose** -- Local development (PostgreSQL, Redis, app)
- **GitHub Actions** -- CI/CD pipeline (lint, typecheck, test, build)
- **Vitest** -- Testing framework

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v9+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url> my-app
cd my-app
pnpm install
```

### 2. Configure environment

```bash
cp .env.template .env
# Edit .env with your values if needed
```

### 3. Start with Docker

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, and the app. The startup script automatically pushes the Prisma schema.

### 4. Verify

```bash
# Health check
curl -s http://localhost:3000/health | jq .

# Readiness (DB + Redis)
curl -s http://localhost:3000/health/ready | jq .

# Swagger UI
open http://localhost:3000/documentation
```

### 5. Local development (without Docker)

```bash
# Start Postgres and Redis separately, then:
pnpm db:generate
pnpm db:push
pnpm dev
```

## Project Structure

```
src/
├── main.ts                          # Server bootstrap, graceful shutdown
└── app/
    ├── app.ts                       # Plugin registration, error handler
    ├── config/
    │   └── env.ts                   # Environment validation (TypeBox)
    ├── plugins/
    │   ├── sensible.plugin.ts       # @fastify/sensible (error helpers)
    │   ├── prisma.plugin.ts         # Prisma client
    │   ├── redis.plugin.ts          # Redis (ioredis)
    │   └── bullmq.plugin.ts         # Background job queues
    ├── common/
    │   ├── schemas/
    │   │   └── shared.schemas.ts    # SuccessResponse, PaginatedResponse
    │   └── types/
    │       └── fastify.d.ts         # Type augmentations
    └── domains/
        └── health/                  # Example domain (DDD pattern)
            ├── index.ts
            ├── domain/services/
            ├── presentation/routes/
            └── presentation/schemas/
```

## Architecture

This template follows **DDD + Hexagonal Architecture**:

| Layer              | Purpose                                              | Dependencies |
| ------------------ | ---------------------------------------------------- | ------------ |
| **Domain**         | Pure business logic, entities, repository interfaces | None         |
| **Presentation**   | HTTP routes, request/response validation             | Domain       |
| **Infrastructure** | Database (Prisma), external APIs, background jobs    | Domain       |

Each domain is a self-contained bounded context under `src/app/domains/`.

## Adding a New Domain

```bash
# 1. Create directory structure
mkdir -p src/app/domains/users/{domain/{entities,services,repositories},presentation/{routes,schemas},infrastructure/repositories}

# 2. Create index.ts (entry point)
# 3. Add Prisma models to prisma/schema.prisma
# 4. Implement domain layer (entities, services, repository interfaces)
# 5. Implement infrastructure (Prisma repository)
# 6. Implement presentation (routes with Swagger schemas)
# 7. Push schema: pnpm db:push
```

## Common Commands

| Command                 | Description                      |
| ----------------------- | -------------------------------- |
| `pnpm dev`              | Start dev server with hot reload |
| `pnpm build`            | Build for production             |
| `pnpm start`            | Start production server          |
| `pnpm test`             | Run tests                        |
| `pnpm test:watch`       | Run tests in watch mode          |
| `pnpm lint`             | Lint code                        |
| `pnpm format`           | Format code                      |
| `pnpm typecheck`        | Type check without emitting      |
| `pnpm db:generate`      | Regenerate Prisma client         |
| `pnpm db:push`          | Push schema to database          |
| `pnpm db:migrate:dev`   | Create a new migration           |
| `pnpm db:studio`        | Open Prisma Studio               |
| `pnpm docker:dev`       | Start Docker services            |
| `pnpm docker:dev:build` | Rebuild and start Docker         |
| `pnpm docker:dev:down`  | Stop Docker services             |
| `pnpm docker:dev:logs`  | Follow app logs                  |

## Docker

```bash
# Development
docker compose up -d              # Start all services
docker compose logs -f app        # Follow app logs
docker compose restart app        # Restart after schema changes
docker compose up -d --build -V   # Rebuild after adding packages

# Production build
docker build -t my-app .
docker run -p 3000:3000 --env-file .env my-app
```

## Testing

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

## License

MIT
