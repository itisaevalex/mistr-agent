// Simple Perplexity MCP Server
const { Server } = require("@modelcontextprotocol/sdk/server");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio");
const https = require('https');

// Get API key from environment variable
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';

async function startServer() {
  // Initialize the MCP server
  const server = new Server({
    name: "PerplexitySearch",
    version: "1.0.0",
  });

  // Register the handler for listing tools
  server.setRequestHandler("listTools", async () => {
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
  server.setRequestHandler("callTool", async (request) => {
    if (request.params.name === "search") {
      const query = request.params.arguments.query;
      
      console.error(`Searching for: ${query}`);
      
      try {
        // Call Perplexity API
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
        console.error(`Error searching Perplexity: ${error.message}`);
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
  console.error("Starting Perplexity MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Perplexity MCP server ready.");
}

// Function to search using Perplexity API
async function searchPerplexity(query) {
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
  console.error("Failed to start Perplexity MCP server:", error);
  process.exit(1);
});
