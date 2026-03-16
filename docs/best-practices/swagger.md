# Swagger / OpenAPI Best Practices

Comprehensive guide for documenting Fastify APIs with `@fastify/swagger` and `@fastify/swagger-ui`, using TypeBox for schema definitions. Every pattern in this document targets OpenAPI 3.0.3 output and assumes ESM with TypeScript.

---

## Table of Contents

1. [Plugin Setup](#plugin-setup)
2. [Route Documentation](#route-documentation)
3. [Schema Design with TypeBox](#schema-design-with-typebox)
4. [Tags Strategy](#tags-strategy)
5. [Security Schemes](#security-schemes)
6. [Response Best Practices](#response-best-practices)
7. [Request Validation](#request-validation)
8. [Versioning](#versioning)
9. [Documentation Quality](#documentation-quality)

---

## Plugin Setup

### Registration Order

`@fastify/swagger` must be registered **before** any route-registering plugins so it can intercept schemas. `@fastify/swagger-ui` must be registered **after** `@fastify/swagger`.

```typescript
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export async function registerDocumentation(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Acme Platform API',
        description: `
RESTful API for the Acme Platform.

## Authentication

All endpoints except \`/health\` and \`/auth/login\` require a valid JWT
in the \`Authorization: Bearer <token>\` header.

## Error Format

Every error response uses a consistent envelope:

\`\`\`json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Detailed, human-readable explanation"
}
\`\`\`
        `,
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'api-support@acme.com',
        },
        license: {
          name: 'Proprietary',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development',
        },
        {
          url: 'https://api.staging.acme.com',
          description: 'Staging',
        },
        {
          url: 'https://api.acme.com',
          description: 'Production',
        },
      ],
      tags: [
        { name: 'System', description: 'Health checks and monitoring' },
        { name: 'Auth', description: 'Authentication and token management' },
        { name: 'Users', description: 'User account management' },
        { name: 'Orders', description: 'Order lifecycle management' },
        { name: 'Products', description: 'Product catalog operations' },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from POST /auth/login',
          },
        },
        schemas: {
          BadRequestError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 400 },
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'Invalid input' },
            },
          },
          UnauthorizedError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 401 },
              error: { type: 'string', example: 'Unauthorized' },
              message: { type: 'string', example: 'Invalid or expired token' },
            },
          },
          ForbiddenError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 403 },
              error: { type: 'string', example: 'Forbidden' },
              message: { type: 'string', example: 'Access denied' },
            },
          },
          NotFoundError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 404 },
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string', example: 'Resource not found' },
            },
          },
          ConflictError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 409 },
              error: { type: 'string', example: 'Conflict' },
              message: {
                type: 'string',
                example: 'A resource with this identifier already exists',
              },
            },
          },
          InternalServerError: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 500 },
              error: { type: 'string', example: 'Internal Server Error' },
              message: { type: 'string', example: 'An unexpected error occurred' },
            },
          },
        },
      },
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayOperationId: true,
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
    staticCSP: false,
  });
}
```

### Key Configuration Notes

- **`openapi: '3.0.3'`** -- Always pin to a specific OpenAPI version rather than relying on defaults. 3.0.3 has the widest tooling support.
- **`staticCSP: false`** -- Required when `@fastify/helmet` is active in development, otherwise Swagger UI assets are blocked. For production, configure explicit CSP directives that allow Swagger UI scripts and styles.
- **`displayOperationId: true`** -- Makes `operationId` visible in the UI, which is critical for code-generation consumers.
- **`filter: true`** -- Enables the search bar in Swagger UI, helpful when the API grows past 20-30 endpoints.
- **Component schemas** -- Define all reusable error types here once. Routes reference them via `{ $ref: 'BadRequestError#' }`.

---

## Route Documentation

### Mandatory Schema Properties

Every route **must** include the following in its schema object:

| Property | Purpose |
|---|---|
| `tags` | Groups the endpoint in Swagger UI |
| `summary` | One-line description shown in collapsed view |
| `description` | Multi-line markdown with behavior, use cases, restrictions |
| `operationId` | Unique identifier for code generation |
| `response` | All possible status codes with typed schemas |

### operationId Convention

Use `verbNoun` in camelCase. The verb describes the action; the noun describes the resource.

| Pattern | Examples |
|---|---|
| List | `listUsers`, `listOrders`, `listProductVariants` |
| Get single | `getUserById`, `getOrderDetails` |
| Create | `createUser`, `createOrder` |
| Update (full) | `replaceUser`, `replaceOrder` |
| Update (partial) | `updateUser`, `updateOrderStatus` |
| Delete | `deleteUser`, `cancelOrder` |
| Action | `activateUser`, `submitOrder`, `resetPassword` |

### Complete Route Schema Example

```typescript
import { Type } from '@sinclair/typebox';
import { SuccessResponse, PaginatedResponse } from '../../common/schemas/shared.schemas';

