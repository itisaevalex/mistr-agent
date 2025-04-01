import { NextRequest, NextResponse } from 'next/server';

// This handler responds to rewritten SSE requests
export async function GET(request: NextRequest) {
  console.log('SSE Handler: Intercepted problematic SSE request');
  
  // Create a simple SSE stream that immediately closes
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send an empty message and immediately close the stream
      controller.enqueue(encoder.encode('event: close\ndata: {}\n\n'));
      controller.close();
    }
  });
  
  // Return a response with the stream
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
