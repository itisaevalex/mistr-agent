// src/with-mcp/tools/weather-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

async function startServer() {
  // Initialize the MCP server with correct capabilities
  const server = new Server(
    {
      name: "WeatherServer",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {} // This enables tool support
      }
    }
  );

  // Register the handler for listing tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_weather",
          description: "Gets the current weather for a location",
          inputSchema: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The location to get weather for"
              }
            },
            required: ["location"]
          }
        }
      ]
    };
  });

  // Register the handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error(`Tool call received: ${request.params.name}`);
    
    if (request.params.name === "get_weather") {
      // Check if arguments exist
      if (!request.params.arguments) {
        throw new Error("Missing arguments for get_weather tool");
      }
      
      const location = request.params.arguments.location;
      
      if (typeof location !== 'string') {
        throw new Error("Invalid or missing location parameter");
      }
      
      console.error(`Getting weather for ${location}`);
      
      // Return the weather information
      return {
        content: [
          {
            type: "text",
            text: `Weather in ${location}: 72°F, Sunny with a light breeze. The forecast predicts similar conditions for the next three days.`
          }
        ]
      };
    }
    
    throw new Error(`Tool "${request.params.name}" not found`);
  });

  // Start receiving messages on stdin and sending messages on stdout
  console.error("Starting Weather MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP server connected and ready.");
}

startServer().catch(error => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});