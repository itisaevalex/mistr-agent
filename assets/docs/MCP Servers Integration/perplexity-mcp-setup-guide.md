# Perplexity MCP Server Setup and Testing Guide

This document provides comprehensive instructions for setting up and testing the Perplexity MCP (Model Context Protocol) server. It includes solutions to common issues and various testing methods.

## Overview

The Perplexity MCP server allows AI assistants like Claude to perform web searches using the Perplexity API. It implements the Model Context Protocol, enabling AI models to interact with external tools and services.

## Prerequisites

- Python 3.11 or higher
- UV package manager (optional, can use regular Python)
- A Perplexity API key (required)

## Installation and Setup

### Step 1: Clone or Download the Repository

The Perplexity MCP server code should be available in your MCP servers directory:

```
C:\Users\Alex Isaev\Documents\mistral MCP adapter\ui\mcp-servers\perplexity-mcp
```

### Step 2: Install the Package

Navigate to the server directory and install it in development mode:

```bash
cd "C:\Users\Alex Isaev\Documents\mistral MCP adapter\ui\mcp-servers\perplexity-mcp"
pip install -e .
```

This will install the package, but the executable script location might not be in your PATH. The installation will report where the script is installed, typically in a path like:
```
C:\Users\Alex Isaev\AppData\Roaming\Python\Python312\Scripts\perplexity-mcp.exe
```

### Step 3: Configure Environment Variables

The server requires two environment variables:

- `PERPLEXITY_API_KEY`: Your API key from Perplexity AI
- `PERPLEXITY_MODEL`: The model to use (defaults to "sonar" if not specified)

You can set these variables in several ways:

**Command Line (Temporary):**
```bash
set PERPLEXITY_API_KEY=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
set PERPLEXITY_MODEL=sonar
```

**Batch File (Recommended):**
Create a batch file called `launch_perplexity_mcp.bat` with the following content:

```batch
@echo off
set PERPLEXITY_API_KEY=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
set PERPLEXITY_MODEL=sonar

echo Starting Perplexity MCP server...
python -m perplexity_mcp.server
```

## Running the MCP Server

### Method 1: Using UV (Recommended)

After setting environment variables:
```bash
uvx perplexity-mcp
```

### Method 2: Using Python Module

After setting environment variables:
```bash
python -m perplexity_mcp.server
```

### Method 3: Using the Batch File

```bash
launch_perplexity_mcp.bat
```

**Note:** The server will appear to "hang" after starting. This is normal behavior as it's waiting for MCP protocol commands via stdin/stdout.

## Testing the MCP Server

We developed several methods to test the Perplexity MCP server:

### Method 1: Direct Python Testing

Create a file named `test_perplexity.py` with the following content:

```python
import asyncio
import os
import sys

# Add the src directory to the path so we can import the module
sys.path.append("C:\\Users\\Alex Isaev\\Documents\\mistral MCP adapter\\ui\\mcp-servers\\perplexity-mcp\\src")

# Import the server module
from perplexity_mcp.server import call_perplexity

async def test_perplexity_directly():
    # Set the required environment variables
    os.environ["PERPLEXITY_API_KEY"] = "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"
    os.environ["PERPLEXITY_MODEL"] = "sonar"
    
    # Test queries with different recency settings
    queries = [
        ("latest news about artificial intelligence", "day"),
        ("developments in quantum computing", "week")
    ]
    
    for query, recency in queries:
        print(f"Testing query: '{query}' with recency: '{recency}'")
        try:
            result = await call_perplexity(query, recency)
            print("-" * 50)
            print(f"Results for '{query}':")
            print(result)
            print("-" * 50)
            print("\n")
        except Exception as e:
            print(f"Error for query '{query}': {e}")
    
if __name__ == "__main__":
    asyncio.run(test_perplexity_directly())
```

Run the script:
```bash
python test_perplexity.py
```

### Method 2: Enhanced Testing with MCP Tools

For more comprehensive testing that also verifies the MCP interface functions, use this enhanced script named `corrected_test.py`:

