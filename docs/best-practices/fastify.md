# Fastify Best Practices

A comprehensive, enterprise-grade reference for building production Fastify applications with TypeScript and ESM.

---

## Table of Contents

1. [Plugin Architecture](#plugin-architecture)
2. [Hooks Lifecycle](#hooks-lifecycle)
3. [Decorators](#decorators)
4. [Error Handling](#error-handling)
5. [Validation and Serialization](#validation-and-serialization)
6. [Logging](#logging)
7. [Performance](#performance)
8. [Graceful Shutdown](#graceful-shutdown)
9. [Testing](#testing)

---

## Plugin Architecture

Fastify's plugin system is the foundation of its architecture. Every piece of functionality -- routes, hooks, decorators, middleware -- should be encapsulated in a plugin. Understanding encapsulation is critical to building maintainable applications.

### Encapsulation Model (Parent/Child Contexts)

Fastify creates an **encapsulated context** for every plugin registered with `fastify.register()`. A child context inherits everything from its parent (decorators, hooks, plugins), but the parent **cannot** see anything added by the child. This is the core isolation mechanism.

```typescript
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

// Parent context -- decorates the root instance
fastify.decorate('parentValue', 42);

fastify.register(async (childInstance) => {
  // Child can see parent decorators
  console.log(childInstance.parentValue); // 42

  // Child adds its own decorator -- invisible to parent
  childInstance.decorate('childValue', 99);
  console.log(childInstance.childValue); // 99
});

// Parent cannot see child decorators
// fastify.childValue --> undefined (not accessible)
```

This encapsulation means each plugin gets its own "scope." Hooks registered in a child plugin only apply to routes within that child. This is how you build isolated domain modules that do not leak concerns.

```typescript
// src/app/domains/users/index.ts
import type { FastifyInstance } from 'fastify';

export default async function usersModule(fastify: FastifyInstance) {
  // This hook ONLY applies to routes registered inside this plugin
  fastify.addHook('preHandler', async (request) => {
    request.log.info('Users module preHandler -- scoped to /users routes');
  });

  fastify.get('/users', async () => {
    return { users: [] };
  });
}
```

### Using fastify-plugin to Break Encapsulation

When you need a plugin's decorators or hooks to be visible to the **parent** scope (shared infrastructure like database clients, authentication, configuration), wrap the plugin with `fastify-plugin`. This "breaks" the encapsulation boundary intentionally.

```typescript
// src/app/plugins/prisma.plugin.ts
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

// Declare the type augmentation so TypeScript knows about the decorator
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    const prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
      ],
    });

    await prisma.$connect();
    fastify.log.info('Prisma client connected');

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async () => {
      await prisma.$disconnect();
      fastify.log.info('Prisma client disconnected');
    });
  },
  {
    name: 'prisma-plugin',
    // Declare dependencies -- Fastify will throw if they are missing
    dependencies: [],
  },
);
```

**Key rule**: Use `fastify-plugin` (fp) only for infrastructure plugins that need to share state globally. Domain modules should NOT use fp -- they should remain encapsulated.

### Plugin Registration Order

Registration order determines availability. A plugin cannot access decorators from plugins registered after it. Establish a strict order:

1. **Environment/Config** -- `@fastify/env` must be first; nothing else can read config until it loads
2. **Infrastructure plugins** -- Database, Redis, message queues, shared utilities
3. **Security plugins** -- Helmet, CORS, rate limiting
4. **API documentation** -- Swagger/OpenAPI
5. **Domain modules** -- Business logic routes and handlers

```typescript
// src/app/app.ts
import type { FastifyInstance } from 'fastify';
import fastifyEnv from '@fastify/env';
import AutoLoad from '@fastify/autoload';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEnvJsonSchema } from './config/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function app(fastify: FastifyInstance) {
  // 1. Environment (MUST be first)
  await fastify.register(fastifyEnv, {
    confKey: 'config',
    schema: getEnvJsonSchema(),
    dotenv: true,
    data: process.env,
  });

  // 2. Infrastructure plugins (prisma, redis, bullmq, etc.)
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    maxDepth: 2,
  });

  // 3. Domain modules
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'domains'),
    dirNameRoutePrefix: false,
    indexPattern: /^index\.(ts|js)$/i,
    maxDepth: 1,
  });
}
```

### Always Use Async Plugin Functions

Fastify 5 requires plugins to be async functions. Never use callback-based plugins. The async pattern ensures proper error propagation and clean sequencing.

```typescript
// CORRECT -- async function
export default fp(
  async (fastify: FastifyInstance) => {
    const client = await connectToExternalService();
    fastify.decorate('externalClient', client);
  },
  { name: 'external-client-plugin' },
);

// WRONG -- callback style (not supported in Fastify 5)
// export default fp((fastify, opts, done) => {
//   done();
// });
```

### Plugin Options Typing with TypeBox

Use TypeBox to define strongly typed plugin options. This integrates with Fastify's JSON Schema validation and gives you compile-time safety.

```typescript
import fp from 'fastify-plugin';
import { Type, type Static } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';

const PluginOptionsSchema = Type.Object({
  connectionString: Type.String(),
  maxRetries: Type.Number({ default: 3 }),
  timeoutMs: Type.Number({ default: 5000 }),
  enableMetrics: Type.Boolean({ default: false }),
});

type PluginOptions = Static<typeof PluginOptionsSchema>;

export default fp(
  async (fastify: FastifyInstance, opts: PluginOptions) => {
    fastify.log.info(
      { maxRetries: opts.maxRetries, timeoutMs: opts.timeoutMs },
      'Initializing plugin with options',
    );
    // Use opts with full type safety
  },
  { name: 'typed-plugin' },
);
```

---

## Hooks Lifecycle

Fastify hooks let you intercept the request/response lifecycle at precise points. Understanding the full lifecycle and proper hook usage is essential for authentication, logging, caching, and request transformation.

### Full Lifecycle Order

The request lifecycle flows through hooks in this exact order:

```
Incoming Request
    |
    v
onRequest         --> Timing, IP logging, request tracking
    |
    v
preParsing        --> Stream transformation (decompression, decryption)
    |
    v
preValidation     --> Modify body before validation (rare)
    |
    v
preHandler        --> Authentication, authorization, loading resources
    |
    v
handler           --> Route handler executes
    |
    v
preSerialization  --> Transform response object before serialization
    |
    v
onSend            --> Modify serialized payload (string/Buffer), set headers
    |
    v
onResponse        --> Logging, metrics (response already sent to client)
```

### onRequest -- Timing and Request Tracking

Use `onRequest` for anything that must happen before the body is parsed. This is the earliest hook and is ideal for timing, request IDs, and IP extraction.

```typescript
import type { FastifyInstance } from 'fastify';

export default async function timingPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    // Attach a high-resolution timer to the request
    request.startTime = process.hrtime.bigint();
    request.log.info(
      { method: request.method, url: request.url },
      'Request received',
    );
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Number(process.hrtime.bigint() - request.startTime) / 1e6;
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: duration.toFixed(2),
      },
      'Request completed',
    );
  });
}
```

### preHandler -- Authentication and Authorization

The `preHandler` hook runs after validation, making it the right place for authentication and authorization logic. The request body and query parameters are already parsed and validated at this point.

```typescript
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function authPlugin(fastify: FastifyInstance) {
  // Scoped preHandler -- only applies to routes in this context
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        // IMPORTANT: When short-circuiting, you must return reply
        return reply.unauthorized('Missing authentication token');
      }

      try {
        const decoded = await verifyToken(token);
        request.user = decoded;
      } catch {
        return reply.unauthorized('Invalid or expired token');
      }
    },
  );
}
```

### onError Hook -- Logging, Not Replacing Error Handler

The `onError` hook fires when an error is thrown, **before** the error handler runs. It is strictly for side effects (logging, metrics). It does **not** replace `setErrorHandler` and cannot modify the response.

```typescript
fastify.addHook('onError', async (request, reply, error) => {
  // Log the error with request context for observability
  request.log.error(
    {
      err: error,
      method: request.method,
      url: request.url,
      requestId: request.id,
    },
    'Request error occurred',
  );

  // Increment error metrics
  metrics.requestErrors.inc({
    method: request.method,
    route: request.routeOptions.url ?? 'unknown',
    statusCode: reply.statusCode,
  });

  // Do NOT call reply.send() here -- the error handler will handle the response
});
```

### preSerialization -- Transforming Response Objects

The `preSerialization` hook lets you modify the response object before it is serialized to JSON. This is useful for wrapping responses in a standard envelope.

```typescript
fastify.addHook('preSerialization', async (request, reply, payload) => {
  // Skip if already wrapped or if it is a health check
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload
  ) {
    return payload;
  }

  // Wrap in standard envelope
  return {
    success: true,
    data: payload,
  };
});
```

### Scoped Hooks (Plugin-Level vs Global)

Hooks registered in a child plugin only apply to routes in that plugin. Hooks registered at the root or in a `fastify-plugin`-wrapped plugin apply globally.

```typescript
import fp from 'fastify-plugin';

// GLOBAL hook -- applies to all routes in the application
export default fp(
  async (fastify) => {
    fastify.addHook('onRequest', async (request) => {
      request.log.debug('Global onRequest hook');
    });
  },
  { name: 'global-hooks' },
);
```

```typescript
// SCOPED hook -- applies only to routes inside this plugin
export default async function adminModule(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.user?.isAdmin) {
      return reply.forbidden('Admin access required');
    }
  });

  fastify.get('/admin/dashboard', async () => {
    return { stats: {} };
  });
}
```

### Never Forget to Return Reply When Short-Circuiting

When sending a response from a hook (short-circuiting), you **must** return the reply object. Otherwise, Fastify will continue executing the handler and you will get "Reply already sent" errors or unpredictable behavior.

```typescript
// CORRECT
fastify.addHook('preHandler', async (request, reply) => {
  if (!request.headers['x-api-key']) {
    return reply.code(401).send({ error: 'API key required' });
    // Returning reply tells Fastify the lifecycle is done
  }
  // If we reach here, the handler will execute normally
});

// WRONG -- missing return
// fastify.addHook('preHandler', async (request, reply) => {
//   if (!request.headers['x-api-key']) {
//     reply.code(401).send({ error: 'API key required' });
//     // Without return, Fastify will still call the handler!
//   }
// });
```

---

## Decorators

Decorators attach values, functions, or objects to the Fastify instance, request, or reply. They are the mechanism for dependency injection and shared state.

### decorateRequest / decorateReply for Per-Request State

Use `decorateRequest` and `decorateReply` to add properties that exist per-request. You must initialize them during decoration so Fastify can optimize the object shape.

```typescript
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

// Type augmentation -- tell TypeScript about the new properties
declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; email: string; roles: string[] } | null;
    startTime: bigint;
  }

  interface FastifyReply {
    serverTiming: string | null;
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    // Initialize with null, not undefined (V8 hidden class optimization)
    fastify.decorateRequest('user', null);
    fastify.decorateRequest('startTime', BigInt(0));
    fastify.decorateReply('serverTiming', null);
  },
  { name: 'request-decorators' },
);
```

### Initialize with null, Not undefined

This is a critical performance detail. V8 (the JavaScript engine) uses "hidden classes" to optimize property access. When you initialize with `null`, V8 can pre-allocate the property slot. Using `undefined` or omitting the initializer forces V8 into a slower dictionary-mode lookup.

```typescript
// CORRECT -- V8 can optimize the hidden class
fastify.decorateRequest('user', null);
fastify.decorateRequest('requestMeta', null);

// WRONG -- forces V8 into slow mode
// fastify.decorateRequest('user');
// fastify.decorateRequest('requestMeta', undefined);
```

### decorate for Shared Utilities and Services

Use `fastify.decorate()` to attach shared services, database clients, and utility functions to the Fastify instance itself. These persist for the lifetime of the application.

```typescript
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    emailService: EmailService;
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    const emailService: EmailService = {
      async send(to, subject, body) {
        fastify.log.info({ to, subject }, 'Sending email');
        // Implementation details
      },
    };

    fastify.decorate('emailService', emailService);
  },
  { name: 'email-service-plugin' },
);
```

### hasDecorator Checks Before Double-Registration

If a plugin might be registered multiple times (directly and transitively), guard against double-decoration. Fastify throws an error if you decorate with the same key twice.

```typescript
export default fp(
  async (fastify: FastifyInstance) => {
    if (fastify.hasDecorator('cache')) {
      fastify.log.warn('Cache decorator already registered, skipping');
      return;
    }

    const cache = new Map<string, { value: unknown; expiresAt: number }>();
    fastify.decorate('cache', cache);
  },
  { name: 'cache-plugin' },
);
```

### Type Augmentation with declare module

Always pair decorators with TypeScript module augmentation. This gives you full type safety when accessing decorators throughout the application.

```typescript
// src/types/fastify.d.ts (or inline in the plugin file)
import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    config: {
      NODE_ENV: string;
      PORT: number;
      DATABASE_URL: string;
      REDIS_URL: string;
    };
  }

  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      roles: string[];
    } | null;
  }
}
```

---

## Error Handling

Fastify provides a layered error handling system. Proper configuration prevents information leakage, improves debugging, and ensures consistent API responses.

### setErrorHandler with Validation Error Detection

The global error handler is your last line of defense. Fastify's validation errors carry a `validation` property and a `validationContext` indicating whether the error came from body, querystring, params, or headers.

```typescript
import type { FastifyInstance, FastifyError } from 'fastify';

export function configureErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    // Validation errors from Ajv
    if (error.validation) {
      const context = error.validationContext; // 'body' | 'querystring' | 'params' | 'headers'
      const messages = error.validation.map((err) => {
        const field = err.instancePath?.replace('/', '') || err.params?.missingProperty || 'unknown';
        return `${context}.${field}: ${err.message}`;
      });

      return reply.code(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: messages.join('; '),
        details: error.validation,
      });
    }

    // Client errors (4xx) -- pass through message
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name || 'Error',
        message: error.message,
      });
    }

    // Server errors (5xx) -- log full error, return generic message
    request.log.error(
      { err: error, method: request.method, url: request.url },
      'Unhandled server error',
    );

    const isProduction = process.env.NODE_ENV === 'production';

    return reply.code(error.statusCode ?? 500).send({
      statusCode: error.statusCode ?? 500,
      error: 'Internal Server Error',
      message: isProduction ? 'An unexpected error occurred' : error.message,
    });
  });
}
```

### schemaErrorFormatter for Custom Validation Messages

Override the default Ajv error messages with a custom formatter. This runs before `setErrorHandler` and shapes the error object.

```typescript
import Fastify from 'fastify';

const fastify = Fastify({
  logger: true,
  schemaErrorFormatter: (errors, dataVar) => {
    const formattedErrors = errors.map((err) => {
      const path = err.instancePath || dataVar;
      return `${path} ${err.message}`;
    });

    const error = new Error(formattedErrors.join(', '));
    (error as any).statusCode = 400;
    return error;
  },
});
```

### setNotFoundHandler for Custom 404 Responses

Customize the 404 response to match your API's error format. This is also a good place to log route-miss patterns for debugging.

```typescript
fastify.setNotFoundHandler((request, reply) => {
  request.log.warn(
    { method: request.method, url: request.url },
    'Route not found',
  );

  reply.code(404).send({
    statusCode: 404,
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} does not exist`,
  });
});
```

### Throwing Errors with statusCode

When throwing errors from handlers or services, attach a `statusCode` property. Fastify will use it to set the HTTP status code automatically.

```typescript
// In a service or handler
function findUserOrThrow(id: string) {
  const user = await userRepository.findById(id);
  if (!user) {
    const error = new Error(`User with id ${id} not found`);
    (error as any).statusCode = 404;
    throw error;
  }
  return user;
}
```

### @fastify/sensible for httpErrors Helpers

The `@fastify/sensible` plugin provides clean, typed error factory methods. Prefer these over manually constructing error objects.

```typescript
import type { FastifyInstance, FastifyRequest } from 'fastify';

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.get('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.params.id },
    });

    if (!user) {
      // Clean, typed 404 -- uses @fastify/sensible under the hood
      throw fastify.httpErrors.notFound(`User ${request.params.id} not found`);
    }

    if (user.deletedAt) {
      throw fastify.httpErrors.gone('This user account has been deactivated');
    }

    return { success: true, data: user };
  });
}
```

Available helpers from `@fastify/sensible`:

```typescript
fastify.httpErrors.badRequest('Invalid input');            // 400
fastify.httpErrors.unauthorized('Invalid credentials');     // 401
fastify.httpErrors.forbidden('Access denied');              // 403
fastify.httpErrors.notFound('Resource not found');          // 404
fastify.httpErrors.conflict('Already exists');              // 409
fastify.httpErrors.gone('Resource no longer available');    // 410
fastify.httpErrors.unprocessableEntity('Invalid data');     // 422
fastify.httpErrors.tooManyRequests('Rate limit exceeded');  // 429
fastify.httpErrors.internalServerError('System failure');   // 500
```

### Route-Specific errorHandler Option

Individual routes can define their own error handler, overriding the global one. Use this for routes that need specialized error handling (file uploads, webhooks, etc.).

```typescript
fastify.post('/webhooks/stripe', {
  schema: { /* ... */ },
  errorHandler: (error, request, reply) => {
    // Stripe webhooks need specific error responses
    request.log.error({ err: error }, 'Stripe webhook processing failed');
    // Return 200 to prevent Stripe from retrying on application errors
    reply.code(200).send({ received: true, error: error.message });
  },
  handler: async (request, reply) => {
    // Process webhook
  },
});
```

### Never Expose Stack Traces in Production

Stack traces reveal file paths, dependency versions, and internal architecture. Always strip them in production.

```typescript
fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode ?? 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const response: Record<string, unknown> = {
    statusCode,
    error: statusCode >= 500 ? 'Internal Server Error' : error.name,
    message: statusCode >= 500 && isProduction
      ? 'An unexpected error occurred'
      : error.message,
  };

  // Include stack trace ONLY in development
  if (!isProduction && error.stack) {
    response.stack = error.stack;
  }

  reply.code(statusCode).send(response);
});
```

---

## Validation and Serialization

Fastify compiles JSON schemas at startup for both input validation (Ajv) and output serialization (fast-json-stringify). This is one of Fastify's key performance advantages.

### TypeBox as the Type Provider

TypeBox lets you define a single schema that serves as both a JSON Schema (for Ajv validation) and a TypeScript type. This eliminates type drift between validation and code.

```typescript
import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type, type Static } from '@sinclair/typebox';

