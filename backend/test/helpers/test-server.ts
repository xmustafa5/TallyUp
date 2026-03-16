import Fastify from 'fastify';
import { app } from '../../src/app/app';

export async function buildTestServer() {
  const server = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        strict: 'log',
        keywords: ['example'],
      },
    },
  });

  await server.register(app);
  await server.ready();

  return server;
}
