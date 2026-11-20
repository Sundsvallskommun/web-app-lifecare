import type { Server } from 'node:http';

import { logger } from '@utils/logger';
import { closeRedisClient, destroyRedisClient } from '@utils/redis';
import { createSessionStore } from '@utils/session-store';
import validateEnv from '@utils/validateEnv';

import App from '@/app';
import { registeredControllers } from '@/registered-controllers';

const SHUTDOWN_GRACE_PERIOD_MS = 10_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function markShutdownFailure(message: string, error?: unknown): void {
  logger.error(error === undefined ? message : `${message}: ${errorMessage(error)}`);
  process.exitCode = 1;
}

async function closeHttpServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function gracefullyCloseResources(server: Server): Promise<void> {
  try {
    await closeHttpServer(server);
  } catch (error: unknown) {
    markShutdownFailure('HTTP server shutdown failed', error);
  }

  try {
    await closeRedisClient();
  } catch (error: unknown) {
    markShutdownFailure('Redis shutdown failed', error);
  }
}

function forceCloseResources(server: Server): void {
  markShutdownFailure(`Graceful shutdown exceeded ${SHUTDOWN_GRACE_PERIOD_MS}ms; forcing connections closed`);

  try {
    server.closeAllConnections();
  } catch (error: unknown) {
    markShutdownFailure('Forced HTTP server shutdown failed', error);
  }

  try {
    destroyRedisClient();
  } catch (error: unknown) {
    markShutdownFailure('Forced Redis shutdown failed', error);
  }
}

function beginShutdown(server: Server, signal: NodeJS.Signals): void {
  logger.info(`Received ${signal}; shutting down`);

  const gracefulShutdown = gracefullyCloseResources(server);
  let shutdownTimer: NodeJS.Timeout;
  const shutdownDeadline = new Promise<'timed-out'>(resolve => {
    shutdownTimer = setTimeout(() => {
      resolve('timed-out');
    }, SHUTDOWN_GRACE_PERIOD_MS);
  });

  void Promise.race([gracefulShutdown.then(() => 'complete' as const), shutdownDeadline]).then(result => {
    if (result === 'complete') {
      clearTimeout(shutdownTimer);
      return;
    }

    forceCloseResources(server);
  });
}

export async function startServer(): Promise<void> {
  validateEnv();

  let server: Server;

  try {
    const sessionStore = await createSessionStore();
    const app = new App(registeredControllers, sessionStore);
    server = app.listen();
  } catch (error: unknown) {
    try {
      await closeRedisClient();
    } catch (cleanupError: unknown) {
      logger.error(`Redis cleanup after server startup failure failed: ${errorMessage(cleanupError)}`);
    }

    throw error;
  }

  let shutdownStarted = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;
    beginShutdown(server, signal);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  void startServer().catch((error: unknown) => {
    logger.error(`Server startup failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}
