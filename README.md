# Mistr. Agent

A modern chat interface for Mistral AI with Model Context Protocol (MCP) support, built with Next.js and Shadcn UI.

This UI allows you to chat with Mistral models and use various tools through the Model Context Protocol (MCP), giving the model access to real-time data and external services.

## Getting Started

### Setting Up the Project

1. Run the setup script to create the Next.js project with Shadcn UI:

   **On Windows (PowerShell):**
   ```powershell
   .\setup-project.ps1
   ```

   **On macOS/Linux:**
   ```bash
   # Make the script executable
   chmod +x setup-project.sh
   # Run the script
   ./setup-project.sh
   ```

2. After the setup is complete, update the `.env.local` file with your Mistral API key:
   ```
   MISTRAL_API_KEY=your_api_key_here
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Connecting to MCP Servers

This UI connects to Model Context Protocol (MCP) servers to provide tool functionality to the Mistral model. The project supports multiple MCP servers simultaneously.

### Installing MCP Servers

The project includes scripts to easily install MCP servers:

#### AccuWeather Forecast Server
To install the AccuWeather MCP server:

**On Windows (PowerShell):**
```powershell
.\install-accuweather.ps1
```

**On macOS/Linux:**
```bash
# Make the script executable
chmod +x install-accuweather.sh
# Run the script
./install-accuweather.sh
```

This will:
1. Create a `mcp-servers` directory (ignored by Git)
2. Clone the AccuWeather MCP server into this directory
3. Set up the virtual environment and install dependencies
4. Configure the API key

The AccuWeather server provides detailed weather information including:
- Current weather conditions
- 12-hour hourly forecasts
- Precipitation probability and intensity

### Adding Your Own MCP Servers

You can connect to any MCP-compatible server by:
1. Installing the server in the `mcp-servers` directory
2. Updating your `mcp-config.json` file accordingly

See `CUSTOM_MCP_GUIDE.md` for detailed instructions on adding custom MCP servers.

## Features

- 🤖 Integration with Mistral AI models
- 🔌 Support for MCP tools (like weather information)
- 💬 Multi-session chat management
- 🎨 Modern UI built with Next.js and Shadcn
- 🌙 Light and dark mode support
- 🔧 Configurable settings