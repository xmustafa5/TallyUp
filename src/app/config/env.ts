export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  HOST: string;
  PORT: number;
  LOG_LEVEL: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW: string;
  CORS_ORIGIN?: string;
}

/**
 * JSON Schema for @fastify/env validation.
 */
export function getEnvJsonSchema() {
  return {
    type: 'object' as const,
    required: ['DATABASE_URL'],
    properties: {
      NODE_ENV: {
        type: 'string' as const,
        default: 'development',
        enum: ['development', 'production', 'test'],
      },
      HOST: { type: 'string' as const, default: '0.0.0.0' },
      PORT: { type: 'number' as const, default: 3000 },
      LOG_LEVEL: { type: 'string' as const, default: 'info' },
      DATABASE_URL: { type: 'string' as const },
      REDIS_URL: { type: 'string' as const, default: 'redis://localhost:6379' },
      RATE_LIMIT_MAX: { type: 'number' as const, default: 1000 },
      RATE_LIMIT_WINDOW: { type: 'string' as const, default: '1 minute' },
      CORS_ORIGIN: { type: 'string' as const },
    },
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
  }
}
