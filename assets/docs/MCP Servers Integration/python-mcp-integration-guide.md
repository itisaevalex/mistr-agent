# Python MCP Server Integration Guide

This comprehensive guide documents how to integrate custom Python-based Model Context Protocol (MCP) servers with MCP clients like the Mistral MCP client. It covers setup, configuration, troubleshooting, and best practices based on our experience with the Perplexity MCP server.

## Overview

The Model Context Protocol (MCP) allows AI assistants to access external tools and services. This guide focuses on running Python-based MCP servers (specifically the Perplexity MCP server) with custom MCP clients.

## Prerequisites

- A Python-based MCP server (e.g., Perplexity MCP)
- A custom MCP client (e.g., Mistral MCP client)
- Python 3.11 or higher
- Node.js and npm (for the client UI)
- Optional: UV package manager for Python

## Setting Up a Python MCP Server

### Step 1: Install the MCP Server

For the Perplexity MCP server:

```bash
cd "path\to\perplexity-mcp"
pip install -e .
```

This will install the package in development mode, making it available to Python.

### Step 2: Configure Environment Variables

The Perplexity MCP server requires:
- `PERPLEXITY_API_KEY`: Your Perplexity API key
- `PERPLEXITY_MODEL`: The model to use (defaults to "sonar")

## Client-Server Integration Approaches

We discovered three effective approaches to integrate a Python MCP server with a custom client:

### Approach 1: Direct UVX (Recommended)

This approach directly calls the UV package manager to execute the MCP server with the proper environment and working directory.

**MCP Configuration (mcp-config-direct-uvx.json):**
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

**Key components:**
- `command`: The UV executable (`uvx`)
- `args`: The MCP server package name 
- `env`: Environment variables
- `cwd`: Working directory where the MCP server is installed

**Launch script (start-with-perplexity-direct-uvx.bat):**
```batch
@echo off
echo Starting MCP client with Perplexity MCP server (direct UVX)...

echo Copying direct UVX Perplexity MCP configuration
copy mcp-config-direct-uvx.json mcp-config.json

echo Starting the UI
npm run dev
```

### Approach 2: UVX Batch Script

This approach uses a batch script to set up the environment and call UVX.

**Batch script (uvx_launch.bat):**
```batch
@echo off
echo Setting up environment for Perplexity MCP server...

REM Set the required environment variables
set PERPLEXITY_API_KEY=your-api-key
set PERPLEXITY_MODEL=sonar

echo Using API Key: %PERPLEXITY_API_KEY:~0,8%***
echo Using Model: %PERPLEXITY_MODEL%

echo Starting Perplexity MCP server with UVX...
cd "path\to\perplexity-mcp"
uvx perplexity-mcp
```

**MCP Configuration (mcp-config-uvx.json):**
```json
{
  "servers": {
    "perplexity-mcp-uvx": {
      "type": "stdio",
      "name": "PerplexityWebSearch",
      "command": "path\\to\\uvx_launch.bat",
      "args": [],
      "description": "Web search using Perplexity MCP (UVX)"
    }
  },
  "defaultServer": "perplexity-mcp-uvx"
}
```

### Approach 3: Python Path Environment

This approach explicitly sets the Python path to include the MCP server module.

**Batch script (env_activated_launch.bat):**
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

**MCP Configuration:**
```json
{
  "servers": {
    "perplexity-mcp-python": {
      "type": "stdio",
      "name": "PerplexityWebSearch",
      "command": "path\\to\\env_activated_launch.bat",
      "args": [],
      "env": {
        "PERPLEXITY_API_KEY": "your-api-key",
        "PERPLEXITY_MODEL": "sonar"
      },
      "description": "Web search using Python Perplexity MCP"
    }
  },
  "defaultServer": "perplexity-mcp-python"
}
```

## Common Issues and Solutions

### 1. Module Not Found Error

**Issue:** `ModuleNotFoundError: No module named 'perplexity_mcp'`

**Solutions:**
- Use the Direct UVX approach which ensures the correct Python environment is used
- Add the source directory to PYTHONPATH: `set PYTHONPATH=%PYTHONPATH%;path\to\perplexity-mcp\src`
- Use a Python command that explicitly adds the path: `python -c "import sys; sys.path.append('path'); from module import func; func()"`

### 2. Command Not Found Error

**Issue:** `'perplexity-mcp' is not recognized as an internal or external command`

**Solutions:**
- Use the full path to the executable
- Use UVX or Python to run the module directly
- Set the correct working directory with the `cwd` parameter

### 3. Connection Closed Error

**Issue:** `McpError: MCP error -32000: Connection closed`

**Solutions:**
- Ensure environment variables are correctly set
- Use a batch file to properly initialize the environment
- Check that the MCP server is properly installed and can be run independently

### 4. Communication Protocol Issues

**Issue:** Client and server cannot communicate properly

**Solution:**
- Use `stdio` as the transport type for Python MCP servers
- Make sure the `command` and `args` properly start the MCP server
- Check that the server uses the standard MCP protocol format

## Testing Your Integration

You can test your Python MCP server integration in several ways:

### 1. Direct Console Test

```bash
cd "path\to\perplexity-mcp"
set PERPLEXITY_API_KEY=your-api-key
uvx perplexity-mcp
```

If it starts without errors and waits for input, the server is running correctly.

### 2. Using the MCP Inspector

Install and run the MCP Inspector to test the server:
```bash
npx @modelcontextprotocol/inspector
```

Configure it to use your batch script or direct command.

### 3. Python Testing Script

Create a Python script that directly calls the MCP server functions:

```python
import asyncio
import os
import sys

# Add the source directory to the path
sys.path.append("path\\to\\perplexity-mcp\\src")

# Import the server module
from perplexity_mcp.server import call_perplexity

async def test_perplexity_directly():
    # Set environment variables
    os.environ["PERPLEXITY_API_KEY"] = "your-api-key"
    os.environ["PERPLEXITY_MODEL"] = "sonar"
    
    # Test query
    result = await call_perplexity("test query", "week")
    print(result)
    
if __name__ == "__main__":
    asyncio.run(test_perplexity_directly())
```

## Best Practices

1. **Use Direct UVX Approach**: For Python MCP servers installed with UV, the direct UVX approach is most reliable.

2. **Set Working Directory**: Always set the correct working directory (`cwd`) to ensure the server can find its dependencies.

3. **Environment Variables**: Set environment variables in both the configuration and any batch files to ensure they're available.

4. **Use Absolute Paths**: Always use absolute paths in configuration files to avoid path resolution issues.

5. **Test Independently**: Always test your MCP server independently before integrating it with the client.

6. **Progressive Testing**: Start with simple direct tests and then move to more complex integration tests.

## Advanced Configuration

### Multiple MCP Servers

You can configure multiple MCP servers in your configuration:

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

### Model Configuration

For Perplexity MCP, you can specify different models:

- `sonar`: Default model with 128k context
- `sonar-pro`: Professional grade model with 200k context
- `sonar-deep-research`: Enhanced research capabilities
- `sonar-reasoning`: Enhanced reasoning capabilities
- `sonar-reasoning-pro`: Advanced reasoning with professional focus
- `r1-1776`: Alternative architecture

## Conclusion

Integrating Python-based MCP servers with custom clients requires careful attention to environment setup, path configuration, and communication protocol. The Direct UVX approach is the most reliable for Python MCP servers installed with UV, as it ensures the correct Python environment and dependencies are available.

By following the approaches and best practices outlined in this guide, you can successfully integrate any Python-based MCP server with custom MCP clients like the Mistral MCP client.