const fastify = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

// Define schemas
const CreateUserBody = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  role: Type.Optional(Type.Enum({ ADMIN: 'ADMIN', USER: 'USER' })),
});

const UserResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String(),
  name: Type.String(),
  role: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
});

const UserParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

// Use in route -- full type inference
fastify.post(
  '/users',
  {
    schema: {
      description: 'Create a new user',
      tags: ['Users'],
      summary: 'Create user',
      body: CreateUserBody,
      response: {
        201: Type.Object({
          success: Type.Boolean(),
          data: UserResponse,
        }),
      },
    },
  },
  async (request, reply) => {
    // request.body is fully typed: { email: string; name: string; role?: 'ADMIN' | 'USER' }
    const { email, name, role } = request.body;

    const user = await createUser({ email, name, role });

    return reply.code(201).send({
      success: true,
      data: user,
    });
  },
);
```

### Response Serialization for Performance

When you define a `response` schema, Fastify uses `fast-json-stringify` instead of `JSON.stringify`. This can be **2-10x faster** because the serializer is compiled at startup knowing the exact shape of the data.

```typescript
// With response schema -- fast-json-stringify (compiled, fast)
fastify.get(
  '/users',
  {
    schema: {
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Array(UserResponse),
          meta: Type.Object({
            total: Type.Number(),
            page: Type.Number(),
            pageSize: Type.Number(),
          }),
        }),
      },
    },
  },
  async (request) => {
    // Response is serialized with compiled fast-json-stringify
    return {
      success: true,
      data: users,
      meta: { total: 100, page: 1, pageSize: 20 },
    };
  },
);

