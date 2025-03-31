# Adding MCP Servers to Mistral MCP Client

This guide explains how to connect additional Model Context Protocol (MCP) servers to the Mistral MCP Client.

## Introduction

The Mistral MCP Client is designed to connect to any MCP-compliant server, allowing Mistral to leverage a wide range of tools and resources. This modular approach lets you extend Mistral's capabilities by simply adding new MCP servers to your configuration.

## MCP Server Configuration

All MCP server connections are defined in the `mcp-config.json` file at the root of the project. This file follows this structure:

```json
{
  "servers": {
    "server-id-1": {
      // Server 1 configuration
    },
    "server-id-2": {
      // Server 2 configuration
    }
  },
  "defaultServer": "server-id-1"
}
```

Each server entry consists of:

- A unique ID (used as the key in the "servers" object)
- Configuration details for connecting to that server

## Supported Server Types

### Stdio Servers (Local Process)

Stdio servers run as local processes, communicating through standard input/output:

```json
{
  "servers": {
    "weather": {
      "type": "stdio",
      "name": "WeatherServer",
      "command": "node",
      "args": ["path/to/weather-server.js"],
      "description": "Weather information service",
      "env": {
        "API_KEY": "your-api-key",
        "DEBUG": "true"
      }
    }
  }
}
```

Parameters:
- `type`: Must be "stdio"
- `name`: Display name for the server
- `command`: Executable to run
- `args`: Array of command-line arguments
- `description`: (Optional) Human-readable description
- `env`: (Optional) Environment variables to pass to the process

### HTTP Servers (Remote)

*Note: HTTP transport support is planned but not yet implemented*

HTTP servers run remotely and communicate via HTTP with Server-Sent Events:

```json
{
  "servers": {
    "remote-tools": {
      "type": "http",
      "name": "RemoteToolsServer",
      "url": "https://example.com/mcp",
      "headers": {
        "Authorization": "Bearer your-auth-token"
      },
      "description": "Remote tools service"
    }
  }
}
```

Parameters:
- `type`: Must be "http"
- `name`: Display name for the server
- `url`: Server endpoint URL
- `headers`: (Optional) HTTP headers to include with requests
- `description`: (Optional) Human-readable description

## Adding a New Server

To add a new MCP server:

1. Identify the server's connection details (command, args, or URL)
2. Choose a unique ID for the server
3. Add the server configuration to `mcp-config.json`
4. Restart the Mistral MCP Client

Example:

```json
{
  "servers": {
    "weather": {
      "type": "stdio",
      "name": "WeatherServer",
      "command": "node",
      "args": ["build/tools/weather-server.js"],
      "description": "Weather information service"
    },
    "database": {
      "type": "stdio",
      "name": "DatabaseServer",
      "command": "python",
      "args": ["-m", "database_mcp_server", "--port", "8080"],
      "description": "Database query service",
      "env": {
        "DB_CONNECTION_STRING": "postgresql://user:pass@localhost/db"
      }
    }
  },
  "defaultServer": "weather"
}
```

## Creating Your Own MCP Server

If you want to create your own MCP server, you'll need to implement the MCP specification. You can use existing SDKs for various languages:

- [TypeScript MCP SDK](https://github.com/anthropics/anthropic-tools/tree/main/typescript)
- [Python MCP SDK](https://github.com/anthropics/anthropic-tools/tree/main/python)

A minimal MCP server in TypeScript might look like:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

async function startServer() {
  // Initialize the MCP server
  const server = new Server(
    {
      name: "MyToolServer",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {} // Enable tools capability
      }
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "my_tool",
          description: "Description of my tool",
          inputSchema: {
            type: "object",
            properties: {
              param1: {
                type: "string",
                description: "First parameter"
              }
            },
            required: ["param1"]
          }
        }
      ]
    };
  });

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "my_tool") {
      // Check arguments
      if (!request.params.arguments) {
        throw new Error("Missing arguments");
      }
      
      const param1 = request.params.arguments.param1;
      
      // Tool implementation
      const result = `Processed: ${param1}`;
      
      // Return result
      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    }
    
    throw new Error(`Tool "${request.params.name}" not found`);
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Server started and ready");
}

startServer().catch(error => {
  console.error("Server error:", error);
  process.exit(1);
});
```

## Troubleshooting Server Connections

If you encounter issues connecting to an MCP server:

1. **Server Not Found**: Verify the command and args paths are correct
2. **Connection Refused**: Ensure the server is running and accessible
3. **Authentication Failed**: Check credentials or API keys
4. **Tool Not Found**: Verify the tool name matches exactly what the server provides
5. **Incompatible Protocol**: Ensure the server implements the same MCP version

You can enable debug logging to see more details about the connection process:

```bash
# For CLI
npm run chat -- --debug

# For UI
# Add DEBUG=true to .env.local
```

## Managing Multiple Servers

When multiple servers are configured:

1. The Mistral MCP Client connects to all servers during initialization
2. All tools from all servers are made available to Mistral
3. When Mistral calls a tool, the client routes the request to the appropriate server
4. If multiple servers provide a tool with the same name, the first one takes precedence

You can set the `defaultServer` property to specify which server to use when ambiguity exists:

```json
{
  "servers": {
    "weather": { /* ... */ },
    "math": { /* ... */ }
  },
  "defaultServer": "weather"
}
```
