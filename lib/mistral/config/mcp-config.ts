// src/with-universal-mcp/config/mcp-config.ts
export interface McpServerConfig {
    type: 'stdio' | 'sse';
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
    description?: string;
  }
  
  export interface McpConfig {
    servers: Record<string, McpServerConfig>;
    defaultServer?: string;
  }
  
  // Default configuration with our weather server
  export const defaultMcpConfig: McpConfig = {
    servers: {
      "weather": {
        type: 'stdio',
        name: 'WeatherServer',
        command: 'node',
        args: ['build/with-mcp/tools/weather-server.js'],
        description: 'Weather information service'
      }
    },
    defaultServer: "weather"
  };