// --- Reusable domain schemas ---

const UserResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  name: Type.String(),
  role: Type.Union([Type.Literal('admin'), Type.Literal('member')]),
  department: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

// --- Path parameters ---

const UserParams = Type.Object({
  id: Type.String({
    format: 'uuid',
    description: 'Unique identifier of the user',
  }),
});

// --- Query parameters ---

const ListUsersQuery = Type.Object({
  page: Type.Optional(
    Type.Number({
      minimum: 1,
      default: 1,
      description: 'Page number (1-indexed)',
    }),
  ),
  pageSize: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Number of items per page',
    }),
  ),
  role: Type.Optional(
    Type.Union([Type.Literal('admin'), Type.Literal('member')], {
      description: 'Filter by user role',
    }),
  ),
  search: Type.Optional(
    Type.String({
      minLength: 1,
      maxLength: 255,
      description: 'Search by name or email (case-insensitive partial match)',
    }),
  ),
  sortBy: Type.Optional(
    Type.Union([Type.Literal('name'), Type.Literal('email'), Type.Literal('createdAt')], {
      default: 'createdAt',
      description: 'Field to sort results by',
    }),
  ),
  sortOrder: Type.Optional(
    Type.Union([Type.Literal('asc'), Type.Literal('desc')], {
      default: 'desc',
      description: 'Sort direction',
    }),
  ),
});

// --- Request bodies ---

const CreateUserBody = Type.Object(
  {
    email: Type.String({
      format: 'email',
      description: 'Unique email address for the user',
    }),
    name: Type.String({
      minLength: 1,
      maxLength: 255,
      description: 'Full name of the user',
    }),
    role: Type.Optional(
      Type.Union([Type.Literal('admin'), Type.Literal('member')], {
        default: 'member',
        description: 'Role assigned to the user. Defaults to "member"',
      }),
    ),
    departmentId: Type.Optional(
      Type.String({
        format: 'uuid',
        description: 'ID of the department to assign the user to',
      }),
    ),
  },
  { additionalProperties: false },
);

const UpdateUserBody = Type.Object(
  {
    name: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 255,
        description: 'Updated full name',
      }),
    ),
    role: Type.Optional(
      Type.Union([Type.Literal('admin'), Type.Literal('member')], {
        description: 'Updated role',
      }),
    ),
    departmentId: Type.Optional(
      Type.Union([Type.String({ format: 'uuid' }), Type.Null()], {
        description: 'Updated department ID. Set to null to remove department assignment',
      }),
    ),
  },
  { additionalProperties: false },
);

// --- Route schemas ---

export const listUsersSchema = {
  operationId: 'listUsers',
  tags: ['Users'],
  summary: 'List users with filtering and pagination',
  description: `
Retrieve a paginated list of users with optional filtering and sorting.

**Filtering**
- Filter by \`role\` to see only admins or members
- Use \`search\` for case-insensitive partial matching against name and email

**Sorting**
- Sort by \`name\`, \`email\`, or \`createdAt\`
- Default sort: \`createdAt\` descending (newest first)

**Pagination**
- Results are paginated with a default page size of 20
- Maximum page size is 100
- Response includes \`meta\` with total count and page information
  `,
  querystring: ListUsersQuery,
  response: {
    200: PaginatedResponse(UserResponse),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    500: { $ref: 'InternalServerError#' },
  },
};

