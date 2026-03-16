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
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
}

/**
 * JSON Schema for @fastify/env validation.
 */
export function getEnvJsonSchema() {
  return {
    type: 'object' as const,
    required: ['DATABASE_URL', 'JWT_SECRET'],
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
      JWT_SECRET: { type: 'string' as const },
      JWT_EXPIRES_IN: { type: 'string' as const, default: '15m' },
      JWT_REFRESH_EXPIRES_IN: { type: 'string' as const, default: '30d' },
    },
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
  }
}
