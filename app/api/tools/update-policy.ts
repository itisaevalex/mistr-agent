import { NextRequest, NextResponse } from 'next/server';
import { createSecurityManager } from '../../../lib/mistral/utils/security-utils';

// Get a reference to the global security manager singleton
const securityManager = createSecurityManager();

// Endpoint to update a tool's security policy
export async function POST(request: NextRequest) {
  try {
    const { toolId, requiresApproval } = await request.json();
    
    if (!toolId) {
      return NextResponse.json(
        { error: 'Tool ID is required' },
        { status: 400 }
      );
    }
    
    // Update the security policy
    securityManager.registerToolPolicy(toolId, {
      requiresApproval: requiresApproval,
      maxCallsPerMinute: 60,
      validateInput: true,
      logUsage: true
    });
    
    console.log(`Updated security policy for tool ${toolId}: requiresApproval=${requiresApproval}`);
    
    return NextResponse.json({ 
      success: true,
      toolId,
      requiresApproval
    });
  } catch (error) {
    console.error('Error updating tool security policy:', error);
    return NextResponse.json(
      { error: 'Failed to update tool security policy' },
      { status: 500 }
    );
  }
}
