/**
 * Dynamic Module Executor - Frontend TypeScript
 * Refactored modular client application
 */

// Include all modules in a single file for browser compatibility
// This approach avoids the need for a module bundler

// Types
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

interface ExecuteResponse {
  result?: string;
  error?: string;
}

interface ExecuteRequest {
  callString: string;
}

interface LogEntry {
  id: number;
  call_string: string;
  result: string;
  timestamp: string;
}

interface ClientConfig {
  AUTO_REFRESH_INTERVAL: number;
  DEBOUNCE_DELAY: number;
  MAX_RETRIES: number;
  REQUEST_TIMEOUT: number;
}

type ResultType = 'success' | 'error' | 'loading';

// Configuration
const CLIENT_CONFIG: ClientConfig = {
  AUTO_REFRESH_INTERVAL: 3000,
  DEBOUNCE_DELAY: 300,
  MAX_RETRIES: 3,
  REQUEST_TIMEOUT: 10000,
};

// State Management
class ClientAppState {
  private static instance: ClientAppState;

  public lastModulesHash: string = '';
  public autoRefreshInterval: number | null = null;
  public isAutoRefreshEnabled: boolean = true;
  public isLogsVisible: boolean = false;
  public isExecuting: boolean = false;

  public static getInstance(): ClientAppState {
    if (!ClientAppState.instance) {
      ClientAppState.instance = new ClientAppState();
    }
    return ClientAppState.instance;
  }

  public reset(): void {
    this.lastModulesHash = '';
    this.autoRefreshInterval = null;
    this.isAutoRefreshEnabled = true;
    this.isLogsVisible = false;
    this.isExecuting = false;
  }
}

const clientAppState = ClientAppState.getInstance();

// Utility Functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatResult(result: string): string {
  const escaped = escapeHtml(result);
  if (escaped.length > 100) {
    return `<span class="truncated" title="${escaped}">${escaped.substring(0, 100)}...</span>`;
  }
  return escaped;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffMins < 1440) {
    return `${Math.floor(diffMins / 60)}h ago`;
  } else {
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  }
}

function showUpdateIndicator(): void {
  const indicator: HTMLDivElement = document.createElement('div');
  indicator.style.cssText =
    'position: fixed; top: 10px; right: 10px; background: #28a745; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; z-index: 1000;';
  indicator.textContent = 'Modules Updated';
  document.body.appendChild(indicator);
  setTimeout((): void => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 2000);
}

function validateInput(value: string): void {
  const input = document.getElementById('functionCall') as HTMLInputElement;
  if (!input) return;

  if (value.trim() && !value.includes('(')) {
    input.style.borderColor = '#ffc107';
  } else if (value.trim()) {
    input.style.borderColor = '#28a745';
  } else {
    input.style.borderColor = '';
  }
}

// API Service
class ApiService {
  static async executeWithRetry(
    callString: string,
    retries: number = CLIENT_CONFIG.MAX_RETRIES
  ): Promise<ExecuteResponse> {
    const requestData: ExecuteRequest = { callString };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CLIENT_CONFIG.REQUEST_TIMEOUT);

        const response = await fetch('/api/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('Max retries exceeded');
  }

  static async fetchModules(): Promise<ModulesMap> {
    const response = await fetch('/api/modules');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }

  static async fetchLogs(): Promise<LogEntry[]> {
    const response = await fetch('/api/logs');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }

  static async clearLogs(): Promise<void> {
    const response = await fetch('/api/logs', { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Failed to clear logs');
    }
  }
}

// UI Manager
class UIManager {
  static showResult(resultDiv: HTMLDivElement, message: string, type: ResultType): void {
    resultDiv.className = `result ${type}`;
    resultDiv.textContent =
      type === 'loading' ? message : (type === 'success' ? 'Result: ' : 'Error: ') + message;
  }

  static updateExecuteButton(isExecuting: boolean): void {
    const executeBtn = document.querySelector(
      'button[onclick="executeFunction()"]'
    ) as HTMLButtonElement;
    if (executeBtn) {
      executeBtn.disabled = isExecuting;
      executeBtn.textContent = isExecuting ? 'Executing...' : 'Execute';
    }
  }

