import { NextRequest, NextResponse } from 'next/server';
import { McpAdapter } from '@/lib/mistral/mcp-adapter';
import { ToolManager } from '@/lib/mistral/tool-manager';
import { loadConfig } from '@/lib/mistral/config';
import { loadMcpConfig } from '@/lib/mistral/config/config-loader';

// Create a singleton adapter for capability information
let adapter: McpAdapter | null = null;

export async function GET() {
  try {
    // Initialize adapter if not already done
    if (!adapter) {
      const config = loadConfig();
      const toolManager = new ToolManager();
      const mcpConfig = loadMcpConfig('./mcp-config.json');
      
      adapter = new McpAdapter(config, toolManager, './mcp-config.json');
      
      // Wait for servers to connect
      try {
        await adapter.waitForConnection(undefined, 5000); // 5 second timeout
      } catch (error) {
        console.error('Timeout waiting for MCP servers to connect:', error);
        // Continue anyway to return partial information
      }
    }
    
    // Get all server capabilities
    const capabilities = adapter.getAllServerCapabilities();
    const serverManager = adapter.getServerManager();
    const serverInfo = serverManager.getServerInfo();
    
    return NextResponse.json({
      servers: serverInfo,
      capabilities
    });
  } catch (error) {
    console.error('Error in capabilities API:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve capabilities information' },
      { status: 500 }
    );
  }
}