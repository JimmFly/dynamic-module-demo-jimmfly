/**
 * Shared type definitions for the Dynamic Module Demo Jimmfly
 */

// Parameter interface for function signatures
export interface Parameter {
  name: string;
  type: string;
}

// Function information interface
export interface FunctionInfo {
  name: string;
  parameters: Parameter[];
  description: string;
  example: string;
}

// Module information interface
export interface ModuleInfo {
  functions: FunctionInfo[];
  module: any;
  path: string;
}

// Modules map interface
export interface ModulesMap {
  [key: string]: ModuleInfo;
}

// API request/response interfaces
export interface ExecuteRequest {
  callString: string;
}

export interface ExecuteResponse {
  result?: string;
  error?: string;
}

// Log entry interface
export interface LogEntry {
  id: number;
  call_string: string;
  result: string;
  timestamp: string;
}

// Configuration interface
export interface ServerConfig {
  DEFAULT_PORT: number;
  SCRIPTS_DIR: string;
  DATABASE_PATH: string;
  CACHE_TTL: number;
  MAX_PORT_RANGE: number;
}