  static updateAutoRefreshButton(): void {
    const toggleButton = document.getElementById('autoRefreshToggle') as HTMLButtonElement;
    if (!toggleButton) return;

    if (clientAppState.isAutoRefreshEnabled) {
      toggleButton.textContent = '🔄 Auto Refresh: ON';
      toggleButton.style.backgroundColor = '#28a745';
    } else {
      toggleButton.textContent = '⏸️ Auto Refresh: OFF';
      toggleButton.style.backgroundColor = '#dc3545';
    }
  }

  static renderModules(modules: ModulesMap): void {
    const modulesDiv = document.getElementById('modules') as HTMLDivElement;
    if (!modulesDiv) return;

    modulesDiv.innerHTML = '';
    const modulesGrid: HTMLDivElement = document.createElement('div');
    modulesGrid.className = 'modules-grid';

    Object.keys(modules).forEach((moduleName: string) => {
      const moduleDiv = this.createModuleCard(moduleName, modules[moduleName]);
      modulesGrid.appendChild(moduleDiv);
    });

    modulesDiv.appendChild(modulesGrid);
  }

  private static createModuleCard(moduleName: string, moduleInfo: any): HTMLDivElement {
    const moduleDiv: HTMLDivElement = document.createElement('div');
    moduleDiv.className = 'module-card';

    const title: HTMLHeadingElement = document.createElement('h3');
    title.className = 'module-title';
    title.textContent = moduleName + '.ts';
    moduleDiv.appendChild(title);

    moduleInfo.functions.forEach((funcInfo: FunctionInfo) => {
      const funcDiv = this.createFunctionItem(moduleName, funcInfo);
      moduleDiv.appendChild(funcDiv);
    });

    return moduleDiv;
  }

  private static createFunctionItem(moduleName: string, funcInfo: FunctionInfo): HTMLDivElement {
    const funcDiv: HTMLDivElement = document.createElement('div');
    funcDiv.className = 'function-item';

    const funcName: string = funcInfo.name;
    const params: Parameter[] = funcInfo.parameters || [];
    const example: string = funcInfo.example || moduleName + '.' + funcName + '()';
    const description: string = funcInfo.description || '';

    let paramSignature: string = '';
    if (params.length > 0) {
      paramSignature = params.map((param: Parameter) => param.name + ': ' + param.type).join(', ');
    }

    const signature: string = moduleName + '.' + funcName + '(' + paramSignature + ')';

    const funcNameDiv: HTMLDivElement = document.createElement('div');
    funcNameDiv.className = 'function-name';
    funcNameDiv.textContent = signature;
    funcDiv.appendChild(funcNameDiv);

    if (description) {
      const descDiv: HTMLDivElement = document.createElement('div');
      descDiv.className = 'function-description';
      descDiv.textContent = description;
      funcDiv.appendChild(descDiv);
    }

    if (params.length > 0) {
      const paramDiv: HTMLDivElement = document.createElement('div');
      paramDiv.className = 'function-description';
      paramDiv.innerHTML =
        'Parameters: ' +
        params
          .map((param: Parameter) => `<strong>${param.name}</strong> (${param.type})`)
          .join(', ');
      funcDiv.appendChild(paramDiv);
    }

    const exampleDiv: HTMLDivElement = document.createElement('div');
    exampleDiv.className = 'function-example';
    exampleDiv.textContent = example;
    exampleDiv.onclick = (): void => {
      const functionCallInput = document.getElementById('functionCall') as HTMLInputElement;
      if (functionCallInput) {
        functionCallInput.value = example;
      }
    };
    funcDiv.appendChild(exampleDiv);

    return funcDiv;
  }

  static toggleLogsVisibility(): void {
    const logsDiv = document.getElementById('logs') as HTMLDivElement;
    const modulesDiv = document.getElementById('modules') as HTMLDivElement;

    if (clientAppState.isLogsVisible) {
      if (logsDiv) logsDiv.style.display = 'none';
      if (modulesDiv) modulesDiv.style.display = 'block';
      clientAppState.isLogsVisible = false;
    } else {
      if (logsDiv) logsDiv.style.display = 'block';
      if (modulesDiv) modulesDiv.style.display = 'none';
      clientAppState.isLogsVisible = true;
    }
  }

