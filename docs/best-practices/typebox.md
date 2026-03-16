# TypeBox Best Practices for Fastify

## Overview

TypeBox is a JSON Schema type builder that creates standard JSON Schema objects which simultaneously infer as TypeScript types. In a Fastify application, this gives you a single source of truth: one schema definition drives runtime validation, response serialization, Swagger documentation, and compile-time TypeScript types.

This document covers enterprise-grade patterns for using TypeBox with Fastify, including type provider setup, schema design, composition strategies, validation constraints, Swagger integration, and common anti-patterns to avoid.

---

## Type Provider Setup

### Registering TypeBox as the Fastify Type Provider

TypeBox integrates with Fastify through `@fastify/type-provider-typebox`. Once registered, route handler parameters (`request.body`, `request.params`, `request.query`) are automatically typed based on your schemas.

```ts
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

const app = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>()
```

### Type Provider in Plugins

When you encapsulate routes inside Fastify plugins, the type provider must be re-applied within the plugin scope. Fastify creates a new context for each plugin, and the type provider does not propagate automatically.

```ts
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'

const userRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // `fastify` already has TypeBox type inference in this scope.
  // No need to call withTypeProvider again.

  fastify.get('/users/:id', {
    schema: {
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
    },
  }, async (request) => {
    // request.params.id is typed as string
    const { id } = request.params
    return { id }
  })
}

export default userRoutes
```

Using `FastifyPluginAsyncTypebox` is the recommended approach for plugin-scoped routes. It eliminates boilerplate and ensures type inference works correctly throughout the plugin.

### Encapsulated Server Instance Type

When passing the Fastify instance around (for example, to service constructors or helper functions), use the correct type:

```ts
import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

type AppInstance = FastifyInstance & {
  withTypeProvider: () => FastifyInstance
}

// Or more precisely for functions that need the typed instance:
import { FastifyTypebox } from '@fastify/type-provider-typebox'
```

---

## Core Types

TypeBox maps directly to JSON Schema types. Every `Type.*` call produces a JSON Schema object and a corresponding TypeScript type.

### Primitive Types

```ts
import { Type } from '@sinclair/typebox'

// Strings with validation constraints
const Email = Type.String({ format: 'email', minLength: 5, maxLength: 255 })
const Name = Type.String({ minLength: 1, maxLength: 100 })
const Slug = Type.String({ pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', minLength: 1, maxLength: 100 })

// Numbers
const Price = Type.Number({ minimum: 0, maximum: 999999.99 })
const Quantity = Type.Integer({ minimum: 0, maximum: 10000 })
const PositiveId = Type.Integer({ minimum: 1 })

// Boolean
const IsActive = Type.Boolean()

// Null (used in unions for nullable fields)
const Nullable = Type.Null()
```

### Enums and Literals

Use `Type.Enum` for TypeScript enums and `Type.Union` with `Type.Literal` for string union types.

```ts
// TypeScript enum
enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

const OrderStatusSchema = Type.Enum(OrderStatus)

// String union (preferred when you do not need a runtime enum)
const RoleSchema = Type.Union([
  Type.Literal('ADMIN'),
  Type.Literal('MANAGER'),
  Type.Literal('USER'),
  Type.Literal('GUEST'),
])

// Single literal value (useful for discriminated unions)
const TypeField = Type.Literal('invoice')
```

### Arrays

```ts
const Tags = Type.Array(Type.String({ minLength: 1, maxLength: 50 }), {
  minItems: 0,
  maxItems: 20,
  uniqueItems: true,
})

const LineItems = Type.Array(
  Type.Object({
    productId: Type.String({ format: 'uuid' }),
    quantity: Type.Integer({ minimum: 1, maximum: 9999 }),
    unitPrice: Type.Number({ minimum: 0 }),
  }),
  { minItems: 1, maxItems: 100 },
)
```

### Dates

TypeBox provides `Type.Date()` for date validation, but in JSON Schema contexts (HTTP request/response), dates are serialized as strings. Use `Type.String({ format: 'date-time' })` for schemas that represent JSON payloads.

