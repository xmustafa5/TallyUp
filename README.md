# Starter Template

Monorepo starter template: Fastify backend + Next.js frontend + React Native mobile-app. Empty pages, full plumbing.

## Stack

### Backend (`backend/`)

- **Fastify 5** with DDD + Hexagonal Architecture
- **Prisma** + **PostgreSQL**
- **TypeBox** for schema validation
- **BullMQ** + **ioredis** for background jobs
- **Swagger / OpenAPI** at `/documentation`
- **Vitest**, **ESLint**, **Prettier**

### Frontend (`frontend/`)

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS** + **shadcn/ui**
- **TanStack Query** + **axios**
- **next-intl** (en + ar scaffolding)

### Mobile-app (`mobile-app/`)

- **Expo SDK 55** + **Expo Router 55**
- **React Native 0.83** + **Reanimated 4**
- **TanStack Query** + **axios**
- **MMKV** storage, **expo-haptics**

### Infrastructure

- **Docker Compose** for backend + Postgres + Redis
- **pnpm** workspace

## Prerequisites

- Node.js v22+
- pnpm v9+
- Docker Desktop

## Getting Started

```bash
# Install workspace dependencies
pnpm install

# Backend (Docker)
docker compose up -d
curl -s http://localhost:3000/health | jq .
open http://localhost:3000/documentation

# Frontend
cd frontend && pnpm dev   # http://localhost:3001

# Mobile-app
cd mobile-app && npx expo start
```

## What ships in this template

- Backend: app shell, error handler, Swagger setup, all five plugins (`prisma`, `redis`, `bullmq`, `auth`, `sensible`), `health` domain only.
- Frontend: root layout, providers, i18n plumbing (empty messages), shadcn/ui primitives, axios, TanStack Query, error/toast/skeleton primitives, an empty `(app)` route group with a Welcome placeholder.
- Mobile-app: root `_layout.tsx` with QueryClientProvider + SafeArea + GestureHandler, axios, TanStack Query, MMKV storage, theme tokens, UI primitives, a Welcome placeholder.
- Repo: `CLAUDE.md` + `.claude/rules/` with the architectural conventions every new project should follow.

## What you add

Domains, models, routes, pages, screens, services, hooks, stores, and i18n keys — per project.

## Architecture & Conventions

See `CLAUDE.md` and `.claude/rules/` for the rules every change should follow:

- `ddd.md` — DDD + Hexagonal layout
- `fastify.md` — Plugin-first patterns, error handling, BullMQ
- `prisma.md` — Schema conventions, repository pattern
- `swagger.md` — OpenAPI requirements per route
- `docker.md` — Docker safety rules

## License

MIT
