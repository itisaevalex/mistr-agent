// src/with-universal-mcp/cli.ts
import { McpChatbot } from './chatbot.js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get the current filename and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Extract command line arguments
const args = process.argv.slice(2);
let configPath = path.join(process.cwd(), 'mcp-config.json');
let debug = false;
let saveHistory = true;

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--config' && i + 1 < args.length) {
    configPath = args[i + 1];
    i++;
  } else if (args[i] === '--debug' || args[i] === '-d') {
    debug = true;
  } else if (args[i] === '--no-history') {
    saveHistory = false;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
MCP Chatbot CLI

Usage:
  npm run chat -- [options]

Options:
  --config <path>   Path to MCP configuration file (default: ./mcp-config.json)
  --debug, -d       Enable debug logging
  --no-history      Disable saving conversation history
  --help, -h        Show this help message
    `);
    process.exit(0);
  }
}

// Create and start the chatbot
async function startChatbot() {
  console.log("Starting Universal MCP Chatbot...");
  console.log(`Using config file: ${configPath}`);
  
  const chatbot = new McpChatbot({
    mcpConfigPath: configPath,
    debug: debug,
    saveHistory: saveHistory,
    systemMessage: process.env.SYSTEM_MESSAGE || "You are a helpful assistant that can use tools provided by MCP servers."
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log("\nShutting down chatbot...");
    await chatbot.disconnect();
    process.exit(0);
  });

  try {
    await chatbot.initialize();
    console.log("Chatbot initialized successfully");
    console.log("\n=== MCP Chatbot ===");
    console.log("Connected to MCP servers and ready to chat.");
    console.log("Type 'exit' or 'quit' to end the conversation.");
    console.log("===================\n");
    await chatbot.startChatCLI();
  } catch (error) {
    console.error("Failed to start chatbot:", error);
    process.exit(1);
  }
}

// Start the chatbot
startChatbot();