# Mistral MCP Client Web UI Guide

This document provides an overview of the web-based user interface for the Mistral MCP Client, explaining its features, architecture, and how to use it.

## Overview

The Mistral MCP Client Web UI is a modern interface built with Next.js and Shadcn UI components. It provides a user-friendly way to interact with Mistral AI models while leveraging tools from MCP servers.

## Key Features

- **Chat Interface**: Engage in conversations with Mistral AI
- **Tool Discovery**: Browse and explore available MCP tools
- **Tool Usage**: Insert tool examples and see tool executions
- **Multi-session Support**: Manage multiple chat conversations
- **Responsive Design**: Works on both desktop and mobile devices

## Architecture

The Web UI is built using:

- **Next.js**: React framework for server-rendered applications
- **Shadcn UI**: High-quality UI components built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TypeScript**: Type-safe JavaScript for better development experience

### Key Components

1. **API Layer**
   - `/api/chat`: Manages conversations
   - `/api/chat/[conversationId]/messages`: Handles message exchange
   - `/api/tools`: Provides available tools from MCP servers

2. **UI Components**
   - `ToolsPanel`: Displays available tools from MCP servers
   - `ToolCall`: Visualizes tool calls in the chat interface
   - Chat message components for different message types

3. **State Management**
   - React state hooks for managing conversations and messages
   - Local storage for persisting conversations and settings

## Getting Started

### Prerequisites

- Node.js 18+ installed
- NPM or Yarn package manager
- Mistral API key

### Installation

1. Navigate to the UI directory:
```bash
cd ui
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy example .env file
cp .env.example .env.local
# Edit .env.local with your Mistral API key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Starting a Conversation

1. When you first open the application, a new conversation is automatically created.
2. Type your message in the input field at the bottom of the screen.
3. Press "Send" or hit Enter to send your message to Mistral.

### Using MCP Tools

1. Browse available tools in the right sidebar.
2. Click on a tool to view its description and parameters.
3. Use the "Insert Example" button to add an example tool usage to your message.
4. When you ask Mistral to use a tool, it will appear as a tool call in the chat.

### Managing Conversations

1. Click "New Chat" in the left sidebar to start a fresh conversation.
2. Previous conversations are listed in the sidebar for easy access.
3. Each conversation maintains its own context and history.

## Customization

### Styling

The UI uses Tailwind CSS for styling. You can customize the appearance by:

1. Modifying `tailwind.config.js` to change colors, spacing, etc.
2. Editing component classes to adjust specific elements
3. Creating new components for specialized UI needs

### Adding Components

To add new Shadcn UI components:

```bash
npx shadcn-ui@latest add [component-name]
```

For example:

```bash
npx shadcn-ui@latest add accordion
npx shadcn-ui@latest add tabs
```

## Current Limitations

- Limited to tools feature of MCP (no resources or prompts yet)
- Basic capability negotiation with MCP servers
- No support for streaming responses
- Limited mobile optimization

## Future Enhancements

- Resource browser for exploring MCP resources
- Prompt gallery for using MCP prompts
- Enhanced tool visualization with input forms
- Better mobile experience
- Dark mode toggle
- User authentication and saved conversations
- Streaming responses for faster interaction

## Troubleshooting

### Common Issues

**Issue**: API calls failing with 401/403 errors
**Solution**: Check that your Mistral API key is correctly set in the `.env.local` file

**Issue**: No tools showing in the sidebar
**Solution**: Verify that your MCP servers are running and properly configured in `mcp-config.json`

**Issue**: UI not updating after sending messages
**Solution**: Check browser console for errors, and ensure your Next.js API routes are functioning correctly

### Debugging

For advanced debugging:

1. Check the browser console for error messages
2. Enable verbose logging by adding `DEBUG=true` to your `.env.local` file
3. Inspect network requests in browser developer tools
4. Check server logs for API route errors

## Contributing

Contributions to the Web UI are welcome! Areas that could use improvement:

- Enhanced visualization of tool calls and results
- Better mobile responsiveness
- Accessibility improvements
- Additional UI components for future MCP features (resources, prompts)
- Performance optimizations for large conversations
