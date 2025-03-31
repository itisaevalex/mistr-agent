# Using Perplexity MCP with Mistral

This guide explains how to set up and use the Perplexity MCP server with your Mistral MCP client to add web search capabilities.

## Installation Options

You have multiple options for using Perplexity with your Mistral client:

### Option 1: Smithery Installation (Recommended)

Smithery makes it easy to install and set up the Perplexity MCP server:

```bash
npm run setup:smithery
npm run start:smithery
```

This uses the popular [jsonallen/perplexity-mcp](https://github.com/jsonallen/perplexity-mcp) implementation.

### Option 2: Basic Perplexity Server

A simplified implementation that uses Node.js directly:

```bash
npm run start:perplexity-basic
```

### Option 3: Official Perplexity Server

The implementation from ppl-ai:

```bash
npm run start:perplexity-official
```

## Using Perplexity Search

Once the server is running, you can ask questions that require web search:

- "Search the web for the latest news about quantum computing"
- "What happened in the world news today?"
- "Find information about climate change initiatives in Europe"

## Available Models

When using the Smithery installation, you can select different Perplexity models by changing the `PERPLEXITY_MODEL` environment variable in `mcp-config-smithery.json`:

- `sonar-deep-research`: 128k context - Enhanced research capabilities
- `sonar-reasoning-pro`: 128k context - Advanced reasoning with professional focus
- `sonar-reasoning`: 128k context - Enhanced reasoning capabilities
- `sonar-pro`: 200k context - Professional grade model
- `sonar`: 128k context - Default model
- `r1-1776`: 128k context - Alternative architecture

## Troubleshooting

If you encounter issues:

1. Make sure UV is installed and accessible in your PATH
2. Verify that your Perplexity API key is valid
3. Check for any network connectivity issues
4. Ensure the MCP server is running when you start the client

## API Key

The configuration files include your Perplexity API key. If you need to change it, update the key in the respective configuration file.
