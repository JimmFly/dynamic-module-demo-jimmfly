/**
 * SQLite database operations for execution logging
 */

import sqlite3 from 'sqlite3';
import { LogEntry } from '../types';
import { CONFIG } from '../utils/config';
import { logger } from '../utils/logger';

export class DatabaseManager {
  private db: sqlite3.Database | null = null;
  private isClosing: boolean = false;

  /**
   * Initialize SQLite database connection and create tables
   */
  public async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(CONFIG.DATABASE_PATH, (err) => {
        if (err) {
          logger.error('Failed to connect to SQLite database:', err.message);
          reject(err);
          return;
        }

        logger.info('Connected to SQLite database');
        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  /**
   * Create necessary database tables
   */
  private async createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS execution_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          call_string TEXT NOT NULL,
          result TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createTableSQL, (err) => {
        if (err) {
          logger.error('Failed to create table:', err.message);
          reject(err);
        } else {
          logger.info('Database tables initialized');
          resolve();
        }
      });
    });
  }

  /**
   * Log function execution to database
   */
  public async logExecution(callString: string, result: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const insertSQL = 'INSERT INTO execution_log (call_string, result) VALUES (?, ?)';
      this.db.run(insertSQL, [callString, result], function (err) {
        if (err) {
          logger.error('Failed to log execution:', err.message);
          reject(err);
        } else {
          logger.debug(`Logged execution with ID: ${this.lastID}`);
          resolve();
        }
      });
    });
  }

  /**
   * Get execution logs from database
   */
  public async getLogs(limit: number = 50): Promise<LogEntry[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const selectSQL = `
        SELECT id, call_string, result, timestamp 
        FROM execution_log 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;

      this.db.all(selectSQL, [limit], (err, rows: any[]) => {
        if (err) {
          logger.error('Failed to fetch logs:', err.message);
          reject(err);
        } else {
          resolve(rows as LogEntry[]);
        }
      });
    });
  }

  /**
   * Clear all execution logs
   */
  public async clearLogs(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const deleteSQL = 'DELETE FROM execution_log';
      this.db.run(deleteSQL, (err) => {
        if (err) {
          logger.error('Failed to clear logs:', err.message);
          reject(err);
        } else {
          logger.info('All logs cleared');
          resolve();
        }
      });
    });
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db || this.isClosing) {
        logger.debug('Database is not open or already closing');
        resolve();
        return;
      }

      this.isClosing = true;
      this.db.close((err) => {
        if (err) {
          logger.error('Failed to close database:', err.message);
          this.isClosing = false;
          reject(err);
        } else {
          logger.info('Database connection closed');
          this.db = null;
          this.isClosing = false;
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
export const dbManager = new DatabaseManager();
