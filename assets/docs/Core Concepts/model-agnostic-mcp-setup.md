# Model-Agnostic MCP Configuration with Perplexity

This guide explains how to configure the MCP client to work with the Python-based Perplexity MCP server in a model-agnostic way, allowing it to connect with different AI models.

## Overview

The Model Context Protocol (MCP) enables AI assistants to access external tools and services. By configuring the MCP client to be model-agnostic, you can use the same tools with different AI models (such as Claude, Mistral, GPT, etc.).

## Configuration Files

We've set up the following configuration files:

1. **`mcp-config.json`**: The main configuration file used by the MCP client
2. **`mcp-config-python-perplexity.json`**: A specialized configuration for the Python-based Perplexity MCP server
3. **`launch_for_inspector.bat`**: A batch file that properly sets up the environment and starts the Perplexity MCP server

## Starting the MCP Client

You can start the MCP client with the Python Perplexity MCP server using:

```bash
start-with-python-perplexity.bat
```

This script will:
1. Set the necessary environment variables
2. Copy the Python Perplexity MCP configuration to the main configuration file
3. Start the UI with `npm run dev`

## Model-Agnostic Design

The configuration is designed to be model-agnostic in several ways:

1. **Flexible Environment Variables**: The batch file checks for environment variables and uses defaults if not provided
2. **Standalone Server**: The Perplexity MCP server runs independently of any specific AI model
3. **Standard Protocol**: Uses the Model Context Protocol (MCP) which is a standard interface
4. **Tool-First Approach**: The focus is on providing tool functionality rather than model-specific interactions

## Perplexity MCP Server Features

The Python-based Perplexity MCP server provides:

1. **Web Search**: Uses the Perplexity API to search the web with different recency filters
2. **Model Selection**: Supports different Perplexity models through the `PERPLEXITY_MODEL` environment variable
3. **Customizable Searches**: Allows specifying recency parameters (day, week, month, year)

## How to Use with Different Models

To use this setup with different AI models:

1. **Claude**: Configure Claude Desktop to use the MCP server as described in `perplexity-mcp-setup-guide.md`

2. **Mistral**: Configure Mistral to access the MCP server through its API or interface

3. **Custom Models**: Any model that supports the MCP protocol can be configured to use this server

## Customizing the Configuration

To customize the MCP configuration for different models or scenarios:

1. **Change the Model**: Set the `PERPLEXITY_MODEL` environment variable to use different Perplexity models:
   - `sonar`: Default model with 128k context
   - `sonar-pro`: Professional grade model with 200k context
   - `sonar-deep-research`: Enhanced research capabilities
   - `sonar-reasoning`: Enhanced reasoning capabilities
   - `sonar-reasoning-pro`: Advanced reasoning with professional focus
   - `r1-1776`: Alternative architecture

2. **Add More Servers**: Modify `mcp-config.json` to include additional MCP servers

3. **Change Default Server**: Update the `defaultServer` property in `mcp-config.json`

## Troubleshooting

If you encounter issues:

1. **Server Not Starting**: Make sure your Python environment is correctly set up and the batch file path is correct

2. **API Key Issues**: Verify that the `PERPLEXITY_API_KEY` environment variable is set correctly

3. **Model Compatibility**: Ensure the AI model you're using supports the MCP protocol

4. **Configuration Path**: Make sure the path to the batch file in the configuration is absolute and correct