```ts
// For JSON request/response schemas (most common in Fastify routes)
const CreatedAt = Type.String({ format: 'date-time' })
const BirthDate = Type.String({ format: 'date' })

// Type.Date() is useful for internal validation where you work with Date objects,
// but it does not map to standard JSON Schema. Avoid it in route schemas.
```

---

## Object Schemas

### Security: Always Disable Additional Properties

For request body schemas, always set `additionalProperties: false`. This prevents clients from sending unexpected fields that could lead to mass assignment vulnerabilities or data corruption.

```ts
const CreateUserBody = Type.Object(
  {
    email: Type.String({ format: 'email', maxLength: 255 }),
    password: Type.String({ minLength: 8, maxLength: 128 }),
    name: Type.String({ minLength: 1, maxLength: 100 }),
  },
  { additionalProperties: false },
)
```

Without `additionalProperties: false`, a client could send `{ "email": "a@b.com", "password": "secret", "name": "Alice", "role": "ADMIN" }` and the extra `role` field would pass validation silently.

### Optional vs. Nullable

This distinction is critical and a common source of bugs.

**`Type.Optional(T)`** -- The field may be omitted entirely from the payload. The key is not required in the JSON object. Use this for request bodies where a field is not mandatory.

```ts
// Request body: client may or may not send "nickname"
const UpdateProfileBody = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    nickname: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    bio: Type.Optional(Type.String({ maxLength: 500 })),
  },
  { additionalProperties: false },
)
```

**`Type.Union([T, Type.Null()])`** -- The field is always present in the payload, but its value may be `null`. Use this for response schemas where every field should appear in the JSON output.

```ts
// Response body: every field is always present, some may be null
const UserResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  name: Type.String(),
  nickname: Type.Union([Type.String(), Type.Null()]),
  avatarUrl: Type.Union([Type.String({ format: 'uri' }), Type.Null()]),
  lastLoginAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
})
```

**Rule of thumb:**
- Request schemas: `Type.Optional(T)` for non-required fields
- Response schemas: `Type.Union([T, Type.Null()])` for fields that may lack a value

When mapping entity data to response objects, use the nullish coalescing operator to ensure nullable fields are explicitly `null` rather than `undefined`:

```ts
toResponse() {
  return {
    id: this.id,
    email: this.email,
    name: this.name,
    nickname: this.nickname ?? null,
    avatarUrl: this.avatarUrl ?? null,
    lastLoginAt: this.lastLoginAt?.toISOString() ?? null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  }
}
```

---

## Schema Composition

Never duplicate schema definitions. TypeBox provides composition utilities that mirror TypeScript utility types.

### Pick and Omit

```ts
const UserBase = Type.Object({
  email: Type.String({ format: 'email', maxLength: 255 }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  role: Type.Union([Type.Literal('ADMIN'), Type.Literal('USER')]),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  deletedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
})

// Pick only the fields needed for login
const LoginBody = Type.Pick(UserBase, ['email', 'password'], {
  additionalProperties: false,
})

// Omit sensitive fields from the response
const UserPublic = Type.Omit(UserBase, ['password', 'deletedAt'])
```

### Partial and Required

```ts
const ProductFields = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.String({ maxLength: 2000 }),
  price: Type.Number({ minimum: 0 }),
  sku: Type.String({ pattern: '^[A-Z0-9-]+$' }),
  categoryId: Type.String({ format: 'uuid' }),
})

// All fields optional for PATCH updates
const UpdateProductBody = Type.Partial(ProductFields, {
  additionalProperties: false,
})

// All fields required for POST creation
const CreateProductBody = Type.Required(ProductFields, {
  additionalProperties: false,
})
```

### Intersect

Use `Type.Intersect` to merge multiple schemas into one. This is the TypeBox equivalent of TypeScript's intersection type (`A & B`).

