# MCP Chatbot Guide

This guide provides detailed information about using the MCP Chatbot, a fully-functional interface for interacting with Mistral AI using MCP tools.

## Overview

The MCP Chatbot is built on top of the Universal Mistral MCP Adapter and provides:

1. An interactive command-line interface for chatting with Mistral
2. Access to all tools from configured MCP servers
3. Conversation history management
4. Extensive configuration options
5. Programmatic API for integration into custom applications

## Installation and Setup

### Prerequisites

Before using the chatbot, make sure you have:

1. Node.js v16 or higher installed
2. A valid Mistral API key
3. One or more MCP servers configured

### Configuration

1. Create a `.env` file in the project root with your Mistral API key:

```
MISTRAL_API_KEY=your_api_key_here
MISTRAL_MODEL=mistral-large
SYSTEM_MESSAGE=You are a helpful assistant that can use tools.
```

2. Create a `mcp-config.json` file in the project root to configure your MCP servers:

```json
{
  "servers": {
    "weather": {
      "type": "stdio",
      "name": "WeatherServer",
      "command": "node",
      "args": ["build/with-mcp/tools/weather-server.js"],
      "description": "Weather information service"
    },
    "math": {
      "type": "stdio",
      "name": "MathServer",
      "command": "node",
      "args": ["build/with-universal-mcp/tools/math-server.js"],
      "description": "Mathematical calculation service"
    }
  },
  "defaultServer": "weather"
}
```

3. Build the project:

```bash
npm run build
```

## Using the Chatbot

### Command-Line Interface

The easiest way to use the chatbot is through the command-line interface:

```bash
npm run chat
```

This will:
1. Load your configuration
2. Connect to all configured MCP servers
3. Start an interactive chat session

Example interaction:

```
You: What's the weather like in Tokyo?
Chatbot: The weather in Tokyo is currently 72°F with sunny skies and a light breeze.

You: Can you calculate 145 * 32?
Chatbot: The result of 145 * 32 is 4640.

You: What can you tell me about the Model Context Protocol?
Chatbot: The Model Context Protocol (MCP) is a standard that allows AI models like me to 
connect to external tools and data sources. It enables me to perform actions like getting 
weather information and performing calculations by communicating with specialized servers...
```

### Command-Line Options

The chatbot supports several command-line options:

```bash
npm run chat -- --config ./custom-config.json --debug
```

Available options:

- `--config <path>`: Path to a custom MCP configuration file
- `--debug`, `-d`: Enable debug logging for troubleshooting
- `--no-history`: Disable saving conversation history
- `--help`, `-h`: Show help message with available options

### Environment Variables

You can customize the chatbot behavior using these environment variables:

- `MISTRAL_API_KEY`: Your Mistral API key
- `MISTRAL_MODEL`: Mistral model to use (default: mistral-large)
- `SYSTEM_MESSAGE`: Custom system message to set the assistant's behavior
- `MCP_CONFIG_PATH`: Path to the MCP configuration file
- `HISTORY_PATH`: Directory to save conversation histories

## Programmatic Usage

You can integrate the chatbot into your own applications:

```typescript
import { McpChatbot } from './build/with-universal-mcp/chatbot.js';

async function example() {
  // Create a chatbot instance
  const chatbot = new McpChatbot({
    mcpConfigPath: './my-config.json',
    debug: true,
    saveHistory: true,
    systemMessage: "You are a helpful assistant specializing in data analysis."
  });

  try {
    // Initialize the chatbot
    await chatbot.initialize();
    console.log("Chatbot initialized");

    // Send messages and get responses
    const response1 = await chatbot.sendMessage("What's the weather like in Tokyo?");
    console.log(`Response: ${response1}`);

    const response2 = await chatbot.sendMessage("Calculate 145 * 32");
    console.log(`Response: ${response2}`);

    // Get conversation history
    const history = chatbot.getConversationHistory();
    console.log("Conversation history:", history);

    // Clean up
    await chatbot.disconnect();
    console.log("Chatbot disconnected");
  } catch (error) {
    console.error("Error:", error);
  }
}

example();
```

### ChatbotConfig Options

When creating a chatbot instance, you can provide these configuration options:

```typescript
interface ChatbotConfig {
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
```

### Available Methods

The chatbot provides these methods:

- `initialize()`: Connect to MCP servers and prepare the chatbot
- `sendMessage(message: string)`: Send a message and get a response
- `getConversationHistory()`: Get the current conversation history
- `startChatCLI()`: Start an interactive CLI chat session
- `disconnect()`: Clean up resources and disconnect from servers

## Conversation History

When `saveHistory` is enabled, the chatbot saves conversation histories to the `conversations` directory (or the custom path specified in `historyPath`).

Each conversation is saved as a JSON file with a timestamp in the filename, e.g., `conversation-2023-04-01T12-34-56.789Z.json`.

