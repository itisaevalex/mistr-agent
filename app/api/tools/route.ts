import { NextRequest, NextResponse } from 'next/server';
// Import necessary functions/classes to get adapter and tools
import { getOrCreateAdapter } from '../../../lib/mistral/conversation-store'; // Adjust path
import { McpAdapter } from '../../../lib/mistral/mcp-adapter'; // Adjust path
import { ToolManager } from '../../../lib/mistral/tool-manager'; // Adjust path
import { loadConfig } from '../../../lib/mistral/config'; // Adjust path
import { toolStateManager } from '../../../lib/mistral/tool-state-manager'; // Adjust path
import * as path from 'path';

// --- Define the expected structure for the frontend ---
interface ToolSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
}
interface FrontendToolInfo {
  id: string; // Use name or unique identifier
  name: string;
  description: string;
  server: string;
  schema: ToolSchema;
}
// ---

// Helper function to create adapter instance (similar to messages route)
// NOTE: Using a fixed ID here. Consider implications for multi-user or long-running scenarios.
const ADAPTER_INSTANCE_ID = "shared-tools-adapter";
async function getToolsAdapterInstance(): Promise<McpAdapter> {
    return getOrCreateAdapter(ADAPTER_INSTANCE_ID, async () => {
        console.log(`[Tools API] Creating/Getting adapter instance: ${ADAPTER_INSTANCE_ID}`);
        const config = loadConfig();
        const toolManager = new ToolManager();
        const mcpConfigPath = path.join(process.cwd(), 'mcp-config.json');
        // Ensure all arguments are passed correctly as per McpAdapter constructor
        const adapter = new McpAdapter(config, toolManager, toolStateManager, mcpConfigPath);
        // Wait longer here for all servers to potentially connect
        try {
             console.log(`[Tools API] Waiting for adapter connection (max 15s)...`);
             // Wait for connection which includes initial server discovery attempt
             await adapter.waitForConnection(undefined, 15000);
             console.log(`[Tools API] Adapter connection wait finished.`);
        } catch (connectionError) {
            // Log error but continue, getAvailableTools might still return something
            console.warn(`[Tools API] Adapter connection timeout/error:`, connectionError);
        }
        return adapter;
    });
}


// Endpoint to get available tools
export async function GET(request: NextRequest) {
  console.log("[Tools API] Received GET request");
  try {
    const adapter = await getToolsAdapterInstance();

    // --- Ensure Initialization is Complete (Optional but Recommended) ---
    // Add a short extra delay *after* getting the instance, allowing async
    // tool registration within the adapter to potentially complete.
    // waitForConnection helps, but registration might lag slightly.
    // await new Promise(resolve => setTimeout(resolve, 1000)); // e.g., wait 1 sec
    // A better approach would be an explicit readiness flag/method in McpAdapter if possible.
    // For now, rely on the waitForConnection in getToolsAdapterInstance.
    // ---

    console.log("[Tools API] Getting available tools from adapter...");
    const availableToolsData = adapter.getAvailableTools(); // Gets Record<string, any[]>
    console.log("[Tools API] Raw tools data from adapter:", availableToolsData);

    // --- Transform data for the frontend ---
    const frontendTools: FrontendToolInfo[] = [];
    for (const [serverId, serverTools] of Object.entries(availableToolsData)) {
        // Ensure serverTools is an array before iterating
        if (Array.isArray(serverTools)) {
            serverTools.forEach((tool: any) => {
                 // Basic validation/check if tool has expected properties
                 if (tool && typeof tool.name === 'string' && typeof tool.description === 'string') {
                     frontendTools.push({
                         // Create a unique ID - using name for now, might need improvement if names clash
                         id: tool.id || `${serverId}-${tool.name}`, // Use provided ID or generate one
                         name: tool.name,
                         description: tool.description,
                         server: serverId,
                         // Map the schema structure if needed, assuming it's compatible
                         schema: {
                             type: tool.inputSchema?.type ?? 'object',
                             properties: tool.inputSchema?.properties ?? {},
                             required: tool.inputSchema?.required ?? []
                         }
                     });
                 } else {
                      console.warn(`[Tools API] Skipping invalid tool format from server ${serverId}:`, tool);
                 }
            });
        } else {
             console.warn(`[Tools API] Expected an array of tools for server ${serverId}, but got:`, serverTools);
        }
    }
    console.log(`[Tools API] Processed ${frontendTools.length} tools for frontend.`);
    // --- End Transformation ---

    return NextResponse.json({ tools: frontendTools });

  } catch (error: any) {
    console.error('[Tools API] Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools', details: error.message },
      { status: 500 }
    );
  }
}