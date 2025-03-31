/**
 * Shared security manager singleton that can be accessed across API routes
 */

import { SecurityManager } from './security-manager';

// Create a global namespace
declare global {
  var sharedSecurityManager: SecurityManager | undefined;
  var pendingApprovals: Map<string, (approved: boolean) => void>;
}

// Initialize the global pendingApprovals map if it doesn't exist
if (!global.pendingApprovals) {
  global.pendingApprovals = new Map<string, (approved: boolean) => void>();
  console.log("📝 Initialized global pending approvals map");
}

// Register a tool approval request with direct access to the global map
export function registerToolApproval(
  conversationId: string,
  toolName: string,
  callback: (approved: boolean) => void
): void {
  const key = `${conversationId}:${toolName}`;
  global.pendingApprovals.set(key, callback);
  console.log(`[DIRECT] 📝 Registered tool approval for ${key}`);
  
  // Also register with the SimpleApprovalDialog on the client side
  try {
    // This will only work on the client side
    if (typeof window !== 'undefined' && window.localStorage) {
      // Create a unique ID for this request
      const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create the request object
      const request = {
        id: requestId,
        toolName,
        args: { query: toolName === 'perplexity_search_web' ? conversationId : 'Unknown arguments' },
        timestamp: Date.now()
      };
      
      // Get existing requests from localStorage
      const existingRequests = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
      
      // Add the new request
      existingRequests.push(request);
      
      // Save back to localStorage
      localStorage.setItem('pendingApprovals', JSON.stringify(existingRequests));
      
      // Dispatch an event to notify the SimpleApprovalDialog
      try {
        window.dispatchEvent(new CustomEvent('approval-request', { detail: request }));
        console.log(`[DIRECT] 📢 Dispatched client-side approval request event`);
      } catch (e) {
        console.error('[DIRECT] Error dispatching event:', e);
      }
    }
  } catch (e) {
    console.error('[DIRECT] Error registering with SimpleApprovalDialog:', e);
  }
  
  // Auto-deny after 30 seconds to prevent hanging
  setTimeout(() => {
    if (global.pendingApprovals.has(key)) {
      console.log(`[DIRECT] ⏰ Auto-denying tool approval for ${key} after timeout`);
      const cb = global.pendingApprovals.get(key);
      if (cb) {
        cb(false);
      }
      global.pendingApprovals.delete(key);
    }
  }, 30000);
}

export function getSharedSecurityManager(): SecurityManager {
  // If already exists in global, use that instance
  if (global.sharedSecurityManager) {
    return global.sharedSecurityManager;
  }
  
  // Otherwise create a new one
  console.log("🚫 Creating SECURITY DISABLED manager instance...");
  const manager = new SecurityManager();
  
  // Store in global to ensure it's shared across all API routes
  global.sharedSecurityManager = manager;
  
  // Register all tools with security disabled
  manager.registerToolPolicy('perplexity_search_web', {
    requiresApproval: false, // No approval required
    maxCallsPerMinute: 9999, // No practical rate limit
    validateInput: false,    // No input validation
    logUsage: true           // Keep logging for monitoring
  });
  
  // Add a wildcard policy that auto-approves everything
  manager.registerToolPolicy('*', {
    requiresApproval: false,
    maxCallsPerMinute: 9999,
    validateInput: false,
    logUsage: true
  });
  
  // Set up a simple approval callback that auto-approves everything
  manager.setApprovalCallback(async (request) => {
    console.log("⚠️ SECURITY DISABLED: Auto-approving all tool calls");
    console.log(`✅ Auto-approved tool ${request.toolName}`);
    return true; // Always approve
  });
  
  console.log("🚫 Initialized security-disabled manager");
  
  return manager;
}
