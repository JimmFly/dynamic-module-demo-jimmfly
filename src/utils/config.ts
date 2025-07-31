/**
 * Configuration constants for the Dynamic Module Executor
 */

import { ServerConfig } from '../types';
import path from 'path';

// Server configuration
export const CONFIG: ServerConfig = {
  DEFAULT_PORT: 8080,
  SCRIPTS_DIR: path.join(process.cwd(), 'scripts'),
  DATABASE_PATH: path.join(process.cwd(), 'execution_log.db'),
  CACHE_TTL: 5000, // 5 seconds
  MAX_PORT_RANGE: 100,
} as const;

// Environment-specific settings
export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isProduction = process.env.NODE_ENV === 'production';

// Logging configuration
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

export const currentLogLevel = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
