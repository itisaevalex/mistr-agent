# MCP Adapter Guide

This guide provides comprehensive information about the architecture, implementation details, and best practices for using and extending the Universal Mistral MCP Adapter.

## Architecture Overview

The Universal Mistral MCP Adapter follows a modular architecture that separates concerns and makes the adapter flexible and extensible:

```
┌──────────────┐     ┌────────────────┐     ┌───────────────┐
│  MCP Adapter │────▶│ Server Manager │────▶│ MCP Servers   │
│              │◀────│                │◀────│               │
└──────────────┘     └────────────────┘     └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐     ┌────────────────┐     ┌───────────────┐
│  Tool Manager│     │ Configuration  │     │ Tool Registry │
│              │     │ Management     │     │               │
└──────────────┘     └────────────────┘     └───────────────┘
```

### Key Components

1. **MCP Adapter**: Main interface for the Mistral model to interact with MCP servers
   - Manages conversation history
   - Coordinates tool execution
   - Provides a high-level API for integrations

2. **Server Manager**: Handles connections to multiple MCP servers
   - Manages server lifecycle (initialization, connection, disconnection)
   - Routes tool calls to the appropriate servers
   - Implements error handling and retries

3. **Tool Manager**: Registers and manages tool schemas
   - Converts between MCP tool schemas and Mistral tool formats
   - Tracks available tools and their capabilities
   - Handles tool registration and lookup

4. **Configuration Management**: Loads and validates configurations from files
   - Provides defaults for missing configurations
   - Validates configuration values
   - Supports multiple configuration sources

5. **MCP Servers**: External processes that provide tools
   - Implement MCP protocol handlers
   - Register and execute tools
   - Respond to protocol requests

## Tool Registration and Routing

One of the key features of the adapter is its ability to discover and route tool calls to the appropriate servers.

### Tool Discovery

The adapter discovers tools by:
1. Connecting to each server in the configuration
2. Querying the list of available tools
3. Registering these tools with the Tool Manager

```typescript
// Example of tool discovery
const serverTools = await this.serverManager.getAllTools();
for (const [serverId, tools] of Object.entries(serverTools)) {
  for (const tool of tools) {
    this.toolManager.registerMcpTool(serverId, tool);
  }
}
```

### Tool Routing

When a tool is called, the adapter:
1. Determines which server provides the tool
2. Routes the call to that server
3. Returns the result to the model

```typescript
// Example of tool routing
const toolServerId = toolToServerMap.get(toolName);
if (toolServerId) {
  return this.callTool(toolName, args, toolServerId);
}
```

## Error Handling

The adapter implements comprehensive error handling to ensure robustness:

### Graceful Degradation

When a server is unavailable or a tool fails:
1. The adapter attempts to retry the operation
2. If retries fail, it falls back to alternative methods
3. For critical functionalities like calculations, it provides client-side implementations

### Typed Error Handling

Proper TypeScript error handling is used throughout:

```typescript
try {
  // Code that might throw
} catch (error: unknown) {
  // Proper type checking
  if (error instanceof Error) {
    console.error("Error message:", error.message);
  } else {
    console.error("Unknown error:", String(error));
  }
}
```

## Advanced Configuration

### Server Configuration Options

The `mcp-config.json` file supports extensive configuration:

```json
{
  "servers": {
    "server-id": {
      "type": "stdio",
      "name": "ServerName",
      "command": "executable",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR1": "value1",
        "ENV_VAR2": "value2"
      },
      "description": "Description of the server"
    }
  },
  "defaultServer": "server-id"
}
```

### Environment Variables

The adapter respects the following environment variables:

- `MISTRAL_API_KEY`: Your Mistral API key
- `MISTRAL_MODEL`: The Mistral model to use (default: mistral-large)
- `MISTRAL_API_ENDPOINT`: Custom API endpoint (optional)
- `MCP_CONFIG_PATH`: Path to the MCP configuration file
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## Creating Custom MCP Servers

