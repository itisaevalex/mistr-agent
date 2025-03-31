import { NextRequest, NextResponse } from 'next/server';
import { McpAdapter } from '../../../../../lib/mistral/mcp-adapter';
import { ToolManager } from '../../../../../lib/mistral/tool-manager';
import { loadConfig } from '../../../../../lib/mistral/config';
// import { createSecurityManager } from '../../../../../lib/mistral/utils/security-utils'; // Security manager is handled within getOrCreateConversationAdapter
import { toolStateManager } from '../../../../../lib/mistral/tool-state-manager';
// import { installMcpAdapterHooks } from '../../../../../lib/mistral/mcp-adapter-hooks'; // Hooks likely installed elsewhere or within adapter setup
import {
    // conversations, // Store managed via functions
    getOrCreateAdapter,
    storePendingResponse,
    getConversationHistory,
    updateConversationHistory,
    updateConversationState
} from '../../../../../lib/mistral/conversation-store';
import * as path from 'path';

// Initialize the MCP adapter if it doesn't exist for this conversation
async function getOrCreateConversationAdapter(conversationId: string) {
    return getOrCreateAdapter(conversationId, async () => {
        const config = loadConfig();
        const toolManager = new ToolManager();

        // Path to the MCP configuration file
        const mcpConfigPath = path.join(process.cwd(), 'mcp-config.json');

        try {
            // Create MCP adapter with all required arguments in the correct order
            // Assuming ToolStateManager is correctly passed here
            const mcpAdapter = new McpAdapter(config, toolManager, toolStateManager, mcpConfigPath);

            // Set a shorter timeout for the wait to prevent hanging indefinitely
            try {
                await mcpAdapter.waitForConnection(undefined, 5000);
            } catch (connectionError) {
                console.warn(`[${conversationId}] MCP connection timeout/error during init:`, connectionError);
                // Continue anyway - the adapter will attempt to connect when needed
            }

            // IMPORTANT: Configure security to auto-approve in the backend
            // This prevents timeouts when security dialogs aren't shown in the UI
            try {
                // Access the security manager to add custom policies
                const adapterSecurityManager = mcpAdapter.getSecurityManager();

                // Register specific tools for auto-approval (example)
                adapterSecurityManager.registerToolPolicy('perplexity_search_web', {
                    requiresApproval: false, // Auto-approve in the backend
                    maxCallsPerMinute: 60
                });

                // Auto-approve all other tools in the backend to prevent timeouts
                adapterSecurityManager.registerToolPolicy('*', {
                    requiresApproval: false,
                    maxCallsPerMinute: 60
                });

                console.log(`[${conversationId}] Security manager configured for backend auto-approval.`);

                // Hooks installation might happen here if needed, or within adapter constructor
                // installMcpAdapterHooks(mcpAdapter); // Example

                return mcpAdapter; // Return the successfully created adapter
            } catch (secError) {
                 console.error(`[${conversationId}] Failed configure security manager:`, secError);
                 throw new Error('Failed to configure MCP adapter security.');
            }
        } catch (adapterError) {
            console.error(`[${conversationId}] Failed to create MCP adapter:`, adapterError);
            throw new Error('Failed to initialize MCP adapter.');
        }
    });
}

// Handle POST requests to send messages
export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
    const { conversationId } = params;
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const userMessageContent = body.message;
    // Default to false if not provided
    const autoApprove = typeof body.autoApprove === 'boolean' ? body.autoApprove : false;

    if (!userMessageContent) {
        return NextResponse.json({ error: 'Missing message content' }, { status: 400 });
    }

    try {
        console.log(`[${conversationId}] Getting adapter for new message (autoApprove: ${autoApprove})...`);
        const adapter = await getOrCreateConversationAdapter(conversationId);

        // Add the user message to the history *before* sending to the adapter
        const currentHistory = getConversationHistory(conversationId) || []; // Get current history or start fresh
        const userMessage = { role: 'user' as const, content: userMessageContent };
        // It's crucial to update the history *before* calling sendMessage if sendMessage modifies it internally
        updateConversationHistory(conversationId, [...currentHistory, userMessage]);

        console.log(`[${conversationId}] Sending message to adapter...`);
        // Pass autoApprove flag
        const response = await adapter.sendMessage(conversationId, userMessageContent, autoApprove);

        // Check if the response requires user confirmation for tool calls
        if (response.state === 'awaiting_confirmation') {
            console.log(`[${conversationId}] Tool call requires confirmation.`);

            // Store the pending response details (tool calls and original assistant message content if any)
            if (response.toolCalls) {
                 // Assuming storePendingResponse handles storing the necessary details from the response
                 storePendingResponse(conversationId, { toolCalls: response.toolCalls, content: response.content });
                 // Update conversation state to awaiting_confirmation
                 console.log(`[${conversationId}] Updating conversation state to awaiting_confirmation.`);
                 updateConversationState(conversationId, 'awaiting_confirmation', { toolCalls: response.toolCalls });
           } else {
                console.warn(`[${conversationId}] State is awaiting_confirmation but no toolCalls found in response.`);
                // Handle this case - maybe return an error or proceed as if no confirmation needed?
                return NextResponse.json({ error: 'Inconsistent state: awaiting_confirmation without toolCalls' }, { status: 500 });
            }

            // Return a specific response to the frontend
            return NextResponse.json({
                state: 'awaiting_confirmation',
                toolCalls: response.toolCalls // Send tool calls to UI for display
            });
        } else {
            console.log(`[${conversationId}] Received direct response from adapter (State: ${response.state || 'N/A'}).`);
            // If no confirmation needed (either autoApproved or no tools called),
            // the adapter handles adding the final assistant message to history internally or via conversation-store.
            // We just return the final content.
            return NextResponse.json({
                content: response.content,
                // Determine the state based on the response; could be 'idle' if finished,
                // or potentially another state if the adapter indicates it. Defaulting to 'idle'.
                state: 'idle'
            });
        }

    } catch (error: any) {
        console.error(`[${conversationId}] Error processing message:`, error);
        // Attempt to reset state to idle, catching potential errors
        try {
            // Ensure toolStateManager is defined and has setIdle method
             if (toolStateManager && typeof toolStateManager.setIdle === 'function') {
                await toolStateManager.setIdle(conversationId);
                console.log(`[${conversationId}] State reset to idle after error.`);
             } else {
                 console.warn(`[${conversationId}] toolStateManager or setIdle method not available for error state reset.`);
             }
        } catch (stateError) {
            console.error(`[${conversationId}] Failed to reset state to idle after error:`, stateError);
        }
        // Return the original error message
        return NextResponse.json(
            { error: `Failed to process message: ${error.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}