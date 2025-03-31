// src/with-mcp/mcp-server-manager.ts
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { Client } from '@modelcontextprotocol/sdk/client/index';
import { McpConfig, McpServerConfig } from './config/mcp-config';
import * as childProcess from 'child_process';

import {
  ClientCapabilities,
  ServerCapabilities,
  ProtocolVersion,
  NegotiatedCapabilities,
  ClientInfo,
  ServerInfo,
  InitializeParams,
  InitializeResult,
  CapabilityError
} from './mcp-types';

import { VersionCompatibility } from './utils/version-compatibility';

/**
 * Enhanced MCP server instance with capabilities
 */
export interface McpServerInstance {
  id: string;
  config: McpServerConfig;
  client: Client;
  connected: boolean;
  serverInfo?: ServerInfo;
}

/**
 * MCP Server Manager with enhanced capability negotiation
 */
export class McpServerManager {
  private servers: Map<string, McpServerInstance> = new Map();
  private serverCapabilities: Map<string, ServerCapabilities> = new Map();
  private negotiatedCapabilities: Map<string, NegotiatedCapabilities> = new Map();
  private clientInfo: ClientInfo;
  private clientCapabilities: ClientCapabilities;
  private protocolVersion: ProtocolVersion;
  private config: McpConfig;

  constructor(config: McpConfig) {
    this.config = config;
    
    // Initialize client information
    this.clientInfo = {
      name: 'MistralMcpClient',
      version: '1.0.0'
    };
    
    // Set protocol version - using semantic versioning
    this.protocolVersion = {
      major: 0,
      minor: 1,
      patch: 0
    };
    
    // Define client capabilities
    this.clientCapabilities = {
      tools: {
        toolExecution: true
      },
      resources: {
        resourceAccess: true
      },
      prompts: {
        promptUsage: true
      },
      sampling: {
        completion: false // Not yet supported
      }
    };
  }

  /**
   * Initialize all servers defined in configuration
   */
  async initializeServers(): Promise<void> {
    // Initialize all configured servers
    for (const [id, serverConfig] of Object.entries(this.config.servers)) {
      try {
        await this.initializeServer(id, serverConfig);
      } catch (error) {
        console.error(`Failed to initialize server ${id}:`, error);
        // Continue with other servers even if one fails
      }
    }
  }

  /**
   * Initialize a specific server by ID with capability negotiation
   */
  async initializeServer(id: string, config: McpServerConfig): Promise<McpServerInstance> {
    console.log(`Initializing MCP server: ${id}`);

    if (this.servers.has(id)) {
      return this.servers.get(id)!;
    }

    let transport;
    
    // Create appropriate transport based on type
    if (config.type === 'stdio') {
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env
      });
      