// Without response schema -- falls back to JSON.stringify (slower)
// Avoid this in production code
```

An additional security benefit: the response schema acts as a whitelist. Any properties in the response object that are NOT in the schema are automatically stripped. This prevents accidental data leakage (password hashes, internal IDs, etc.).

### additionalProperties: false for Security

By default, Ajv allows additional properties in the request body. For security, set `additionalProperties: false` to reject unexpected fields. TypeBox `Type.Object()` does NOT set this by default.

```typescript
const CreateUserBody = Type.Object(
  {
    email: Type.String({ format: 'email' }),
    name: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }, // Reject any extra fields
);
```

You can also set this globally in the Ajv configuration:

```typescript
const fastify = Fastify({
  ajv: {
    customOptions: {
      removeAdditional: 'all', // Strip unknown properties instead of rejecting
      useDefaults: true,       // Apply default values from schema
      coerceTypes: false,      // Do not coerce types (strict mode)
      allErrors: true,         // Report all validation errors, not just the first
    },
  },
});
```

### Shared Schemas with $ref and addSchema

For schemas reused across multiple routes, register them once with `addSchema` and reference them via `$ref`. This avoids duplication and improves compilation performance.

```typescript
import { Type } from '@sinclair/typebox';

export default async function sharedSchemas(fastify: FastifyInstance) {
  // Register shared schemas
  fastify.addSchema(
    Type.Object(
      {
        id: Type.String({ format: 'uuid' }),
        email: Type.String({ format: 'email' }),
        name: Type.String(),
        createdAt: Type.String({ format: 'date-time' }),
        updatedAt: Type.String({ format: 'date-time' }),
      },
      { $id: 'User', title: 'User' },
    ),
  );

  fastify.addSchema(
    Type.Object(
      {
        total: Type.Number(),
        page: Type.Number(),
        pageSize: Type.Number(),
        totalPages: Type.Number(),
      },
      { $id: 'PaginationMeta', title: 'PaginationMeta' },
    ),
  );
}

