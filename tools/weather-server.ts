// tools/weather-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

async function startServer() {
  // Initialize the MCP server with expanded capabilities
  const server = new Server(
    {
      name: "WeatherServer",
      version: "1.0.0",
    },
    {
      capabilities: {
        // Explicitly define supported capabilities
        tools: {},
        // resources: {}, // Uncomment to enable resources
        // prompts: {}    // Uncomment to enable prompts
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
      
      // Simulate getting weather data
      // In a real app, you'd call a weather API here
      const weatherData = getSimulatedWeather(location);
      
      // Return the weather information
      return {
        content: [
          {
            type: "text",
            text: `Weather in ${location}: ${weatherData.temperature}°${weatherData.unit}, ${weatherData.condition}. Humidity: ${weatherData.humidity}%. Wind: ${weatherData.wind} mph.`
          }
        ]
      };
    }
    
    throw new Error(`Tool "${request.params.name}" not found`);
  });

  // Start receiving messages on stdin and sending messages on stdout
  console.error("Starting Weather MCP server with capability specification...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP server connected and ready.");
}

// Function to simulate weather data
function getSimulatedWeather(location: string) {
  const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Rainy", "Thunderstorms", "Snowy", "Foggy", "Windy"];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  
  return {
    location,
    temperature: Math.floor(Math.random() * 40) + 40, // 40-80 degrees
    unit: "F",
    condition: randomCondition,
    humidity: Math.floor(Math.random() * 50) + 30, // 30-80%
    wind: Math.floor(Math.random() * 20) + 1, // 1-20 mph
  };
}

startServer().catch(error => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});