```ts
const Timestamps = Type.Object({
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
})

const WithId = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

const SoftDelete = Type.Object({
  deletedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
})

// Compose the full response schema
const ProductResponse = Type.Intersect([
  WithId,
  ProductFields,
  Timestamps,
  SoftDelete,
])
```

### Building a Complete Schema Set for a Domain Entity

A well-structured domain should define a base schema and derive all variants from it:

```ts
import { Type, type Static } from '@sinclair/typebox'

// -- Base fields (shared truth) --

const DepartmentFields = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  code: Type.String({ pattern: '^[A-Z]{2,10}$' }),
  description: Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
  parentId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
})

// -- Request schemas --

const CreateDepartmentBody = Type.Intersect(
  [Type.Omit(DepartmentFields, ['description', 'parentId']), Type.Object({
    description: Type.Optional(Type.String({ maxLength: 500 })),
    parentId: Type.Optional(Type.String({ format: 'uuid' })),
  })],
  { additionalProperties: false },
)

const UpdateDepartmentBody = Type.Partial(
  Type.Omit(DepartmentFields, ['description', 'parentId']),
  { additionalProperties: false },
)

// -- Response schema --

const DepartmentResponse = Type.Intersect([
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
  DepartmentFields,
  Type.Object({
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  }),
])

// -- Static types --

type CreateDepartmentBody = Static<typeof CreateDepartmentBody>
type UpdateDepartmentBody = Static<typeof UpdateDepartmentBody>
type DepartmentResponse = Static<typeof DepartmentResponse>

export {
  CreateDepartmentBody,
  UpdateDepartmentBody,
  DepartmentResponse,
}
```

---

## Static Type Extraction

Every schema should have a corresponding exported TypeScript type. Use `Static<typeof Schema>` (or equivalently `Type.Static<typeof Schema>`) to extract the type.

```ts
import { Type, type Static } from '@sinclair/typebox'

const CreateOrderBody = Type.Object(
  {
    customerId: Type.String({ format: 'uuid' }),
    items: Type.Array(
      Type.Object({
        productId: Type.String({ format: 'uuid' }),
        quantity: Type.Integer({ minimum: 1 }),
      }),
      { minItems: 1 },
    ),
    notes: Type.Optional(Type.String({ maxLength: 1000 })),
  },
  { additionalProperties: false },
)

// Extract the TypeScript type
type CreateOrderBody = Static<typeof CreateOrderBody>

// Now you can use the type in service signatures:
async function createOrder(data: CreateOrderBody): Promise<Order> {
  // data.customerId is typed as string
  // data.items is typed as { productId: string; quantity: number }[]
  // data.notes is typed as string | undefined
}
```

Always export both the schema constant and the type. This enables consumers to use the schema for validation and the type for function signatures without any duplication.

---

## Validation Constraints Reference

### String Constraints

```ts
// Format validation (JSON Schema built-in formats)
Type.String({ format: 'email' })          // RFC 5322 email
Type.String({ format: 'uuid' })           // RFC 4122 UUID
Type.String({ format: 'date-time' })      // ISO 8601 date-time
Type.String({ format: 'date' })           // ISO 8601 date (YYYY-MM-DD)
Type.String({ format: 'time' })           // ISO 8601 time (HH:MM:SS)
Type.String({ format: 'uri' })            // RFC 3986 URI
Type.String({ format: 'ipv4' })           // IPv4 address
Type.String({ format: 'ipv6' })           // IPv6 address

// Length constraints
Type.String({ minLength: 1 })             // Non-empty string
Type.String({ maxLength: 255 })           // Maximum 255 characters
Type.String({ minLength: 8, maxLength: 128 }) // Password length range

// Pattern (regular expression)
Type.String({ pattern: '^[A-Z]{2}[0-9]{4}$' }) // e.g., "AB1234"
```

### Number Constraints

