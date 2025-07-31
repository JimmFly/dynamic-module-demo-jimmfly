#!/usr/bin/env node

/**
 * Dynamic Module Demo Jimmfly - Main Entry Point
 * A high-performance TypeScript/JavaScript module execution server
 */

import { server } from './server/server';
import { logger } from './utils/logger';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    logger.info('🚀 Starting Dynamic Module Demo Jimmfly...');

    // Initialize and start server
    await server.initialize();
    await server.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('\n📝 Received SIGINT, shutting down gracefully...');
      try {
        await server.stop();
      } catch (stopError) {
        logger.error('Error during shutdown:', stopError);
      }
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('\n📝 Received SIGTERM, shutting down gracefully...');
      try {
        await server.stop();
      } catch (stopError) {
        logger.error('Error during shutdown:', stopError);
      }
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('💥 Uncaught Exception:', error);
      try {
        await server.stop();
      } catch (stopError) {
        logger.error('Error during shutdown:', stopError);
      }
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      try {
        await server.stop();
      } catch (stopError) {
        logger.error('Error during shutdown:', stopError);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('💥 Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    logger.error('💥 Application startup failed:', error);
    process.exit(1);
  });
}

export { server };