export const getUserByIdSchema = {
  operationId: 'getUserById',
  tags: ['Users'],
  summary: 'Get a single user by ID',
  description: `
Retrieve complete details for a single user.

**Includes**
- Basic profile information (name, email, role)
- Department assignment (null if unassigned)
- Timestamps (created, updated)

**Errors**
- Returns 404 if the user ID does not match any existing user
  `,
  params: UserParams,
  response: {
    200: SuccessResponse(UserResponse),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
    500: { $ref: 'InternalServerError#' },
  },
};

export const createUserSchema = {
  operationId: 'createUser',
  tags: ['Users'],
  summary: 'Create a new user',
  description: `
Create a new user account.

**Automatic Fields**
- \`id\`: Generated UUID v4
- \`createdAt\` / \`updatedAt\`: Set to current timestamp
- \`role\`: Defaults to \`"member"\` if not specified

**Validation**
- \`email\` must be unique across all users
- \`name\` must be between 1 and 255 characters
- \`departmentId\`, if provided, must reference an existing department

**Errors**
- Returns 409 if a user with the same email already exists
- Returns 400 if departmentId references a non-existent department
  `,
  body: CreateUserBody,
  response: {
    201: SuccessResponse(UserResponse),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    409: { $ref: 'ConflictError#' },
    500: { $ref: 'InternalServerError#' },
  },
};

export const updateUserSchema = {
  operationId: 'updateUser',
  tags: ['Users'],
  summary: 'Partially update a user',
  description: `
Update one or more fields on an existing user. Only the fields included in the
request body will be modified; omitted fields remain unchanged.

**Updatable Fields**
- \`name\`: Change the user's display name
- \`role\`: Change role between admin and member
- \`departmentId\`: Reassign department, or set to \`null\` to remove assignment

**Side Effects**
- \`updatedAt\` timestamp is automatically refreshed

**Errors**
- Returns 404 if the user does not exist
  `,
  params: UserParams,
  body: UpdateUserBody,
  response: {
    200: SuccessResponse(UserResponse),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
    500: { $ref: 'InternalServerError#' },
  },
};

export const deleteUserSchema = {
  operationId: 'deleteUser',
  tags: ['Users'],
  summary: 'Delete a user',
  description: `
Permanently delete a user account. This action is **irreversible**.

**Cascade Behavior**
- All associated sessions are terminated
- Audit log entries are preserved (user reference becomes null)

**Errors**
- Returns 404 if the user does not exist
  `,
  params: UserParams,
  response: {
    204: Type.Null({ description: 'User successfully deleted' }),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
    500: { $ref: 'InternalServerError#' },
  },
};
```

### Applying Schemas to Routes

```typescript
import type { FastifyInstance } from 'fastify';
import {
  listUsersSchema,
  getUserByIdSchema,
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
} from '../schemas/user.schemas';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/', { schema: listUsersSchema }, async (request, reply) => {
    // handler implementation
  });

  fastify.get('/:id', { schema: getUserByIdSchema }, async (request, reply) => {
    // handler implementation
  });

  fastify.post('/', { schema: createUserSchema }, async (request, reply) => {
    // handler implementation -- reply.code(201).send(...)
  });

  fastify.patch('/:id', { schema: updateUserSchema }, async (request, reply) => {
    // handler implementation
  });

  fastify.delete('/:id', { schema: deleteUserSchema }, async (request, reply) => {
    // handler implementation -- reply.code(204).send()
  });
}
```

---

## Schema Design with TypeBox

### Foundational Principles

1. **Always set `additionalProperties: false`** on request body schemas to reject unexpected fields.
2. **Use `$id` for schemas that need to be referenced** from multiple locations.
3. **Keep schemas in dedicated files** (`*.schemas.ts`) next to the routes that consume them.
4. **Shared schemas** (pagination, response wrappers, common value objects) go in `src/app/common/schemas/`.

### Type.Optional vs Type.Union with Type.Null

This is one of the most common sources of confusion. The rules are precise:

```typescript
import { Type } from '@sinclair/typebox';

