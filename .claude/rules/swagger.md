---
paths:
  - '**/routes/**'
  - '**/schemas/**'
---

# Swagger Documentation Rules

Every route MUST have a complete schema with all of the following:

## Required Schema Properties

```typescript
{
  tags: ['DomainName'],
  summary: 'Short one-line summary',
  description: `
Multi-line description with markdown formatting.

**Features/Returns** -- What this endpoint does
**Use Cases** -- When to use it
**Behavior** -- How it processes requests
**Restrictions** -- Any limitations or requirements
  `,
  body: BodySchema,           // For POST/PUT/PATCH
  params: ParamsSchema,       // For path parameters
  querystring: QuerySchema,   // For query parameters
  response: {
    200: SuccessResponse(DataSchema),
    400: { $ref: 'BadRequestError#' },
    404: { $ref: 'NotFoundError#' },
    // ... all applicable error responses
  },
}
```

## Description Style by HTTP Method

**GET (list)**: Features, filtering options, sorting, pagination behavior
**GET (single)**: What data is returned, related entities included
**POST (create)**: Automatic features (ID generation, timestamps), validation rules
**PUT/PATCH (update)**: Which fields are updatable, side effects
**DELETE**: Side effects, cascading behavior, irreversibility warning

## TypeBox Schema Patterns

```typescript
import { Type } from '@sinclair/typebox';

// Request body
const CreateUserBody = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  role: Type.Union([Type.Literal('admin'), Type.Literal('user')]),
});

// Path params
const UserParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

// Nullable field in response
const UserResponse = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String(),
  bio: Type.Union([Type.String(), Type.Null()]),
});
```

## Error Response References

Use shared error schemas via `$ref`:

```typescript
response: {
  400: { $ref: 'BadRequestError#' },
  401: { $ref: 'UnauthorizedError#' },
  403: { $ref: 'ForbiddenError#' },
  404: { $ref: 'NotFoundError#' },
  409: { $ref: 'ConflictError#' },
  500: { $ref: 'InternalServerError#' },
}
```
