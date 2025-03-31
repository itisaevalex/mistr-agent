// tools/simple-search-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import https from 'https';

// Get API key from environment variable
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';

async function startServer() {
  // Initialize the MCP server
  const server = new Server(
    {
      name: "SimpleSearchServer",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Register the handler for listing tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "search",
          description: "Search the web using Perplexity",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query"
              }
            },
            required: ["query"]
          }
        }
      ]
    };
  });

  // Register the handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error(`Tool call received: ${request.params.name}`);
    
    if (request.params.name === "search") {
      // Check if arguments exist
      if (!request.params.arguments) {
        throw new Error("Missing arguments for search tool");
      }
      
      const query = request.params.arguments.query;
      
      if (typeof query !== 'string') {
        throw new Error("Invalid or missing query parameter");
      }
      
      console.error(`Searching for: ${query}`);
      
      try {
        // Search using Perplexity API
        const result = await searchPerplexity(query);
        
        return {
          content: [
            {
              type: "text",
              text: result
            }
          ]
        };
      } catch (error) {
        console.error(`Error searching: ${error.message}`);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    }
    
    throw new Error(`Tool "${request.params.name}" not found`);
  });

  // Start receiving messages on stdin and sending messages on stdout
  console.error("Starting Simple Search MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Simple Search MCP server connected and ready.");
}

// Function to search using Perplexity API
async function searchPerplexity(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.perplexity.ai',
      port: 443,
      path: '/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.answer) {
              resolve(response.answer);
            } else {
              resolve(JSON.stringify(response, null, 2));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`API returned status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({ query }));
    req.end();
  });
}

startServer().catch(error => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
