"use client";

import React, { useState, useEffect } from 'react';

/**
 * Global approval dialog component that shows tool approvals
 * This uses a global event bus approach that doesn't depend on React context
 */

// Types
interface ToolRequest {
  id: string;
  toolName: string;
  toolServer?: string;
  args: any;
  timestamp: number;
}

interface GlobalApprovalState {
  isOpen: boolean;
  currentRequest: ToolRequest | null;
  pendingRequests: ToolRequest[];
}

// Create a global event bus
class ToolApprovalEventBus {
  private static instance: ToolApprovalEventBus;
  private listeners: Set<(state: GlobalApprovalState) => void> = new Set();
  private state: GlobalApprovalState = {
    isOpen: false,
    currentRequest: null,
    pendingRequests: []
  };
  
  private constructor() {}
  
  public static getInstance(): ToolApprovalEventBus {
    if (!ToolApprovalEventBus.instance) {
      ToolApprovalEventBus.instance = new ToolApprovalEventBus();
    }
    return ToolApprovalEventBus.instance;
  }
  
  public addListener(listener: (state: GlobalApprovalState) => void): () => void {
    this.listeners.add(listener);
    // Return cleanup function
    return () => this.listeners.delete(listener);
  }
  
  public getState(): GlobalApprovalState {
    return this.state;
  }
  
  public updateState(newState: Partial<GlobalApprovalState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }
  
  public requestApproval(request: ToolRequest): Promise<boolean> {
    console.log("📣 GlobalApprovalDialog: Requesting approval for tool:", request.toolName);
    
    // Add to pending requests
    this.state.pendingRequests.push(request);
    
    // If no current request, set this as current
    if (!this.state.currentRequest) {
      this.state.currentRequest = request;
      this.state.isOpen = true;
    }
    
    this.notifyListeners();
    
    // Create a promise that will be resolved when user makes a decision
    return new Promise<boolean>((resolve) => {
      // Store the request with its resolver in a global map
      window.__toolApprovalResolvers = window.__toolApprovalResolvers || new Map();
      window.__toolApprovalResolvers.set(request.id, resolve);
    });
  }
  
  public approveRequest(requestId: string): void {
    console.log("✅ GlobalApprovalDialog: Approving request:", requestId);
    
    // Resolve the promise
    if (window.__toolApprovalResolvers?.has(requestId)) {
      const resolve = window.__toolApprovalResolvers.get(requestId);
      resolve(true);
      window.__toolApprovalResolvers.delete(requestId);
    }
    
    // Remove from pending requests
    this.state.pendingRequests = this.state.pendingRequests.filter(
      req => req.id !== requestId
    );
    
    // If this was the current request, move to next one
    if (this.state.currentRequest?.id === requestId) {
      this.state.currentRequest = this.state.pendingRequests[0] || null;
      this.state.isOpen = !!this.state.currentRequest;
    }
    
    this.notifyListeners();
  }
  
  public denyRequest(requestId: string): void {
    console.log("❌ GlobalApprovalDialog: Denying request:", requestId);
    
    // Resolve the promise with false
    if (window.__toolApprovalResolvers?.has(requestId)) {
      const resolve = window.__toolApprovalResolvers.get(requestId);
      resolve(false);
      window.__toolApprovalResolvers.delete(requestId);
    }
    
    // Remove from pending requests
    this.state.pendingRequests = this.state.pendingRequests.filter(
      req => req.id !== requestId
    );
    
    // If this was the current request, move to next one
    if (this.state.currentRequest?.id === requestId) {
      this.state.currentRequest = this.state.pendingRequests[0] || null;
      this.state.isOpen = !!this.state.currentRequest;
    }
    
    this.notifyListeners();
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Declare the global type
declare global {
  interface Window {
    __toolApprovalResolvers?: Map<string, (approved: boolean) => void>;
    __toolApprovalEventBus?: ToolApprovalEventBus;
  }
}

// Make the event bus available globally
if (typeof window !== 'undefined') {
  window.__toolApprovalEventBus = ToolApprovalEventBus.getInstance();
}

// Hook to use the event bus
export function useToolApproval() {
  const [state, setState] = useState<GlobalApprovalState>({
    isOpen: false,
    currentRequest: null,
    pendingRequests: []
  });
  
  useEffect(() => {
    const eventBus = ToolApprovalEventBus.getInstance();
    
    // Initial state
    setState(eventBus.getState());
    
    // Listen for changes
    const cleanup = eventBus.addListener(setState);
    
    return cleanup;
  }, []);
  
  const approveRequest = (requestId: string) => {
    ToolApprovalEventBus.getInstance().approveRequest(requestId);
  };
  
  const denyRequest = (requestId: string) => {
    ToolApprovalEventBus.getInstance().denyRequest(requestId);
  };
  
  return {
    state,
    approveRequest,
    denyRequest
  };
}

// Export the event bus for programmatic access
export const toolApprovalEventBus = ToolApprovalEventBus.getInstance();

export default function GlobalApprovalDialog() {
  const { state, approveRequest, denyRequest } = useToolApproval();
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  
  // Auto-approve countdown effect
  useEffect(() => {
    if (state.isOpen && state.currentRequest && autoApprove && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (state.isOpen && state.currentRequest && autoApprove && countdown === 0) {
      // Execute when countdown reaches zero
      if (state.currentRequest?.id) {
        approveRequest(state.currentRequest.id);
      }
    }
  }, [state.isOpen, state.currentRequest, autoApprove, countdown, approveRequest]);
  
  // Reset countdown when a new request comes in
  useEffect(() => {
    if (state.currentRequest) {
      setCountdown(5);
    }
  }, [state.currentRequest?.id]);
  
  // If no current request or dialog is not open, don't render anything
  if (!state.isOpen || !state.currentRequest) {
    return null;
  }
  
  // Format a friendly display of the arguments
  const formatArgs = (args: any) => {
    if (!args || typeof args !== 'object') {
      return String(args);
    }
    
    try {
      return JSON.stringify(args, null, 2);
    } catch (error) {
      return String(args);
    }
  };
  
  // Toggle auto-approve feature
  const toggleAutoApprove = () => {
    setAutoApprove(!autoApprove);
    // Reset countdown when toggling on
    if (!autoApprove) {
      setCountdown(5);
    }
  };
  
  // Get a friendly server name
  const serverName = state.currentRequest.toolServer || 'Unknown server';
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2">Approve Tool Execution</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The assistant wants to execute a tool that requires your approval:
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-lg">Tool</h4>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 text-gray-900 dark:text-gray-100">
                {state.currentRequest.toolName}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-lg">Server</h4>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 text-gray-900 dark:text-gray-100">
                {serverName}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-lg">Arguments</h4>
              <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 overflow-auto max-h-60 text-sm text-gray-900 dark:text-gray-100">
                {formatArgs(state.currentRequest.args)}
              </pre>
            </div>
          </div>
          
          {/* Auto-approve toggle */}
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="auto-approve"
              checked={autoApprove}
              onChange={toggleAutoApprove}
              className="mr-2 h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="auto-approve" className="text-sm text-gray-700 dark:text-gray-300">
              Auto-approve tool calls {autoApprove && `(executing in ${countdown}s)`}
            </label>
          </div>
          
          <div className="mt-6 flex justify-end space-x-2">
            <button
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
              onClick={() => state.currentRequest && denyRequest(state.currentRequest.id)}
            >
              Deny
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => state.currentRequest && approveRequest(state.currentRequest.id)}
            >
              {autoApprove ? `Approve (${countdown}s)` : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