```ts
Type.Number({ minimum: 0 })                     // Zero or positive
Type.Number({ maximum: 100 })                   // At most 100
Type.Number({ exclusiveMinimum: 0 })             // Strictly positive
Type.Number({ exclusiveMaximum: 1 })             // Strictly less than 1
Type.Number({ multipleOf: 0.01 })                // Two decimal places (currency)
Type.Integer({ minimum: 1 })                     // Positive integer
Type.Integer({ minimum: 0, maximum: 2147483647 })// Safe 32-bit integer
```

### Array Constraints

```ts
Type.Array(Type.String(), { minItems: 1 })           // At least one item
Type.Array(Type.String(), { maxItems: 50 })           // At most 50 items
Type.Array(Type.String(), { uniqueItems: true })      // No duplicates
Type.Array(Type.String(), { minItems: 1, maxItems: 10, uniqueItems: true })
```

### Object Constraints

```ts
Type.Object({ ... }, { additionalProperties: false }) // Reject unknown fields
Type.Object({ ... }, { minProperties: 1 })             // At least one field set (useful for PATCH)
```

---

## Common Patterns

### ID Parameters

```ts
const IdParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

type IdParams = Static<typeof IdParams>
```

### Pagination Query Parameters

```ts
const PaginationQuery = Type.Object({
  page: Type.Integer({ minimum: 1, default: 1 }),
  limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
})

type PaginationQuery = Static<typeof PaginationQuery>
```

### Paginated Response Wrapper

```ts
function PaginatedResponse<T extends TSchema>(itemSchema: T) {
  return Type.Object({
    data: Type.Array(itemSchema),
    meta: Type.Object({
      page: Type.Integer({ minimum: 1 }),
      limit: Type.Integer({ minimum: 1 }),
      total: Type.Integer({ minimum: 0 }),
      totalPages: Type.Integer({ minimum: 0 }),
    }),
  })
}

// Usage
const UserListResponse = PaginatedResponse(UserResponse)
type UserListResponse = Static<typeof UserListResponse>
```

### Search and Filter Query Parameters

```ts
const SearchQuery = Type.Object({
  q: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  sortBy: Type.Optional(Type.String()),
  order: Type.Optional(
    Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
  ),
})

type SearchQuery = Static<typeof SearchQuery>
```

### Combined Query Parameters

Compose multiple query schemas for endpoints that support pagination, search, and filtering:

```ts
import { type TSchema } from '@sinclair/typebox'

const ListUsersQuery = Type.Intersect([
  PaginationQuery,
  SearchQuery,
  Type.Object({
    role: Type.Optional(Type.Union([Type.Literal('ADMIN'), Type.Literal('USER')])),
    isActive: Type.Optional(Type.Boolean()),
  }),
])
```

### Standard Error Response

```ts
const ErrorResponse = Type.Object({
  statusCode: Type.Integer(),
  error: Type.String(),
  message: Type.String(),
})

type ErrorResponse = Static<typeof ErrorResponse>
```

### Full Route Example

Putting it all together in a Fastify route definition:

```ts
import { Type, type Static } from '@sinclair/typebox'
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'

const IdParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

const CreateUserBody = Type.Object(
  {
    email: Type.String({ format: 'email', maxLength: 255 }),
    name: Type.String({ minLength: 1, maxLength: 100 }),
    role: Type.Optional(
      Type.Union([Type.Literal('ADMIN'), Type.Literal('USER')]),
    ),
  },
  { additionalProperties: false },
)

const UserResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  name: Type.String(),
  role: Type.String(),
  lastLoginAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
})

type CreateUserBody = Static<typeof CreateUserBody>
type UserResponse = Static<typeof UserResponse>

const userRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post('/users', {
    schema: {
      description: 'Create a new user account',
      tags: ['Users'],
      summary: 'Create user',
      body: CreateUserBody,
      response: {
        201: UserResponse,
        409: Type.Object({
          statusCode: Type.Integer(),
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { email, name, role } = request.body
    // All fields are fully typed here.
    // email: string, name: string, role: 'ADMIN' | 'USER' | undefined

    const user = await fastify.userService.create({ email, name, role })

    return reply.status(201).send(user.toResponse())
  })

  fastify.get('/users/:id', {
    schema: {
      description: 'Retrieve a user by their unique identifier',
      tags: ['Users'],
      summary: 'Get user by ID',
      params: IdParams,
      response: {
        200: UserResponse,
        404: Type.Object({
          statusCode: Type.Integer(),
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  }, async (request) => {
    const { id } = request.params
    // id is typed as string

    const user = await fastify.userService.findById(id)
    if (!user) {
      throw fastify.httpErrors.notFound('User not found')
    }

    return user.toResponse()
  })
}

export default userRoutes
```

