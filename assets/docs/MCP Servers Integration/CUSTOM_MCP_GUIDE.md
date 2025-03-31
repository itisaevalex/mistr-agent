# Adding Custom MCP Servers to the Mistral MCP Adapter

This guide explains how to add and configure custom Model Context Protocol (MCP) servers to work with the Mistral MCP Adapter.

## What is the Model Context Protocol (MCP)?

The Model Context Protocol (MCP) is a standardized interface for interacting with LLM servers. It allows your application to:

- Execute tools/functions via LLMs
- Use dynamic resources
- Maintain a consistent communication format

## Adding a Custom MCP Server: Step-by-Step Guide

### 1. Create the MCP Server Configuration

First, you need to add your custom MCP server to the configuration. Create or modify `mcp-config.json` in the project root:

```json
{
  "servers": {
    "default": {
      "type": "stdio",
      "name": "DefaultServer",
      "command": "node",
      "args": ["./lib/mistral/server.js"],
      "env": {
        "NODE_ENV": "production"
      },
      "description": "Default MCP server"
    },
    "custom-server": {
      "type": "stdio",
      "name": "CustomServer",
      "command": "python",
      "args": ["./path/to/your/custom_server.py"],
      "env": {
        "PYTHONPATH": "./path/to/modules"
      },
      "description": "My custom MCP server implementation"
    }
  },
  "defaultServer": "default"
}
```

### 2. Implement Your Custom MCP Server

Depending on your language of choice, you'll need to implement an MCP-compliant server.

#### Example: Simple Python MCP Server

```python
# custom_server.py
from modelcontextprotocol.server import McpServer, StdioServerTransport

# Create an MCP server
server = McpServer(name="CustomServer", version="1.0.0")

# Add a tool
@server.tool
def weather(location: str):
    # Implement your custom weather logic here
    return {
        "content": [{"type": "text", "text": f"Weather for {location}: Sunny, 72°F"}]
    }

# Add a dynamic resource
@server.resource
def greeting(name: str = "User"):
    return f"Hello, {name}! Welcome to the custom MCP server."

# Start the server with stdio transport
transport = StdioServerTransport()
server.start(transport)
```

#### Example: Node.js MCP Server

For Node.js, you can use the existing `server.ts` as a template:

```typescript
// custom-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "CustomServer",
  version: "1.0.0"
});

// Add custom tools
server.tool("customTool",
  { param1: z.string(), param2: z.number() },
  async ({ param1, param2 }) => {
    // Implement your custom logic here
    return {
      content: [{ type: "text", text: `Processed ${param1} with value ${param2}` }]
    };
  }
);

// Add dynamic resources
server.resource(
  "customResource",
  z.object({ name: z.string() }),
  async ({ name }) => {
    return `Custom resource content for ${name}`;
  }
);

// Start server with stdio transport
const transport = new StdioServerTransport();
server.start(transport);
```

### 3. Register Tools for Your MCP Server

Update the `ToolManager` to know about the tools your custom MCP server provides:

```typescript
// lib/mistral/tool-manager.ts
import { MistralTool } from './mcp-types';

export class ToolManager {
  private tools: Record<string, MistralTool> = {};

  constructor() {
    // Register default tools
    this.registerWeatherTool();
    
    // Register your custom tools
    this.registerCustomTool();
  }

  // Add your custom tool registration
  private registerCustomTool() {
    this.tools['customTool'] = {
      type: 'function',
      function: {
        name: 'customTool',
        description: 'Performs a custom operation',
        parameters: {
          type: 'object',
          properties: {
            param1: {
              type: 'string',
              description: 'First parameter description'
            },
            param2: {
              type: 'number',
              description: 'Second parameter description'
            }
          },
          required: ['param1', 'param2']
        }
      }
    };
  }

  // Get all registered tools
  getTools(): MistralTool[] {
    return Object.values(this.tools);
  }

  // Get a specific tool by name
  getTool(name: string): MistralTool | undefined {
    return this.tools[name];
  }
}
```

### 4. Using Custom MCPs in the Application

To use your custom MCP server in the application, you can specify the server ID when starting a conversation or sending a message:

```typescript
// Example usage in API route
import { McpAdapter } from '../../../lib/mistral/mcp-adapter';
import { ToolManager } from '../../../lib/mistral/tool-manager';
import { loadConfig } from '../../../lib/mistral/config';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { serverId = 'default' } = body;  // Accept server ID from request
  
  const config = loadConfig();
  const toolManager = new ToolManager();
  const mcpAdapter = new McpAdapter(config, toolManager, 'mcp-config.json');
  
  // Wait for connection to specific server
  await mcpAdapter.waitForConnection(serverId);
  
  // Start a conversation
  const conversationId = await mcpAdapter.startConversation();
  
  // Use the conversation...
  
  return NextResponse.json({ conversationId });
}
```

## Advanced Configuration Options

### MCP Server Types

The MCP adapter supports different transport types:

- **stdio**: Uses standard input/output for communication (good for local processes)
- **sse**: Uses Server-Sent Events for communication (good for remote servers)

### Environment Variables

You can configure environment variables for your MCP servers in the config:

```json
"env": {
  "API_KEY": "your-api-key",
  "DEBUG": "true",
  "CUSTOM_SETTING": "value"
}
```

### Error Handling

Implement proper error handling in your MCP server:

```typescript
server.tool("riskyOperation",
  { input: z.string() },
  async ({ input }) => {
    try {
      // Attempt operation
      return { content: [{ type: "text", text: "Success!" }] };
    } catch (error) {
      // Handle errors
      return { 
        content: [{ 
          type: "text", 
          text: `Error: ${error.message || "Unknown error"}` 
        }] 
      };
    }
  }
);
```

## Testing Your Custom MCP

You can test your custom MCP using the test utility:

```typescript
// test-custom-mcp.ts
import { loadConfig } from './config';
import { ToolManager } from './tool-manager';
import { McpAdapter } from './mcp-adapter';

async function testCustomMcp() {
  try {
    const config = loadConfig();
    const toolManager = new ToolManager();
    const mcpAdapter = new McpAdapter(config, toolManager, './mcp-config.json');
    
    // Wait for server to connect
    await mcpAdapter.waitForConnection('custom-server');
    
    // Start a conversation
    const conversationId = await mcpAdapter.startConversation();
    console.log(`Started conversation: ${conversationId}`);
    
    // Test your custom tool
    const prompt = "Use the customTool with param1='test' and param2=42";
    const response = await mcpAdapter.sendMessage(conversationId, prompt);
    console.log(`Response: ${response}`);
    
    // Disconnect
    mcpAdapter.disconnect();
    console.log("Test completed successfully");
  } catch (error) {
    console.error('Error testing Custom MCP:', error);
  }
}

testCustomMcp();
```

## Updating the UI to Support Custom MCPs

To allow users to select different MCP servers in the UI:

1. Update the API to expose available servers
2. Add a selector component to the UI
3. Pass the selected server ID to the API calls

## Troubleshooting

Common issues and solutions:

1. **MCP Server Not Starting**: Check the logs for errors, verify paths in your config.
2. **Tool Execution Failures**: Ensure tool parameters match the expected schema.
3. **Connection Issues**: Verify the transport configuration is correct.

For more detailed debugging, set `debug: true` in your config or check server logs.
