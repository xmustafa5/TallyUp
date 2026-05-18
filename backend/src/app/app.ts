import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, FastifyError } from 'fastify';
import AutoLoad from '@fastify/autoload';
import fastifyEnv from '@fastify/env';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCompress from '@fastify/compress';
import { getEnvJsonSchema } from './config/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function app(fastify: FastifyInstance) {
  // ========================================================================
  // 1. Environment Configuration (MUST BE FIRST)
  // ========================================================================
  await fastify.register(fastifyEnv, {
    confKey: 'config',
    schema: getEnvJsonSchema(),
    dotenv: true,
    data: process.env,
  });

  fastify.log.info(
    { nodeEnv: fastify.config.NODE_ENV, port: fastify.config.PORT },
    'Environment configuration loaded',
  );

  // ========================================================================
  // 2. Sensible defaults (via autoload plugins)
  // ========================================================================
  // @fastify/sensible is registered via plugins/sensible.plugin.ts

  // ========================================================================
  // 3. Response Compression
  // ========================================================================
  await fastify.register(fastifyCompress, {
    global: true,
    encodings: ['gzip', 'deflate'],
  });

  // ========================================================================
  // 4. Security Plugins
  // ========================================================================
  const isDev = fastify.config.NODE_ENV === 'development';

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          },
        },
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await fastify.register(fastifyCors, {
    origin: isDev
      ? true
      : fastify.config.CORS_ORIGIN
        ? fastify.config.CORS_ORIGIN.split(',').map((o) => o.trim())
        : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  if (!isDev) {
    await fastify.register(fastifyRateLimit, {
      max: fastify.config.RATE_LIMIT_MAX,
      timeWindow: fastify.config.RATE_LIMIT_WINDOW,
    });
  }

  // ========================================================================
  // 5. API Documentation (Swagger/OpenAPI)
  // ========================================================================
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Fastify Template API',
        description: `
RESTful API built with Fastify, following DDD + Hexagonal Architecture.

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Detailed error message"
}
\`\`\`
        `,
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${fastify.config.PORT}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'System', description: 'System health and monitoring endpoints' },
        { name: 'Auth', description: 'Registration, login, token refresh and logout' },
        { name: 'Users', description: 'Profile management and User ID lookup' },
        { name: 'Rooms', description: 'Challenge rooms: lifecycle, members, targets' },
        { name: 'Invitations', description: 'Invite users to rooms and respond to invites' },
        { name: 'Cycles', description: 'Challenge cycles, live leaderboard and results' },
        { name: 'CheckIns', description: 'Recording, listing and undoing point check-ins' },
        {
          name: 'Notifications',
          description: 'In-app notifications and Expo push device tokens',
        },
        {
          name: 'Templates',
          description: 'Public room templates for the create-room wizard',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
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
              message: { type: 'string', example: 'Resource already exists' },
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

  // Register shared error schemas so Fastify serialization can resolve $ref
  fastify.addSchema({
    $id: 'BadRequestError',
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 400 },
      error: { type: 'string', example: 'Bad Request' },
      message: { type: 'string', example: 'Invalid input' },
    },
  });
  fastify.addSchema({
    $id: 'UnauthorizedError',
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 401 },
      error: { type: 'string', example: 'Unauthorized' },
      message: { type: 'string', example: 'Invalid or expired token' },
    },
  });
  fastify.addSchema({
    $id: 'ForbiddenError',
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 403 },
      error: { type: 'string', example: 'Forbidden' },
      message: { type: 'string', example: 'Access denied' },
    },
  });
  fastify.addSchema({
    $id: 'NotFoundError',
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 404 },
      error: { type: 'string', example: 'Not Found' },
      message: { type: 'string', example: 'Resource not found' },
    },
  });
  fastify.addSchema({
    $id: 'ConflictError',
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 409 },
      error: { type: 'string', example: 'Conflict' },
      message: { type: 'string', example: 'Resource already exists' },
    },
  });
  fastify.addSchema({
    $id: 'InternalServerError',
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 500 },
      error: { type: 'string', example: 'Internal Server Error' },
      message: { type: 'string', example: 'An unexpected error occurred' },
    },
  });

  fastify.log.info('Swagger documentation available at /documentation');

  // ========================================================================
  // 6. Application Plugins (AutoLoad)
  // ========================================================================
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    maxDepth: 2,
  });

  // ========================================================================
  // 7. Domain Modules (AutoLoad)
  // ========================================================================
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'domains'),
    dirNameRoutePrefix: false,
    indexPattern: /^index\.(ts|js)$/i,
    maxDepth: 1,
  });

  // ========================================================================
  // 8. Global Error Handler
  // ========================================================================
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    // Sub-500 errors (validation, auth, etc.) pass through
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name || 'Error',
        message: error.message,
      });
    }

    // Prisma Client Known Request Errors
    if (error.code && typeof error.code === 'string' && error.code.startsWith('P')) {
      request.log.warn({ prismaCode: error.code, url: request.url }, `Prisma ${error.code}`);
      const map: Record<string, [number, string, string]> = {
        P2000: [400, 'Bad Request', 'Value too long for the field'],
        P2002: [409, 'Conflict', 'A record with this value already exists'],
        P2003: [400, 'Bad Request', 'Referenced record does not exist'],
        P2007: [400, 'Bad Request', 'Invalid data provided'],
        P2020: [400, 'Bad Request', 'Value out of range for the field type'],
        P2023: [400, 'Bad Request', 'Invalid data encoding'],
        P2025: [404, 'Not Found', 'Record not found'],
      };
      const [code, err, msg] = map[error.code] || [
        400,
        'Bad Request',
        'Invalid database operation',
      ];
      return reply.code(code).send({ statusCode: code, error: err, message: msg });
    }

    // Prisma query validation errors
    const m = error.message;
    if (
      m &&
      typeof m === 'string' &&
      m.includes('invocation') &&
      (m.includes('Unknown argument') ||
        m.includes('Unknown field') ||
        m.includes('Invalid value') ||
        m.includes('Invalid `'))
    ) {
      request.log.warn({ url: request.url }, 'Prisma query validation error');
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid query parameters',
      });
    }

    // PostgreSQL encoding errors
    if (m && (m.includes('invalid byte sequence') || m.includes('unsupported Unicode escape'))) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid character encoding in input',
      });
    }

    // Fallback 500
    request.log.error({ err: error }, 'Unhandled error');
    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });

  fastify.log.info('Application initialized successfully');
}