      transport.onmessage = (message) => {
        console.log(`[Debug] Message from ${id}:`, JSON.stringify(message).substring(0, 200) + '...');
      };

    } else if (config.type === 'sse') {
      // SSE transport would be implemented here
      throw new Error('SSE transport not yet implemented');
    } else {
      throw new Error(`Unsupported transport type: ${config.type}`);
    }
    
    // Setup event handlers
    transport.onerror = (error) => {
      console.error(`MCP server ${id} error:`, error);
    };
    
    transport.onclose = () => {
      console.log(`MCP server ${id} connection closed`);
      const server = this.servers.get(id);
      if (server) {
        server.connected = false;
      }
    };
    
    // Create client
    const client = new Client({ 
      name: this.clientInfo.name, 
      version: this.clientInfo.version 
    });
    
    // Create server instance
    const serverInstance: McpServerInstance = {
      id,
      config,
      client,
      connected: false
    };
    
    // Store the instance
    this.servers.set(id, serverInstance);
    
    // Connect to the server
    try {
      console.log(`Connecting to MCP server: ${id}`);
      await client.connect(transport);
      serverInstance.connected = true;
      console.log(`Successfully connected to MCP server: ${id}`);
      
      // Perform capability negotiation
      await this.performCapabilityNegotiation(id, serverInstance);
      
      return serverInstance;
    } catch (error) {
      console.error(`Failed to connect to MCP server ${id}:`, error);
      throw error;
    }
  }

  /**
   * Perform capability negotiation with server
   */
  private async performCapabilityNegotiation(id: string, serverInstance: McpServerInstance): Promise<void> {
    try {
      console.log(`Performing capability negotiation with server: ${id}`);
      
      // Try formal initialization
      const serverCapabilities = await this.formalInitialization(serverInstance.client, id);
      
      if (serverCapabilities) {
        this.serverCapabilities.set(id, serverCapabilities);
        const negotiated = this.negotiateCapabilities(serverCapabilities, id);
        this.negotiatedCapabilities.set(id, negotiated);
        return;
      }
      
      // Fallback to capability inference if formal initialization fails
      console.log(`Formal initialization not supported by server ${id}, falling back to capability inference`);
      const inferredCapabilities = await this.inferServerCapabilities(serverInstance.client, id);
      this.serverCapabilities.set(id, inferredCapabilities);
      
      // Negotiate capabilities
      const negotiated = this.negotiateCapabilities(inferredCapabilities, id);
      this.negotiatedCapabilities.set(id, negotiated);
      
      console.log(`Capability negotiation completed for server ${id}:`, negotiated);
    } catch (error) {
      console.error(`Error during capability negotiation with server ${id}:`, error);
      
      // Set minimal capabilities as fallback
      const fallbackCapabilities: NegotiatedCapabilities = {
        protocolVersion: VersionCompatibility.versionToString(this.protocolVersion),
        tools: true, // Assume basic tools support
        resources: false,
        prompts: false,
        completion: false,
        streaming: false,
        extensions: {}
      };
      
      this.negotiatedCapabilities.set(id, fallbackCapabilities);
      console.log(`Using fallback capabilities for server ${id}:`, fallbackCapabilities);
    }
  }
  
  /**
   * Perform formal initialization with capability negotiation
   */
  private async formalInitialization(client: Client, serverId: string): Promise<ServerCapabilities | null> {
    try {
      // Prepare initialization parameters
      const initParams: InitializeParams = {
        protocolVersion: this.protocolVersion,
        clientInfo: this.clientInfo,
        capabilities: this.clientCapabilities
      };
      
      // Try the formal initialize method - this might not be supported
      try {
        console.log(`Attempting formal initialization with server ${serverId}`);
        // @ts-ignore - Use any type to bypass TypeScript error with callMethod
        const initResult = await (client as any).callMethod('initialize', initParams) as InitializeResult;
        
        // Verify result
        if (initResult && initResult.capabilities) {
          console.log(`Server ${serverId} supports formal initialization:`, initResult);
          
          // Store server info if available
          if (initResult.serverInfo) {
            const serverInstance = this.servers.get(serverId);
            if (serverInstance) {
              serverInstance.serverInfo = initResult.serverInfo;
            }
          }
          
          return initResult.capabilities;
        }
      } catch (error) {
        console.log(`Formal initialization not supported by server ${serverId}:`, error);
      }
      
      // Try the getCapabilities method
      try {
        console.log(`Trying getCapabilities with server ${serverId}`);
        // @ts-ignore - Use any type to bypass TypeScript error with callMethod
        const capabilities = await (client as any).callMethod('getCapabilities', {});
        
        if (capabilities && capabilities.features) {
          console.log(`Server ${serverId} supports getCapabilities method`);
          return capabilities;
        }
      } catch (error) {
        console.log(`getCapabilities not supported by server ${serverId}:`, error);
      }
    } catch (error) {
      console.log(`Error during capability discovery with server ${serverId}:`, error);
    }
    
    return null;
  }
  
  /**
   * Infer server capabilities by testing features
   */
  private async inferServerCapabilities(client: Client, serverId: string): Promise<ServerCapabilities> {
    console.log(`Inferring capabilities for server ${serverId} by feature testing`);
    
    const capabilities: ServerCapabilities = {
      tools: {}
    };
    
    // Check for server initialization options
    const serverInstance = this.servers.get(serverId);
    if (serverInstance && serverInstance.config?.command) {
      const serverCommand = serverInstance.config.command;
      console.log(`Server ${serverId} was initialized with command: ${serverCommand}`);
      
      // Get configuration if available
      if (serverInstance.config.args && serverInstance.config.args.length > 0) {
        console.log(`Server ${serverId} was initialized with args:`, serverInstance.config.args);
      }
    }
    
    // Test for tool support - most important capability for MCP
    let hasTools = false;
    try {
      console.log(`Testing if server ${serverId} supports tools...`);
      const toolsResult = await client.listTools();
      
      if (toolsResult && Array.isArray(toolsResult.tools)) {
        hasTools = true;
        capabilities.tools = { listChanged: false }; // Assume basic tools support
        console.log(`Server ${serverId} supports tools with ${toolsResult.tools.length} tools available`);
        
        // Log the available tools
        if (toolsResult.tools.length > 0) {
          console.log(`Tools on server ${serverId}:`, 
            toolsResult.tools.map(t => t.name).join(', '));
        }
      }
    } catch (e) {
      console.log(`Server ${serverId} does not support tools, error:`, e);
      delete capabilities.tools;
    }
    
    // Only test other capabilities if tools are supported
    if (hasTools) {
      // Test for resource support
      try {
        console.log(`Testing if server ${serverId} supports resources...`);
        const resources = await client.listResources();
        if (resources && Array.isArray(resources.resources)) {
          capabilities.resources = { 
            listChanged: false,
            subscribe: false
          };
          console.log(`Server ${serverId} supports resources with ${resources.resources.length} resources available`);
        }
      } catch (e) {
        console.log(`Server ${serverId} does not support resources`);
        // Resources not supported
      }
      
      // Test for prompt support
      try {
        console.log(`Testing if server ${serverId} supports prompts...`);
        const prompts = await client.listPrompts();
        if (prompts && Array.isArray(prompts.prompts)) {
          capabilities.prompts = { listChanged: false };
          console.log(`Server ${serverId} supports prompts with ${prompts.prompts.length} prompts available`);
        }
      } catch (e) {
        console.log(`Server ${serverId} does not support prompts`);
        // Prompts not supported
      }
    }
    
    return capabilities;
  }
  
  /**
   * Negotiate capabilities between client and server
   */
  /**
   * Negotiate capabilities between client and server
   */
  private negotiateCapabilities(
    serverCapabilities: ServerCapabilities,
    serverId: string
  ): NegotiatedCapabilities {
    console.log(`Negotiating capabilities with server ${serverId}`);
    
    // Start with the default capabilities we support
    const featuresWeSupportByDefault = {
      tools: true,
      resources: true,
      prompts: true,
      completion: false,
      streaming: false
    };
    
    // Determine actual supported features based on server capabilities
    const features = {
      tools: !!serverCapabilities.tools && featuresWeSupportByDefault.tools,
      resources: !!serverCapabilities.resources && featuresWeSupportByDefault.resources,
      prompts: !!serverCapabilities.prompts && featuresWeSupportByDefault.prompts,
      completion: !!serverCapabilities.completion && featuresWeSupportByDefault.completion,
      streaming: false // Currently not supported
    };
    
    // Initialize empty extensions
    const extensions: Record<string, any> = {};
    
    // Add any extensions from server capabilities if present
    if (serverCapabilities.tools?.listChanged) {
      extensions.toolListChanged = true;
    }
    
    if (serverCapabilities.resources?.subscribe) {
      extensions.resourceSubscription = true;
    }
    
    if (serverCapabilities.resources?.listChanged) {
      extensions.resourceListChanged = true;
    }
    
    // Log negotiated capabilities
    console.log(`Negotiated capabilities for server ${serverId}:`, {
      protocolVersion: VersionCompatibility.versionToString(this.protocolVersion),
      tools: features.tools,
      resources: features.resources,
      prompts: features.prompts,
      completion: features.completion,
      streaming: features.streaming,
      extensions: Object.keys(extensions)
    });
    
    return {
      protocolVersion: VersionCompatibility.versionToString(this.protocolVersion),
      ...features,
      extensions
    };
  }

  /**
   * Get a server instance by ID
   */
  getServer(id?: string): McpServerInstance {
    const serverId = id || this.config.defaultServer;
    
    if (!serverId) {
      throw new Error('No server ID specified and no default server configured');
    }
    
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server "${serverId}" not found`);
    }
    
    return server;
  }

  /**
   * Check if a server is connected
   */
  isServerConnected(id?: string): boolean {
    try {
      const server = this.getServer(id);
      return server.connected;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for a server to be connected
   */
  async waitForConnection(id?: string, timeoutMs: number = 10000): Promise<void> {
    const serverId = id || this.config.defaultServer;
    
    if (!serverId) {
      throw new Error('No server ID specified and no default server configured');
    }
    
    const startTime = Date.now();
    
    while (!this.isServerConnected(serverId)) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`MCP server ${serverId} connection timed out after ${timeoutMs}ms`);
      }
      
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Disconnect all servers
   */
  disconnectAll(): void {
    for (const [id, server] of this.servers.entries()) {
      try {
        server.client.close();
        server.connected = false;
        console.log(`Disconnected from MCP server: ${id}`);
      } catch (error) {
        console.error(`Error disconnecting from MCP server ${id}:`, error);
      }
    }
  }

  /**
   * Get all available tools across all servers that support tools
   */
  async getAllTools(): Promise<Record<string, any[]>> {
    const allTools: Record<string, any[]> = {};
    
    for (const [id, server] of this.servers.entries()) {
      if (server.connected) {
        try {
          // Check if server supports tools
          const capabilities = this.negotiatedCapabilities.get(id);
          
          if (capabilities?.tools) {
            const tools = await server.client.listTools();
            allTools[id] = tools.tools;
          } else {
            console.log(`Skipping tool discovery for server ${id} as it doesn't support tools`);
            allTools[id] = [];
          }
        } catch (error) {
          console.error(`Error getting tools from ${id}:`, error);
          allTools[id] = [];
        }
      }
    }
    
    return allTools;
  }

  /**
   * Call a tool on a specific server with capability checking
   */
  async callTool(toolName: string, args: any, serverId?: string): Promise<any> {
    // If serverId is not provided, we need to determine which server has this tool
    if (!serverId) {
      // Create a map of tool name to server ID based on our getAllTools results
      const toolToServerMap = new Map<string, string>();
      const allTools = await this.getAllTools();
      
      for (const [serverId, tools] of Object.entries(allTools)) {
        for (const tool of tools) {
          toolToServerMap.set(tool.name, serverId);
        }
      }
      
      // Find the server for this tool
      const toolServerId = toolToServerMap.get(toolName);
      if (toolServerId) {
        console.log(`Found tool ${toolName} on server ${toolServerId}`);
        return this.callTool(toolName, args, toolServerId);
      }
      
      // If we can't find the server, try all servers with tools capability
      console.log(`No specific server found for tool ${toolName}, trying all servers with tools capability`);
      
      for (const [id, capabilities] of this.negotiatedCapabilities.entries()) {
        if (capabilities.tools) {
          try {
            console.log(`Attempting to call ${toolName} on server ${id}`);
            return await this.servers.get(id)!.client.callTool({
              name: toolName,
              arguments: args
            });
          } catch (error: unknown) {
            console.log(`Error calling ${toolName} on server ${id}:`, error);
            // Only rethrow if it's not a "not found" error
            if (error instanceof Error && !error.message.includes('not found')) {
              throw error;
            }
          }
        }
      }
      
      throw new Error(`Tool ${toolName} not found on any server`);
    } else {
      // Check if server supports tools
      const capabilities = this.negotiatedCapabilities.get(serverId);
      if (!capabilities?.tools) {
        throw new Error(`Server ${serverId} does not support tools capability`);
      }
      
      // Get the server client
      const server = this.getServer(serverId);
      if (!server.connected) {
        throw new Error(`Server ${serverId} is not connected`);
      }
      
      console.log(`Calling tool ${toolName} on specified server ${serverId}`);
      return await server.client.callTool({
        name: toolName,
        arguments: args
      });
    }
  }
  
  /**
   * Check if a server has a specific capability 
   */
  hasCapability(serverId: string, capabilityPath: string): boolean {
    const serverInstance = this.servers.get(serverId);
    if (!serverInstance) return false;
    
    const serverCapabilities = this.serverCapabilities.get(serverId);
    if (!serverCapabilities) return false;
    
    // Parse path like "tools.listChanged"
    const parts = capabilityPath.split('.');
    let current: any = serverCapabilities;
    
    for (const part of parts) {
      if (!current || current[part] === undefined) {
        return false;
      }
      current = current[part];
    }
    
    return !!current;
  }
  
  /**
   * Get negotiated capabilities for a server
   */
  getCapabilities(serverId: string): NegotiatedCapabilities | undefined {
    return this.negotiatedCapabilities.get(serverId);
  }
  
  /**
   * Get all servers that support a specific feature
   */
  getServersWithFeature(feature: keyof NegotiatedCapabilities): string[] {
    const result: string[] = [];
    
    for (const [serverId, capabilities] of this.negotiatedCapabilities.entries()) {
      if (capabilities[feature]) {
        result.push(serverId);
      }
    }
    
    return result;
  }
  
  /**
   * Get all server IDs
   */
  getServers(): string[] {
    return Array.from(this.servers.keys());
  }
  
  /**
   * Get server information with capabilities
   */
  getServerInfo(): Record<string, {
    connected: boolean;
    serverInfo?: ServerInfo;
    capabilities?: NegotiatedCapabilities;
  }> {
    const result: Record<string, {
      connected: boolean;
      serverInfo?: ServerInfo;
      capabilities?: NegotiatedCapabilities;
    }> = {};
    
    for (const [serverId, server] of this.servers.entries()) {
      result[serverId] = {
        connected: server.connected,
        serverInfo: server.serverInfo,
        capabilities: this.negotiatedCapabilities.get(serverId)
      };
    }
    
    return result;
  }
}