```python
import asyncio
import os
import sys

# Add the src directory to the path so we can import the module
sys.path.append("C:\\Users\\Alex Isaev\\Documents\\mistral MCP adapter\\ui\\mcp-servers\\perplexity-mcp\\src")

# Import the server module
from perplexity_mcp.server import call_perplexity, list_tools, call_tool

async def test_perplexity_directly():
    # Set the required environment variables
    os.environ["PERPLEXITY_API_KEY"] = "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"
    os.environ["PERPLEXITY_MODEL"] = "sonar"
    
    # Test the list_tools handler
    print("Testing list_tools handler...")
    tools = await list_tools()
    for tool in tools:
        print(f"Tool: {tool.name}")
        print(f"Description: {tool.description}")
        print(f"Input Schema: {tool.inputSchema}")
        print("-" * 50)
    
    # Test queries with different recency settings
    queries = [
        ("What's happening in AI research this week?", "week"),
        ("Latest space exploration news", "month")
    ]
    
    for query, recency in queries:
        print(f"\nTesting query: '{query}' with recency: '{recency}'")
        
        # Test direct call to call_perplexity
        try:
            result = await call_perplexity(query, recency)
            print("-" * 50)
            print(f"Results for '{query}':")
            print(result)
            print("-" * 50)
        except Exception as e:
            print(f"Error for query '{query}': {e}")
        
        # Test the call_tool handler
        try:
            print("\nTesting call_tool handler...")
            tool_result = await call_tool("perplexity_search_web", {"query": query, "recency": recency})
            for content in tool_result:
                if hasattr(content, "text"):
                    print(f"Tool result: {content.text}")
        except Exception as e:
            print(f"Error calling tool: {e}")
    
if __name__ == "__main__":
    asyncio.run(test_perplexity_directly())
```

Run the script:
```bash
python corrected_test.py
```

### Method 3: Using the MCP Inspector

The MCP Inspector is a visual tool for testing MCP servers.

1. Create a batch file specifically for MCP Inspector testing called `launch_for_inspector.bat`:

```batch
@echo off
echo Setting up environment for Perplexity MCP server...
set PERPLEXITY_API_KEY=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
set PERPLEXITY_MODEL=sonar

echo Starting Perplexity MCP server...
python -m perplexity_mcp.server
```

2. Install and launch the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector
```

3. In the Inspector UI, configure the connection:
   - **Transport Type**: `stdio`
   - **Command**: The full path to your batch file, e.g.:
     ```
     C:\Users\Alex Isaev\Documents\mistral MCP adapter\ui\mcp-servers\perplexity-mcp\launch_for_inspector.bat
     ```
   - **Arguments**: Leave empty
   - **Environment Variables**: Leave empty (they're set in the batch file)

4. Click "Connect" and navigate to the "Tools" tab

5. Test the perplexity_search_web tool with example input:
```json
{
  "query": "latest AI news",
  "recency": "week"
}
```

### Method 4: Integration with Claude Desktop or Cursor

1. Edit the Claude Desktop config file:
```
%APPDATA%\Claude\claude_desktop_config.json
```

2. Add this configuration:
```json
"perplexity-mcp": {
  "env": {
    "PERPLEXITY_API_KEY": "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",
    "PERPLEXITY_MODEL": "sonar"
  },
  "command": "C:\\Users\\Alex Isaev\\Documents\\mistral MCP adapter\\ui\\mcp-servers\\perplexity-mcp\\launch_for_inspector.bat",
  "args": []
}
```

3. Restart Claude Desktop and test with prompts like:
   - "Search the web for recent AI developments"
   - "Find information about quantum computing from the past week"

## Troubleshooting Common Issues

### 1. Command Not Found Errors

**Issue:** `'perplexity-mcp' is not recognized as an internal or external command`

**Solution:** 
- Use the Python module approach instead: `python -m perplexity_mcp.server`
- Or add the Scripts directory to your PATH: 
  ```
  setx PATH "%PATH%;C:\Users\Alex Isaev\AppData\Roaming\Python\Python312\Scripts"
  ```

### 2. API Key Errors

**Issue:** `Error: PERPLEXITY_API_KEY environment variable is required`

**Solution:** Make sure to set the environment variable before starting the server.

### 3. MCP Inspector Connection Issues

**Issue:** `Error: spawn perplexity-mcp ENOENT`

**Solution:** 
- Use the full path to Python with the module name in the batch file
- Make sure environment variables are set correctly
- Use the batch file approach for launching the server

## Available Configuration Options

### Perplexity Models

You can specify different models by setting the `PERPLEXITY_MODEL` environment variable:

- `sonar-deep-research`: 128k context - Enhanced research capabilities
- `sonar-reasoning-pro`: 128k context - Advanced reasoning with professional focus
- `sonar-reasoning`: 128k context - Enhanced reasoning capabilities
- `sonar-pro`: 200k context - Professional grade model
- `sonar`: 128k context - Default model
- `r1-1776`: 128k context - Alternative architecture

### Search Recency Options

The tool accepts a `recency` parameter with these values:
- `day`: last 24 hours
- `week`: last 7 days
- `month`: last 30 days (default)
- `year`: last 365 days

## Conclusion

The Perplexity MCP server provides web search capabilities to AI assistants through the Model Context Protocol. With proper configuration and testing, it can be integrated into AI workflows to enhance their information retrieval capabilities.

This guide covers installation, configuration, running, and testing the server using various methods, as well as troubleshooting common issues that may arise during setup.
