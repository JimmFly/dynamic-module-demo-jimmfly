/**
 * HTTP route handlers for the Dynamic Module Demo Jimmfly
 */

import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { ExecuteRequest } from '../types';
import { moduleManager } from '../modules/moduleManager';
import { dbManager } from '../database/sqlite';
import { HttpUtils } from '../utils/network';
import { HtmlTemplate } from './htmlTemplate';
import { logger } from '../utils/logger';
import { rateLimiter } from '../utils/rateLimiter';
import { AuthManager } from '../utils/auth';
import { InputSanitizer } from '../utils/sanitizer';
import { isDevelopment } from '../utils/config';
import * as ts from 'typescript';

export class RouteHandler {
  /**
   * Handle root path - serve main HTML page
   */
  static async handleRoot(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const html = HtmlTemplate.generateMainPage();
      HttpUtils.sendHTML(res, html);
      logger.debug('Served main HTML page');
    } catch (error) {
      logger.error('Failed to serve main page:', error);
      HttpUtils.sendError(res, 'Failed to load page');
    }
  }

  /**
   * Handle /client.js - serve compiled client-side JavaScript
   */
  static async handleClientJs(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // In development, compile TypeScript on-the-fly
      if (isDevelopment) {
        const tsPath = path.join(process.cwd(), 'src', 'client', 'app.ts');
        if (fs.existsSync(tsPath)) {
          const tsContent = fs.readFileSync(tsPath, 'utf8');
          const jsContent = ts.transpile(tsContent, {
            target: ts.ScriptTarget.ES2018,
            module: ts.ModuleKind.None,
            removeComments: false,
            strict: false,
          });
          HttpUtils.sendJS(res, jsContent);
          logger.debug('Served dynamically compiled client JS');
          return;
        }
      }

      // In production, serve pre-compiled JS
      const compiledPath = path.join(process.cwd(), 'dist', 'client', 'app.js');
      if (fs.existsSync(compiledPath)) {
        const jsContent = fs.readFileSync(compiledPath, 'utf8');
        HttpUtils.sendJS(res, jsContent);
        logger.debug('Served compiled client JS');
        return;
      }

      // If neither exists, return error
      logger.error('Client JS not found. Please run "npm run build" first.');
      HttpUtils.sendError(res, 'Client script not available. Please build the project first.');
    } catch (error) {
      logger.error('Failed to serve client.js:', error);
      HttpUtils.sendError(res, 'Failed to load client script');
    }
  }

  /**
   * Handle /api/modules - get available modules
   */
  static async handleModules(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'GET') {
      HttpUtils.sendMethodNotAllowed(res);
      return;
    }

    try {
      const { query } = HttpUtils.parseUrl(req.url || '');
      const forceRefresh = query.get('forceRefresh') === 'true';

      const modules = await moduleManager.getAvailableModules(forceRefresh);
      HttpUtils.sendJSON(res, modules);
      logger.debug(`Served modules list (${Object.keys(modules).length} modules)`);
    } catch (error) {
      logger.error('Failed to get modules:', error);
      HttpUtils.sendError(res, 'Failed to load modules');
    }
  }

  /**
   * Get client IP address
   */
  private static getClientIP(req: IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Validate function call string format
   */
  private static validateCallString(callString: string): boolean {
    if (!callString || typeof callString !== 'string') {
      return false;
    }

    // Check length
    if (callString.length > 500) {
      return false;
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s*\(/,
      /eval\s*\(/,
      /Function\s*\(/,
      /process\./,
      /global\./,
      /console\./,
      /__dirname/,
      /__filename/,
      /fs\./,
      /child_process/,
      /exec\s*\(/,
      /spawn\s*\(/,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(callString));
  }

  /**
   * Handle /api/execute - execute function calls
   */
  static async handleExecute(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      HttpUtils.sendMethodNotAllowed(res);
      return;
    }

    try {
      // Get client IP for rate limiting
      const clientIP = RouteHandler.getClientIP(req);

      // Check authentication if required
      if (AuthManager.isAuthRequired()) {
        const authToken = AuthManager.extractAuthToken(req.headers);

        if (!authToken) {
          HttpUtils.sendError(res, 'Authentication required', 401);
          return;
        }

        // Try API key first, then session token
        const isValidApiKey = AuthManager.validateApiKey(authToken);
        const isValidSession = AuthManager.validateSession(authToken, clientIP);

        if (!isValidApiKey && !isValidSession) {
          HttpUtils.sendError(res, 'Invalid authentication token', 401);
          logger.warn(`Invalid auth attempt from ${clientIP}`);
          return;
        }
      }

      // Check rate limit
      if (!rateLimiter.isAllowed(clientIP)) {
        HttpUtils.sendError(res, 'Rate limit exceeded', 429);
        logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
        return;
      }

      const requestData: ExecuteRequest = await HttpUtils.parseRequestBody(req);

      if (!requestData.callString) {
        HttpUtils.sendError(res, 'Missing callString in request', 400);
        return;
      }

      // Validate call string
      if (!RouteHandler.validateCallString(requestData.callString)) {
        HttpUtils.sendError(res, 'Invalid or potentially dangerous function call', 400);
        logger.warn(`Blocked dangerous call string from ${clientIP}: ${requestData.callString}`);
        return;
      }

      // Additional sanitization check
      if (InputSanitizer.containsDangerousPatterns(requestData.callString)) {
        HttpUtils.sendError(res, 'Potentially dangerous patterns detected', 400);
        logger.warn(
          `Blocked dangerous patterns from ${clientIP}: ${InputSanitizer.sanitizeLogOutput(requestData.callString)}`
        );
        return;
      }

      // Sanitize the call string
      const sanitizedCallString = InputSanitizer.sanitizeFunctionCall(requestData.callString);

      // Execute the function with sanitized input
      const result = await moduleManager.executeFunction(sanitizedCallString);

      // Log execution to database (sanitize for logging)
      try {
        const logCallString = InputSanitizer.sanitizeLogOutput(
          sanitizedCallString.substring(0, 200)
        );
        const logResultText = InputSanitizer.sanitizeLogOutput(
          (result.error || result.result || 'No result').substring(0, 1000)
        );
        await dbManager.logExecution(logCallString, logResultText);
      } catch (logError) {
        logger.warn('Failed to log execution:', logError);
      }

      HttpUtils.sendJSON(res, result);
      logger.info(
        `Executed: ${InputSanitizer.sanitizeLogOutput(sanitizedCallString.substring(0, 100))}`
      );
    } catch (error) {
      logger.error('Failed to execute function:', error);
      HttpUtils.sendError(res, 'Failed to execute function');
    }
  }

  /**
   * Handle /api/logs - get or clear execution logs
   */
  static async handleLogs(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (req.method === 'GET') {
        const logs = await dbManager.getLogs();
        HttpUtils.sendJSON(res, logs);
        logger.debug(`Served ${logs.length} log entries`);
      } else if (req.method === 'DELETE') {
        await dbManager.clearLogs();
        HttpUtils.sendJSON(res, { message: 'Logs cleared successfully' });
        logger.info('Cleared all logs');
      } else {
        HttpUtils.sendMethodNotAllowed(res);
      }
    } catch (error) {
      logger.error('Failed to handle logs request:', error);
      HttpUtils.sendError(res, 'Failed to handle logs request');
    }
  }

  /**
   * Handle OPTIONS requests for CORS
   */
  static handleOptions(_req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
  }

  /**
   * Main request router
   */
  static async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const { pathname } = HttpUtils.parseUrl(req.url || '');

    logger.debug(`${req.method} ${pathname}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      this.handleOptions(req, res);
      return;
    }

    // Route requests
    switch (pathname) {
      case '/':
        await this.handleRoot(req, res);
        break;

      case '/client.js':
        await this.handleClientJs(req, res);
        break;

      case '/api/modules':
        await this.handleModules(req, res);
        break;

      case '/api/execute':
        await this.handleExecute(req, res);
        break;

      case '/api/logs':
        await this.handleLogs(req, res);
        break;

      default:
        HttpUtils.send404(res);
        break;
    }
  }
}
