# Mistral MCP Client Comprehensive Guide

This guide provides detailed information on working with the Mistral MCP client, including integrating Python-based MCP servers and implementing chat persistence.

## Table of Contents

1. [Overview](#overview)
2. [Python MCP Server Integration](#python-mcp-server-integration)
3. [Chat Persistence](#chat-persistence)
4. [Configuration Options](#configuration-options)
5. [Troubleshooting](#troubleshooting)
6. [Git Repository Setup](#git-repository-setup)

## Overview

The Mistral MCP (Model Context Protocol) client is a web-based interface for interacting with AI assistants using the Model Context Protocol. It provides:

- A chat interface for communicating with AI models
- Integration with various MCP servers for extended capabilities
- Persistence of chat histories across sessions
- Security controls for tool usage

## Python MCP Server Integration

### Key Concepts

The MCP protocol allows AI assistants to access external tools and services. Python-based MCP servers (like the Perplexity MCP server) can be integrated with the Mistral MCP client to provide additional functionality such as web search.

### Integration Methods

We discovered three effective approaches to integrate a Python MCP server with the Mistral client:

#### 1. Direct UVX Approach (Recommended)

This approach directly calls the UV package manager to execute the MCP server with the proper environment and working directory.

```json
{
  "servers": {
    "perplexity-direct-uvx": {
      "type": "stdio",
      "name": "PerplexityDirectUvx",
      "command": "uvx",
      "args": ["perplexity-mcp"],
      "env": {
        "PERPLEXITY_API_KEY": "your-api-key",
        "PERPLEXITY_MODEL": "sonar"
      },
      "cwd": "C:\\path\\to\\your\\perplexity-mcp",
      "description": "Web search using Perplexity MCP (direct UVX)"
    }
  },
  "defaultServer": "perplexity-direct-uvx"
}
```

To start the client with this configuration:

```batch
@echo off
echo Starting MCP client with Perplexity MCP server (direct UVX)...

echo Copying direct UVX Perplexity MCP configuration
copy mcp-config-direct-uvx.json mcp-config.json

echo Starting the UI
npm run dev
```

#### 2. UVX Batch Script

This approach uses a batch script to set up the environment and call UVX:

```batch
@echo off
echo Setting up environment for Perplexity MCP server...

REM Set the required environment variables
set PERPLEXITY_API_KEY=your-api-key
set PERPLEXITY_MODEL=sonar

echo Starting Perplexity MCP server with UVX...
cd "path\to\perplexity-mcp"
uvx perplexity-mcp
```

#### 3. Python Path Environment

This approach explicitly sets the Python path to include the MCP server module:

```batch
@echo off
echo Setting up environment for Perplexity MCP server...

REM Set the required environment variables
set PERPLEXITY_API_KEY=your-api-key
set PERPLEXITY_MODEL=sonar

REM Add the source directory to PYTHONPATH
set PYTHONPATH=%PYTHONPATH%;path\to\perplexity-mcp\src

echo Starting Perplexity MCP server...
python -c "import sys; sys.path.append('path\\to\\perplexity-mcp\\src'); from perplexity_mcp.server import cli; cli()"
```

### Common Integration Issues

1. **Module Not Found Error**: Occurs when Python cannot find the MCP server module
   - Solution: Use the Direct UVX approach or explicitly set the Python path

2. **Command Not Found Error**: Occurs when the system cannot find the MCP server executable
   - Solution: Use the full path to the executable or use UVX

3. **Connection Closed Error**: Occurs when the client cannot establish a connection to the server
   - Solution: Ensure environment variables are correctly set and the server is properly installed

## Chat Persistence

### Implementation Overview

The Mistral MCP client now includes a persistence layer for chat messages using browser localStorage. This allows conversations to be saved and restored across sessions.

### Key Components

1. **Conversation Storage Utility** (`lib/storage/conversation-storage.ts`):
   - Provides functions for saving, loading, and managing conversations
   - Handles metadata like conversation titles and timestamps

2. **UI Integration** (`app/page.tsx`):
   - Shows a list of saved conversations in the sidebar
   - Allows switching between conversations
   - Auto-saves messages as they are sent and received

### Using Chat Persistence

1. **Start a new conversation** by clicking the "New Chat" button
2. **View saved conversations** by clicking "Show Saved Chats"
3. **Switch between conversations** by clicking on them in the sidebar
4. **Delete conversations** by clicking the "×" button next to them

### Storage Schema

The localStorage keys are structured as follows:

- `mistral-ui-conversations`: Array of conversation IDs
- `conversation-{id}`: JSON string of conversation messages
- `conversation-meta-{id}`: JSON string of conversation metadata

## Configuration Options

### MCP Server Configuration

The MCP server configuration is stored in `mcp-config.json` and can include multiple servers:

```json
{
  "servers": {
    "perplexity-server": {
      "type": "stdio",
      "name": "PerplexitySearch",
      "command": "uvx",
      "args": ["perplexity-mcp"],
      "env": {
        "PERPLEXITY_API_KEY": "your-api-key"
      },
      "cwd": "path\\to\\perplexity-mcp",
      "description": "Web search using Perplexity"
    },
    "weather-server": {
      "type": "stdio",
      "name": "WeatherForecast",
      "command": "node",
      "args": ["path/to/weather-server.js"],
      "description": "Weather forecast tool"
    }
  },
  "defaultServer": "perplexity-server"
}
```

### Perplexity Model Options

For Perplexity MCP, you can specify different models using the `PERPLEXITY_MODEL` environment variable:

- `sonar`: Default model with 128k context
- `sonar-pro`: Professional grade model with 200k context
- `sonar-deep-research`: Enhanced research capabilities
- `sonar-reasoning`: Enhanced reasoning capabilities
- `sonar-reasoning-pro`: Advanced reasoning with professional focus
- `r1-1776`: Alternative architecture

## Troubleshooting

### Python MCP Server Issues

1. **Module Not Found Error**: `ModuleNotFoundError: No module named 'perplexity_mcp'`
   - Use the Direct UVX approach which ensures the correct Python environment is used
   - Add the source directory to PYTHONPATH: `set PYTHONPATH=%PYTHONPATH%;path\to\perplexity-mcp\src`

2. **Command Not Found Error**: `'perplexity-mcp' is not recognized as an internal or external command`
   - Use the full path to the executable
   - Use UVX or Python to run the module directly
   - Set the correct working directory with the `cwd` parameter

3. **Connection Closed Error**: `McpError: MCP error -32000: Connection closed`
   - Ensure environment variables are correctly set
   - Use a batch file to properly initialize the environment
   - Check that the MCP server is properly installed and can be run independently

### Chat Persistence Issues

1. **Conversations Not Saving**:
   - Check that localStorage is available and not full
   - Ensure JavaScript is enabled in the browser

2. **Conversations Not Loading**:
   - Check that the conversation ID is correct
   - Verify that localStorage contains the conversation data

3. **Corrupted Conversation Data**:
   - Clear the corrupted conversation using the delete button
   - In extreme cases, clear localStorage for the site

## Git Repository Setup

We've also set up a Git repository to track changes to the project:

1. **Initialize the repository**:
   ```
   init-git-repo.bat
   ```

2. **Add a remote repository URL**:
   ```
   git remote add origin <your-repo-url>
   ```

3. **Push your changes**:
   ```
   git push -u origin main
   ```

### Key Files in the Repository

- `mcp-config-direct-uvx.json`: Configuration for direct UVX integration
- `start-with-perplexity-direct-uvx.bat`: Batch file to start the client
- `lib/storage/conversation-storage.ts`: Conversation persistence utility
- `app/page.tsx`: Main UI component with chat persistence integration

## Best Practices

1. **Use Direct UVX Approach** for Python MCP servers installed with UV
2. **Set Working Directory** correctly to ensure the server can find its dependencies
3. **Use Absolute Paths** in configuration files to avoid path resolution issues
4. **Test MCP Servers Independently** before integrating with the client
5. **Regularly Back Up Your Configuration** using the Git repository

## Conclusion

By following this guide, you should be able to successfully integrate Python-based MCP servers with the Mistral MCP client and utilize the chat persistence functionality. This combination creates a powerful interface for interacting with AI assistants and their tools, with the ability to maintain context across sessions.
