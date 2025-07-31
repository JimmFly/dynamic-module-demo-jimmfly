/**
 * CORS (Cross-Origin Resource Sharing) security configuration
 */

import { IncomingMessage, ServerResponse } from 'http';
import { logger } from './logger';

export class CorsManager {
  private static readonly ALLOWED_ORIGINS = new Set<string>();
  private static readonly ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'];
  private static readonly ALLOWED_HEADERS = ['Content-Type', 'Authorization'];
  private static readonly MAX_AGE = 86400; // 24 hours

  /**
   * Initialize CORS configuration
   */
  static initialize(): void {
    // Add allowed origins from environment or use defaults
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:8081',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8081',
    ];

    allowedOrigins.forEach((origin) => {
      this.ALLOWED_ORIGINS.add(origin.trim());
    });

    logger.info(`CORS initialized with ${this.ALLOWED_ORIGINS.size} allowed origins`);
  }

  /**
   * Check if origin is allowed
   */
  static isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) {
      // Allow requests without origin (e.g., same-origin, Postman, curl)
      return true;
    }

    return this.ALLOWED_ORIGINS.has(origin);
  }

  /**
   * Set CORS headers on response
   */
  static setCorsHeaders(req: IncomingMessage, res: ServerResponse): boolean {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && !this.isOriginAllowed(origin)) {
      logger.warn(`Blocked request from unauthorized origin: ${origin}`);
      return false;
    }

    // Set CORS headers
    if (origin && this.isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // For same-origin requests or when no origin header
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', this.ALLOWED_METHODS.join(', '));
    res.setHeader('Access-Control-Allow-Headers', this.ALLOWED_HEADERS.join(', '));
    res.setHeader('Access-Control-Max-Age', this.MAX_AGE.toString());
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    return true;
  }

  /**
   * Handle preflight OPTIONS request
   */
  static handlePreflight(req: IncomingMessage, res: ServerResponse): boolean {
    if (req.method !== 'OPTIONS') {
      return false;
    }

    // Set CORS headers
    if (!this.setCorsHeaders(req, res)) {
      res.writeHead(403);
      res.end('Origin not allowed');
      return true;
    }

    // Respond to preflight
    res.writeHead(200);
    res.end();
    return true;
  }

  /**
   * Add allowed origin
   */
  static addAllowedOrigin(origin: string): void {
    this.ALLOWED_ORIGINS.add(origin);
    logger.info(`Added allowed origin: ${origin}`);
  }

  /**
   * Remove allowed origin
   */
  static removeAllowedOrigin(origin: string): void {
    this.ALLOWED_ORIGINS.delete(origin);
    logger.info(`Removed allowed origin: ${origin}`);
  }

  /**
   * Get all allowed origins
   */
  static getAllowedOrigins(): string[] {
    return Array.from(this.ALLOWED_ORIGINS);
  }
}

// Initialize CORS manager
CorsManager.initialize();
