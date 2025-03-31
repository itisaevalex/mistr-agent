# Mistr. Agent Setup Guide

This guide will walk you through setting up the Mistr. Agent for your existing Mistral MCP Adapter.

## Quick Start

1. **Set up the UI project**
   ```bash
   # On Windows (PowerShell)
   .\setup-project.ps1

   # On macOS/Linux
   chmod +x setup-project.sh
   ./setup-project.sh
   ```

2. **Configure your Mistral API key**
   Create a `.env.local` file:
   ```
   MISTRAL_API_KEY=your_api_key_here
   MISTRAL_MODEL=mistral-medium
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Start the MCP Weather Server (example tool)**
   ```bash
   npm run start:weather
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Understanding the Project Structure

- `/app`: Next.js app directory with pages and routes
- `/components`: UI components using Shadcn
- `/lib/mistral`: Mistral client and MCP adapter code
- `/tools`: MCP server implementations
- `mcp-config.json`: Configuration for MCP servers

## Integration with Your Existing Adapter

The UI is designed to work with your existing Mistral MCP Adapter. See `INTEGRATION.md` for detailed instructions on connecting the two projects.

## Customizing the UI

The UI is built with Shadcn, making it easy to customize:

1. **Add more Shadcn components**
   ```bash
   npx shadcn-ui@latest add [component-name]
   ```

2. **Modify the theme**
   Edit the `tailwind.config.js` file to change colors and styles

3. **Create new pages**
   Add new pages in the `/app` directory

## Features

- 🤖 Chat with Mistral AI models
- 🔌 Use MCP tools like weather information
- 💬 Multi-session chat management
- 🌙 Light and dark mode support
- 🔧 Configurable settings

## Troubleshooting

If you encounter issues during setup:

1. Make sure you have Node.js 18+ installed
2. Check that your Mistral API key is correctly configured
3. Verify that the paths in `mcp-config.json` are correct
4. Check the console for error messages