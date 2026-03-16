---
paths:
  - '**/plugins/**'
  - '**/routes/**'
  - '**/app.ts'
---

# Fastify Rules

## Plugin-First Architecture

All functionality should come from Fastify plugins. Never build custom middleware/utilities when a plugin exists.

## Essential Plugins

| Plugin                | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `@fastify/env`        | Environment validation (MUST be registered first) |
| `@fastify/sensible`   | HTTP error shortcuts (`reply.notFound()`, etc.)   |
| `@fastify/helmet`     | Security headers                                  |
| `@fastify/cors`       | Cross-origin resource sharing                     |
| `@fastify/rate-limit` | Rate limiting                                     |
| `@fastify/compress`   | Response compression                              |
| `@fastify/swagger`    | OpenAPI spec generation                           |
| `@fastify/swagger-ui` | Swagger UI at `/documentation`                    |
| `@fastify/autoload`   | Plugin/route auto-discovery                       |

## Error Handling

Use `@fastify/sensible` helpers:

```typescript
reply.badRequest('Invalid input');
reply.unauthorized('Invalid credentials');
reply.notFound('Resource not found');
reply.conflict('Already exists');
reply.internalServerError('System error');
```

## Plugin Organization

Plugins in `src/app/plugins/` are auto-loaded. Use `fastify-plugin` wrapper to expose decorators to parent scope.

```typescript
import fp from 'fastify-plugin';

export default fp(
  async (fastify) => {
    // Plugin logic
    fastify.decorate('myService', service);
  },
  { name: 'my-plugin', dependencies: ['prisma-plugin'] },
);
```

## BullMQ Background Jobs Pattern

1. Route handler enqueues job to Redis queue (sub-millisecond)
2. BullMQ worker picks up the job
3. Worker processes the job (DB operations, external API calls, etc.)
4. Retry: 3 attempts with exponential backoff (2s base)

```typescript
// Enqueue a job
await fastify.queues.default.add('send-email', { to, subject, body });

// Create a worker (in infrastructure/jobs/)
import { Worker } from 'bullmq';

const worker = new Worker(
  'default-jobs',
  async (job) => {
    if (job.name === 'send-email') {
      // Process the job
    }
  },
  { connection: fastify.redis },
);
```

## Response Pattern

```typescript
// Success
{ success: true, data: { ... } }

// Paginated
{ success: true, data: [...], meta: { total, page, pageSize, totalPages } }

// Error (via @fastify/sensible)
{ statusCode: 400, error: 'Bad Request', message: 'Details...' }
```