You can create your own MCP servers to extend the adapter's capabilities:

### Server Template

```typescript
// src/with-universal-mcp/tools/custom-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

async function startServer() {
  // Initialize the server
  const server = new Server(
    {
      name: "CustomServer",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "custom_tool",
          description: "A custom tool",
          inputSchema: {
            type: "object",
            properties: {
              param1: {
                type: "string",
                description: "Parameter 1"
              }
            },
            required: ["param1"]
          }
        }
      ]
    };
  });

  // Implement tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "custom_tool") {
      // Check for arguments
      if (!request.params.arguments) {
        throw new Error("Missing arguments");
      }
      
      const param1 = request.params.arguments.param1;
      
      // Execute the tool
      return {
        content: [
          {
            type: "text",
            text: `Executed custom_tool with param1=${param1}`
          }
        ]
      };
    }
    
    throw new Error(`Tool "${request.params.name}" not found`);
  });

  // Start the server
  console.error("Starting Custom MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Custom MCP server connected and ready.");
}

startServer().catch((error) => {
  console.error("Failed to start server:", 
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
```

### Adding to Configuration

After creating your custom server, add it to your configuration:

```json
{
  "servers": {
    "custom": {
      "type": "stdio",
      "name": "CustomServer",
      "command": "node",
      "args": ["build/with-universal-mcp/tools/custom-server.js"],
      "description": "Custom tool provider"
    }
  }
}
```

## Best Practices

### TypeScript Type Safety

Always use proper TypeScript typing:
- Define interfaces for all data structures
- Use union types for variants
- Add type guards for runtime type checking
- Use optional parameters with default values

### Asynchronous Operations

Follow best practices for async operations:
- Use `async/await` for readability
- Add proper error handling for all async operations
- Implement timeouts for external operations
- Consider retry logic for transient failures

### Logging and Debugging

Implement comprehensive logging:
- Use different log levels (error, warn, info, debug)
- Log important events and state transitions
- Include relevant context in log messages
- Enable detailed logging for debugging

## Performance Considerations

### Connection Management

- Reuse connections when possible
- Implement connection pooling for high-throughput scenarios
- Handle reconnection in case of network issues

### Tool Call Optimization

- Implement caching for frequently used tools
- Consider batching tool calls where appropriate
- Minimize data transfer between components

## Security Considerations

### Input Validation

- Validate all inputs before passing to tools
- Use schema validation for tool arguments
- Sanitize inputs to prevent injection attacks

### API Key Management

- Never hardcode API keys in your code
- Use environment variables or secure storage
- Implement proper access controls

### Tool Execution Safety

- Consider the security implications of tool execution
- Validate tool outputs before returning to models
- Implement appropriate sandboxing for untrusted code

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check if the server executable exists and is executable
   - Verify paths in configuration file
   - Check for proper error handling in the server

2. **Tool Not Found Errors**
   - Verify tool names match exactly between registration and invocation
   - Check that the server is properly registering tools
   - Enable debug logging to see available tools

3. **TypeScript Errors**
   - Ensure proper type annotations are used
   - Add type guards for runtime type checking
   - Use explicit type parameters where necessary

## Future Improvements

Potential enhancements to consider:

1. **Streaming Responses**: Support for streaming responses from tools
2. **Tool Caching**: Cache tool results for better performance
3. **Web Transport**: Support for HTTP/WebSocket transport
4. **Authentication**: Add authentication for secure server connections
5. **Metrics Collection**: Track tool usage and performance metrics
6. **Tool Marketplace**: Discover and install tools from a marketplace

## Conclusion

The Universal Mistral MCP Adapter provides a robust, flexible way to connect Mistral AI models to any MCP server. By following the patterns and best practices outlined in this guide, you can create a powerful, maintainable system that can adapt to changing requirements and integrate with a wide variety of tools and data sources.