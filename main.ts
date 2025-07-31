import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as sqlite3 from 'sqlite3';
import * as ts from 'typescript';

// Register TypeScript compiler for .ts files
try {
    require('ts-node').register({
        transpileOnly: true,
        compilerOptions: {
            module: 'commonjs',
            target: 'es2018'
        }
    });
} catch (error: any) {
    console.warn('TypeScript support not available:', error.message);
}

// Initialize SQLite database
const db: sqlite3.Database = new sqlite3.Database('./execution_log.db');

// Type definitions
interface Parameter {
    name: string;
    type: string;
}

interface FunctionInfo {
    name: string;
    parameters: Parameter[];
    description: string;
    example: string;
}

interface ModuleInfo {
    functions: FunctionInfo[];
    module: any;
    path: string;
}

interface ModulesMap {
    [key: string]: ModuleInfo;
}

/**
 * Initialize database table for storing execution logs
 */
function initDatabase(): void {
    db.run(`CREATE TABLE IF NOT EXISTS execution_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        call_string TEXT NOT NULL,
        result TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

/**
 * Clear require cache for dynamic module reloading
 * @param modulePath - Path to the module to clear from cache
 */
function clearRequireCache(modulePath: string): void {
    const resolvedPath: string = require.resolve(modulePath);
    delete require.cache[resolvedPath];
}

/**
 * Get available modules and their functions with parameter information
 * @returns Object containing module names and their functions with details
 */
function getAvailableModules(): ModulesMap {
    const scriptsDir: string = path.join(__dirname, 'scripts');
    const modules: ModulesMap = {};
    
    try {
        const files: string[] = fs.readdirSync(scriptsDir);
        
        files.forEach((file: string) => {
            if (file.endsWith('.js') || file.endsWith('.ts')) {
                const moduleName: string = path.basename(file, path.extname(file));
                const modulePath: string = path.join(scriptsDir, file);
                
                // Clear cache and reload module
                clearRequireCache(modulePath);
                
                try {
                    const moduleExports: any = require(modulePath);
                    
                    // Read file content to extract function signatures and comments
                    const fileContent: string = fs.readFileSync(modulePath, 'utf8');
                    
                    const functions: FunctionInfo[] = [];
                    Object.keys(moduleExports).forEach((funcName: string) => {
                        const funcInfo: FunctionInfo = extractFunctionInfo(fileContent, funcName, moduleName);
                        functions.push(funcInfo);
                    });
                    
                    modules[moduleName] = {
                        functions: functions,
                        module: moduleExports,
                        path: modulePath
                    };
                } catch (error: any) {
                    console.error(`Error loading module ${moduleName}:`, error.message);
                }
            }
        });
    } catch (error: any) {
        console.error('Error reading scripts directory:', error.message);
    }
    
    return modules;
}

/**
 * Extract function information including parameters and examples
 * @param fileContent - The file content
 * @param funcName - Function name
 * @param moduleName - Module name
 * @returns Function information
 */
function extractFunctionInfo(fileContent: string, funcName: string, moduleName: string): FunctionInfo {
    const funcInfo: FunctionInfo = {
        name: funcName,
        parameters: [],
        description: '',
        example: ''
    };
    
    // Find function definition (support both CommonJS and ES6 exports)
    const funcRegex: RegExp = new RegExp(`(?:exports\.${funcName}\\s*=\\s*\\(([^)]*)\\)|export\\s+const\\s+${funcName}\\s*=\\s*\\(([^)]*)\\))`, 'g');
    const match: RegExpExecArray | null = funcRegex.exec(fileContent);
    
    if (match && (match[1] || match[2])) {
        // Parse parameters (from either CommonJS or ES6 syntax)
        const paramString: string = match[1] || match[2];
        const params: Parameter[] = paramString.split(',').map((p: string) => {
            const param: string = p.trim();
            if (param.includes(':')) {
                // TypeScript parameter with type annotation
                const [name, type] = param.split(':').map((s: string) => s.trim());
                return { name, type };
            } else {
                // JavaScript parameter without type
                return { name: param, type: 'any' };
            }
        }).filter((p: Parameter) => p.name);
        funcInfo.parameters = params;
    }
    
    // Generate example based on function name and module
    funcInfo.example = generateFunctionExample(moduleName, funcName, funcInfo.parameters);
    
    // Extract JSDoc description if available
    const jsdocRegex: RegExp = new RegExp('/\\*\\*[\\s\\S]*?\\*/\\s*(?:exports\\.' + funcName + '|export\\s+const\\s+' + funcName + ')', 'g');
    const jsdocMatch: RegExpExecArray | null = jsdocRegex.exec(fileContent);
    if (jsdocMatch) {
        const jsdoc: string = jsdocMatch[0];
        const descMatch: RegExpMatchArray | null = jsdoc.match(/\*\s*(.+?)\s*\n/);
        if (descMatch) {
            funcInfo.description = descMatch[1];
        }
    }
    
    return funcInfo;
}

/**
 * Generate educational example function call that teaches parameter usage
 * @param moduleName - Module name
 * @param funcName - Function name
 * @param parameters - Function parameters
 * @returns Educational example function call
 */
function generateFunctionExample(moduleName: string, funcName: string, parameters: Parameter[]): string {
    // Generate educational examples that show parameter types and expected values
    const exampleParams: string[] = [];
    
    parameters.forEach((param: Parameter) => {
        // Handle both old string format and new object format
        const paramName: string = param.name;
        const paramType: string = param.type;
        const paramLower: string = paramName.toLowerCase();
        
        // Generate type-aware examples that show both value and type
        if (paramType === 'string') {
            if (paramLower.includes('name')) {
                exampleParams.push(`"Fluffy" // ${paramType}`);
            } else if (paramLower.includes('greeting')) {
                exampleParams.push(`"Hello" // ${paramType}`);
            } else if (paramLower.includes('item') || paramLower.includes('object')) {
                exampleParams.push(`"ball" // ${paramType}`);
            } else if (paramLower.includes('location') || paramLower.includes('place')) {
                exampleParams.push(`"park" // ${paramType}`);
            } else if (paramLower.includes('message') || paramLower.includes('text')) {
                exampleParams.push(`"Hello World" // ${paramType}`);
            } else if (paramLower.includes('color')) {
                exampleParams.push(`"blue" // ${paramType}`);
            } else {
                exampleParams.push(`"example" // ${paramType}`);
            }
        } else if (paramType === 'number') {
            if (paramLower.includes('times') || paramLower.includes('count')) {
                exampleParams.push(`3 // ${paramType}`);
            } else if (paramLower.includes('volume') || paramLower.includes('level') || paramLower.includes('intensity')) {
                exampleParams.push(`5 // ${paramType}`);
            } else {
                exampleParams.push(`1 // ${paramType}`);
            }
        } else {
            // For any other type, show the type information
            exampleParams.push(`value // ${paramType}`);
        }
    });
    
    // If no parameters, show empty parentheses to indicate no parameters needed
    if (parameters.length === 0) {
        return `${moduleName}.${funcName}()`;
    }
    
    return `${moduleName}.${funcName}(${exampleParams.join(', ')})`;
}

