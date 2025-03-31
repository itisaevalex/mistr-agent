// lib/mistral/conversation-store.ts
import { McpAdapter } from './mcp-adapter';
import { Message, ToolCall } from './mistral-client';

// Re-import or define AgentState here
type AgentState = 'idle' | 'thinking' | 'using_tool' | 'awaiting_confirmation';

// Define the structure for the original response that might contain tool calls
interface PendingResponse {
    toolCalls: ToolCall[];
    content: string | null;
}

// Define the structure for Conversation Data including state
interface ConversationData {
    id: string;
    adapter: McpAdapter;
    history: Message[];
    pendingResponse?: PendingResponse;
    state: AgentState;
    toolName?: string; // For 'using_tool' state
    pendingToolCalls?: ToolCall[]; // For 'awaiting_confirmation'
    lastUpdated: number;
}

// --- Use globalThis for persistence in development ---
// Augment the global object type (optional but good practice)
declare global {
    var conversationsStore: Map<string, ConversationData> | undefined;
}

// Initialize the store on globalThis if it doesn't exist
if (!globalThis.conversationsStore) {
    globalThis.conversationsStore = new Map<string, ConversationData>();
    console.log("[ConvStore] Initialized global conversation store.");
}

// Use the global store instance
const conversations = globalThis.conversationsStore;
// ----------------------------------------------------

/**
 * Retrieves an existing adapter instance for a conversation.
 * Returns undefined if the conversation or adapter doesn't exist.
 */
export function getAdapter(conversationId: string): McpAdapter | undefined {
    return conversations.get(conversationId)?.adapter;
}

/**
 * Retrieves the stored conversation history.
 */
export function getConversationHistory(conversationId: string): Message[] | undefined {
    return conversations.get(conversationId)?.history;
}

/**
 * Retrieves the pending response that triggered tool confirmation.
 */
export function getPendingResponse(conversationId: string): PendingResponse | undefined {
    return conversations.get(conversationId)?.pendingResponse;
}

/**
 * Retrieves the current state for a conversation.
 * Returns default 'idle' state if conversation doesn't exist.
 */
export function getConversationState(conversationId: string): ConversationData {
    const conversationData = conversations.get(conversationId);
    if (conversationData) {
        return conversationData;
    } else {
        // Return a default state if not found, but log it
        console.warn(`[ConvStore] Conversation ${conversationId} not found in store. Returning default state.`);
        return {
            id: conversationId,
            adapter: {} as McpAdapter, // Placeholder
            history: [],
            state: 'idle',
            lastUpdated: Date.now()
        };
    }
}

/**
 * Updates the stored conversation history.
 * Creates a copy to avoid mutation issues.
 */
export function updateConversationHistory(conversationId: string, history: Message[]): void {
    const conversation = conversations.get(conversationId);
    if (conversation) {
        conversation.history = [...history]; // Store a copy
        conversation.lastUpdated = Date.now();
    } else {
        console.warn(`[ConvStore] Attempted to update history for non-existent conversation: ${conversationId}`);
    }
}

/**
 * Stores the response that is awaiting confirmation.
 */
export function storePendingResponse(conversationId: string, response: PendingResponse): void {
    const conversation = conversations.get(conversationId);
    if (conversation) {
        conversation.pendingResponse = response;
        conversation.lastUpdated = Date.now();
        console.log(`[ConvStore] Stored pending response for ${conversationId}`, response);
    } else {
        console.warn(`[ConvStore] Attempted to store pending response for non-existent conversation: ${conversationId}`);
    }
}

/**
 * Clears the pending response after a decision is made.
 */
export function clearPendingResponse(conversationId: string): void {
    const conversation = conversations.get(conversationId);
    if (conversation) {
        conversation.pendingResponse = undefined;
        conversation.lastUpdated = Date.now();
        console.log(`[ConvStore] Cleared pending response for ${conversationId}`);
    } else {
         console.warn(`[ConvStore] Attempted to clear pending response for non-existent conversation: ${conversationId}`);
    }
}

/**
 * Updates the state for a specific conversation.
 */
export function updateConversationState(
    conversationId: string, 
    newState: AgentState,
    options?: { toolName?: string; toolCalls?: ToolCall[] }
): void {
    const conversation = conversations.get(conversationId);
    if (conversation) {
        conversation.state = newState;
        conversation.toolName = newState === 'using_tool' ? options?.toolName : undefined;
        conversation.pendingToolCalls = newState === 'awaiting_confirmation' ? options?.toolCalls : undefined;
        conversation.lastUpdated = Date.now();
        console.log(`[ConvStore] Updated state for ${conversationId}: ${newState}`, 
                    options?.toolName ? `Tool: ${options.toolName}` : '',
                    options?.toolCalls ? `Pending Calls: ${options.toolCalls.length}` : '');
    } else {
        console.warn(`[ConvStore] Attempted to update state for non-existent conversation: ${conversationId}`);
    }
}

/**
 * Retrieves an existing adapter or creates a new one using the provided factory function.
 * Also initializes or updates the conversation history and state in the store.
 */
export async function getOrCreateAdapter(
    conversationId: string,
    createFn: () => Promise<McpAdapter>
): Promise<McpAdapter> {
    let conversationData = conversations.get(conversationId);

    if (!conversationData) {
        console.log(`[ConvStore] Creating new adapter and state for ${conversationId}`);
        const adapter = await createFn();
        const initialHistory = adapter.getInternalHistory(conversationId) || [];
        conversationData = {
            id: conversationId,
            adapter: adapter,
            history: initialHistory,
            state: 'idle', // Initial state
            lastUpdated: Date.now()
        };
        conversations.set(conversationId, conversationData);
    } else {
        console.log(`[ConvStore] Using existing adapter for ${conversationId}`);
        // Ensure history in store is updated from adapter (optional sync)
        // const currentHistory = conversationData.adapter.getInternalHistory(conversationId);
        // if (currentHistory) {
        //     conversationData.history = [...currentHistory]; 
        // }
    }

    return conversationData.adapter;
}

/**
 * Removes a conversation and its adapter/state from the store.
 */
export function removeConversation(conversationId: string): boolean {
    console.log(`[ConvStore] Removing conversation ${conversationId}`);
    return conversations.delete(conversationId);
}

// Optional: Add functions to clear old conversations periodically if needed