// Reference in routes
fastify.get('/users', {
  schema: {
    response: {
      200: Type.Object({
        success: Type.Boolean(),
        data: Type.Array(Type.Ref('User')),
        meta: Type.Ref('PaginationMeta'),
      }),
    },
  },
  handler: async () => { /* ... */ },
});
```

### schemaErrorFormatter for User-Friendly Messages

Customize how validation errors are presented to API consumers. The default Ajv messages are often cryptic for end users.

```typescript
const fastify = Fastify({
  schemaErrorFormatter: (errors, dataVar) => {
    const details = errors.map((error) => {
      const field = error.instancePath
        ? error.instancePath.slice(1).replace(/\//g, '.')
        : error.params?.missingProperty || 'unknown';

      switch (error.keyword) {
        case 'required':
          return `Field '${error.params?.missingProperty}' is required`;
        case 'type':
          return `Field '${field}' must be of type ${error.params?.type}`;
        case 'format':
          return `Field '${field}' must be a valid ${error.params?.format}`;
        case 'minLength':
          return `Field '${field}' must be at least ${error.params?.limit} characters`;
        case 'maxLength':
          return `Field '${field}' must be at most ${error.params?.limit} characters`;
        case 'enum':
          return `Field '${field}' must be one of: ${error.params?.allowedValues?.join(', ')}`;
        default:
          return `Field '${field}': ${error.message}`;
      }
    });

    const error = new Error(details.join('. '));
    (error as any).statusCode = 400;
    return error;
  },
});
```

---

## Logging

Fastify has Pino built in. Never use `console.log` -- it is synchronous, unstructured, and lacks request context.

### request.log for Request-Scoped Logging

Every request gets a logger instance with the request ID automatically included. Use `request.log` in handlers and hooks for full traceability.

```typescript
fastify.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string };

  request.log.info({ userId: id }, 'Fetching user');

  const user = await fastify.prisma.user.findUnique({ where: { id } });

  if (!user) {
    request.log.warn({ userId: id }, 'User not found');
    throw fastify.httpErrors.notFound(`User ${id} not found`);
  }

  request.log.debug({ userId: id, email: user.email }, 'User fetched successfully');
  return { success: true, data: user };
});
```

Output (structured JSON):

```json
{
  "level": 30,
  "time": 1710000000000,
  "pid": 1,
  "hostname": "app-container",
  "reqId": "req-1",
  "userId": "abc-123",
  "msg": "Fetching user"
}
```

### fastify.log for Application-Level Logging

Use `fastify.log` for events outside request context -- startup, shutdown, scheduled jobs, background workers.

```typescript
fastify.log.info(
  { port: fastify.config.PORT, env: fastify.config.NODE_ENV },
  'Application started',
);

