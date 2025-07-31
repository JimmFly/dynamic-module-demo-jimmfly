/**
 * Logging utility for the Dynamic Module Demo Jimmfly
 */

import { currentLogLevel, LOG_LEVELS } from './config';

export class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = this.getTimestamp();
    const formattedArgs =
      args.length > 0
        ? ' ' +
          args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')
        : '';
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  /**
   * Log error messages
   */
  public error(message: string, ...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  /**
   * Log warning messages
   */
  public warn(message: string, ...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  /**
   * Log info messages
   */
  public info(message: string, ...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', message, ...args));
    }
  }

  /**
   * Log debug messages
   */
  public debug(message: string, ...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, ...args));
    }
  }
}

// Export singleton instance
export const logger = new Logger();
