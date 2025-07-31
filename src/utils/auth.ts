/**
 * Simple authentication utilities
 */

import crypto from 'crypto';
import { logger } from './logger';

export class AuthManager {
  private static readonly API_KEYS = new Set<string>();
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private static sessions = new Map<string, { created: number; ip: string }>();

  /**
   * Initialize with default API key (in production, this should be from env)
   */
  static initialize(): void {
    // Generate a default API key for development
    const defaultKey = process.env.API_KEY || this.generateApiKey();
    this.API_KEYS.add(defaultKey);

    if (!process.env.API_KEY) {
      logger.warn(`No API_KEY environment variable set. Using generated key: ${defaultKey}`);
      logger.warn('Please set API_KEY environment variable for production use.');
    }

    // Clean up expired sessions every hour
    setInterval(
      () => {
        this.cleanupSessions();
      },
      60 * 60 * 1000
    );
  }

  /**
   * Generate a secure API key
   */
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate API key
   */
  static validateApiKey(apiKey: string): boolean {
    return this.API_KEYS.has(apiKey);
  }

  /**
   * Create a session token
   */
  static createSession(ip: string): string {
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.sessions.set(sessionId, {
      created: Date.now(),
      ip,
    });
    return sessionId;
  }

  /**
   * Validate session token
   */
  static validateSession(sessionId: string, ip: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Check if session expired
    if (Date.now() - session.created > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Check if IP matches (optional security measure)
    if (session.ip !== ip) {
      logger.warn(`Session IP mismatch: expected ${session.ip}, got ${ip}`);
      return false;
    }

    return true;
  }

  /**
   * Extract auth token from request headers
   */
  static extractAuthToken(headers: any): string | null {
    const authHeader = headers.authorization;

    if (!authHeader) {
      return null;
    }

    // Support both "Bearer token" and "token" formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }

  /**
   * Check if authentication is required (can be disabled for development)
   */
  static isAuthRequired(): boolean {
    return process.env.NODE_ENV === 'production' || process.env.REQUIRE_AUTH === 'true';
  }

  /**
   * Clean up expired sessions
   */
  private static cleanupSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.created > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired sessions`);
    }
  }
}

// Initialize auth manager
AuthManager.initialize();
