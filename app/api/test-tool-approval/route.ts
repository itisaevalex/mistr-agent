import { NextRequest, NextResponse } from 'next/server';

// Access the global pendingApprovals map
declare global {
  var pendingApprovals: Map<string, (approved: boolean) => void>;
}

// Debug endpoint for testing tool approval
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId');
  const toolName = url.searchParams.get('toolName');
  const approved = url.searchParams.get('approved') === 'true';
  
  if (!conversationId || !toolName) {
    return NextResponse.json(
      { error: 'Conversation ID and toolName are required' },
      { status: 400 }
    );
  }
  
  // Check global map
  const key = `${conversationId}:${toolName}`;
  
  if (!global.pendingApprovals) {
    return NextResponse.json(
      { error: 'Global pendingApprovals map not initialized' },
      { status: 500 }
    );
  }
  
  // Check if we have a callback
  const callback = global.pendingApprovals.get(key);
  
  if (!callback) {
    return NextResponse.json(
      { error: 'No callback found for this tool', key, availableKeys: [...global.pendingApprovals.keys()] },
      { status: 404 }
    );
  }
  
  // Call the callback
  console.log(`🧪 TEST: Direct callback execution for ${key}: ${approved ? 'APPROVED' : 'DENIED'}`);
  callback(approved);
  
  // Remove from the map
  global.pendingApprovals.delete(key);
  
  return NextResponse.json({
    success: true,
    message: `Successfully ${approved ? 'approved' : 'denied'} tool request for ${key}`
  });
}
