// Direct Perplexity MCP Server for Mistral
const { Server } = require("@modelcontextprotocol/sdk/server");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio");
const https = require('https');

// Get API key from environment variable
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || 'sonar';

async function startServer() {
  // Initialize the MCP server
  const server = new Server(
    {
      name: "DirectPerplexityServer",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      }
    }
  );

  // Register the handler for listing tools
  server.setRequestHandler("listTools", async () => {
    return {
      tools: [
        {
          name: "perplexity_search_web",
          description: "Search the web using Perplexity AI",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query"
              },
              recency: {
                type: "string",
                description: "Filter results by time period: 'day', 'week', 'month' (default), 'year'",
                enum: ["day", "week", "month", "year"]
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
    if (request.params.name === "perplexity_search_web") {
      const query = request.params.arguments.query;
      const recency = request.params.arguments.recency || 'month';
      
      console.error(`Searching for: "${query}" with recency: ${recency}`);
      
      try {
        // Call Perplexity API
        const result = await searchPerplexity(query, recency);
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
  console.error("Starting Direct Perplexity MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Direct Perplexity MCP server ready.");
}

// Function to search using Perplexity API
async function searchPerplexity(query, recency) {
  return new Promise((resolve, reject) => {
    // Map recency to max_age parameter (in seconds)
    const recencyMap = {
      'day': 60 * 60 * 24,         // 1 day in seconds
      'week': 60 * 60 * 24 * 7,     // 1 week in seconds
      'month': 60 * 60 * 24 * 30,   // 30 days in seconds
      'year': 60 * 60 * 24 * 365    // 365 days in seconds
    };
    
    const max_age = recencyMap[recency] || recencyMap['month']; // Default to month
    
    const requestBody = {
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: "user",
          content: query
        }
      ],
      options: {
        search_focus: true,
        max_age
      }
    };
    
    const options = {
      hostname: 'api.perplexity.ai',
      port: 443,
      path: '/chat/completions',
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
            
            let result = '';
            
            // Extract content from the response
            if (response.choices && response.choices.length > 0 && response.choices[0].message) {
              result = response.choices[0].message.content;
            } else {
              result = "No results found.";
            }
            
            // Add citations if available
            if (response.citations && response.citations.length > 0) {
              result += "\n\nCitations:\n";
              response.citations.forEach((citation, index) => {
                result += `[${index + 1}] ${citation.url || citation}\n`;
              });
            }
            
            resolve(result);
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

    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

startServer().catch(error => {
  console.error("Failed to start Direct Perplexity MCP server:", error);
  process.exit(1);
});
