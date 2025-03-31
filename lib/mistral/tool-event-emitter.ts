/**
 * Tool event emitter for broadcasting tool usage events
 */

import { EventEmitter } from 'events';

// Define event types for TypeScript
export interface ToolEvent {
  conversationId: string;
  toolName: string;
  timestamp: number;
  args?: any;
}

export interface ToolStartEvent extends ToolEvent {
  eventType: 'start';
}

export interface ToolCompleteEvent extends ToolEvent {
  eventType: 'complete';
  result?: any;
}

export interface ToolErrorEvent extends ToolEvent {
  eventType: 'error';
  error: string;
}

export type AnyToolEvent = ToolStartEvent | ToolCompleteEvent | ToolErrorEvent;

// Centralized event emitter
class ToolEventEmitter extends EventEmitter {
  private static instance: ToolEventEmitter;
  
  private constructor() {
    super();
    
    // Set a higher maximum listener count as we may have multiple components listening
    this.setMaxListeners(20);
  }
  
  public static getInstance(): ToolEventEmitter {
    if (!ToolEventEmitter.instance) {
      ToolEventEmitter.instance = new ToolEventEmitter();
    }
    return ToolEventEmitter.instance;
  }
  
  // Event emitters
  public emitToolStart(event: Omit<ToolStartEvent, 'eventType'>) {
    this.emit('tool:start', { ...event, eventType: 'start' });
    this.updateChatbotState(event.conversationId, 'using_tool', event.toolName);
  }
  
  public emitToolComplete(event: Omit<ToolCompleteEvent, 'eventType'>) {
    this.emit('tool:complete', { ...event, eventType: 'complete' });
    this.updateChatbotState(event.conversationId, 'thinking');
  }
  
  public emitToolError(event: Omit<ToolErrorEvent, 'eventType'>) {
    this.emit('tool:error', { ...event, eventType: 'error' });
    this.updateChatbotState(event.conversationId, 'thinking');
  }
  
  public emitThinking(conversationId: string) {
    this.emit('thinking', { conversationId, timestamp: Date.now() });
    this.updateChatbotState(conversationId, 'thinking');
  }
  
  public emitIdle(conversationId: string) {
    this.emit('idle', { conversationId, timestamp: Date.now() });
    this.updateChatbotState(conversationId, 'idle');
  }
  
  // State API integration
  private async updateChatbotState(
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
export const toolEvents = ToolEventEmitter.getInstance();
