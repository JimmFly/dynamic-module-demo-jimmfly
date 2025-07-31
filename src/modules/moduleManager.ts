/**
 * Dynamic module loading and management
 */

import fs from 'fs';
import path from 'path';
import { ModulesMap, ModuleInfo, FunctionInfo } from '../types';
import { CONFIG } from '../utils/config';
import { logger } from '../utils/logger';
import { InputSanitizer } from '../utils/sanitizer';

export class ModuleManager {
  private modulesCache: ModulesMap = {};
  private cacheTimestamp: number = 0;
  private fileWatcher: fs.FSWatcher | null = null;

  constructor() {
    this.initFileWatcher();
  }

  /**
   * Initialize file watcher for hot reloading
   */
  private initFileWatcher(): void {
    try {
      if (fs.existsSync(CONFIG.SCRIPTS_DIR)) {
        this.fileWatcher = fs.watch(
          CONFIG.SCRIPTS_DIR,
          { recursive: true },
          (eventType, filename) => {
            if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
              logger.info(`File ${eventType}: ${filename}`);
              this.clearCache();
            }
          }
        );
        logger.info(`File watcher initialized for ${CONFIG.SCRIPTS_DIR}`);
      }
    } catch (error) {
      logger.warn('Failed to initialize file watcher:', error);
    }
  }

  /**
   * Clear require cache for dynamic module reloading
   */
  private clearRequireCache(modulePath: string): void {
    try {
      const resolvedPath = require.resolve(modulePath);
      delete require.cache[resolvedPath];
      logger.debug(`Cleared cache for module: ${modulePath}`);
    } catch (error) {
      logger.warn(`Failed to clear cache for module: ${modulePath}`, error);
    }
  }

  /**
   * Extract parameter types from TypeScript function signature
   */
  private extractParameterTypes(functionSignature: string): { name: string; type: string }[] {
    const params: { name: string; type: string }[] = [];

    // Match function parameters with types: (param1: type1, param2: type2)
    const paramMatch = functionSignature.match(/\(([^)]*)\)/);
    if (!paramMatch || !paramMatch[1].trim()) {
      return params;
    }

    const paramString = paramMatch[1];
    // Split by comma, but be careful with nested types like Array<string>
    const paramParts = this.splitParameters(paramString);

    paramParts.forEach((param) => {
      const trimmed = param.trim();
      if (trimmed) {
        // Match parameter with type annotation: paramName: type
        const typeMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
        if (typeMatch) {
          const name = typeMatch[1].trim();
          const type = typeMatch[2].trim();
          params.push({ name, type });
        } else {
          // Parameter without type annotation
          params.push({ name: trimmed, type: 'any' });
        }
      }
    });

    return params;
  }

  /**
   * Split parameter string by comma, handling nested types
   */
  private splitParameters(paramString: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < paramString.length; i++) {
      const char = paramString[i];

      if (char === '<' || char === '(' || char === '[') {
        depth++;
      } else if (char === '>' || char === ')' || char === ']') {
        depth--;
      } else if (char === ',' && depth === 0) {
        params.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params;
  }

  /**
   * Extract function information from module exports
   */
  private extractFunctionInfo(
    moduleExports: any,
    fileContent: string,
    moduleName: string
  ): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = fileContent.split('\n');

    Object.keys(moduleExports).forEach((funcName: string) => {
      if (typeof moduleExports[funcName] === 'function') {
        let description = 'No description available';
        let example = `${moduleName}.${funcName}()`;
        let parameters: { name: string; type: string }[] = [];

        // Find function declaration in source code
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Look for function declarations
          const functionPatterns = [
            new RegExp(`export\\s+const\\s+${funcName}\\s*=`),
            new RegExp(`export\\s+function\\s+${funcName}\\s*\\(`),
            new RegExp(`function\\s+${funcName}\\s*\\(`),
            new RegExp(`const\\s+${funcName}\\s*=`),
          ];

          const isFunction = functionPatterns.some((pattern) => pattern.test(line));

          if (isFunction) {
            // Extract function signature for parameter types
            let functionSignature = line;

            // If function spans multiple lines, collect them
            let j = i;
            while (j < lines.length && !functionSignature.includes(')')) {
              j++;
              if (j < lines.length) {
                functionSignature += ' ' + lines[j].trim();
              }
            }

            // Extract parameter types from TypeScript signature
            parameters = this.extractParameterTypes(functionSignature);

            // Look backwards for JSDoc comment
            let commentLines: string[] = [];
            for (let k = i - 1; k >= 0; k--) {
              const prevLine = lines[k].trim();
              if (prevLine === '*/') {
                // Found end of JSDoc, collect comment lines
                for (let l = k - 1; l >= 0; l--) {
                  const commentLine = lines[l].trim();
                  if (commentLine === '/**') {
                    break;
                  }
                  if (commentLine.startsWith('*')) {
                    commentLines.unshift(commentLine.substring(1).trim());
                  }
                }
                break;
              }
            }

            if (commentLines.length > 0) {
              // First non-empty line is description
              description =
                commentLines.find((line) => line && !line.startsWith('@')) || description;

              // Look for @example
              const exampleIndex = commentLines.findIndex((line) => line.startsWith('@example'));
              if (exampleIndex >= 0) {
                const exampleLine = commentLines[exampleIndex];
                const exampleText = exampleLine.replace('@example', '').trim();
                if (exampleText) {
                  // If example doesn't include module name, add it
                  if (!exampleText.includes(`${moduleName}.`)) {
                    example = `${moduleName}.${exampleText}`;
                  } else {
                    example = exampleText;
                  }
                }
              }
            }

            // Generate default example if none provided
            if (example === `${moduleName}.${funcName}()` && parameters.length > 0) {
              const exampleParams = parameters
                .map((param, index) => {
                  switch (param.type.toLowerCase()) {
                    case 'string':
                      return `"example"`;
                    case 'number':
                      return `${index + 1}`;
                    case 'boolean':
                      return 'true';
                    case 'array':
                    case 'array<string>':
                    case 'string[]':
                      return '["item1", "item2"]';
                    case 'array<number>':
                    case 'number[]':
                      return '[1, 2, 3]';
                    default:
                      return `param${index + 1}`;
                  }
                })
                .join(', ');
              example = `${moduleName}.${funcName}(${exampleParams})`;
            }

            break;
          }
        }

        functions.push({
          name: funcName,
          parameters,
          description,
          example,
        });
      }
    });

    return functions;
  }

  /**
   * Load a single module from file path
   */
  private async loadModule(filePath: string): Promise<ModuleInfo | null> {
    try {
      const moduleName = path.basename(filePath, path.extname(filePath));
      const modulePath = path.resolve(filePath);
      const isTypeScript = path.extname(filePath) === '.ts';

      // Clear cache for hot reloading
      this.clearRequireCache(modulePath);

      // Read file content for documentation extraction
      const fileContent = fs.readFileSync(modulePath, 'utf8');

      let moduleExports: any;

      if (isTypeScript) {
        // For TypeScript files, use ts-node to compile and load
        try {
          // Register ts-node if not already registered
          if (!process.env.TS_NODE_REGISTERED) {
            require('ts-node').register({
              transpileOnly: true,
              compilerOptions: {
                module: 'commonjs',
                target: 'es2020',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
              },
            });
            process.env.TS_NODE_REGISTERED = 'true';
          }

          moduleExports = require(modulePath);

          // Handle ES6 modules with default export
          if (moduleExports && typeof moduleExports === 'object' && moduleExports.__esModule) {
            // If it's an ES6 module, use the exports directly
            const namedExports = { ...moduleExports };
            delete namedExports.default;
            delete namedExports.__esModule;
            moduleExports = namedExports;
          }
        } catch (tsError) {
          const error = tsError as Error;
          logger.error(`Failed to load TypeScript module: ${filePath}`, {
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace',
            name: error.name || 'Error',
          });
          return null;
        }
      } else {
        // For JavaScript files, load directly
        moduleExports = require(modulePath);

        // Handle ES6 modules with default export
        if (moduleExports && typeof moduleExports === 'object' && moduleExports.__esModule) {
          const namedExports = { ...moduleExports };
          delete namedExports.default;
          delete namedExports.__esModule;
          moduleExports = namedExports;
        }
      }

      // Extract function information
      const functions = this.extractFunctionInfo(moduleExports, fileContent, moduleName);

      if (functions.length === 0) {
        logger.warn(`No functions found in module: ${moduleName}`);
        return null;
      }

      logger.debug(`Loaded module: ${moduleName} with ${functions.length} functions`);

      return {
        functions,
        module: moduleExports,
        path: modulePath,
      };
    } catch (err) {
      const error = err as Error;
      logger.error(`Failed to load module: ${filePath}`, {
        message: error.message || 'Unknown error',
        stack: error.stack || 'No stack trace',
        name: error.name || 'Error',
      });
      return null;
    }
  }

  /**
   * Get all available modules from scripts directory
   */
  public async getAvailableModules(forceRefresh: boolean = false): Promise<ModulesMap> {
    const now = Date.now();

    // Return cached modules if still valid
    if (
      !forceRefresh &&
      Object.keys(this.modulesCache).length > 0 &&
      now - this.cacheTimestamp < CONFIG.CACHE_TTL
    ) {
      logger.debug('Returning cached modules');
      return this.modulesCache;
    }

    logger.debug('Refreshing modules from disk');
    const modules: ModulesMap = {};

    try {
      // Check if scripts directory exists
      if (!fs.existsSync(CONFIG.SCRIPTS_DIR)) {
        logger.warn(`Scripts directory does not exist: ${CONFIG.SCRIPTS_DIR}`);
        return modules;
      }

      // Get all supported script files
      const files = fs
        .readdirSync(CONFIG.SCRIPTS_DIR)
        .filter((file) => ['.ts', '.js'].includes(path.extname(file)))
        .map((file) => path.join(CONFIG.SCRIPTS_DIR, file));

      // Load modules in parallel
      const modulePromises = files.map((file) => this.loadModule(file));
      const moduleResults = await Promise.all(modulePromises);

      // Build modules map
      moduleResults.forEach((moduleInfo, index) => {
        if (moduleInfo) {
          const moduleName = path.basename(files[index], path.extname(files[index]));
          modules[moduleName] = moduleInfo;
        }
      });

      // Update cache
      this.modulesCache = modules;
      this.cacheTimestamp = now;

      logger.info(`Loaded ${Object.keys(modules).length} modules`);
      return modules;
    } catch (error) {
      logger.error('Failed to load modules:', error);
      return modules;
    }
  }

  /**
   * Execute a function call string
   */
  /**
   * Parse and validate function call string
   */
  private parseFunctionCall(
    callString: string
  ): { moduleName: string; functionName: string; args: any[]; error?: string } | null {
    try {
      // Check for basic structure issues
      if (!callString || typeof callString !== 'string') {
        return {
          moduleName: '',
          functionName: '',
          args: [],
          error: 'Function call string is empty or invalid',
        };
      }

      const trimmed = callString.trim();

      // Check if it contains a dot
      if (!trimmed.includes('.')) {
        return {
          moduleName: '',
          functionName: '',
          args: [],
          error: 'Missing module name. Expected format: moduleName.functionName(args)',
        };
      }

      // Check if it contains parentheses
      if (!trimmed.includes('(') || !trimmed.includes(')')) {
        return {
          moduleName: '',
          functionName: '',
          args: [],
          error: 'Missing parentheses. Expected format: moduleName.functionName(args)',
        };
      }

      // Validate basic format: moduleName.functionName(args)
      const functionCallRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/;
      const match = trimmed.match(functionCallRegex);

      if (!match) {
        // Provide more specific error messages
        if (trimmed.match(/^[^.]*\.[^.]*\(.*\)$/)) {
          return {
            moduleName: '',
            functionName: '',
            args: [],
            error:
              'Invalid module or function name. Names must start with letter or underscore and contain only letters, numbers, and underscores',
          };
        }
        return {
          moduleName: '',
          functionName: '',
          args: [],
          error: 'Invalid function call format. Expected: moduleName.functionName(args)',
        };
      }

      const [, moduleName, functionName, argsString] = match;

      // Parse arguments safely
      let args: any[] = [];
      if (argsString.trim()) {
        try {
          // Check for common syntax errors
          if (argsString.includes('，')) {
            return {
              moduleName,
              functionName,
              args: [],
              error: 'Invalid comma character. Use English comma (,) instead of Chinese comma (，)',
            };
          }

          if (argsString.trim().endsWith(',')) {
            return {
              moduleName,
              functionName,
              args: [],
              error: 'Trailing comma in arguments. Remove the comma after the last argument',
            };
          }

          // Use JSON.parse for safe argument parsing
          args = JSON.parse(`[${argsString}]`);
        } catch (parseError) {
          return {
            moduleName,
            functionName,
            args: [],
            error:
              'Invalid arguments format. Use JSON-compatible values (strings in quotes, numbers, booleans, null)',
          };
        }
      }

      return { moduleName, functionName, args };
    } catch (error) {
      logger.error(`Failed to parse function call: ${error}`);
      return {
        moduleName: '',
        functionName: '',
        args: [],
        error: 'Unexpected error parsing function call',
      };
    }
  }

  /**
   * Validate function call against available modules
   */
  private async validateFunctionCall(moduleName: string, functionName: string): Promise<boolean> {
    const modules = await this.getAvailableModules();

    // Check if module exists
    if (!modules[moduleName]) {
      logger.warn(`Module '${moduleName}' not found`);
      return false;
    }

    // Check if function exists in module
    if (typeof modules[moduleName].module[functionName] !== 'function') {
      logger.warn(`Function '${functionName}' not found in module '${moduleName}'`);
      return false;
    }

    return true;
  }

  /**
   * Validate function parameters against function signature
   */
  private async validateFunctionParameters(
    moduleName: string,
    functionName: string,
    args: any[]
  ): Promise<{ isValid: boolean; error?: string }> {
    const modules = await this.getAvailableModules();
    const moduleInfo = modules[moduleName];

    if (!moduleInfo) {
      return { isValid: false, error: `Module '${moduleName}' not found` };
    }

    // Find function info
    const functionInfo = moduleInfo.functions.find((f) => f.name === functionName);
    if (!functionInfo) {
      return {
        isValid: false,
        error: `Function '${functionName}' not found in module '${moduleName}'`,
      };
    }

    const requiredParams = functionInfo.parameters;

    // Check if we have too many arguments
    if (args.length > requiredParams.length) {
      return {
        isValid: false,
        error: `Too many arguments. Expected ${requiredParams.length}, got ${args.length}`,
      };
    }

    // Check for missing required parameters (non-undefined values)
    for (let i = 0; i < requiredParams.length; i++) {
      const param = requiredParams[i];
      const argValue = args[i];

      // If argument is missing or explicitly undefined/null, it's invalid
      if (i >= args.length || argValue === undefined || argValue === null || argValue === '') {
        return {
          isValid: false,
          error: `Missing required parameter '${param.name}' (${param.type})`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Sanitize and validate arguments
   */
  private sanitizeArguments(args: any[]): any[] {
    return args.map((arg) => InputSanitizer.sanitizeParameter(arg));
  }

  public async executeFunction(callString: string): Promise<{ result?: string; error?: string }> {
    try {
      logger.debug(`Executing: ${callString}`);

      // Input validation - check length
      if (!callString || callString.length > 1000) {
        return { error: 'Invalid call string length' };
      }

      // Parse function call safely
      const parsed = this.parseFunctionCall(callString);
      if (!parsed) {
        return { error: 'Failed to parse function call' };
      }

      // Check for parsing errors
      if (parsed.error) {
        return { error: parsed.error };
      }

      const { moduleName, functionName, args } = parsed;

      // Validate function exists
      const isValid = await this.validateFunctionCall(moduleName, functionName);
      if (!isValid) {
        return { error: `Function ${moduleName}.${functionName} not found` };
      }

      // Validate function parameters
      const paramValidation = await this.validateFunctionParameters(moduleName, functionName, args);
      if (!paramValidation.isValid) {
        return { error: paramValidation.error };
      }

      // Sanitize arguments
      let sanitizedArgs: any[];
      try {
        sanitizedArgs = this.sanitizeArguments(args);
      } catch (error) {
        return {
          error: `Invalid arguments: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      // Get modules and execute function safely
      const modules = await this.getAvailableModules();
      const targetFunction = modules[moduleName].module[functionName];

      // Execute with timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Function execution timeout')), 5000);
      });

      const executionPromise = Promise.resolve(targetFunction.apply(null, sanitizedArgs));

      const result = await Promise.race([executionPromise, timeoutPromise]);
      const resultString = String(result);

      // Limit result size
      if (resultString.length > 10000) {
        return { error: 'Result too large' };
      }

      logger.debug(`Execution result: ${resultString}`);
      return { result: resultString };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Execution failed: ${errorMessage}`);
      return { error: 'Function execution failed' };
    }
  }

  /**
   * Clear module cache
   */
  public clearCache(): void {
    this.modulesCache = {};
    this.cacheTimestamp = 0;
    logger.debug('Module cache cleared');
  }

  /**
   * Stop file watcher
   */
  public stopWatcher(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
      logger.info('File watcher stopped');
    }
  }
}

// Export singleton instance
export const moduleManager = new ModuleManager();
