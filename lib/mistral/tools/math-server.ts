// src/with-mcp/tools/math-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

async function startServer() {
  // Initialize the MCP server with correct capabilities
  const server = new Server(
    {
      name: "MathServer",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {}, // This enables tool support
      },
    }
  );

  // Register the handler for listing tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "calculate",
          description: "Perform mathematical calculations",
          inputSchema: {
            type: "object",
            properties: {
              expression: {
                type: "string",
                description: "The mathematical expression to evaluate",
              },
            },
            required: ["expression"],
          },
        },
      ],
    };
  });

  // Register the handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error(`Tool call received on math server: ${request.params.name}`);
    console.error(`Arguments:`, JSON.stringify(request.params.arguments));
   
    if (request.params.name === "calculate") {
      // Check if arguments exist
      if (!request.params.arguments) {
        throw new Error("Missing arguments for calculate tool");
      }
     
      const expression = request.params.arguments.expression;
     
      if (typeof expression !== 'string') {
        throw new Error("Invalid or missing expression parameter");
      }
     
      console.error(`Calculating: ${expression}`);
     
      try {
        // Safely evaluate the expression
        // Note: Using Function instead of eval for slightly better safety
        const result = new Function(`return ${expression}`)();
       
        return {
          content: [
            {
              type: "text",
              text: `The result of ${expression} is ${result}`
            }
          ]
        };
      } catch (error: unknown) {
        console.error(`Error in calculation:`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error calculating ${expression}: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    } // <-- This closing brace was missing
   
    console.error(`Tool "${request.params.name}" not found on math server`);
    throw new Error(`Tool "${request.params.name}" not found`);
  });

  // Start receiving messages on stdin and sending messages on stdout
  console.error("Starting Math MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Math MCP server connected and ready.");
}

startServer().catch((error) => {
  // Handle the error with proper type checking
  console.error("Failed to start MCP server:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});