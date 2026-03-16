import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { getLivenessStatus } from '../../../src/app/domains/health/domain/services/health-check.service';

describe('Health Check Service', () => {
  it('should return liveness status', () => {
    const result = getLivenessStatus();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
    expect(typeof result.uptime).toBe('number');
  });
});

describe('Health Routes', () => {
  it('GET /health should return 200 with liveness data', async () => {
    const server = Fastify({
      logger: false,
      ajv: { customOptions: { strict: 'log', keywords: ['example'] } },
    });

    // Register just the health domain directly for unit testing
    const healthRoutes =
      await import('../../../src/app/domains/health/presentation/routes/health.routes');
    await server.register(healthRoutes.default, { prefix: '/health' });
    await server.ready();

    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.timestamp).toBeDefined();
    expect(typeof body.data.uptime).toBe('number');

    await server.close();
  });
});