// OPTIONAL: Field may or may not be present in the payload.
// Use for request bodies where the client can omit the field entirely.
const UpdateBody = Type.Object({
  name: Type.Optional(Type.String()),    // Client can omit "name"
  bio: Type.Optional(Type.String()),     // Client can omit "bio"
});

// NULLABLE: Field is always present but its value can be null.
// Use for response schemas where the field exists but may have no value.
const UserResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  bio: Type.Union([Type.String(), Type.Null()]),         // Always present, can be null
  avatarUrl: Type.Union([Type.String(), Type.Null()]),   // Always present, can be null
});

// OPTIONAL + NULLABLE: Field can be omitted OR explicitly set to null.
// Use for PATCH request bodies where the client can:
//   - Omit the field (no change)
//   - Send null (clear the value)
//   - Send a value (update the value)
const PatchBody = Type.Object({
  bio: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});
```

**Rule of thumb:**
- Request schemas: `Type.Optional(...)` for fields the client may omit
- Response schemas: `Type.Union([T, Type.Null()])` for fields that can be null
- Entity `toResponse()` methods: use `?? null` for nullable fields, never `?.`

### Schema Composition

TypeBox provides utilities for composing schemas without duplication.

```typescript
import { Type, type Static } from '@sinclair/typebox';

// Base entity with shared fields
const BaseEntity = Type.Object({
  id: Type.String({ format: 'uuid' }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

// Domain-specific fields
const ProductFields = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  sku: Type.String({ pattern: '^[A-Z0-9-]+$', description: 'Stock Keeping Unit' }),
  price: Type.Number({ minimum: 0, description: 'Price in cents (integer)' }),
  currency: Type.String({ minLength: 3, maxLength: 3, description: 'ISO 4217 currency code' }),
  description: Type.Union([Type.String(), Type.Null()]),
  isActive: Type.Boolean({ default: true }),
});

// Full response: Base + Domain
const ProductResponse = Type.Intersect([BaseEntity, ProductFields]);

// Create request: Only the fields the client provides
const CreateProductBody = Type.Pick(ProductFields, ['name', 'sku', 'price', 'currency'], {
  additionalProperties: false,
});

// Update request: All domain fields optional
const UpdateProductBody = Type.Partial(
  Type.Pick(ProductFields, ['name', 'price', 'description', 'isActive']),
  { additionalProperties: false },
);

// Derive TypeScript types from schemas
type Product = Static<typeof ProductResponse>;
type CreateProduct = Static<typeof CreateProductBody>;
type UpdateProduct = Static<typeof UpdateProductBody>;
```

### Reusable Schemas with $id

Assign `$id` to schemas that are referenced from multiple routes or that you want to appear in the "Schemas" section of Swagger UI.

```typescript
import { Type } from '@sinclair/typebox';

// Adding $id allows this schema to be referenced via { $ref: 'Address#' }
const AddressSchema = Type.Object(
  {
    street: Type.String({ minLength: 1, maxLength: 500 }),
    city: Type.String({ minLength: 1, maxLength: 255 }),
    state: Type.String({ minLength: 2, maxLength: 2, description: 'Two-letter state code' }),
    postalCode: Type.String({ pattern: '^\\d{5}(-\\d{4})?$' }),
    country: Type.String({ minLength: 2, maxLength: 2, description: 'ISO 3166-1 alpha-2' }),
  },
  { $id: 'Address', additionalProperties: false },
);

// Register the schema with Fastify so $ref resolution works
// Typically done in a plugin:
export default async function schemaPlugin(fastify: FastifyInstance) {
  fastify.addSchema(AddressSchema);
}
```

Then reference it in route schemas:

```typescript
const CreateOrderBody = Type.Object(
  {
    items: Type.Array(OrderItemSchema, { minItems: 1 }),
    shippingAddress: Type.Ref(AddressSchema),
    billingAddress: Type.Optional(Type.Ref(AddressSchema)),
  },
  { additionalProperties: false },
);
```

### Enum Schemas

```typescript
import { Type } from '@sinclair/typebox';

// Simple string enum
const OrderStatus = Type.Union(
  [
    Type.Literal('pending'),
    Type.Literal('confirmed'),
    Type.Literal('shipped'),
    Type.Literal('delivered'),
    Type.Literal('cancelled'),
  ],
  {
    description: `Order lifecycle status:
- **pending**: Order created but not yet confirmed
- **confirmed**: Payment received, awaiting fulfillment
- **shipped**: Order dispatched to carrier
- **delivered**: Order received by customer
- **cancelled**: Order cancelled (terminal state)`,
  },
);

// For use in query filters where the client can select multiple statuses
const StatusFilter = Type.Optional(
  Type.Array(OrderStatus, {
    description: 'Filter by one or more statuses',
  }),
);
```

### Pagination Wrapper

A reusable generic wrapper for paginated responses:

```typescript
import { Type } from '@sinclair/typebox';
import type { TSchema } from '@sinclair/typebox';

export function PaginatedResponse<T extends TSchema>(itemSchema: T) {
  return Type.Object({
    success: Type.Literal(true),
    data: Type.Array(itemSchema),
    meta: Type.Object({
      total: Type.Number({ description: 'Total number of matching records' }),
      page: Type.Number({ description: 'Current page number (1-indexed)' }),
      pageSize: Type.Number({ description: 'Number of items per page' }),
      totalPages: Type.Number({ description: 'Total number of pages' }),
    }),
  });
}

export const PaginationQuerySchema = Type.Object({
  page: Type.Optional(
    Type.Number({ minimum: 1, default: 1, description: 'Page number (1-indexed)' }),
  ),
  pageSize: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Items per page (max 100)',
    }),
  ),
});
```

### Error Response Schemas

Define error schemas as component schemas in the OpenAPI config (see [Plugin Setup](#plugin-setup)), then reference them in routes via `$ref`:

```typescript
response: {
  200: SuccessResponse(UserResponse),
  400: { $ref: 'BadRequestError#' },
  401: { $ref: 'UnauthorizedError#' },
  403: { $ref: 'ForbiddenError#' },
  404: { $ref: 'NotFoundError#' },
  409: { $ref: 'ConflictError#' },
  500: { $ref: 'InternalServerError#' },
}
```

The `#` suffix is required by Fastify's `$ref` resolution. Without it, the reference will not resolve.