/**
 * Execute a function call string and return the result
 * @param callString - The function call string to execute
 * @returns Execution result
 */
function executeFunction(callString: string): string {
    try {
        // Get current modules
        const modules: ModulesMap = getAvailableModules();
        
        // Parse the call string to extract module and function
        const match: RegExpMatchArray | null = callString.match(/^(\w+)\.(\w+)\((.*)\)$/);
        if (!match) {
            return 'Error: Invalid function call format. Use: moduleName.functionName(args)';
        }
        
        const [, moduleName, functionName, argsString] = match;
        
        // Check if module exists
        if (!modules[moduleName]) {
            return `Error: Module '${moduleName}' not found`;
        }
        
        // Check if function exists
        if (!modules[moduleName].module[functionName]) {
            return `Error: Function '${functionName}' not found in module '${moduleName}'`;
        }
        
        // Parse arguments
        let args: any[] = [];
        if (argsString.trim()) {
            try {
                // Simple argument parsing - split by comma and evaluate
                args = argsString.split(',').map((arg: string) => {
                    const trimmed: string = arg.trim();
                    // Try to parse as JSON first, then as string
                    try {
                        return JSON.parse(trimmed);
                    } catch {
                        // If not valid JSON, treat as string (remove quotes if present)
                        return trimmed.replace(/^["']|["']$/g, '');
                    }
                });
            } catch (error: any) {
                return `Error parsing arguments: ${error.message}`;
            }
        }
        
        // Execute the function
        const result: any = modules[moduleName].module[functionName](...args);
        
        // Log the execution
        logExecution(callString, String(result));
        
        return String(result);
    } catch (error: any) {
        const errorMsg: string = `Error executing function: ${error.message}`;
        logExecution(callString, errorMsg);
        return errorMsg;
    }
}

/**
 * Log function execution to database
 * @param callString - The function call string
 * @param result - The execution result
 */
function logExecution(callString: string, result: string): void {
    db.run('INSERT INTO execution_log (call_string, result) VALUES (?, ?)', [callString, result], (err: Error | null) => {
        if (err) {
            console.error('Error logging execution:', err.message);
        }
    });
}

/**
 * Generate HTML page content
 * @returns HTML string
 */
function generateHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dynamic Module Executor</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 2.5em;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .controls {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .input-group {
            flex: 1;
            min-width: 300px;
        }
        
        input[type="text"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: white;
        }
        
        input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        button {
            padding: 15px 25px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            white-space: nowrap;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        .toggle-button {
            background: #28a745;
        }
        
        .toggle-button.off {
            background: #dc3545;
        }
        
        #result {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            min-height: 60px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .modules {
            width: 100%;
        }
        
        .logs {
            width: 100%;
            margin: 20px 0;
            background: white;
            border: 2px solid #e1e5e9;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }
        
        .logs h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.4em;
            border-bottom: 2px solid #f1f3f4;
            padding-bottom: 10px;
        }
        
        .log-item {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            font-family: 'Courier New', monospace;
        }
        
        .log-item:last-child {
            margin-bottom: 0;
        }
        
        .log-timestamp {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .log-call {
            font-weight: bold;
            color: #007acc;
            margin-bottom: 5px;
        }
        
        .log-result {
            color: #28a745;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .modules-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
            width: 100%;
        }
        
        .module {
            background: white;
            border: 2px solid #e1e5e9;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            min-width: 320px;
            height: fit-content;
        }
        
        .module:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
            border-color: #667eea;
        }
        
        .module h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.4em;
            border-bottom: 2px solid #f1f3f4;
            padding-bottom: 10px;
        }
        
        .function {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .function:hover {
            background: #e3f2fd;
            border-color: #2196f3;
            transform: translateX(5px);
        }
        
        .function:last-child {
            margin-bottom: 0;
        }
        
        .update-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 20px;
                margin: 10px;
            }
            
            .controls {
                flex-direction: column;
            }
            
            .input-group {
                min-width: 100%;
            }
            
            .modules-grid {
                grid-template-columns: 1fr;
            }
            
            .module {
                min-width: 280px;
            }
            
            h1 {
                font-size: 2em;
            }
        }
        
        @media (max-width: 480px) {
            .module {
                min-width: 250px;
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Dynamic Module Executor</h1>
        
        <div class="controls">
            <div class="input-group">
                <input type="text" id="functionCall" placeholder="Enter function call (e.g., dog.sayHi('Hello', 'Buddy'))" />
            </div>
            <button onclick="executeFunction()">▶️ Execute</button>
            <button onclick="refreshModules()">🔄 Refresh</button>
            <button id="autoRefreshToggle" class="toggle-button" onclick="toggleAutoRefresh()">🔄 Auto Refresh: ON</button>
            <button onclick="toggleLogs()">📊 View Logs</button>
        </div>
        
        <div id="result">Ready to execute functions...</div>
        
        <div id="logs" class="logs" style="display: none;">
            <h3>📊 Execution Logs (Latest 50)</h3>
            <div id="logsContent">Loading logs...</div>
        </div>
        
        <div id="modules" class="modules">
            <!-- Modules will be loaded here -->
        </div>
    </div>
    
    <script src="app.js"></script>
</body>
</html>
    `;
}

/**
 * Handle HTTP requests
 * @param req - HTTP request object
 * @param res - HTTP response object
 */
function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname: string = parsedUrl.pathname || '/';
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (pathname === '/') {
        // Serve main page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(generateHTML());
    } else if (pathname === '/app.js') {
        // Serve client-side TypeScript (compiled to JavaScript)
        try {
            const appTsPath: string = path.join(__dirname, 'public', 'app.ts');
            const appTs: string = fs.readFileSync(appTsPath, 'utf8');
            
            // Compile TypeScript to JavaScript
            const compilerOptions: ts.CompilerOptions = {
                target: ts.ScriptTarget.ES2018,
                module: ts.ModuleKind.None,
                lib: ['dom', 'es2018'],
                strict: false,
                esModuleInterop: true,
                skipLibCheck: true
            };
            
            const result = ts.transpile(appTs, compilerOptions);
            
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(result);
        } catch (error: any) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('app.ts not found or compilation failed: ' + error.message);
        }
    } else if (pathname === '/api/modules') {
        // API endpoint for getting available modules
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getAvailableModules()));
    } else if (pathname === '/api/execute' && req.method === 'POST') {
        // API endpoint for executing functions
        let body: string = '';
        req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data: { callString: string } = JSON.parse(body);
                const result: string = executeFunction(data.callString);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ result }));
            } catch (error: any) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request body' }));
            }
        });
    } else if (pathname === '/api/logs') {
        // API endpoint for getting execution logs
        db.all('SELECT * FROM execution_log ORDER BY timestamp DESC LIMIT 50', (err: Error | null, rows: any[]) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Database error' }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(rows));
            }
        });
    } else {
        // 404 for other paths
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

// Initialize database
initDatabase();

// Create and start server
const server: http.Server = http.createServer(handleRequest);

const PORT: number = 8080;
server.listen(PORT, () => {
    console.log('🚀 Server running at http://localhost:' + PORT);
    console.log('📁 Watching scripts directory for dynamic module loading');
    console.log('💾 SQLite database initialized for execution logging');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err: Error | null) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('💾 Database connection closed.');
        }
        process.exit(0);
    });
});