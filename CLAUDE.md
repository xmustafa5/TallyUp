# Fastify Template

**Single Fastify service** with DDD + Hexagonal Architecture.
Tech Stack: Fastify 5 | TypeScript | Prisma | PostgreSQL | BullMQ | Redis | Docker | pnpm

## Core Principles

1. **Plugin-First**: Use Fastify plugins for all functionality -- never reinvent the wheel
2. **DDD + Hexagonal**: Domain layer is pure business logic with zero dependencies. Infrastructure implements domain ports. Presentation handles HTTP concerns
3. **Comprehensive Swagger**: Every route MUST have full schema with description, tags, summary, request/response types
4. **No Emojis**: Never use emojis in code, comments, docs, or commit messages
5. **Context7 First**: NEVER write code without first querying Context7 for up-to-date docs on every library/plugin being used. This is mandatory, not optional
6. **Docker-First**: Development happens in Docker containers via `docker compose up -d`

## Critical Rules

### Git Commits

**NEVER commit with Claude authorship or co-authorship.** No `Co-Authored-By: Claude`, no Claude/Anthropic emails, no modifying git config. All commits must appear as solely human-made.

### Docker Safety

- DO: `docker compose up/restart/down`, `docker logs`, `docker exec`, `docker ps`
- **NEVER**: `docker rm`, `docker compose rm`, `docker system prune`, `docker container prune`, `docker volume prune` or any destructive cleanup

### Context7 Documentation Lookup (MANDATORY)

Before writing ANY implementation code using a library, plugin, or framework:

1. Call `resolve-library-id` to find the library
2. Call `query-docs` with your specific use case
3. Use the returned docs/examples as the basis for implementation

This applies to: Fastify plugins, Prisma, BullMQ, TypeBox, ioredis, any npm package.

### Package Installation

**NEVER manually edit package.json.** Use `pnpm add <package>` commands only.

## Development Workflow

1. **Research & Documentation (MANDATORY)** -- Query Context7 MCP for every library/plugin. Study existing codebase patterns.
2. **Design Schema** -- Write/update Prisma models, plan migrations and relationships
3. **Implement Domain Layer** -- Entities, value objects, services, repository interfaces (pure logic, no dependencies)
4. **Implement Infrastructure** -- Repository implementations, database operations, external integrations, background jobs
5. **Implement Presentation** -- Routes with full Swagger schemas, request/response validation, error handling
6. **Test** -- `pnpm test`, then curl endpoints manually
7. **Docker** -- `docker compose restart app` after Prisma schema changes

## Port Mapping

| Port | Service         |
| ---- | --------------- |
| 3000 | Fastify Template API |
| 5432 | PostgreSQL      |
| 6379 | Redis           |

## Testing (CURL First)

```bash
# Liveness
curl -s http://localhost:3000/health | jq .

# Readiness (checks DB + Redis)
curl -s http://localhost:3000/health/ready | jq .

# Swagger UI
open http://localhost:3000/documentation
```

## Common Pitfalls

- **ESM with bundler resolution**: Do NOT add `.js` extensions to imports
- **Anonymous Docker volumes cache stale `node_modules`**: Use `-V` flag after adding packages (`docker compose up -d -V`)
- **`@fastify/env` must be registered first**: No config access until env plugin is loaded
- **TypeBox nullable fields**: Use `Type.Union([T, Type.Null()])` not `Type.Optional()` for response schemas
- **Entity `toResponse()`**: Use `?? null` not `?.` for nullable fields
- **Prisma nested creates**: Use relation names, not FK columns (`department: { connect: { id } }` NOT `departmentId: id`)
- **Prisma schema sync in Docker**: After changing `schema.prisma`, run `docker compose restart app` (startup script auto-pushes schema)

## Detailed Rules (auto-loaded by path)

Architecture details, patterns, and conventions are in `.claude/rules/`:

- `ddd.md` -- DDD structure, layer rules, adding new domains
- `fastify.md` -- Plugin architecture, error handling, BullMQ patterns
- `prisma.md` -- Schema conventions, repository pattern, nullable fields
- `swagger.md` -- Swagger documentation requirements and style guide
- `docker.md` -- Docker commands, container management, safety rules

## Best Practices Reference

Enterprise-grade reference guides in `docs/best-practices/`:

- `fastify.md` -- Plugins, hooks, decorators, error handling, validation, logging, performance, testing
- `prisma.md` -- Schema design, queries, transactions, error codes, N+1, migrations, repository pattern
- `redis.md` -- Connection management, caching patterns, data structures, pipelining, pub/sub, Lua scripting
- `bullmq.md` -- Queue design, workers, retries, rate limiting, flows, repeatable jobs, graceful shutdown
- `swagger.md` -- OpenAPI setup, route docs, TypeBox schemas, tags, security schemes, response conventions
- `postgresql.md` -- Indexing (B-tree/GIN/GiST/BRIN), query optimization, connection pooling, transactions
- `typebox.md` -- Type provider, schema composition, Optional vs Nullable, validation constraints