// In a BullMQ worker
fastify.log.info({ jobId: job.id, jobName: job.name }, 'Processing background job');
```

### Structured Logging -- Objects First

Pino's API puts the data object first, then the message string. This is critical for log aggregation tools (Elasticsearch, Datadog, Grafana Loki) which can index and search structured fields.

```typescript
// CORRECT -- structured data as first argument
request.log.info({ userId, action: 'login', ip: request.ip }, 'User authenticated');

// WRONG -- string interpolation loses structure
// request.log.info(`User ${userId} authenticated from ${request.ip}`);

// WRONG -- object as second argument does not get structured
// request.log.info('User authenticated', { userId });
```

### Log Levels

```
trace  --> Extremely verbose, function-level tracing
debug  --> Detailed diagnostic information
info   --> Normal operational events (startup, request completed)
warn   --> Unexpected but recoverable situations
error  --> Errors that need attention
fatal  --> Application is about to crash
```

Set levels per environment:

```typescript
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    // Human-readable format in development
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
              colorize: true,
            },
          }
        : undefined,
  },
});
```

### Custom Serializers for Sensitive Data Redaction

Prevent sensitive data from appearing in logs by customizing Pino's serializers.

```typescript
const fastify = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          // Redact authorization header
          headers: {
            ...request.headers,
            authorization: request.headers.authorization ? '[REDACTED]' : undefined,
            cookie: request.headers.cookie ? '[REDACTED]' : undefined,
          },
        };
      },
      res(reply) {
        return {
          statusCode: reply.statusCode,
        };
      },
    },
  },
});
```

### Disable Logging in Tests

Tests should not produce log output. Set `logger: false` or `level: 'silent'` when building the app for testing.

```typescript
// test/helpers.ts
import Fastify from 'fastify';
import { app } from '../src/app/app';

