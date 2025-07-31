/**
 * Dynamic Module Executor - Frontend TypeScript
 * Handles module execution, auto-refresh, and UI interactions
 */

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

// Global variables
let lastModulesHash: string = "";
let autoRefreshInterval: NodeJS.Timeout | null = null;
let isAutoRefreshEnabled: boolean = true;
let isLogsVisible: boolean = false;

/**
 * Initialize the application when page loads
 */
window.onload = function (): void {
  refreshModules();
  // Initialize auto refresh (enabled by default)
  if (isAutoRefreshEnabled) {
    autoRefreshInterval = setInterval(refreshModules, 3000);
  }

  // Allow Enter key to execute
  const functionCallInput = document.getElementById(
    "functionCall"
  ) as HTMLInputElement;
  if (functionCallInput) {
    functionCallInput.addEventListener(
      "keypress",
      function (e: KeyboardEvent): void {
        if (e.key === "Enter") {
          executeFunction();
        }
      }
    );
  }
};

/**
 * Execute function call from user input
 */
async function executeFunction(): Promise<void> {
  const functionCallInput = document.getElementById(
    "functionCall"
  ) as HTMLInputElement;
  const callString: string = functionCallInput?.value.trim() || "";

  if (!callString) {
    alert("Please enter a function call");
    return;
  }

  try {
    const response: Response = await fetch("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ callString } as ExecuteRequest),
    });

    const data: ExecuteResponse = await response.json();
    const resultDiv = document.getElementById("result") as HTMLDivElement;

    if (data.result !== undefined) {
      resultDiv.className = "result success";
      resultDiv.textContent = "Result: " + data.result;
    } else if (data.error !== undefined) {
      resultDiv.className = "result error";
      resultDiv.textContent = "Error: " + data.error;
    } else {
      resultDiv.className = "result error";
      resultDiv.textContent = "Error: Unknown response format";
    }

    // Auto-refresh modules after execution to show any new modules/functions (only if auto refresh is enabled)
    if (isAutoRefreshEnabled) {
      refreshModules();
    }
  } catch (error: any) {
    const resultDiv = document.getElementById("result") as HTMLDivElement;
    resultDiv.className = "result error";
    resultDiv.textContent = "Network Error: " + error.message;
  }
}

/**
 * Toggle auto refresh functionality
 */
function toggleAutoRefresh(): void {
  isAutoRefreshEnabled = !isAutoRefreshEnabled;
  const toggleButton = document.getElementById(
    "autoRefreshToggle"
  ) as HTMLButtonElement;

  if (isAutoRefreshEnabled) {
    // Enable auto refresh
    autoRefreshInterval = setInterval(refreshModules, 3000);
    toggleButton.textContent = "🔄 Auto Refresh: ON";
    toggleButton.style.backgroundColor = "#28a745";
  } else {
    // Disable auto refresh
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
    toggleButton.textContent = "⏸️ Auto Refresh: OFF";
    toggleButton.style.backgroundColor = "#dc3545";
  }
}

/**
 * Refresh available modules and update UI with waterfall layout
 */
