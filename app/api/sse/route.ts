import { NextRequest, NextResponse } from 'next/server';

// This handler intercepts SSE requests that would otherwise cause 404 errors
export async function GET(request: NextRequest) {
  // Get the search parameters from the URL
  const searchParams = request.nextUrl.searchParams;
  const transportType = searchParams.get('transportType');
  const command = searchParams.get('command');
  
  // If this is the specific request that's causing the 404 errors, handle it
  if (transportType === 'stdio' && command && command.includes('launch_for_inspector.bat')) {
    console.log('Intercepted SSE fallback request, responding with empty stream');
    
    // Create a ReadableStream that simply closes immediately
    // This satisfies the SSE request without causing errors
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
  
  // For any other SSE requests, return a 404
  return new NextResponse(null, { status: 404 });
}
