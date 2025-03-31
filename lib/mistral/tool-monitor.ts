/**
 * Direct tool monitoring module
 * 
 * This provides a more direct way to monitor tool calls since 
 * our monkey-patching approach wasn't working correctly.
 */

// Singleton for tracking active tool usage
class ToolMonitor {
  private static instance: ToolMonitor;
  private activeTool: string | null = null;
  private conversationId: string | null = null;
  
  private constructor() {}
  
  public static getInstance(): ToolMonitor {
    if (!ToolMonitor.instance) {
      ToolMonitor.instance = new ToolMonitor();
    }
    return ToolMonitor.instance;
  }
  
  // Track when a tool starts being used
  public startToolUsage(conversationId: string, toolName: string) {
    console.log(`📊 Tool monitor: Starting tool ${toolName} for conversation ${conversationId}`);
    this.activeTool = toolName;
    this.conversationId = conversationId;
    this.updateStateAPI(conversationId, 'using_tool', toolName);
  }
  
  // Track when a tool finishes
  public endToolUsage() {
    if (this.conversationId) {
      console.log(`📊 Tool monitor: Ending tool ${this.activeTool} for conversation ${this.conversationId}`);
      this.updateStateAPI(this.conversationId, 'thinking');
      this.activeTool = null;
    }
  }
  
  // Set thinking state
  public setThinking(conversationId: string) {
    console.log(`📊 Tool monitor: Thinking for conversation ${conversationId}`);
    this.updateStateAPI(conversationId, 'thinking');
  }
  
  // Set idle state
  public setIdle(conversationId: string) {
    console.log(`📊 Tool monitor: Idle for conversation ${conversationId}`);
    this.updateStateAPI(conversationId, 'idle');
  }
  
  // Get current tool being used
  public getActiveTool(): string | null {
    return this.activeTool;
  }
  
  // Get conversation ID
  public getConversationId(): string | null {
    return this.conversationId;
  }
  
  // Update state API
  private async updateStateAPI(
    conversationId: string, 
    state: 'idle' | 'thinking' | 'using_tool',
    toolName?: string
  ) {
    try {
      // Only run in browser environment
      if (typeof window === 'undefined' || typeof fetch === 'undefined') {
        return;
      }
      
      // Update the state API
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId, 
          state,
          toolName: state === 'using_tool' ? toolName : undefined
        })
      });
    } catch (error) {
      console.error('Failed to update chatbot state:', error);
    }
  }
}

// Export singleton instance
export const toolMonitor = ToolMonitor.getInstance();
