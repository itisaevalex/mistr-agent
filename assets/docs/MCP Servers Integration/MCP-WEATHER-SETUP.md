# MCP Weather Server Setup Guide

This guide will help you set up and troubleshoot the MCP Weather Server for your Mistral MCP Adapter.

## Diagnostic Steps

First, run the diagnostic script to check your environment:

```
diagnose-python.bat
```

This will help identify any issues with your Python installation or virtual environment.

## Setup Options

There are three ways to run the MCP weather server:

### Option 1: Use the Built-in TypeScript Weather Server (Simplest)

This uses the basic weather server included with the project:

```
npm run use:basic-weather
npm run dev
```

The configuration will be updated to use the built-in weather server, which provides simulated weather data.

### Option 2: Use the AccuWeather Server with Batch File

This uses a batch script to properly activate the virtual environment:

```
npm run use:batch-weather
npm run dev
```

The batch file handles activating the correct virtual environment and setting up the environment variables.

### Option 3: Manual Setup

If the above options don't work, try these manual steps:

1. Open a command prompt in the project directory
2. Navigate to the MCP weather directory:
   ```
   cd mcp-servers\mcp-weather
   ```
3. Ensure you have a .env file with your API key:
   ```
   echo ACCUWEATHER_API_KEY=6nIbRueZzybIBQOT7TMrCxDMrxQZkjMe > .env
   ```
4. Activate the virtual environment:
   - If using .venv: `.venv\Scripts\activate`
   - If using venv: `venv\Scripts\activate`
5. Run the server:
   ```
   python -m mcp_weather
   ```
6. In a new command prompt, start the UI:
   ```
   cd "C:\Users\Alex Isaev\Documents\mistral MCP adapter\ui"
   npm run dev
   ```

## Troubleshooting

If you encounter issues, try these troubleshooting steps:

1. **Module Not Found Error**:
   - Ensure you've activated the correct virtual environment
   - Verify the package is installed: `pip list | findstr mcp-weather`
   - If not installed, run: `pip install -e .`

2. **API Key Issues**:
   - Ensure the .env file exists in the mcp-weather directory
   - Verify the API key is correctly formatted

3. **Path Issues**:
   - Update the PYTHONPATH in mcp-config.json to use absolute paths:
     ```json
     "PYTHONPATH": "C:\\Users\\Alex Isaev\\Documents\\mistral MCP adapter\\ui\\mcp-servers\\mcp-weather"
     ```

4. **Virtual Environment Issues**:
   - If neither venv nor .venv works, create a new one:
     ```
     python -m venv new_venv
     new_venv\Scripts\activate
     pip install -e .
     ```
   - Then update run-weather-server.bat to use this new environment

5. **Fallback Option**:
   - If all else fails, use the built-in weather server:
     ```
     npm run use:basic-weather
     npm run dev
     ```

## Testing the MCP Server

To test if the MCP server works independently:

```
run-weather-server.bat
```

If this runs without errors, the server is working correctly. You can then start the UI in a separate command prompt:

```
npm run dev
```

## Using the Weather API

In the chat interface, you can ask the weather using:
- "What's the weather like in New York?"
- "Get hourly forecast for London"
- "What's the temperature in Tokyo?"
