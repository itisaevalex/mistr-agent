# MCP Weather Server Guide

This guide provides multiple methods to run the MCP Weather Server separately from the client.

## Option 1: Try All Methods Automatically

The simplest approach is to run the script that tries all possible methods:

```bash
try-all-mcp-methods.bat
```

This script will attempt multiple methods to run the server and use the first one that works.

## Option 2: Run the Python Script Directly

You can run the Python script that directly imports and runs the server:

```bash
python run-fastmcp-server.py
```

This script adds the necessary paths and runs the FastMCP server with proper arguments.

## Option 3: Run with uvicorn

If you know uvicorn is installed in your virtual environment:

```bash
cd "mcp-servers\mcp-weather"
.venv\Scripts\activate
uvicorn mcp_weather.weather:mcp --host 0.0.0.0 --port 8080
```

## Option 4: Use the Built-in Weather Server

If all else fails, use the built-in TypeScript weather server:

```bash
npm run start:weather
```

Then configure the client to use this server with:

```bash
npm run use:basic-weather
```

## Configuring the Client for an External Server

Once you have a server running, configure the client to use the SSE connection mode:

```bash
npm run use:sse
```

Then in a separate terminal:

```bash
npm run dev
```

## Troubleshooting

If you're having issues:

1. Check if Python can find the module:
   ```
   python inspect-fastmcp.py
   ```

2. Look for the entry point script in your virtual environment:
   ```
   dir "mcp-servers\mcp-weather\.venv\Scripts" /b | findstr mcp
   ```

3. Ensure the API key is set in the .env file:
   ```
   echo ACCUWEATHER_API_KEY=6nIbRueZzybIBQOT7TMrCxDMrxQZkjMe > "mcp-servers\mcp-weather\.env"
   ```
