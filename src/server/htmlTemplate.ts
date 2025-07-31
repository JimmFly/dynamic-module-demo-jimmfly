/**
 * HTML template generator for the web interface
 */

export class HtmlTemplate {
  /**
   * Generate the main HTML page
   */
  static generateMainPage(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Dynamic Module Demo Jimmfly</title>
    <style>
        ${this.getCSS()}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🚀 Dynamic Module Demo Jimmfly</h1>
            <p class="subtitle">Execute TypeScript functions dynamically with hot reloading</p>
        </header>
        
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
            <div class="loading">Loading modules...</div>
        </div>
    </div>
    
    <script src="/client.js"></script>
</body>
</html>
    `;
  }

  /**
   * Get CSS styles for the page
   */
  private static getCSS(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e1e5e9;
        }
        
        .header h1 {
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .subtitle {
            color: #7f8c8d;
            font-size: 1.1em;
        }
        
        .controls {
            display: flex;
            gap: 15px;
            margin-bottom: 25px;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .input-group {
            flex: 1;
            min-width: 300px;
        }
        
        input[type="text"] {
            width: 100%;
            padding: 15px 20px;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: white;
        }
        
        input[type="text"]:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }
        
        button {
            padding: 15px 25px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #3498db;
            color: white;
            white-space: nowrap;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .toggle-button {
            background: #28a745;
        }
        
        .toggle-button.off {
            background: #dc3545;
        }
        
        .result {
            margin: 20px 0;
            padding: 20px;
            border-radius: 12px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
            min-height: 60px;
        }
        
        .result.success {
            background: #d4edda;
            border: 2px solid #c3e6cb;
            color: #155724;
        }
        
        .result.error {
            background: #f8d7da;
            border: 2px solid #f5c6cb;
            color: #721c24;
        }
        
        .result.loading {
            background: #d1ecf1;
            border: 2px solid #bee5eb;
            color: #0c5460;
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
        
        .logs-container {
            max-height: 500px;
            overflow-y: auto;
        }
        
        .logs-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e1e5e9;
        }
        
        .logs-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        
        .logs-table th,
        .logs-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e1e5e9;
        }
        
        .logs-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        
        .call-string {
            font-family: 'Courier New', monospace;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 4px;
        }
        
        .result-cell {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .timestamp {
            color: #6c757d;
            font-size: 12px;
        }
        
        .truncated {
            cursor: help;
        }
        
        .clear-logs-btn {
            background: #dc3545;
            padding: 8px 16px;
            font-size: 14px;
        }
        
        .logs-pagination {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e1e5e9;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modules-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .module-card {
            background: white;
            border: 2px solid #e1e5e9;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
        }
        
        .module-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        
        .module-title {
            font-size: 1.4em;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .function-item {
            margin-bottom: 15px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #3498db;
        }
        
        .function-name {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .function-description {
            color: #7f8c8d;
            margin-bottom: 8px;
            font-size: 0.9em;
        }
        
        .function-example {
            font-family: 'Courier New', monospace;
            background: #e9ecef;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.85em;
            color: #495057;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        
        .function-example:hover {
            background: #dee2e6;
        }
        
        .loading {
            text-align: center;
            color: #7f8c8d;
            padding: 40px;
            font-size: 1.1em;
        }
        
        .no-logs {
            text-align: center;
            color: #7f8c8d;
            padding: 40px;
            font-size: 1.1em;
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
            
            button {
                width: 100%;
            }
            
            .modules-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
  }
}
