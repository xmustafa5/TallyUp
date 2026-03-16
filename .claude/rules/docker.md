---
paths:
  - '**/Dockerfile*'
  - '**/docker-compose*'
  - '**/.dockerignore'
---

# Docker Rules

## Allowed Commands

```bash
docker compose up -d          # Start all services
docker compose down           # Stop all services
docker compose restart app    # Restart the app (after schema changes)
docker compose logs -f app    # Follow app logs
docker compose ps             # List running services
docker exec -it fastify-template-db psql -U postgres -d fastify_template_db  # Access database
docker exec -it fastify-template-redis redis-cli                              # Access Redis
```

## FORBIDDEN Commands

**NEVER run these -- they destroy data:**

- `docker rm` / `docker compose rm`
- `docker system prune`
- `docker container prune`
- `docker volume prune`
- `docker image prune`

## When to Restart vs. Auto-Sync

**Auto-synced (no restart needed):**

- Source file changes in `src/` (tsx watch mode handles this)

**Requires `docker compose restart app`:**

- Prisma schema changes (`prisma/schema.prisma`)
- Environment variable changes

**Requires `docker compose up -d -V` (recreate volumes):**

- Adding new npm packages (`pnpm add ...`)
- The `-V` flag recreates anonymous volumes to clear stale `node_modules`

## Service Management

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f app
docker compose logs -f db
docker compose logs -f redis

# Restart after schema changes
docker compose restart app

# Full rebuild after dependency changes
docker compose up -d --build -V
```