  static renderLogs(logs: LogEntry[], container: HTMLDivElement): void {
    const fragment = document.createDocumentFragment();
    const logsContainer = document.createElement('div');
    logsContainer.className = 'logs-container';

    const header = document.createElement('div');
    header.className = 'logs-header';
    header.innerHTML = `
      <h3>📊 Execution Logs (${logs.length})</h3>
      <button onclick="clearLogs()" class="clear-logs-btn">🗑️ Clear Logs</button>
    `;
    logsContainer.appendChild(header);

    const table = document.createElement('table');
    table.className = 'logs-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>ID</th>
          <th>Function Call</th>
          <th>Result</th>
          <th>Timestamp</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    const batchSize = 50;
    const visibleLogs = logs.slice(-batchSize);

    visibleLogs.reverse().forEach((log) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${log.id}</td>
        <td><code class="call-string">${escapeHtml(log.call_string)}</code></td>
        <td class="result-cell">${formatResult(log.result)}</td>
        <td class="timestamp">${formatTimestamp(log.timestamp)}</td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    logsContainer.appendChild(table);

    if (logs.length > batchSize) {
      const pagination = document.createElement('div');
      pagination.className = 'logs-pagination';
      pagination.innerHTML = `
        <span>Showing latest ${visibleLogs.length} of ${logs.length} logs</span>
        <button onclick="loadAllLogs()">Load All</button>
      `;
      logsContainer.appendChild(pagination);
    }

    fragment.appendChild(logsContainer);
    container.innerHTML = '';
    container.appendChild(fragment);
  }

  static showLogsLoading(container: HTMLDivElement): void {
    container.innerHTML = '<div class="loading">Loading logs...</div>';
  }

  static showNoLogs(container: HTMLDivElement): void {
    container.innerHTML = '<div class="no-logs">📝 No execution logs found</div>';
  }

  static showLogsError(container: HTMLDivElement): void {
    container.innerHTML = '<div class="error">❌ Failed to load logs</div>';
  }
}

// Event Manager
class EventManager {
  static setupEventListeners(): void {
    const functionCallInput = document.getElementById('functionCall') as HTMLInputElement;

    if (functionCallInput) {
      let inputTimeout: NodeJS.Timeout;
      functionCallInput.addEventListener('input', () => {
        clearTimeout(inputTimeout);
        inputTimeout = setTimeout(() => {
          validateInput(functionCallInput.value);
        }, CLIENT_CONFIG.DEBOUNCE_DELAY);
      });

      functionCallInput.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !clientAppState.isExecuting) {
          e.preventDefault();
          executeFunction();
        }
      });
    }
  }

  static setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeFunction();
      }

      if (e.key === 'F5') {
        e.preventDefault();
        refreshModules(true);
      }
    });
  }

  static setupAll(): void {
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
  }
}

// Module Manager
class ModuleManager {
  static startAutoRefresh(): void {
    if (clientAppState.autoRefreshInterval) {
      clearInterval(clientAppState.autoRefreshInterval);
    }

    clientAppState.autoRefreshInterval = window.setInterval(() => {
      this.refreshModules();
    }, CLIENT_CONFIG.AUTO_REFRESH_INTERVAL);
  }

  static stopAutoRefresh(): void {
    if (clientAppState.autoRefreshInterval) {
      clearInterval(clientAppState.autoRefreshInterval);
      clientAppState.autoRefreshInterval = null;
    }
  }

  static toggleAutoRefresh(): void {
    clientAppState.isAutoRefreshEnabled = !clientAppState.isAutoRefreshEnabled;

    if (clientAppState.isAutoRefreshEnabled) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }

    UIManager.updateAutoRefreshButton();
  }

  static async refreshModules(forceRefresh: boolean = false): Promise<void> {
    try {
      const modules: ModulesMap = await ApiService.fetchModules();
      const currentHash: string = JSON.stringify(modules);

      if (currentHash !== clientAppState.lastModulesHash || forceRefresh) {
        UIManager.renderModules(modules);

        if (clientAppState.lastModulesHash !== '') {
          showUpdateIndicator();
        }

        clientAppState.lastModulesHash = currentHash;
      }
    } catch (error: any) {
      console.error('Error refreshing modules:', error);
    }
  }
}