The history files contain the full conversation including:
- User messages
- Assistant responses
- Tool calls and results
- System messages

These history files can be useful for:
- Debugging issues
- Analyzing user interactions
- Training or fine-tuning models
- Providing continuity between sessions

## Advanced Usage

### Custom System Messages

You can customize the chatbot's behavior by providing a system message:

```typescript
const chatbot = new McpChatbot({
  systemMessage: `You are a data analysis assistant specializing in processing numerical 
  information and generating insights. Whenever possible, use mathematical tools to provide 
  accurate calculations. Always format outputs clearly.`
});
```

### Integration with Web Applications

To integrate the chatbot with a web application:

```typescript
import express from 'express';
import { McpChatbot } from './build/with-universal-mcp/chatbot.js';

const app = express();
app.use(express.json());

// Create a map to store chatbot instances for each user
const chatbots = new Map();

// Initialize a chatbot for a user
app.post('/api/chat/init', async (req, res) => {
  const userId = req.body.userId;
  
  if (chatbots.has(userId)) {
    return res.json({ status: 'already_initialized' });
  }
  
  try {
    const chatbot = new McpChatbot({
      mcpConfigPath: './mcp-config.json',
      saveHistory: true
    });
    
    await chatbot.initialize();
    chatbots.set(userId, chatbot);
    
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Send a message to the chatbot
app.post('/api/chat/message', async (req, res) => {
  const { userId, message } = req.body;
  
  if (!chatbots.has(userId)) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Chatbot not initialized' 
    });
  }
  
  try {
    const chatbot = chatbots.get(userId);
    const response = await chatbot.sendMessage(message);
    
    res.json({
      status: 'success',
      response,
      history: chatbot.getConversationHistory()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Troubleshooting

### Common Issues

#### Connection Failures

If the chatbot fails to connect to MCP servers:

1. Check that the server paths in your configuration file are correct
2. Verify that the server executables exist and are properly built
3. Enable debug mode to see more detailed logs: `--debug`
4. Check for error messages in the server logs

#### Authentication Errors

If you encounter Mistral API authentication errors:

1. Verify your API key in the `.env` file
2. Check that the API key has sufficient permissions and credits
3. Ensure the `.env` file is properly loaded

#### Tool Execution Errors

If tools fail to execute:

1. Check that the tool names match between registration and invocation
2. Verify that the tool arguments are properly formatted
3. Look for error messages in the server logs
4. Try running the tool server directly to test its functionality

## Advanced Configuration

### Custom Tool Registration

You can register custom tools programmatically:

```typescript
import { McpChatbot } from './build/with-universal-mcp/chatbot.js';
import { ToolManager } from './build/with-universal-mcp/tool-manager.js';

// Create a custom tool manager
const toolManager = new ToolManager();

// Register a custom tool
toolManager.registerTool({
  name: 'custom_tool',
  description: 'A custom tool that does something special',
  parameters: {
    param1: {
      type: 'string',
      description: 'Parameter 1'
    }
  },
  required: ['param1'],
  execute: async (args) => {
    // Custom tool implementation
    return `Executed custom_tool with param1=${args.param1}`;
  }
});

// Create a chatbot with the custom tool manager
const chatbot = new McpChatbot({
  toolManager: toolManager
});
```

### Custom Conversation Storage

You can implement custom conversation storage:

```typescript
import { McpChatbot } from './build/with-universal-mcp/chatbot.js';
import { MongoClient } from 'mongodb';

// Connect to MongoDB
const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('chatbot');
const conversations = db.collection('conversations');

// Create a chatbot with custom history handling
const chatbot = new McpChatbot({
  saveHistory: false // Disable default history saving
});

// Initialize the chatbot
await chatbot.initialize();
const conversationId = await chatbot.startConversation();

// Override the sendMessage method to save to MongoDB
const originalSendMessage = chatbot.sendMessage.bind(chatbot);
chatbot.sendMessage = async (message) => {
  const response = await originalSendMessage(message);
  
  // Save to MongoDB
  await conversations.updateOne(
    { conversationId },
    { 
      $set: { 
        conversationId,
        updatedAt: new Date()
      },
      $push: { 
        messages: { 
          role: 'user', 
          content: message 
        },
        messages: { 
          role: 'assistant', 
          content: response 
        }
      }
    },
    { upsert: true }
  );
  
  return response;
};
```

## Conclusion

The MCP Chatbot provides a powerful, flexible way to interact with Mistral AI using MCP tools. Whether you're using it directly through the CLI or integrating it into your own applications, the chatbot makes it easy to leverage the capabilities of multiple MCP servers through a unified interface.

By following the patterns and best practices outlined in this guide, you can create robust, user-friendly conversational AI applications that take full advantage of the Universal Mistral MCP Adapter.