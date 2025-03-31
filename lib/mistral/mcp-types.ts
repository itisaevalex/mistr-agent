// src/with-mcp/mcp-types.ts

// --- Protocol Version Structure ---
export interface ProtocolVersion {
  major: number;
  minor: number;
  patch: number;
}

// --- Client Capabilities ---
export interface ClientCapabilities {
  tools?: ToolsClientCapabilities;
  resources?: ResourcesClientCapabilities;
  prompts?: PromptsClientCapabilities;
  sampling?: SamplingClientCapabilities;
}

export interface ToolsClientCapabilities {
  // Any client-specific tool capabilities
  toolExecution?: boolean;
}

export interface ResourcesClientCapabilities {
  // Client capabilities for handling resources
  resourceAccess?: boolean;
}

export interface PromptsClientCapabilities {
  // Client capabilities for handling prompts
  promptUsage?: boolean;
}

export interface SamplingClientCapabilities {
  // Client capabilities for sampling
  completion?: boolean;
}

// --- Server Capabilities ---
export interface ServerCapabilities {
  tools?: ToolsServerCapabilities;
  resources?: ResourcesServerCapabilities;
  prompts?: PromptsServerCapabilities;
  logging?: LoggingServerCapabilities;
  completion?: CompletionServerCapabilities;
}

export interface ToolsServerCapabilities {
  listChanged?: boolean; // Server can notify when tool list changes
}

export interface ResourcesServerCapabilities {
  subscribe?: boolean; // Server supports resource subscriptions
  listChanged?: boolean; // Server can notify when resource list changes
}

export interface PromptsServerCapabilities {
  listChanged?: boolean; // Server can notify when prompt list changes
}

export interface LoggingServerCapabilities {
  // Server logging configuration capabilities
  level?: 'debug' | 'info' | 'warn' | 'error';
}

export interface CompletionServerCapabilities {
  // Argument completion suggestion capabilities
  argumentSuggestions?: boolean;
}

// --- Negotiated Capabilities ---
export interface NegotiatedCapabilities {
  protocolVersion: string;
  tools: boolean;
  resources: boolean;
  prompts: boolean;
  completion: boolean;
  streaming: boolean;
  extensions: Record<string, any>;
}

// --- Client and Server Info ---
export interface ClientInfo {
  name: string;
  version: string;
}

export interface ServerInfo {
  name: string;
  version: string;
}

// --- Initialization Parameters ---
export interface InitializeParams {
  protocolVersion: ProtocolVersion;
  clientInfo: ClientInfo;
  capabilities: ClientCapabilities;
}

export interface InitializeResult {
  protocolVersion: ProtocolVersion;
  serverInfo?: ServerInfo;
  capabilities: ServerCapabilities;
}

// --- Error Types ---
export enum CapabilityError {
  INCOMPATIBLE_VERSION = 'incompatible_version',
  REQUIRED_FEATURE_MISSING = 'required_feature_missing',
  EXTENSION_INCOMPATIBLE = 'extension_incompatible',
  NEGOTIATION_FAILED = 'negotiation_failed'
}

// --- Mistral-Specific Tool Definition ---
export interface MistralTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: any; // Use a more specific type if you have a schema
    };
}

// --- MCP Primitives ---

// Prompts (Simplified for this example)
export interface McpPrompt {
  id: string;
  content: string; // The prompt template
}

// Resources (Simplified - you'll likely need a more complex structure)
export interface McpResource {
  id: string;
  type: string; // e.g., "text", "image", "database_record"
  data: any;     // The actual resource data
}

// Tools (MCP representation - maps to MistralTool)
export interface McpTool {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema for input parameters
  // You might add outputSchema here as well
}

// Roots (Simplified)
export interface McpRoot {
  id: string;
  path: string; // e.g., a file path, a database connection string
}

// Sampling (Simplified)
export interface McpSamplingRequest {
  promptId: string;
  parameters: any; // Parameters for the sampling (e.g., temperature)
}

export interface McpSamplingResponse {
  result: string; // The generated text
}

// --- MCP Messages ---

export type McpMessageType =
  | 'request'
  | 'response'
  | 'error'
  | 'ping'
  | 'pong';

export interface McpMessage {
  type: McpMessageType;
  id: string; // Unique message ID
  payload: any; // The actual message payload (depends on the type)
}

// --- MCP Request Payloads ---

export interface McpExecuteToolRequest {
  toolName: string;
  toolParameters: any;
}

// --- MCP Response Payloads ---
export interface McpExecuteToolResponse {
    result: any
}

// --- Error Codes (Example - expand as needed) ---

export enum McpErrorCode {
  OK = 0,
  TOOL_NOT_FOUND = 1,
  INVALID_INPUT = 2,
  TOOL_EXECUTION_ERROR = 3,
  INTERNAL_SERVER_ERROR = 4,
  // ... other error codes ...
}

export interface McpErrorResponse {
  code: McpErrorCode;
  message: string;
}