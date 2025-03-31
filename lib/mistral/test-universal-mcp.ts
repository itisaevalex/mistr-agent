// src/with-universal-mcp/test-universal-mcp.ts
import { loadConfig } from './config';
import { ToolManager } from './tool-manager';
import { McpAdapter } from './mcp-adapter';
import * as path from 'path';

async function testUniversalMcp() {
  try {
    const config = loadConfig();
    const toolManager = new ToolManager();
    
    // Path to the MCP configuration file
    const mcpConfigPath = path.join(process.cwd(), 'mcp-config.json');
    console.log(`Using MCP config file: ${mcpConfigPath}`);
    
    console.log("Creating Universal MCP Adapter...");
    const mcpAdapter = new McpAdapter(config, toolManager, mcpConfigPath);

    // Wait for MCP server to connect
    console.log("Waiting for MCP servers to connect...");
    await mcpAdapter.waitForConnection();
    console.log("MCP servers connected, starting test...");

    // Start conversation
    const conversationId = await mcpAdapter.startConversation();

    // Test with a weather query
    const weatherPrompt = "What's the weather like in Tokyo?";
    console.log(`\nUser: ${weatherPrompt}`);
    const weatherResponse = await mcpAdapter.sendMessage(conversationId, weatherPrompt);
    console.log(`Agent: ${weatherResponse}`);

    // Test with a math calculation
    const mathPrompt = "Can you calculate 145 * 32?";
    console.log(`\nUser: ${mathPrompt}`);
    const mathResponse = await mcpAdapter.sendMessage(conversationId, mathPrompt);
    console.log(`Agent: ${mathResponse}`);

    // Test with a general question
    const generalPrompt = "What are the benefits of the Model Context Protocol?";
    console.log(`\nUser: ${generalPrompt}`);
    const generalResponse = await mcpAdapter.sendMessage(conversationId, generalPrompt);
    console.log(`Agent: ${generalResponse}`);

    // Show conversation history
    console.log("\nConversation History:");
    const history = mcpAdapter.getConversationHistory(conversationId);
    for (const message of history) {
      if (message.role === 'tool') {
        console.log(`${message.role} (${message.name}): ${message.content}`);
      } else {
        console.log(`${message.role}: ${message.content.substring(0, 100)}...`);
      }
    }

    // Disconnect
    mcpAdapter.disconnect();
    console.log("Test completed successfully")

  } catch (error) {
    console.error('Error testing Universal MCP adapter:', error);
  }
}

testUniversalMcp();