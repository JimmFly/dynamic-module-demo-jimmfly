/**
 * Network utilities for port management and HTTP responses
 */

import { createServer, Server } from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import { CONFIG } from './config';
import { logger } from './logger';

/**
 * Check if a port is available
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server: Server = createServer();

    server.listen(port, 'localhost', () => {
      server.close(() => {
        logger.debug(`Port ${port} is available`);
        resolve(true);
      });
    });

    server.on('error', () => {
      logger.debug(`Port ${port} is not available`);
      resolve(false);
    });
  });
}

/**
 * Find the next available port starting from the default port
 */
export async function findAvailablePort(startPort: number = CONFIG.DEFAULT_PORT): Promise<number> {
  for (let port = startPort; port < startPort + CONFIG.MAX_PORT_RANGE; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `No available port found in range ${startPort}-${startPort + CONFIG.MAX_PORT_RANGE}`
  );
}

/**
 * HTTP response utilities
 */
export class HttpUtils {
  /**
   * Send JSON response
   */
  static sendJSON(res: ServerResponse, data: any, statusCode: number = 200): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data));
  }

  /**
   * Send error response
   */
  static sendError(res: ServerResponse, message: string, statusCode: number = 500): void {
    logger.error(`HTTP Error ${statusCode}: ${message}`);
    this.sendJSON(res, { error: message }, statusCode);
  }

  /**
   * Send 404 response
   */
  static send404(res: ServerResponse): void {
    this.sendError(res, 'Not Found', 404);
  }

  /**
   * Send method not allowed response
   */
  static sendMethodNotAllowed(res: ServerResponse): void {
    this.sendError(res, 'Method Not Allowed', 405);
  }

  /**
   * Send HTML response
   */
  static sendHTML(res: ServerResponse, html: string): void {
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(html);
  }

  /**
   * Send JavaScript response
   */
  static sendJS(res: ServerResponse, js: string): void {
    res.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(js);
  }

  /**
   * Parse request body as JSON with size limits
   */
  static parseRequestBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      const maxSize = 1024 * 1024; // 1MB limit
      let size = 0;

      req.on('data', (chunk) => {
        size += chunk.length;

        // Check size limit
        if (size > maxSize) {
          reject(new Error('Request body too large'));
          return;
        }

        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : {};
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON in request body'));
        }
      });

      req.on('error', (error) => {
        reject(error);
      });

      // Set timeout for request parsing
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000); // 10 second timeout

      req.on('end', () => {
        clearTimeout(timeout);
      });

      req.on('error', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Get URL pathname and query parameters
   */
  static parseUrl(url: string): { pathname: string; query: URLSearchParams } {
    const urlObj = new URL(url, 'http://localhost');
    return {
      pathname: urlObj.pathname,
      query: urlObj.searchParams,
    };
  }
}