export async function buildTestApp() {
  const fastify = Fastify({
    logger: false, // Silent in tests
  });
  await fastify.register(app);
  await fastify.ready();
  return fastify;
}
```

---

## Performance

Fastify is designed to be one of the fastest Node.js frameworks. These practices ensure you do not accidentally negate its performance advantages.

### Return Values Instead of reply.send()

When a handler returns a value, Fastify handles serialization optimally. Using `reply.send()` adds promise overhead. Prefer returning values for simple responses.

```typescript
// PREFERRED -- return value directly
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// ACCEPTABLE -- use reply.send() when you need to set status code or headers
fastify.post('/users', async (request, reply) => {
  const user = await createUser(request.body);
  return reply.code(201).send({ success: true, data: user });
});
```

### Use Schema Serialization on All Responses

As described in the Validation section, defining a `response` schema triggers `fast-json-stringify`. This is dramatically faster than `JSON.stringify` for known shapes. Always define response schemas for performance-critical routes.

### connectionTimeout and keepAliveTimeout Tuning

Tune timeouts for your deployment environment. Behind a load balancer, `keepAliveTimeout` should be longer than the load balancer's idle timeout to prevent premature connection drops.

```typescript
const fastify = Fastify({
  // Maximum time to wait for a complete HTTP request (headers + body)
  connectionTimeout: 30_000, // 30 seconds

  // How long to keep idle connections open
  // AWS ALB default idle timeout is 60s, so set this higher
  keepAliveTimeout: 72_000, // 72 seconds (> ALB's 60s)

  // Maximum time for request headers (prevents slowloris attacks)
  // Node.js default is 60s -- lower it for security
  // Note: This is set on the underlying http.Server
});

