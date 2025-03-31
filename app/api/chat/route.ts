import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Simple endpoint to create a new conversation
export async function POST(request: NextRequest) {
  try {
    // Generate a unique conversation ID
    const conversationId = Date.now().toString();
    
    return NextResponse.json({ conversationId });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
