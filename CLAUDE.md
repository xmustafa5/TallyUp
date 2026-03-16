# Qatha

Monorepo with Fastify backend + Next.js frontend.

**Backend:** Fastify 5 | TypeScript | Prisma | PostgreSQL | BullMQ | Redis | Docker | pnpm
**Frontend:** Next.js 16 | React 19 | TypeScript | Tailwind CSS | shadcn/ui | pnpm

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

This applies to: Fastify plugins, Prisma, BullMQ, TypeBox, ioredis, Next.js, TanStack Query, shadcn/ui, any npm package.

### Package Installation

**NEVER manually edit package.json.** Use `pnpm add <package>` commands only.

## Commands

### Backend (from `backend/`)

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server
pnpm build            # Build
pnpm test             # Run tests
pnpm lint             # Run ESLint
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to DB
pnpm db:migrate:dev   # Create migration
pnpm db:studio        # Open Prisma Studio
```

### Frontend (from `frontend/`)

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Next.js dev server (localhost:3000)
pnpm build            # Build frontend
pnpm lint             # Run ESLint
```

### Docker

```bash
docker compose up -d          # Start all services
docker compose up -d --build  # Rebuild and start
docker compose logs -f app    # Follow app logs
docker compose down           # Stop all services
docker compose restart app    # Restart after Prisma schema changes
```

## Port Mapping

| Port | Service    |
| ---- | ---------- |
| 3000 | Backend API |
| 3001 | Frontend   |
| 5432 | PostgreSQL |
| 6379 | Redis      |

## Architecture

### Backend (backend/src/) - DDD + Hexagonal

Development workflow:

1. **Research & Documentation (MANDATORY)** -- Query Context7 MCP for every library/plugin. Study existing codebase patterns.
2. **Design Schema** -- Write/update Prisma models, plan migrations and relationships
3. **Implement Domain Layer** -- Entities, value objects, services, repository interfaces (pure logic, no dependencies)
4. **Implement Infrastructure** -- Repository implementations, database operations, external integrations, background jobs
5. **Implement Presentation** -- Routes with full Swagger schemas, request/response validation, error handling
6. **Test** -- `pnpm test`, then curl endpoints manually
7. **Docker** -- `docker compose restart app` after Prisma schema changes

### Frontend (frontend/src/) - Next.js App Router Pages

```
src/
├── app/                               # App Router (file-based routing)
│   ├── layout.tsx                     # Root layout
│   ├── page.tsx                       # Home page
│   ├── (auth)/                        # Auth route group
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (dashboard)/                   # Dashboard route group
│       ├── layout.tsx                 # Dashboard layout (sidebar, nav)
│       └── {page}/                    # e.g., people/, attendance/, payroll/
│           ├── page.tsx               # Page component
│           ├── loading.tsx            # Loading UI
│           ├── error.tsx              # Error boundary
│           └── [id]/page.tsx          # Dynamic route (detail view)
├── components/                        # ALL UI components
│   ├── ui/                            # shadcn/ui components
│   ├── layout/                        # Layout components (sidebar, nav)
│   └── shared/                        # Custom shared (data-table, filter-bar, page-header)
├── services/                          # API call functions per domain
│   └── {domain}.ts                    # e.g., people.ts, attendance.ts
├── hooks/                             # Custom hooks (TanStack Query wrappers, utilities)
├── types/                             # TypeScript types per domain
├── stores/                            # Global state management (Zustand)
├── contexts/                          # React contexts
├── i18n/                              # Internationalization config
├── constants/                         # Query keys & shared constants
└── lib/                               # Shared libraries & config
    ├── axios.ts                       # Axios instance config
    └── utils.ts                       # Utility functions
```

**Frontend architecture rules:**

- `src/components/` = ALL reusable components (shadcn/ui, layouts, shared)
- `src/app/` = ONLY routing and page components (no business logic)
- `services/` = raw axios API calls, `hooks/` = TanStack Query hooks that import from services
- Pages are thin wrappers that compose components and hooks
- Use route groups `(groupName)/` for shared layouts without affecting URL

## Frontend Libraries

| Library                   | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| **@tanstack/react-query** | ALL server state (fetching, caching, mutations) |
| **axios**                 | ALL HTTP API calls                              |
| **shadcn/ui**             | ALL UI components                               |
| **react-hook-form**       | ALL form handling                               |
| **zod**                   | ALL data validation                             |
| **Zustand**               | Global client state (when needed)               |
| **next-intl**             | Internationalization                            |

## API & Integration Rules

- When implementing any API endpoint, mark it as `- [x]` in `API-DOCS.md`
- When you find a mismatch between UI types and API responses, log it in `API-UI-CONFLICTS.md`
- Backend enforces `limit <= 100` on all paginated endpoints -- never use `limit: 200`
- When the API returns only raw IDs but the UI needs a human-readable name, do NOT fetch the related entity separately. Add it to `BACKEND-FIXES.md` as a backend fix (API should JOIN and return the resolved name). Only implement a frontend workaround if the user explicitly asks.
- Conflict statuses: `PENDING` | `NEEDS VERIFY` | `OK (safe fallback)`
- Backend team notifications in `API-UI-CONFLICTS.md` must be copy-paste-ready with: Endpoint, Current behavior, Expected behavior, Example response, Why needed, Priority

## Testing

### Backend

```bash
# Liveness
curl -s http://localhost:3000/health | jq .

# Readiness (checks DB + Redis)
curl -s http://localhost:3000/health/ready | jq .

# Swagger UI
open http://localhost:3000/documentation
```

### Frontend

- **ALWAYS use `curl`** for API testing -- never write Python/Node test scripts

## Frontend Code Patterns

### Data Fetching

- `services/` = raw axios calls (no TanStack Query)
- `hooks/` = TanStack Query hooks wrapping service methods
- `constants/query-keys.ts` = query key factory: `all`, `list(filters?)`, `detail(id)`
- Always import axios instance from `@/lib/axios`

### Critical UI Rules

1. **NEVER conditionally render Lucide icons** (e.g., `{isPending && <Loader2 />}`). Always render and toggle with CSS: `<Loader2 className={`mr-2 size-4 animate-spin ${isPending ? '' : 'hidden'}`} />`. Conditional rendering of SVG icons inside buttons causes React DOM `insertBefore` errors.
2. **ALWAYS use Zod + react-hook-form** for all forms
3. **ALWAYS reset forms** when dialogs open
4. **ALWAYS close dialogs** on successful mutations
5. **ALWAYS invalidate queries** after mutations
6. Dialogs go in `components/` folder as separate files: `{entity}-{action}-dialog.tsx`
7. Main page = default export, dialogs = named exports
8. Use axios for HTTP -- NOT fetch

### Global Hooks

- `useDebouncedValue(value, delay?)` -- ALWAYS use for search debouncing. Never manual `useEffect` + `setTimeout`.

## Code Style

- TypeScript strict mode, ES2022 target, 2-space indentation
- Functional components only, named exports
- File naming: components `kebab-case.tsx`, hooks `use-{name}.ts`, types `index.ts`
- Props interface: `{Component}Props` above component
- Always use `pnpm` (not npm/yarn). Never manually edit package.json.

## Backend Common Pitfalls

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
