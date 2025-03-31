import { NextRequest, NextResponse } from 'next/server';

// Get access to the global pendingApprovals map
declare global {
  var pendingApprovals: Map<string, (approved: boolean) => void>;
}

// Ensure the global map exists (it should be created in shared-security-manager.ts)
if (!global.pendingApprovals) {
  global.pendingApprovals = new Map<string, (approved: boolean) => void>();
  console.log("📝 Initialized global pending approvals map from route");
}

// Register a tool approval request - used by external modules
export function registerToolApproval(
  conversationId: string,
  toolName: string,
  callback: (approved: boolean) => void
): void {
  const key = `${conversationId}:${toolName}`;
  global.pendingApprovals.set(key, callback);
  console.log(`[CALLBACK] Registering callback for ${key}`);
  console.log(`[CALLBACK] Registered approval callback for ${key}`);
  
  // Auto-deny after 30 seconds to prevent hanging
  setTimeout(() => {
    if (global.pendingApprovals.has(key)) {
      console.log(`[CALLBACK] Auto-denying tool approval for ${key} after timeout`);
      const cb = global.pendingApprovals.get(key);
      if (cb) {
        cb(false);
      }
      global.pendingApprovals.delete(key);
    }
  }, 30000);
}

// Process approval decision - called by UI
export async function POST(request: NextRequest) {
  try {
    const { approved, toolName, conversationId } = await request.json();
    
    if (!toolName || conversationId === undefined) {
      return NextResponse.json(
        { error: 'Tool name and conversation ID are required' },
        { status: 400 }
      );
    }
    
    const key = `${conversationId}:${toolName}`;
    console.log(`Processing tool approval decision for ${key}: ${approved ? 'APPROVED' : 'DENIED'}`);
    
    // Get the callback from the global map
    const callback = global.pendingApprovals.get(key);
    
    if (callback) {
      // Call the callback with the decision
      console.log(`Found callback for ${key}, executing with decision: ${approved}`);
      callback(approved);
      
      // Remove from pending
      global.pendingApprovals.delete(key);
      
      return NextResponse.json({ success: true });
    } else {
      console.warn(`No callback found for tool approval ${key}`);
      return NextResponse.json(
        { error: 'No pending approval found for this tool', key },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error processing tool approval:', error);
    return NextResponse.json(
      { error: 'Failed to process tool approval' },
      { status: 500 }
    );
  }
}

// Debug endpoint to check pending approvals
export async function GET(request: NextRequest) {
  const pendingCount = global.pendingApprovals?.size || 0;
  const pendingKeys = [...(global.pendingApprovals?.keys() || [])];
  
  return NextResponse.json({
    pendingCount,
    pendingKeys
  });
}
