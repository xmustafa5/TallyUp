import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { app } from './app/app';

async function buildServer() {
  const loggerConfig =
    process.env.NODE_ENV === 'development'
      ? {
          level: process.env.LOG_LEVEL || 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
              colorize: true,
            },
          },
        }
      : {
          level: process.env.LOG_LEVEL || 'info',
        };

  const server = Fastify({
    logger: loggerConfig,
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    trustProxy: true,
    ignoreTrailingSlash: true,
    pluginTimeout: 30000,
    ajv: {
      customOptions: {
        strict: 'log',
        keywords: ['example'],
      },
    },
  });

  await server.register(app);

  return server;
}

async function start() {
  let server: Awaited<ReturnType<typeof buildServer>> | null = null;

  try {
    server = await buildServer();

    const host = process.env.HOST || '0.0.0.0';
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;

    await server.listen({ host, port });

    server.log.info(
      {
        host,
        port,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        pid: process.pid,
      },
      'Server started successfully',
    );

    server.log.info(
      {
        url: `http://${host}:${port}`,
        documentation: `http://${host}:${port}/documentation`,
        health: `http://${host}:${port}/health`,
      },
      'Server ready',
    );
  } catch (err) {
    if (server) {
      server.log.error(err, 'Failed to start server');
    } else {
      console.error('Failed to build server:', err);
    }
    process.exit(1);
  }

  async function gracefulShutdown(signal: string) {
    if (!server) return;

    server.log.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

    const forceExit = setTimeout(() => {
      server!.log.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000);

    try {
      await server.close();
      clearTimeout(forceExit);
      server.log.info('Server closed successfully');
      process.exit(0);
    } catch (err) {
      clearTimeout(forceExit);
      server.log.error(err, 'Error during graceful shutdown');
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    if (server) {
      server.log.fatal(err, 'Uncaught exception');
    } else {
      console.error('Uncaught exception:', err);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    if (server) {
      server.log.fatal({ reason, promise }, 'Unhandled promise rejection');
    } else {
      console.error('Unhandled promise rejection:', reason);
    }
    process.exit(1);
  });
}

start();
