/**
 * Main HTTP server for the Dynamic Module Executor
 */

import { createServer, Server } from 'http';
import { CONFIG, isDevelopment } from '../utils/config';
import { findAvailablePort } from '../utils/network';
import { RouteHandler } from './routes';
import { dbManager } from '../database/sqlite';
import { logger } from '../utils/logger';
import { CorsManager } from '../utils/cors';
import { moduleManager } from '../modules/moduleManager';

export class DynamicModuleServer {
  private server: Server | null = null;
  private port: number = CONFIG.DEFAULT_PORT;

  /**
   * Initialize the server
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize database
      await dbManager.initDatabase();
      logger.info('Database initialized successfully');

      // Register TypeScript compiler for development
      if (isDevelopment) {
        try {
          require('ts-node/register');
          logger.info('TypeScript compiler registered for development');
        } catch (error) {
          logger.warn('Failed to register TypeScript compiler:', error);
        }
      }

      // Find available port
      this.port = await findAvailablePort(CONFIG.DEFAULT_PORT);
      logger.info(`Found available port: ${this.port}`);
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  /**
   * Start the HTTP server
   */
  public async start(): Promise<void> {
    if (this.server) {
      logger.warn('Server is already running');
      return;
    }

    try {
      // Create HTTP server
      this.server = createServer((req, res) => {
        // Handle CORS preflight requests
        if (CorsManager.handlePreflight(req, res)) {
          return;
        }

        // Set CORS headers for all requests
        if (!CorsManager.setCorsHeaders(req, res)) {
          res.writeHead(403);
          res.end('Origin not allowed');
          return;
        }

        RouteHandler.handleRequest(req, res).catch((error) => {
          logger.error('Request handling error:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
      });

      // Set up server error handling
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.port} is already in use`);
        } else {
          logger.error('Server error:', error);
        }
      });

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.port, 'localhost', () => {
          logger.info(`🚀 Server running at http://localhost:${this.port}`);
          logger.info(`📁 Watching scripts directory: ${CONFIG.SCRIPTS_DIR}`);
          logger.info('💾 SQLite database initialized for execution logging');
          resolve();
        });

        this.server!.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    if (!this.server) {
      logger.warn('Server is not running');
      return;
    }

    try {
      // Close server
      await new Promise<void>((resolve, reject) => {
        this.server!.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.server = null;
      logger.info('Server stopped');

      // Stop file watcher
      moduleManager.stopWatcher();

      // Close database connection
      await dbManager.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Failed to stop server:', error);
      throw error;
    }
  }

  /**
   * Get server status
   */
  public getStatus(): { running: boolean; port: number | null } {
    return {
      running: this.server !== null,
      port: this.server ? this.port : null,
    };
  }

  /**
   * Restart the server
   */
  public async restart(): Promise<void> {
    logger.info('Restarting server...');
    await this.stop();
    await this.initialize();
    await this.start();
  }
}

// Export singleton instance
export const server = new DynamicModuleServer();
