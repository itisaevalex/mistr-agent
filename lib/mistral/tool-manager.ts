// src/with-universal-mcp/tool-manager.ts
import { NegotiatedCapabilities } from './mcp-types';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  required?: string[];
  execute: (args: any) => Promise<any>;
}

export interface MistralTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private toolServerMap: Map<string, string> = new Map(); // Map tool names to server IDs
  private serverToolMap: Map<string, Set<string>> = new Map(); // Map server IDs to tool names
  private toolMetadata: Map<string, { parameters: Record<string, any>, required?: string[] }> = new Map();

  /**
   * Register a tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    
    // Store parameter metadata for later use
    this.toolMetadata.set(tool.name, {
      parameters: tool.parameters,
      required: tool.required
    });
    
    // Debug log
    console.log(`Registered tool metadata for ${tool.name}`);
  }

  /**
   * Execute a tool (this would typically call the MCP server)
   */
  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return await tool.execute(args);
  }

  /**
   * Get all tools in Mistral format with improved descriptions and parameter formatting
   */
  getMistralTools(): MistralTool[] {
    return Array.from(this.tools.values()).map(tool => {
      // Get the server for this tool to include in description
      const serverId = this.toolServerMap.get(tool.name);
      
      // Create a more informative description that includes the server source
      const enhancedDescription = serverId 
        ? `${tool.description} (from ${serverId} server)`
        : tool.description;
        
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: enhancedDescription,
          parameters: {
            type: 'object',
            properties: this.enhanceParameterDescriptions(tool.parameters, tool.name),
            required: tool.required,
          },
        },
      };
    });
  }
  
  /**
   * Enhance parameter descriptions with more context
   */
  private enhanceParameterDescriptions(
    parameters: Record<string, any>, 
    toolName: string
  ): Record<string, any> {
    const enhancedParams: Record<string, any> = {};
    
    for (const [key, param] of Object.entries(parameters)) {
      enhancedParams[key] = {...param};
      
      // If description is very basic, enhance it
      if (!param.description || param.description === `Parameter ${key}`) {
        enhancedParams[key].description = `${key} parameter for the ${toolName} tool`;
      }
      
      // Add format examples if they're missing but we can infer them
      if (param.type === 'string' && !param.examples) {
        if (key.toLowerCase().includes('location') || key.toLowerCase().includes('city')) {
          enhancedParams[key].examples = ['New York', 'Tokyo', 'London'];
        } else if (key.toLowerCase().includes('date')) {
          enhancedParams[key].examples = ['2023-11-01', 'today', 'tomorrow'];
        } else if (key.toLowerCase().includes('email')) {
          enhancedParams[key].examples = ['user@example.com'];
        }
      }
    }
    
    return enhancedParams;
  }

  /**
   * Register a tool from an MCP server with enhanced capability awareness
   */
  registerMcpTool(
    serverId: string, 
    tool: any, 
    serverCapabilities?: NegotiatedCapabilities
  ): void {
    const toolName = tool.name;
    
    // Check if we already have this tool registered
    if (this.tools.has(toolName)) {
      // If the tool is already registered to a different server,
      // log a warning about potential conflicts
      const existingServer = this.toolServerMap.get(toolName);
      if (existingServer && existingServer !== serverId) {
        console.warn(`Tool ${toolName} is already registered with server ${existingServer}, overriding with ${serverId}`);
      } else {
        return; // Same server, no need to re-register
      }
    }
    
    // Enhanced capability checking
    if (serverCapabilities) {
      // Check if server has tools capability
      if (!serverCapabilities.tools) {
        console.warn(`Not registering tool ${toolName} because server ${serverId} does not support tools capability`);
        return;
      }
      
      // Check for specific tool features if needed
      if (tool.requiresStreaming && !serverCapabilities.streaming) {
        console.warn(`Not registering tool ${toolName} because it requires streaming, but server ${serverId} doesn't support it`);
        return;
      }
    }
    
    // Register the tool with enhanced metadata
    this.registerTool({
      name: toolName,
      description: this.enhanceToolDescription(tool, serverId),
      parameters: this.convertSchemaToParameters(tool.inputSchema),
      required: this.extractRequiredParameters(tool.inputSchema),
      execute: async () => ({}) // Dummy execute, we'll use MCP server
    });
    
    // Map tool to server for routing
    this.toolServerMap.set(toolName, serverId);
    
    // Update server to tools mapping
    if (!this.serverToolMap.has(serverId)) {
      this.serverToolMap.set(serverId, new Set<string>());
    }
    this.serverToolMap.get(serverId)!.add(toolName);
    
    console.log(`Registered MCP tool: ${toolName} from server: ${serverId}`);
  }
  
  /**
   * Enhanced tool description generator
   */
  private enhanceToolDescription(tool: any, serverId: string): string {
    // Start with the provided description or a default
    let description = tool.description || `Tool from ${serverId}`;
    
    // Add parameter information if not already included
    if (!description.includes('Parameters:') && tool.inputSchema && tool.inputSchema.properties) {
      const paramCount = Object.keys(tool.inputSchema.properties).length;
      description += `. Takes ${paramCount} parameter${paramCount !== 1 ? 's' : ''}`;
      
      // Add required parameters info
      if (tool.inputSchema.required && tool.inputSchema.required.length > 0) {
        description += `. Required: ${tool.inputSchema.required.join(', ')}`;
      }
    }
    
    return description;
  }
  
  /**
   * Get the server ID for a tool
   */
  getToolServer(toolName: string): string | undefined {
    return this.toolServerMap.get(toolName);
  }
  
  /**
   * Get all tools from a specific server with capability awareness
   */
  getToolsFromServer(serverId: string, capabilities?: NegotiatedCapabilities): Tool[] {
    const toolNames = this.serverToolMap.get(serverId);
    if (!toolNames) return [];
    
    // If capabilities are provided, filter based on them
    if (capabilities && !capabilities.tools) {
      return []; // Server doesn't support tools capability
    }
    
    return Array.from(toolNames)
      .map(name => this.tools.get(name)!)
      .filter(Boolean);
  }
  
  /**
   * Get all server IDs that have registered tools
   */
  getServersWithTools(): string[] {
    return Array.from(this.serverToolMap.keys());
  }
  
  /**
   * Remove all tools from a server (e.g., when server disconnects)
   */
  removeServerTools(serverId: string): void {
    const toolNames = this.serverToolMap.get(serverId);
    if (!toolNames) return;
    
    for (const toolName of toolNames) {
      this.tools.delete(toolName);
      this.toolServerMap.delete(toolName);
      this.toolMetadata.delete(toolName); // Also remove from metadata map
    }
    
    this.serverToolMap.delete(serverId);
    console.log(`Removed all tools from server ${serverId}`);
  }

  /**
   * Convert MCP tool schema to Mistral tool parameters with enhanced information
   */
  private convertSchemaToParameters(schema: any): Record<string, any> {
    if (!schema || !schema.properties) {
      return {};
    }
    
    const parameters: Record<string, any> = {};
    
    for (const [key, prop] of Object.entries(schema.properties)) {
      const property = prop as any;
      parameters[key] = {
        type: property.type || 'string',
        description: property.description || `Parameter ${key}`
      };
      
      // Copy additional properties if present
      if (property.enum) parameters[key].enum = property.enum;
      if (property.default !== undefined) parameters[key].default = property.default;
      if (property.minimum !== undefined) parameters[key].minimum = property.minimum;
      if (property.maximum !== undefined) parameters[key].maximum = property.maximum;
      if (property.format) parameters[key].format = property.format;
      if (property.examples) parameters[key].examples = property.examples;
      
      // Enhanced: Add examples based on type if they're not provided
      if (!property.examples) {
        if (property.type === 'string' && property.enum) {
          // Use enum values as examples
          parameters[key].examples = property.enum.slice(0, 3);
        } else if (property.type === 'number' || property.type === 'integer') {
          // Generate numeric examples
          parameters[key].examples = [
            property.minimum !== undefined ? property.minimum : 0,
            property.maximum !== undefined ? property.maximum : 100
          ];
        }
      }
    }
    
    return parameters;
  }

  /**
   * Extract required parameters from schema
   */
  private extractRequiredParameters(schema: any): string[] {
    if (!schema || !schema.required) {
      return [];
    }
    
    return schema.required as string[];
  }
  
  /**
   * Check if a specific tool is supported
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }
  
  /**
   * Get a list of all registered tool names
   */
  getAllToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
  
  /**
   * Get metadata for a specific tool
   */
  getToolMetadata(toolName: string): { parameters: Record<string, any>, required?: string[] } | undefined {
    if (!this.toolMetadata) {
      console.warn(`Tool metadata map is not initialized`);
      return undefined;
    }
    
    const metadata = this.toolMetadata.get(toolName);
    if (!metadata) {
      console.warn(`No metadata found for tool: ${toolName}`);
    }
    
    return metadata;
  }
  
  /**
   * Listen for tool list changes from a server with capability awareness
   */
  setupToolListChangeListener(
    serverId: string, 
    client: any, 
    hasListChangedCapability: boolean
  ): void {
    if (!hasListChangedCapability) {
      console.log(`Server ${serverId} does not support tool list change notifications`);
      return;
    }
    
    try {
      // This assumes the client has an onToolsListChanged method
      // to subscribe to tool list change notifications
      client.onToolsListChanged((tools: any) => {
        console.log(`Tool list changed for server ${serverId}`);
        
        // Remove all existing tools from this server
        this.removeServerTools(serverId);
        
        // Register the new tools
        for (const tool of tools.tools) {
          this.registerMcpTool(serverId, tool);
        }
      });
      
      console.log(`Set up tool list change listener for server ${serverId}`);
    } catch (error) {
      console.error(`Error setting up tool list change listener for server ${serverId}:`, error);
    }
  }
}