---

## Tags Strategy

### Principles

1. **One tag per domain / bounded context.** Do not split a single domain across multiple tags.
2. **PascalCase plural nouns**: `Users`, `Orders`, `Products`, `Departments`.
3. **Define all tags in the OpenAPI config** with descriptions, even if no routes use them yet. This establishes the API's structure upfront.
4. **System tag** for non-business endpoints (health checks, metrics, documentation).

### Tag Definition

```typescript
tags: [
  { name: 'System', description: 'Health probes, metrics, and operational endpoints' },
  { name: 'Auth', description: 'Authentication, token refresh, and session management' },
  { name: 'Users', description: 'User account CRUD and profile management' },
  { name: 'Departments', description: 'Organizational unit management' },
  { name: 'Orders', description: 'Order lifecycle from creation to delivery' },
  { name: 'Products', description: 'Product catalog, variants, and inventory' },
  { name: 'Notifications', description: 'Notification preferences and delivery history' },
],
```

### Tag Usage in Routes

Every route schema must include exactly one tag (in rare cases two, when an endpoint bridges domains):

```typescript
export const listUsersSchema = {
  tags: ['Users'],  // Array with a single tag
  // ...
};
```

Avoid:
- Generic tags like "API" or "Misc"
- Tags named after HTTP methods ("GET Endpoints")
- Tags that map to infrastructure ("Database", "Redis")

---

## Security Schemes

### JWT Bearer Token

Define the security scheme once in the OpenAPI config components:

```typescript
components: {
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT access token obtained from `POST /auth/login`',
    },
  },
},
```

### Applying Security Globally

To require authentication on all routes by default:

```typescript
// In the openapi config object:
openapi: {
  // ... info, servers, tags, components ...
  security: [{ BearerAuth: [] }],
}
```

### Opting Out for Public Routes

Mark specific routes as public by setting an empty security array:

```typescript
export const loginSchema = {
  operationId: 'login',
  tags: ['Auth'],
  summary: 'Authenticate and receive a JWT',
  description: 'Public endpoint. No authentication required.',
  security: [],  // Overrides global security -- this route is public
  body: LoginBody,
  response: {
    200: SuccessResponse(TokenResponse),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const healthLivenessSchema = {
  operationId: 'healthLiveness',
  tags: ['System'],
  summary: 'Liveness probe',
  security: [],  // Public
  response: {
    200: SuccessResponse(LivenessData),
  },
};
```

### Per-Route Security (Multiple Schemes)

For routes that accept multiple authentication methods:

```typescript
export const webhookSchema = {
  operationId: 'handleWebhook',
  tags: ['Webhooks'],
  summary: 'Receive external webhook',
  security: [
    { BearerAuth: [] },
    { ApiKeyAuth: [] },  // Accepts either JWT or API key
  ],
  // ...
};
```

---

## Response Best Practices

### Consistent Response Envelope

Use a wrapper function to ensure every success response has the same shape:

```typescript
import { Type } from '@sinclair/typebox';
import type { TSchema } from '@sinclair/typebox';

export function SuccessResponse<T extends TSchema>(dataSchema: T) {
  return Type.Object({
    success: Type.Literal(true),
    data: dataSchema,
  });
}

export const MessageResponse = Type.Object({
  success: Type.Literal(true),
  message: Type.String(),
});
```

### Status Code Conventions

| Status Code | When to Use | Response Body |
|---|---|---|
| 200 | Successful retrieval or update | `SuccessResponse(DataSchema)` |
| 201 | Successful creation | `SuccessResponse(DataSchema)` |
| 204 | Successful deletion | No body (`Type.Null()`) |
| 400 | Validation error, malformed request | `{ $ref: 'BadRequestError#' }` |
| 401 | Missing or invalid authentication | `{ $ref: 'UnauthorizedError#' }` |
| 403 | Authenticated but insufficient permissions | `{ $ref: 'ForbiddenError#' }` |
| 404 | Resource not found | `{ $ref: 'NotFoundError#' }` |
| 409 | Unique constraint violation, duplicate resource | `{ $ref: 'ConflictError#' }` |
| 500 | Unhandled server error | `{ $ref: 'InternalServerError#' }` |

### Document All Applicable Status Codes

Every route must document every status code it can realistically return. Do not omit error responses:

```typescript
// GOOD: All possible outcomes documented
response: {
  201: SuccessResponse(OrderResponse),
  400: { $ref: 'BadRequestError#' },      // Invalid body
  401: { $ref: 'UnauthorizedError#' },     // No/bad token
  404: { $ref: 'NotFoundError#' },         // Referenced product not found
  409: { $ref: 'ConflictError#' },         // Duplicate order number
  500: { $ref: 'InternalServerError#' },   // Unexpected failure
}

// BAD: Only the happy path
response: {
  201: SuccessResponse(OrderResponse),
}
```

### Example Values in Schemas

TypeBox supports the `examples` and `description` annotations that flow through to OpenAPI:

```typescript
const OrderResponse = Type.Object({
  id: Type.String({ format: 'uuid', examples: ['550e8400-e29b-41d4-a716-446655440000'] }),
  orderNumber: Type.String({
    pattern: '^ORD-\\d{8}$',
    examples: ['ORD-20260312'],
    description: 'Human-readable order number in format ORD-YYYYMMDD',
  }),
  total: Type.Number({
    minimum: 0,
    examples: [4999],
    description: 'Total amount in cents',
  }),
  status: OrderStatus,
  createdAt: Type.String({
    format: 'date-time',
    examples: ['2026-03-12T10:30:00.000Z'],
  }),
});
```

---

## Request Validation

### Validate All Input Sources

Fastify validates params, querystring, body, and headers when schemas are provided. Always define schemas for every input source your route uses:

```typescript
export const getOrderItemSchema = {
  operationId: 'getOrderItem',
  tags: ['Orders'],
  summary: 'Get a specific item within an order',
  params: Type.Object({
    orderId: Type.String({
      format: 'uuid',
      description: 'The order containing the item',
    }),
    itemId: Type.String({
      format: 'uuid',
      description: 'The specific line item',
    }),
  }),
  response: {
    200: SuccessResponse(OrderItemResponse),
    404: { $ref: 'NotFoundError#' },
  },
};
```