// For the underlying Node.js server
fastify.server.headersTimeout = 65_000;
```

### trustProxy for Reverse Proxy Deployments

If Fastify runs behind a reverse proxy (nginx, AWS ALB, Cloudflare), enable `trustProxy` to correctly resolve client IP, protocol, and hostname from forwarded headers.

```typescript
const fastify = Fastify({
  // Trust first proxy (single reverse proxy)
  trustProxy: true,

  // Or specify the number of proxies
  // trustProxy: 2,

  // Or specify trusted addresses
  // trustProxy: '10.0.0.0/8',
});

// With trustProxy enabled:
// request.ip       --> client's real IP (from X-Forwarded-For)
// request.hostname --> original hostname (from X-Forwarded-Host)
// request.protocol --> original protocol (from X-Forwarded-Proto)
```

### caseSensitive and ignoreDuplicateSlashes

These settings prevent routing ambiguity and potential security issues.

```typescript
const fastify = Fastify({
  // /Users and /users are different routes (default: true)
  caseSensitive: true,

  // /users//123 is NOT treated as /users/123 (default: false)
  ignoreDuplicateSlashes: false,

  // /users/ and /users are different routes (default: false)
  ignoreTrailingSlash: false,
});
```

### Avoid Synchronous Operations in Hooks and Handlers

Fastify runs on a single event loop thread. Any synchronous blocking operation (CPU-heavy computation, synchronous file I/O, large JSON parsing) will stall ALL concurrent requests.

```typescript
// WRONG -- blocks the event loop
fastify.get('/report', async () => {
  const data = fs.readFileSync('/large/file.csv', 'utf-8'); // Blocks!
  const parsed = expensiveParsing(data); // Blocks!
  return parsed;
});