---

## Swagger Integration

### Schema Descriptions and Examples

Add `description`, `examples`, and `title` properties to improve Swagger UI output.

```ts
const CreateInvoiceBody = Type.Object(
  {
    customerId: Type.String({
      format: 'uuid',
      description: 'The unique identifier of the customer being invoiced',
    }),
    lineItems: Type.Array(
      Type.Object({
        description: Type.String({
          minLength: 1,
          maxLength: 200,
          description: 'Line item description',
        }),
        amount: Type.Number({
          minimum: 0,
          multipleOf: 0.01,
          description: 'Amount in the invoice currency',
        }),
      }),
      {
        minItems: 1,
        maxItems: 50,
        description: 'List of invoice line items',
      },
    ),
    dueDate: Type.String({
      format: 'date',
      description: 'Payment due date in ISO 8601 format (YYYY-MM-DD)',
    }),
    notes: Type.Optional(
      Type.String({
        maxLength: 1000,
        description: 'Optional internal notes for this invoice',
      }),
    ),
  },
  {
    additionalProperties: false,
    title: 'CreateInvoiceBody',
    description: 'Payload for creating a new invoice',
  },
)
```

### Registering Shared Schemas with `$id`

For schemas used across multiple routes, register them with Fastify using `addSchema`. This enables JSON Schema `$ref` references, reducing duplication in the generated Swagger document.

```ts
import { Type } from '@sinclair/typebox'

const ErrorResponseSchema = Type.Object(
  {
    statusCode: Type.Integer(),
    error: Type.String(),
    message: Type.String(),
  },
  { $id: 'ErrorResponse', title: 'ErrorResponse' },
)

const PaginationMetaSchema = Type.Object(
  {
    page: Type.Integer({ minimum: 1 }),
    limit: Type.Integer({ minimum: 1 }),
    total: Type.Integer({ minimum: 0 }),
    totalPages: Type.Integer({ minimum: 0 }),
  },
  { $id: 'PaginationMeta', title: 'PaginationMeta' },
)

// Register during app setup
app.addSchema(ErrorResponseSchema)
app.addSchema(PaginationMetaSchema)

// Reference in route schemas using Type.Ref
fastify.get('/users', {
  schema: {
    response: {
      200: Type.Object({
        data: Type.Array(UserResponse),
        meta: Type.Ref(PaginationMetaSchema),
      }),
      500: Type.Ref(ErrorResponseSchema),
    },
  },
}, handler)
```

### Response Schema for Every Status Code

Document all possible response status codes. This produces complete Swagger documentation and enables Fastify's response serialization (which strips undeclared fields from responses, preventing data leaks).

```ts
{
  schema: {
    response: {
      200: UserResponse,
      400: Type.Ref(ErrorResponseSchema),    // Validation error
      401: Type.Ref(ErrorResponseSchema),    // Unauthorized
      403: Type.Ref(ErrorResponseSchema),    // Forbidden
      404: Type.Ref(ErrorResponseSchema),    // Not found
      409: Type.Ref(ErrorResponseSchema),    // Conflict
      500: Type.Ref(ErrorResponseSchema),    // Internal error
    },
  },
}
```

---

## Anti-Patterns

### 1. Using `Type.Any()` or `Type.Unknown()`

```ts
// BAD: Defeats type safety and validation entirely
const RequestBody = Type.Object({
  data: Type.Any(),
})

// GOOD: Define the exact shape
const RequestBody = Type.Object({
  data: Type.Object({
    key: Type.String(),
    value: Type.String(),
  }),
})
```