### Constraint Annotations

Document constraints directly in the TypeBox schema. These flow into OpenAPI and are enforced at runtime by Fastify's Ajv integration:

```typescript
const CreateProductBody = Type.Object(
  {
    // String constraints
    name: Type.String({
      minLength: 1,
      maxLength: 255,
      description: 'Product display name',
    }),

    // String with regex pattern
    sku: Type.String({
      pattern: '^[A-Z]{2,4}-\\d{4,8}$',
      description: 'Stock Keeping Unit (e.g., ELEC-00142)',
    }),

    // Numeric constraints
    price: Type.Number({
      minimum: 0,
      maximum: 99999999,
      description: 'Price in cents (e.g., 1999 = $19.99)',
    }),

    // Integer type
    quantity: Type.Integer({
      minimum: 0,
      maximum: 999999,
      description: 'Available inventory count',
    }),

    // UUID format
    categoryId: Type.String({
      format: 'uuid',
      description: 'ID of the product category',
    }),

    // Date-time format (ISO 8601)
    availableFrom: Type.Optional(
      Type.String({
        format: 'date-time',
        description: 'ISO 8601 timestamp when the product becomes available',
      }),
    ),

    // Email format
    contactEmail: Type.Optional(
      Type.String({
        format: 'email',
        description: 'Support contact email for this product',
      }),
    ),

    // URI format
    externalUrl: Type.Optional(
      Type.String({
        format: 'uri',
        description: 'Link to external product page',
      }),
    ),

    // Array constraints
    tags: Type.Optional(
      Type.Array(Type.String({ minLength: 1, maxLength: 50 }), {
        maxItems: 20,
        uniqueItems: true,
        description: 'Searchable tags (max 20, each up to 50 chars)',
      }),
    ),
  },
  { additionalProperties: false },
);
```

### Header Validation

For routes that require custom headers:

```typescript
export const webhookSchema = {
  operationId: 'handleWebhook',
  tags: ['Webhooks'],
  summary: 'Receive webhook payload',
  headers: Type.Object({
    'x-webhook-signature': Type.String({
      description: 'HMAC-SHA256 signature of the request body',
    }),
    'x-webhook-timestamp': Type.String({
      description: 'ISO 8601 timestamp when the webhook was sent',
    }),
  }),
  body: WebhookPayloadBody,
  response: {
    200: MessageResponse,
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};
```

---

## Versioning

### URL Path Versioning

Prefix all API routes with `/api/v1`. This is the most explicit and widely understood versioning strategy for REST APIs.

```typescript
import type { FastifyInstance } from 'fastify';

export default async function apiRoutes(fastify: FastifyInstance) {
  // Register all domain routes under /api/v1
  await fastify.register(
    async function v1(v1Instance) {
      await v1Instance.register(import('./domains/users'), { prefix: '/users' });
      await v1Instance.register(import('./domains/orders'), { prefix: '/orders' });
      await v1Instance.register(import('./domains/products'), { prefix: '/products' });
    },
    { prefix: '/api/v1' },
  );
}
```

### Version in OpenAPI Info

Always reflect the API version in the `info.version` field:

```typescript
info: {
  title: 'Acme Platform API',
  version: '1.0.0',  // Semantic version of the API contract
  // ...
},
```

When introducing a breaking change:

1. Create a new `/api/v2` prefix for the affected routes.
2. Bump `info.version` to `2.0.0`.
3. Keep `/api/v1` routes operational during the deprecation period.
4. Use the `deprecated: true` flag on v1 route schemas to signal deprecation in Swagger UI.

```typescript
export const listUsersV1Schema = {
  operationId: 'listUsersV1',
  tags: ['Users'],
  summary: 'List users (deprecated -- use v2)',
  deprecated: true,
  // ...
};
```

---

## Documentation Quality

### Markdown in Descriptions

Swagger UI renders markdown in `description` fields. Use this for rich formatting:

```typescript
description: `
Retrieve all orders for the authenticated user.

