// src/with-universal-mcp/chatbot.ts
import * as readline from 'readline';
import { loadConfig } from './config';
import { McpAdapter } from './mcp-adapter';
import { ToolManager } from './tool-manager';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get the current filename and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration for the MCP Chatbot
 */
export interface ChatbotConfig {
  /** Path to the MCP configuration file */
  mcpConfigPath?: string;
  /** System message to initialize the chat */
  systemMessage?: string;
  /** Whether to save the conversation history */
  saveHistory?: boolean;
  /** Path where to save conversation history */
  historyPath?: string;
  /** Whether to show debug logs */
  debug?: boolean;
}

/**
 * A chatbot that uses Mistral with MCP tools
 */
export class McpChatbot {
  private mcpAdapter: McpAdapter;
  private toolManager: ToolManager;
  private conversationId: string | null = null;
  private config: ChatbotConfig;
  private rl: readline.Interface | null = null;

  /**
   * Creates a new MCP Chatbot
   * @param config Configuration options
   */
  constructor(config: ChatbotConfig = {}) {
    this.config = {
      mcpConfigPath: path.join(process.cwd(), 'mcp-config.json'),
      systemMessage: "You are a helpful assistant that can use tools.",
      saveHistory: false,
      historyPath: path.join(process.cwd(), 'conversations'),
      debug: false,
      ...config
    };

    if (this.config.debug) {
      console.log(`Using MCP config file: ${this.config.mcpConfigPath}`);
    }

    // Initialize components
    const mistralConfig = loadConfig();
    this.toolManager = new ToolManager();
    this.mcpAdapter = new McpAdapter(mistralConfig, this.toolManager, this.config.mcpConfigPath);
  }

  /**
   * Initialize the chatbot and connect to MCP servers
   */
  async initialize(): Promise<void> {
    console.log("Initializing chatbot and connecting to MCP servers...");
    try {
      // Wait for all MCP servers to connect
      await this.mcpAdapter.waitForConnection();
      console.log("Connected to MCP servers");

      // Start a new conversation
      this.conversationId = await this.mcpAdapter.startConversation();
      
      // If system message is provided, send it
      if (this.config.systemMessage) {
        if (this.config.debug) {
          console.log(`Setting system message: ${this.config.systemMessage}`);
        }
      }
    } catch (error) {
      console.error("Failed to initialize chatbot:", error);
      throw error;
    }
  }

  /**
   * Send a message to the chatbot and get a response
   * @param message The user's message
   * @returns The chatbot's response
   */
  async sendMessage(message: string): Promise<string> {
    if (!this.conversationId) {
      throw new Error("Chatbot not initialized. Call initialize() first.");
    }

    try {
      const response = await this.mcpAdapter.sendMessage(this.conversationId, message);
      
      // Save history if enabled
      if (this.config.saveHistory) {
        await this.saveConversationHistory();
      }
      
      return response.content;
    } catch (error) {
      console.error("Error sending message:", error);
      return "I'm sorry, I encountered an error processing your message.";
    }
  }

  /**
   * Save the current conversation history to disk
   */
  private async saveConversationHistory(): Promise<void> {
    if (!this.conversationId || !this.config.historyPath) return;

    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(this.config.historyPath)) {
        fs.mkdirSync(this.config.historyPath, { recursive: true });
      }

      const history = this.mcpAdapter.getConversationHistory(this.conversationId);
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filePath = path.join(this.config.historyPath, `conversation-${timestamp}.json`);
      
      await fs.promises.writeFile(
        filePath, 
        JSON.stringify(history, null, 2), 
        'utf8'
      );
      
      if (this.config.debug) {
        console.log(`Conversation history saved to ${filePath}`);
      }
    } catch (error) {
      console.error("Failed to save conversation history:", error);
    }
  }

  /**
   * Get the current conversation history
   * @returns The conversation history
   */
  getConversationHistory() {
    if (!this.conversationId) {
      return [];
    }
    return this.mcpAdapter.getConversationHistory(this.conversationId);
  }

  /**
   * Start an interactive CLI chat session
   */
  async startChatCLI(): Promise<void> {
    if (!this.conversationId) {
      await this.initialize();
    }

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log("=== MCP Chatbot ===");
    console.log("Type 'exit' or 'quit' to end the conversation.");
    console.log("====================");

    const promptUser = () => {
      this.rl!.question("\nYou: ", async (input) => {
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          await this.disconnect();
          return;
        }

        try {
          const response = await this.sendMessage(input);
          console.log(`\nChatbot: ${response}`);
        } catch (error) {
          console.error("Error:", error);
        }

        promptUser();
      });
    };

    promptUser();
  }

  /**
   * Disconnect from MCP servers and clean up resources
   */
  async disconnect(): Promise<void> {
    // Save history one last time if enabled
    if (this.config.saveHistory && this.conversationId) {
      await this.saveConversationHistory();
    }

    // Close readline interface if it exists
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    // Disconnect from MCP servers
    this.mcpAdapter.disconnect();
    console.log("Disconnected from MCP servers");
  }
}

// Check if this module is being run directly
// Note: Using ES Module approach here instead of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
  const chatbot = new McpChatbot({
    debug: true,
    saveHistory: true
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log("\nReceived SIGINT. Shutting down...");
    await chatbot.disconnect();
    process.exit(0);
  });

  chatbot.initialize().then(() => {
    chatbot.startChatCLI();
  }).catch(error => {
    console.error("Failed to start chatbot:", error);
    process.exit(1);
  });
}

// Export for use as a module
export default McpChatbot;