/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>"'&]/g, (match) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;',
        };
        return entities[match] || match;
      })
      .trim();
  }

  /**
   * Sanitize function call string for safe execution
   */
  static sanitizeFunctionCall(callString: string): string {
    if (typeof callString !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters and patterns
    return callString
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .trim();
  }

  /**
   * Validate and sanitize parameter values
   */
  static sanitizeParameter(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      // Limit string length
      if (value.length > 1000) {
        value = value.substring(0, 1000);
      }
      return this.sanitizeString(value);
    }

    if (typeof value === 'number') {
      // Check for valid numbers
      if (!isFinite(value) || isNaN(value)) {
        return 0;
      }
      // Limit number range
      return Math.max(-1e10, Math.min(1e10, value));
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      // Limit array size
      if (value.length > 100) {
        value = value.slice(0, 100);
      }
      return value.map((item: any) => this.sanitizeParameter(item));
    }

    if (typeof value === 'object') {
      // Limit object properties
      const keys = Object.keys(value);
      if (keys.length > 50) {
        const limitedObj: any = {};
        keys.slice(0, 50).forEach((key) => {
          limitedObj[key] = value[key];
        });
        value = limitedObj;
      }

      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        const sanitizedKey = this.sanitizeString(key);
        if (sanitizedKey.length > 0 && sanitizedKey.length <= 100) {
          sanitized[sanitizedKey] = this.sanitizeParameter(val);
        }
      }
      return sanitized;
    }

    // For other types, convert to string and sanitize
    return this.sanitizeString(String(value));
  }

  /**
   * Check if string contains dangerous patterns
   */
  static containsDangerousPatterns(input: string): boolean {
    const dangerousPatterns = [
      // Script injection
      /<script[^>]*>/i,
      /<\/script>/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,

      // Code execution
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,

      // System access
      /require\s*\(/i,
      /import\s*\(/i,
      /process\./i,
      /global\./i,
      /__dirname/i,
      /__filename/i,

      // File system
      /fs\./i,
      /readFile/i,
      /writeFile/i,
      /unlink/i,

      // Network
      /http\./i,
      /https\./i,
      /net\./i,

      // Child processes
      /child_process/i,
      /exec\s*\(/i,
      /spawn\s*\(/i,

      // SQL injection patterns
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Sanitize log output to prevent log injection
   */
  static sanitizeLogOutput(output: string): string {
    if (typeof output !== 'string') {
      return String(output);
    }

    return output
      .replace(/[\r\n]/g, ' ') // Replace newlines to prevent log injection
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .substring(0, 500); // Limit length
  }
}