// Log Manager
class LogManager {
  static async toggleLogs(): Promise<void> {
    UIManager.toggleLogsVisibility();

    if (clientAppState.isLogsVisible) {
      await this.loadLogs();
    }
  }

  static async loadLogs(): Promise<void> {
    const logsContent = document.getElementById('logsContent') as HTMLDivElement;
    if (!logsContent) return;

    try {
      UIManager.showLogsLoading(logsContent);
      const logs: LogEntry[] = await ApiService.fetchLogs();

      if (logs.length === 0) {
        UIManager.showNoLogs(logsContent);
        return;
      }

      UIManager.renderLogs(logs, logsContent);
    } catch (error) {
      console.error('Error loading logs:', error);
      UIManager.showLogsError(logsContent);
    }
  }

  static async clearLogs(): Promise<void> {
    if (!confirm('Are you sure you want to clear all logs?')) {
      return;
    }

    try {
      await ApiService.clearLogs();
      await this.loadLogs();
    } catch (error) {
      console.error('Error clearing logs:', error);
      alert('Failed to clear logs');
    }
  }

  static loadAllLogs(): void {
    this.loadLogs();
  }
}

// Executor
class Executor {
  static async executeFunction(): Promise<void> {
    if (clientAppState.isExecuting) {
      return;
    }

    const functionCallInput = document.getElementById('functionCall') as HTMLInputElement;
    const resultDiv = document.getElementById('result') as HTMLDivElement;

    if (!functionCallInput || !resultDiv) {
      console.error('Required elements not found');
      return;
    }

    const callString = functionCallInput.value.trim();
    if (!callString) {
      UIManager.showResult(resultDiv, 'Please enter a function call', 'error');
      return;
    }

    clientAppState.isExecuting = true;
    UIManager.updateExecuteButton(true);
    UIManager.showResult(resultDiv, 'Executing...', 'loading');

    try {
      const result = await ApiService.executeWithRetry(callString);

      if (result.error) {
        UIManager.showResult(resultDiv, result.error, 'error');
      } else {
        UIManager.showResult(resultDiv, result.result || 'No result', 'success');
      }

      if (clientAppState.isLogsVisible) {
        LogManager.loadLogs();
      }

      if (clientAppState.isAutoRefreshEnabled) {
        ModuleManager.refreshModules();
      }
    } catch (error) {
      console.error('Execution error:', error);
      UIManager.showResult(
        resultDiv,
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      clientAppState.isExecuting = false;
      UIManager.updateExecuteButton(false);
    }
  }
}

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  // Load modules initially
  await ModuleManager.refreshModules(true);

  // Start auto-refresh if enabled
  if (clientAppState.isAutoRefreshEnabled) {
    ModuleManager.startAutoRefresh();
  }

  // Setup event listeners
  EventManager.setupAll();
}

// Global function wrappers for HTML onclick handlers
function executeFunction(): void {
  // Call the async method but don't await it to maintain void return type
  Executor.executeFunction().catch((error) => {
    console.error('Execute function error:', error);
  });
}

function refreshModules(forceRefresh: boolean = false): void {
  ModuleManager.refreshModules(forceRefresh);
}

function toggleAutoRefresh(): void {
  ModuleManager.toggleAutoRefresh();
}

function toggleLogs(): void {
  LogManager.toggleLogs();
}

function clearLogs(): void {
  LogManager.clearLogs();
}

function loadAllLogs(): void {
  LogManager.loadAllLogs();
}

// Make functions globally available for HTML onclick handlers
(window as any).executeFunction = executeFunction;
(window as any).toggleAutoRefresh = toggleAutoRefresh;
(window as any).refreshModules = refreshModules;
(window as any).toggleLogs = toggleLogs;
(window as any).clearLogs = clearLogs;
(window as any).loadAllLogs = loadAllLogs;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
