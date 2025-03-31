import { NextRequest, NextResponse } from 'next/server';
import { getSharedSecurityManager } from '../../../lib/mistral/shared-security-manager';

// Store pending approval requests
const pendingApprovals = new Map<string, {
  id: string;
  toolName: string;
  toolServer?: string;
  args: any;
  timestamp: number;
  callingContext: string;
  resolve: (approved: boolean) => void;
}>();

// Endpoint to get pending approval requests
export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 Checking for pending approvals (count: ${pendingApprovals.size})`);
    
    // Convert Map to array for response
    const approvals = Array.from(pendingApprovals.values()).map(({ resolve, ...rest }) => rest);
    
    return NextResponse.json({ pendingApprovals: approvals });
  } catch (error) {
    console.error('Error getting approval state:', error);
    return NextResponse.json(
      { error: 'Failed to get approval state' },
      { status: 500 }
    );
  }
}

// Endpoint to submit approval decision
export async function POST(request: NextRequest) {
  try {
    const { requestId, approved } = await request.json();
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`🧩 Received approval decision for request ${requestId}: ${approved ? 'APPROVED' : 'DENIED'}`);
    
    // Get the pending approval request
    const pendingRequest = pendingApprovals.get(requestId);
    
    if (!pendingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    // Resolve the promise with the user's decision
    pendingRequest.resolve(approved);
    
    // Remove from pending approvals
    pendingApprovals.delete(requestId);
    
    return NextResponse.json({ 
      success: true,
      requestId,
      approved
    });
  } catch (error) {
    console.error('Error updating approval state:', error);
    return NextResponse.json(
      { error: 'Failed to update approval state' },
      { status: 500 }
    );
  }
}

// Register the approval callback with the security manager
const securityManager = getSharedSecurityManager();

securityManager.setApprovalCallback(async (request) => {
  console.log(`⚠️ SECURITY APPROVAL NEEDED for tool: ${request.toolName}`);
  
  // Check if auto-approve is enabled globally
  let autoApprove = false;
  try {
    if (typeof global.localStorage !== 'undefined') {
      autoApprove = global.localStorage.getItem('autoApproveTools') === 'true';
    }
  } catch (e) {
    // Ignore - localStorage not available in server context
  }
  
  if (autoApprove) {
    console.log(`🔓 Auto-approving tool ${request.toolName} due to global setting`);
    return true;
  }
  
  // Return a promise that will be resolved when the user makes a decision
  return new Promise<boolean>((resolve) => {
    // Generate a unique ID for this request if it doesn't have one
    const requestId = request.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Store the request and its resolve function
    pendingApprovals.set(requestId, {
      ...request,
      id: requestId,
      resolve
    });
    
    console.log(`🔒 Added approval request to queue: ${requestId} (${pendingApprovals.size} pending)`);
    
    // Set a timeout to auto-deny after 30 seconds
    setTimeout(() => {
      if (pendingApprovals.has(requestId)) {
        console.log(`⏱️ Auto-denying after timeout for request: ${requestId}`);
        resolve(false);
        pendingApprovals.delete(requestId);
      }
    }, 30000); // 30 seconds
  });
});

console.log("✅ Approval handler registered with shared security manager");