`Type.Any()` produces no validation and no TypeScript type information. If you genuinely need a flexible schema, use `Type.Record` with constrained key/value types:

```ts
// Acceptable: structured flexibility
const Metadata = Type.Record(
  Type.String({ maxLength: 50 }),
  Type.String({ maxLength: 500 }),
  { maxProperties: 20 },
)
```

### 2. Duplicating Schemas

```ts
// BAD: Same fields defined in two places -- they will drift apart
const CreateUserBody = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String(),
})

const UpdateUserBody = Type.Object({
  email: Type.Optional(Type.String({ format: 'email' })),
  name: Type.Optional(Type.String()),
})

// GOOD: Derive from a single base
const UserFields = Type.Object({
  email: Type.String({ format: 'email', maxLength: 255 }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
})

const CreateUserBody = Type.Strict(UserFields)
const UpdateUserBody = Type.Partial(UserFields, { additionalProperties: false })
```

### 3. Using `Type.Optional()` for Response Nullable Fields

```ts
// BAD: Field may be missing from JSON output, breaking client contracts
const UserResponse = Type.Object({
  id: Type.String(),
  nickname: Type.Optional(Type.String()), // client sees: nickname?: string
})

// GOOD: Field is always present, value may be null
const UserResponse = Type.Object({
  id: Type.String(),
  nickname: Type.Union([Type.String(), Type.Null()]), // client sees: nickname: string | null
})
```

Clients parsing API responses should never need to check whether a field exists. They should only need to check whether a value is `null`.

### 4. Forgetting `additionalProperties: false` on Request Bodies

```ts
// BAD: Allows arbitrary extra fields (mass assignment risk)
const CreateUserBody = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String(),
})

// GOOD: Rejects any fields not declared in the schema
const CreateUserBody = Type.Object(
  {
    email: Type.String({ format: 'email' }),
    name: Type.String(),
  },
  { additionalProperties: false },
)
```

### 5. Missing Validation Constraints

```ts
// BAD: No constraints -- accepts empty strings, negative numbers, enormous arrays
const CreateProductBody = Type.Object({
  name: Type.String(),
  price: Type.Number(),
  tags: Type.Array(Type.String()),
})

// GOOD: Every field has appropriate constraints
const CreateProductBody = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    price: Type.Number({ minimum: 0, maximum: 999999.99, multipleOf: 0.01 }),
    tags: Type.Array(
      Type.String({ minLength: 1, maxLength: 50 }),
      { maxItems: 20, uniqueItems: true },
    ),
  },
  { additionalProperties: false },
)
```

### 6. Inline Schemas Without Reuse

```ts
// BAD: ID params defined inline in every route
fastify.get('/users/:id', {
  schema: {
    params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  },
}, handler1)

fastify.delete('/users/:id', {
  schema: {
    params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  },
}, handler2)

// GOOD: Define once, use everywhere
const IdParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

fastify.get('/users/:id', { schema: { params: IdParams } }, handler1)
fastify.delete('/users/:id', { schema: { params: IdParams } }, handler2)
```

---

## Summary of Rules

1. Always use `additionalProperties: false` on request body schemas.
2. Use `Type.Optional(T)` for optional request fields; use `Type.Union([T, Type.Null()])` for nullable response fields.
3. Never use `Type.Any()` or `Type.Unknown()` in request schemas.
4. Compose schemas from base definitions using `Pick`, `Omit`, `Partial`, `Required`, and `Intersect`.
5. Export both the schema object and the `Static` type from every schema file.
6. Add `description`, `title`, and validation constraints to every field.
7. Define response schemas for all status codes to enable Fastify's response serialization and complete Swagger documentation.
8. Use `FastifyPluginAsyncTypebox` for route plugins to get automatic type inference.
9. Register frequently used schemas with `addSchema` and `$id` to enable `$ref` in Swagger output.
10. Map entity data to responses using `?? null` for nullable fields, never relying on `undefined`.
