// Global test setup for Vitest
// Add environment overrides or global mocks here

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/fastify_template_test_db';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
