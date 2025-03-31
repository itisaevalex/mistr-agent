# Perplexity Ask MCP Server Setup

This guide helps you set up and use the Perplexity Ask MCP server with your Mistral client for web search capabilities.

## Step 1: Start the Perplexity Ask Server

Open a command prompt and run:

```bash
npm run start:perplexity
```

This will start the Perplexity Ask MCP server. Keep this window open while using the server.

## Step 2: Configure the Mistral Client

In a new command prompt, run:

```bash
npm run use:perplexity
```

This will configure the Mistral client to use the Perplexity Ask server.

## Step 3: Start the Mistral Client

In the same or another command prompt, run:

```bash
npm run dev
```

This will start the Mistral client, which will connect to the Perplexity Ask server.

## Using Perplexity Ask

Once everything is set up, you can ask questions that require web searches in your chat. For example:

- "What are the latest news about AI?"
- "Who won the last Super Bowl?"
- "What's the weather forecast for New York this weekend?"

The Perplexity Ask server will perform web searches to answer these questions.

## Troubleshooting

If you encounter any issues:

1. Make sure the Perplexity Ask server is running (the window from Step 1 is open)
2. Check that your API key is correct
3. Restart both the server and client if needed

## API Key

Your Perplexity API key is already configured, but if you need to change it, edit the `mcp-config-perplexity.json` file and the `start-perplexity-ask.bat` file.