**Filtering Options**
| Parameter | Type | Description |
|-----------|------|-------------|
| \`status\` | string | Filter by order status |
| \`from\` | date-time | Orders created after this timestamp |
| \`to\` | date-time | Orders created before this timestamp |

**Pagination**
- Default page size: 20
- Maximum page size: 100
- Results sorted by \`createdAt\` descending

**Rate Limiting**
- 100 requests per minute per user
- Rate limit headers included in response:
  - \`X-RateLimit-Limit\`: Maximum requests per window
  - \`X-RateLimit-Remaining\`: Requests remaining in current window
  - \`X-RateLimit-Reset\`: Unix timestamp when the window resets
`,
```

### Description Templates by HTTP Method

Use these templates to maintain consistency across the entire API surface.

**GET (list)**:
```
Retrieve a paginated list of {resources} with optional filtering and sorting.

**Filtering**
- (describe each filter parameter and its behavior)

**Sorting**
- (describe sortable fields and defaults)

**Pagination**
- (describe defaults, maximums, and response meta)
```

**GET (single)**:
```
Retrieve complete details for a single {resource}.

**Includes**
- (list what data is returned, especially related entities)

**Errors**
- Returns 404 if the {resource} ID does not match any existing record
```

**POST (create)**:
```
Create a new {resource}.

**Automatic Fields**
- (list fields generated server-side: ID, timestamps, defaults)

**Validation**
- (list key validation rules and unique constraints)

**Errors**
- (list specific error conditions: 409 for duplicates, 400 for bad references)
```

**PATCH (update)**:
```
Update one or more fields on an existing {resource}. Only fields included in the
request body are modified; omitted fields remain unchanged.

**Updatable Fields**
- (list each field and any special behavior)

**Side Effects**
- (describe automatic changes: updatedAt refresh, cache invalidation)
```

**DELETE**:
```
Permanently delete a {resource}. This action is **irreversible**.

**Cascade Behavior**
- (describe what happens to related records)

**Errors**
- Returns 404 if the {resource} does not exist
```

### Rate Limiting Documentation

When `@fastify/rate-limit` is active, document the response headers:

```typescript
description: `
...

**Rate Limiting**

All API responses include the following headers when rate limiting is enabled:

| Header | Description |
|--------|-------------|
| \`X-RateLimit-Limit\` | Maximum number of requests allowed per time window |
| \`X-RateLimit-Remaining\` | Number of requests remaining in the current window |
| \`X-RateLimit-Reset\` | Unix timestamp (seconds) when the current window resets |
| \`Retry-After\` | Seconds to wait before retrying (only present on 429 responses) |

Default limits: 100 requests per 60-second window.
`,
```

### Pagination Documentation

Include the pagination contract in every list endpoint's description:

```typescript
description: `
...

**Pagination Response Format**

\`\`\`json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 142,
    "page": 2,
    "pageSize": 20,
    "totalPages": 8
  }
}
\`\`\`

- \`page\` is 1-indexed
- \`pageSize\` defaults to 20, maximum 100
- When \`page\` exceeds \`totalPages\`, an empty \`data\` array is returned (not a 404)
`,
```

---

## Checklist

Use this checklist when reviewing route schemas before merging:

- [ ] `operationId` is present and follows `verbNoun` convention
- [ ] `tags` contains exactly one domain tag
- [ ] `summary` is a single line under 80 characters
- [ ] `description` uses markdown and covers behavior, use cases, and errors
- [ ] All path parameters have `format` and `description`
- [ ] All query parameters have `description` and `default` (if applicable)
- [ ] Request body uses `additionalProperties: false`
- [ ] Response includes all applicable status codes (not just 200)
- [ ] Error responses use `$ref` to shared component schemas
- [ ] Nullable response fields use `Type.Union([T, Type.Null()])`, not `Type.Optional()`
- [ ] Numeric fields have `minimum` / `maximum` constraints
- [ ] String fields have `minLength` / `maxLength` or `format` / `pattern`
- [ ] Arrays have `maxItems` where appropriate
- [ ] `security: []` is set on public routes when global security is enabled
- [ ] `deprecated: true` is set on endpoints scheduled for removal
