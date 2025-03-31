import { NextRequest, NextResponse } from 'next/server';
import {
    getAdapter,
    getPendingResponse,
    clearPendingResponse,
    getConversationState,
    getConversationHistory,
    updateConversationState 
} from '../../../lib/mistral/conversation-store';
import { toolStateManager } from '../../../lib/mistral/tool-state-manager';
import { ToolCall, Message } from '../../../lib/mistral/mistral-client'; 

export async function POST(request: NextRequest) {
    let finalAssistantMessage: Message | null = null; 
    let conversationId: string | null = null; // Define conversationId here to use in catch block
    try {

        const body = await request.json();
        conversationId = body.conversationId; // Assign conversationId
        const decision = body.decision;

        if (!conversationId || !decision || (decision !== 'allow' && decision !== 'deny')) {
            return NextResponse.json(
                { error: 'Conversation ID and decision (allow/deny) are required' },
                { status: 400 }
            );
        }

        console.log(`[ToolDecision] Received decision: ${decision} for conversation ${conversationId}`);

        const currentState = getConversationState(conversationId);
        console.log(`[ToolDecision] Current state from store for ${conversationId}:`, currentState);

        // It's crucial the state is 'awaiting_confirmation' before proceeding.
        if (currentState.state !== 'awaiting_confirmation') {
            console.error(`[ToolDecision] Error: Expected state 'awaiting_confirmation' but got '${currentState.state}' for ${conversationId}`);
            // If state is wrong, maybe clear pending data if it exists?
             if (getPendingResponse(conversationId)) {
                 clearPendingResponse(conversationId);
                 console.warn(`[ToolDecision] Cleared potentially stale pending response for ${conversationId} due to incorrect state.`);
             }
            return NextResponse.json(
                { error: `Invalid state: Expected awaiting_confirmation, got ${currentState.state}` },
                { status: 400 }
            );
        }

        const adapter = getAdapter(conversationId);
        const pendingResponseData = getPendingResponse(conversationId); 

        // --- Data Validation ---
        if (!adapter) {
            console.error(`[ToolDecision] Error: Adapter not found for ${conversationId}`);
            return NextResponse.json({ error: 'Adapter not found' }, { status: 404 });
        }

        // Use pendingResponseData to check for tool calls, not currentState
        if (!pendingResponseData || !pendingResponseData.toolCalls || pendingResponseData.toolCalls.length === 0) {
            console.error(`[ToolDecision] Error: No pending tool calls found in pendingResponseData for ${conversationId}, despite state being ${currentState.state}`);
            clearPendingResponse(conversationId); // Clear inconsistent pending data
            updateConversationState(conversationId, 'idle'); // Reset state
            return NextResponse.json({ error: 'Internal state inconsistency: No pending tool calls found' }, { status: 500 });
        }

        let conversationHistory = getConversationHistory(conversationId);
        if (!conversationHistory) {
            console.error(`[ToolDecision] Error: Conversation history not found for ${conversationId}`);
            if (decision === 'allow') {
                return NextResponse.json({ error: 'Cannot process allowed tools without history' }, { status: 500 });
            }
            conversationHistory = []; 
        } else {
             if (decision === 'deny') {
                 conversationHistory = [...conversationHistory]; 
             }
        }

        // --- Process Decision ---
        // Clear the pending response data now that we're handling the decision
        clearPendingResponse(conversationId);
        let adapterResponse: any | null = null; // Use 'any' or a more specific ResponseFormat type

        if (decision === 'allow') {
            console.log(`[ToolDecision] User allowed tool calls for ${conversationId}. Processing...`);

            const toolCallsToExecute = pendingResponseData.toolCalls;
             const currentHistory = conversationHistory || []; // Ensure history is an array

            // --- FIX START: Set state to 'using_tool' ---
            const toolName = toolCallsToExecute[0]?.function?.name ?? 'unknown tool'; // Get first tool name
            console.log(`[ToolDecision] Updating state to using_tool (${toolName}) for ${conversationId}`);
            updateConversationState(conversationId, 'using_tool', { toolName: toolName });
            // --- FIX END ---

            // Now process the tool calls
            adapterResponse = await adapter.processToolCalls(
                conversationId,
                pendingResponseData, // Pass the original pending response
                currentHistory      // Pass the current history
            );
            console.log(`[ToolDecision] Finished processing allowed tool calls for ${conversationId}. Adapter response received.`);
            // Note: processToolCalls should ideally handle setting the state back to 'thinking' or 'idle' internally upon completion.
            // If it doesn't, you might need to add: updateConversationState(conversationId, 'idle'); here.


        } else { // decision === 'deny'
            console.log(`[ToolDecision] User denied tool calls for ${conversationId}. Continuing conversation.`);

             // Set state back to idle immediately after denial
             updateConversationState(conversationId, 'idle');

            // Append a message indicating denial *before* calling continueConversation
            const denialMessage: Message = {
                 role: 'user', // Or perhaps 'system'? Check what continueConversation expects
                 content: "(User has denied the request to use tools. Please respond accordingly without using the tool.)"
            };
             const historyWithDenial = [...(conversationHistory || []), denialMessage];

            adapterResponse = await adapter.continueConversation(
                conversationId,
                historyWithDenial
            );
            console.log(`[ToolDecision] Finished processing denied tool call for ${conversationId}. Adapter response received.`);
            // State should already be idle here.
        }

        // --- Format Final Response ---
        // Standardize response handling
         if (adapterResponse && typeof adapterResponse.content === 'string') {
             finalAssistantMessage = {
                 role: 'assistant',
                 content: adapterResponse.content,
                 // Include tool calls if the adapter might return them even after processing/denial
                 tool_calls: adapterResponse.toolCalls ?? undefined
             };
         } else {
             // Handle unexpected or null/empty responses
             console.warn("[ToolDecision] No valid content in adapter response:", adapterResponse);
              finalAssistantMessage = {
                  role: 'assistant',
                  content: decision === 'allow' ? "(Tool executed, but no response content received)" : "(Tool use denied)"
              };
         }

        // Return only the content part for the frontend message update
        return NextResponse.json({ content: finalAssistantMessage.content });

    } catch (error: any) {
        console.error('[ToolDecision] Error processing tool decision:', error);
         // Attempt to reset state to idle if conversationId is available
         if (conversationId) {
             try {
                 updateConversationState(conversationId, 'idle');
                 console.log(`[ToolDecision] Reset state to idle after error for ${conversationId}.`);
             } catch (resetError) {
                 console.error(`[ToolDecision] Failed to reset state after error for ${conversationId}:`, resetError);
             }
         }
        const responseBody = {
            error: 'Failed to process tool decision',
            details: error.message
        };
        // Avoid sending potentially large objects back in error details
        return NextResponse.json(responseBody, { status: 500 });
    }
}
