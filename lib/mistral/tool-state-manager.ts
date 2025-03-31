/**
 * Direct tool state manager for tracking tool usage
 */

import { ToolCall } from './mistral-client'; // Import the exported ToolCall
import { updateConversationState } from './conversation-store'; // Import the store function

// Define the possible states of the agent
type AgentState = 'idle' | 'thinking' | 'using_tool' | 'awaiting_confirmation';

// Define the structure for pending tool calls (align with MistralToolCall or similar)
type PendingToolCall = ToolCall; // Use the imported ToolCall type

// Singleton for tracking active tool usage with server connectivity
export class ToolStateManager { // Add export keyword
  private static instance: ToolStateManager;
  // Remove local state tracking as it's now in conversation-store
  // private activeTool: string | null = null;
  // private conversationId: string | null = null;
  private debugMode: boolean = true;
  
  private constructor() {}
  
  public static getInstance(): ToolStateManager {
    if (!ToolStateManager.instance) {
      ToolStateManager.instance = new ToolStateManager();
    }
    return ToolStateManager.instance;
  }
  
  // Enable debug mode
  public enableDebug() {
    this.debugMode = true;
  }
  
  // Debug log
  private debugLog(...args: any[]) {
    if (this.debugMode) {
      console.log('[ToolStateManager]', ...args);
    }
  }
  
  // Track when a tool starts being used
  public startToolUsage(conversationId: string, toolName: string) {
    // Update state directly via conversation store
    updateConversationState(conversationId, 'using_tool', { toolName });
    this.debugLog(`State set to using_tool for conversation ${conversationId} (Tool: ${toolName})`);
  }

  // Track when a tool finishes
  public endToolUsage(conversationId: string) {
    // Assume thinking after tool use unless set otherwise
    updateConversationState(conversationId, 'thinking'); 
    this.debugLog(`State set to thinking after tool usage for conversation ${conversationId}`);
  }
  
  // Set thinking state
  public setThinking(conversationId: string) {
      updateConversationState(conversationId, 'thinking');
      this.debugLog(`State set to thinking for conversation ${conversationId}`);
  }
  
  // Set idle state
  public setIdle(conversationId: string) {
      updateConversationState(conversationId, 'idle');
      this.debugLog(`State set to idle for conversation ${conversationId}`);
  }

  // Set awaiting confirmation state
  public setAwaitingConfirmation(conversationId: string, toolCalls: ToolCall[]) {
    updateConversationState(conversationId, 'awaiting_confirmation', { toolCalls });
    this.debugLog(`State set to awaiting_confirmation for conversation ${conversationId}`, toolCalls);
  }

  // Get current tool being used
  public getActiveTool(conversationId: string): string | null {
    // Implement logic to retrieve active tool from conversation-store
    // For demonstration purposes, assume a function getActiveToolFromStore
    // const activeTool = getActiveToolFromStore(conversationId);
    // return activeTool;
    throw new Error('Method not implemented.');
  }
  
  // Get conversation ID
  public getConversationId(): string | null {
    // Implement logic to retrieve conversation ID from conversation-store
    // For demonstration purposes, assume a function getConversationIdFromStore
    // const conversationId = getConversationIdFromStore();
    // return conversationId;
    throw new Error('Method not implemented.');
  }
}

// Export singleton instance
export const toolStateManager = ToolStateManager.getInstance();
