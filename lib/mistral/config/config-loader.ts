// src/with-universal-mcp/config/config-loader.ts
import * as fs from 'fs';
import * as path from 'path';
import { McpConfig, defaultMcpConfig } from './mcp-config';

/**
 * Loads MCP configuration from a file or returns default configuration
 */
export function loadMcpConfig(configPath?: string): McpConfig {
  if (!configPath) {
    console.warn('No MCP config path provided, using empty configuration.');
    return { servers: {} };
  }

  const fullPath = path.resolve(configPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`MCP Configuration file not found at ${fullPath}`);
  }

  try {
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const config = JSON.parse(fileContent) as McpConfig;
    
    if (!config.servers || typeof config.servers !== 'object') {
      throw new Error(`Invalid MCP configuration: 'servers' key is missing or not an object in ${fullPath}`);
    }
    
    if (Object.keys(config.servers).length === 0) {
      console.warn(`No servers defined in MCP configuration file: ${fullPath}`);
    }
    
    if (!config.defaultServer && Object.keys(config.servers).length > 0) {
      config.defaultServer = Object.keys(config.servers)[0];
      console.log(`Default MCP server not specified, using first server: ${config.defaultServer}`);
    }
    
    console.log(`Successfully loaded MCP config from ${fullPath}`);
    return config;
  } catch (error: any) {
    console.error(`Error loading MCP config from ${fullPath}:`, error);
    throw new Error(`Failed to load or parse MCP configuration from ${fullPath}: ${error.message}`);
  }
}