async function refreshModules(): Promise<void> {
  try {
    const response: Response = await fetch("/api/modules");
    const modules: ModulesMap = await response.json();

    // Create a hash of current modules to detect changes
    const currentHash: string = JSON.stringify(modules);

    // Only update UI if modules actually changed
    if (currentHash !== lastModulesHash) {
      const modulesDiv = document.getElementById("modules") as HTMLDivElement;
      modulesDiv.innerHTML = "";

      // Create grid layout container
      const modulesGrid: HTMLDivElement = document.createElement("div");
      modulesGrid.className = "modules-grid";

      // Add modules to grid
      Object.keys(modules).forEach((moduleName: string) => {
        const moduleDiv: HTMLDivElement = document.createElement("div");
        moduleDiv.className = "module";

        const title: HTMLHeadingElement = document.createElement("h3");
        title.textContent = moduleName + ".ts";
        moduleDiv.appendChild(title);

        modules[moduleName].functions.forEach((funcInfo: FunctionInfo) => {
          const funcDiv: HTMLDivElement = document.createElement("div");
          funcDiv.className = "function";

          // Create function signature display with type information
          const funcName: string = funcInfo.name;
          const params: Parameter[] = funcInfo.parameters || [];
          const example: string =
            funcInfo.example || moduleName + "." + funcName + "()";
          const description: string = funcInfo.description || "";

          // Build parameter signature with types
          let paramSignature: string = "";
          if (params.length > 0) {
            paramSignature = params
              .map((param: Parameter) => {
                return param.name + ": " + param.type;
              })
              .join(", ");
          }

          const signature: string =
            moduleName + "." + funcName + "(" + paramSignature + ")";

          // Build parameter list display
          let paramListHtml: string = "";
          if (params.length > 0) {
            paramListHtml =
              '<div style="font-size: 11px; color: #555; margin-bottom: 5px;">Parameters:</div>';
            params.forEach((param: Parameter) => {
              if (param.name && param.type) {
                paramListHtml +=
                  '<div style="font-size: 10px; color: #777; margin-left: 10px;">• ' +
                  param.name +
                  ' <span style="color: #007acc; font-weight: bold;">(' +
                  param.type +
                  ")</span></div>";
              }
            });
          }

          funcDiv.innerHTML =
            '<div style="font-weight: bold; margin-bottom: 5px;">' +
            signature +
            "</div>" +
            (description
              ? '<div style="font-size: 12px; color: #666; margin-bottom: 5px;">' +
                description +
                "</div>"
              : "") +
            paramListHtml +
            (params.length === 0
              ? '<div style="font-size: 11px; color: #888; font-style: italic;">Example: ' +
                example +
                "</div>"
              : "");

          funcDiv.onclick = (): void => {
            const functionCallInput = document.getElementById(
              "functionCall"
            ) as HTMLInputElement;
            if (functionCallInput) {
              functionCallInput.value = example;
            }
          };
          moduleDiv.appendChild(funcDiv);
        });

        // Add module to grid
        modulesGrid.appendChild(moduleDiv);
      });

      modulesDiv.appendChild(modulesGrid);
      lastModulesHash = currentHash;

      // Show a subtle indication that modules were updated
      if (lastModulesHash !== "") {
        showUpdateIndicator();
      }
    }
  } catch (error: any) {
    console.error("Error refreshing modules:", error);
  }
}

/**
 * Show visual indicator when modules are updated
 */
function showUpdateIndicator(): void {
  const indicator: HTMLDivElement = document.createElement("div");
  indicator.style.cssText =
    "position: fixed; top: 10px; right: 10px; background: #28a745; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; z-index: 1000;";
  indicator.textContent = "Modules Updated";
  document.body.appendChild(indicator);
  setTimeout((): void => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 2000);
}

/**
 * Toggle logs visibility and load logs data
 */
async function toggleLogs(): Promise<void> {
  const logsDiv = document.getElementById('logs') as HTMLDivElement;
  const modulesDiv = document.getElementById('modules') as HTMLDivElement;
  
  if (isLogsVisible) {
    // Hide logs, show modules
    logsDiv.style.display = 'none';
    modulesDiv.style.display = 'block';
    isLogsVisible = false;
  } else {
    // Show logs, hide modules
    logsDiv.style.display = 'block';
    modulesDiv.style.display = 'none';
    isLogsVisible = true;
    await loadLogs();
  }
}

/**
 * Load execution logs from server
 */
async function loadLogs(): Promise<void> {
  try {
    const response: Response = await fetch('/api/logs');
    const logs: LogEntry[] = await response.json();
    
    const logsContent = document.getElementById('logsContent') as HTMLDivElement;
    
    if (logs.length === 0) {
      logsContent.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No execution logs found.</div>';
      return;
    }
    
    let logsHtml = '';
    logs.forEach((log: LogEntry) => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      logsHtml += `
        <div class="log-item">
          <div class="log-timestamp">${timestamp}</div>
          <div class="log-call">${log.call_string}</div>
          <div class="log-result">${log.result}</div>
        </div>
      `;
    });
    
    logsContent.innerHTML = logsHtml;
  } catch (error: any) {
    console.error('Error loading logs:', error);
    const logsContent = document.getElementById('logsContent') as HTMLDivElement;
    logsContent.innerHTML = '<div style="color: #dc3545; padding: 20px;">Error loading logs.</div>';
  }
}

// Make functions globally available
(window as any).executeFunction = executeFunction;
(window as any).toggleAutoRefresh = toggleAutoRefresh;
(window as any).refreshModules = refreshModules;
(window as any).toggleLogs = toggleLogs;
