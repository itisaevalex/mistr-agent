import { NextRequest, NextResponse } from 'next/server';
import { getConversationState } from '../../../lib/mistral/conversation-store';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }
    
    // Get the state directly from the conversation store
    const stateData = getConversationState(conversationId);
    
    // Return the relevant parts of the state data
    // Include pendingToolCalls which is required for our enhanced UI
    return NextResponse.json({
      conversationId: stateData.id,
      state: stateData.state,
      toolName: stateData.toolName,
      pendingToolCalls: stateData.pendingToolCalls, // For showing tool info in the UI
      lastUpdated: stateData.lastUpdated
    });
  } catch (error) {
    console.error('Error getting chatbot state:', error);
    return NextResponse.json(
      { error: 'Failed to get chatbot state' },
      { status: 500 }
    );
  }
}
