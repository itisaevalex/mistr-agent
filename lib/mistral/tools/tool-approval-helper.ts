"use client";

/**
 * Tool approval helper that uses the global event bus
 */

// Create a global function to request tool approval
export function requestToolApproval(
  toolName: string,
  args: any,
  serverId?: string
): Promise<boolean> {
  // Safety check for browser environment
  if (typeof window === 'undefined') {
    console.warn('Tool approval helper called in non-browser environment');
    return Promise.resolve(true); // Auto-approve in non-browser environment
  }
  
  // Create a unique ID for this request
  const requestId = `${Date.now()}-${toolName}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Create the request object
  const request = {
    id: requestId,
    toolName,
    toolServer: serverId,
    args,
    timestamp: Date.now()
  };
  
  console.log("🔐 Tool approval helper requesting approval for:", toolName);
  
  // If the global event bus exists, use it
  if (window.__toolApprovalEventBus) {
    return window.__toolApprovalEventBus.requestApproval(request);
  }
  
  // Otherwise, just resolve with true (auto-approve)
  console.warn("⚠️ Global tool approval event bus not found, auto-approving tool call");
  return Promise.resolve(true);
}

// Export a function to manually trigger the approval dialog (for testing)
export function testToolApproval(): Promise<boolean> {
  return requestToolApproval(
    'test_tool',
    {
      param1: 'test value',
      param2: 123,
      complex: { nested: true }
    },
    'test-server'
  );
}