// CORRECT -- use async I/O and offload heavy computation
import { readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';

fastify.get('/report', async (request) => {
  const data = await readFile('/large/file.csv', 'utf-8');

  // Offload CPU-heavy work to a worker thread
  const parsed = await runInWorker(data);
  return parsed;
});

// Or better: enqueue it as a background job
fastify.get('/report', async (request, reply) => {
  const jobId = await fastify.queues.reports.add('generate-report', {
    userId: request.user?.id,
  });

  return reply.code(202).send({
    success: true,
    data: { jobId: jobId.id, status: 'processing' },
  });
});
```

---

## Graceful Shutdown

Production applications must handle shutdown signals cleanly -- finish in-flight requests, close database connections, and release resources before exiting.

### Listen for SIGTERM and SIGINT

Docker, Kubernetes, and process managers send SIGTERM when stopping a container. SIGINT is sent on Ctrl+C during local development.

```typescript
// src/server.ts
import Fastify from 'fastify';
import { app } from './app/app';

const SHUTDOWN_TIMEOUT_MS = 30_000; // 30 seconds

async function start() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  await fastify.register(app);

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    fastify.log.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

    // Set a hard deadline -- if graceful shutdown takes too long, force exit
    const forceShutdownTimer = setTimeout(() => {
      fastify.log.fatal('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    // Prevent the timer from keeping the process alive
    forceShutdownTimer.unref();

    try {
      // fastify.close() does the following:
      // 1. Stops accepting new connections
      // 2. Waits for in-flight requests to complete
      // 3. Triggers all onClose hooks (database disconnect, Redis disconnect, etc.)
      await fastify.close();
      fastify.log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      fastify.log.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('unhandledRejection', (reason) => {
    fastify.log.fatal({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    fastify.log.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  // Start listening
  try {
    await fastify.listen({
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0', // Required for Docker
    });
  } catch (err) {
    fastify.log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
```

### onClose Hooks for Resource Cleanup

Every plugin that opens a connection should register an `onClose` hook to clean up. Fastify calls these hooks in reverse registration order during `fastify.close()`.

```typescript
// Prisma plugin -- disconnect on shutdown
export default fp(
  async (fastify) => {
    const prisma = new PrismaClient();
    await prisma.$connect();
    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async (instance) => {
      instance.log.info('Disconnecting Prisma client');
      await prisma.$disconnect();
    });
  },
  { name: 'prisma-plugin' },
);

// Redis plugin -- disconnect on shutdown
export default fp(
  async (fastify) => {
    const redis = new Redis(fastify.config.REDIS_URL);
    fastify.decorate('redis', redis);

    fastify.addHook('onClose', async (instance) => {
      instance.log.info('Disconnecting Redis client');
      await redis.quit();
    });
  },
  { name: 'redis-plugin' },
);

// BullMQ workers -- close on shutdown
export default fp(
  async (fastify) => {
    const worker = new Worker('jobs', processor, {
      connection: fastify.redis,
    });

    fastify.addHook('onClose', async () => {
      fastify.log.info('Closing BullMQ worker');
      await worker.close();
    });
  },
  { name: 'bullmq-worker-plugin' },
);
```

---

## Testing

Fastify's `inject()` method simulates HTTP requests without binding to a port. This eliminates network overhead and port conflicts, making tests fast and reliable.

### Use fastify.inject() for Integration Tests

`inject()` sends a request through Fastify's full lifecycle (hooks, validation, serialization, error handling) without actual TCP/IP overhead.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { app } from '../../src/app/app';

describe('Users API', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(app);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('should create a user', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/users',
      payload: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('test@example.com');
    expect(body.data.id).toBeDefined();
  });

  it('should return 400 for invalid email', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/users',
      payload: {
        email: 'not-an-email',
        name: 'Test',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toContain('Validation');
  });

  it('should return 404 for non-existent user', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/users/00000000-0000-0000-0000-000000000000',
    });

    expect(response.statusCode).toBe(404);
  });
});
```

### Build App Without Calling listen() for Tests

Never call `fastify.listen()` in tests. Use `fastify.ready()` to initialize the application and then use `inject()`. This avoids port binding entirely.

```typescript
// test/helpers/build-app.ts
import Fastify, { type FastifyInstance } from 'fastify';
import { app } from '../../src/app/app';

export async function buildTestApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false, // Silent logging in tests
  });

  // Register the app (all plugins, routes, hooks)
  await fastify.register(app);

  // Initialize without binding to a port
  await fastify.ready();

  return fastify;
}

export async function teardownTestApp(fastify: FastifyInstance): Promise<void> {
  await fastify.close();
}
```

### Test Plugin Isolation

Test individual plugins in isolation to verify they decorate correctly and handle errors. This catches issues early without running the full application stack.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import prismaPlugin from '../../src/app/plugins/prisma.plugin';

describe('Prisma Plugin', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = Fastify({ logger: false });

    // Register only the plugin under test
    await fastify.register(prismaPlugin);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('should decorate fastify with prisma client', () => {
    expect(fastify.hasDecorator('prisma')).toBe(true);
    expect(fastify.prisma).toBeDefined();
  });

  it('should connect to the database', async () => {
    // A simple query to verify connectivity
    const result = await fastify.prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });
});
```

### Testing Hooks and Middleware

To test that hooks execute correctly (authentication, authorization, timing), create focused test routes and verify the behavior through inject.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import authPlugin from '../../src/app/plugins/auth.plugin';

describe('Auth Hook', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(authPlugin);

    // Add a test route that requires authentication
    fastify.get('/protected', async (request) => {
      return { user: request.user };
    });

    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('should reject requests without auth header', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject invalid tokens', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should allow valid tokens and populate request.user', async () => {
    const validToken = generateTestToken({ id: 'user-1', email: 'test@example.com' });

    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user.id).toBe('user-1');
  });
});
```

---

## Summary of Key Rules

| Rule | Why |
| --- | --- |
| Register `@fastify/env` first | All other plugins may depend on configuration |
| Use `fastify-plugin` only for infrastructure | Domain modules should remain encapsulated |
| Initialize decorators with `null` | V8 hidden class optimization |
| Always define response schemas | 2-10x serialization performance, prevents data leakage |
| Use `request.log` in handlers | Includes reqId for request tracing |
| Never use `console.log` | Synchronous, unstructured, no request context |
| Return values from handlers | Less overhead than `reply.send()` |
| Return `reply` when short-circuiting hooks | Prevents "reply already sent" errors |
| Handle SIGTERM and SIGINT | Required for clean container shutdown |
| Use `fastify.inject()` for tests | No port binding, full lifecycle coverage |
| Set `additionalProperties: false` | Rejects unexpected input fields |
| Never expose stack traces in production | Security -- prevents information disclosure |
