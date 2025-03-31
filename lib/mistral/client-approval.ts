/**
 * Direct client-side approval system that doesn't rely on API routes
 */

// Create a direct connection between the security manager and the client UI
let waitingForApproval = false;

// Function to show a popup for approval
export async function showApprovalPopup(
  toolName: string,
  args: any
): Promise<boolean> {
  console.log(`📢 Showing approval popup for tool: ${toolName}`);
  
  // Check if already waiting for approval
  if (waitingForApproval) {
    console.warn('Already waiting for approval, denying new request');
    return false;
  }
  
  // Set waiting flag
  waitingForApproval = true;
  
  try {
    // Create a unique ID for this request
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the approval request
    const request = {
      id: requestId,
      toolName,
      args,
      timestamp: Date.now()
    };
    
    // Use a simpler approach - through localStorage
    // This works across all components without complex state management
    
    // Check if the browser environment is available
    if (typeof window !== 'undefined' && window.localStorage) {
      // Create a promise that will be resolved when the user makes a decision
      return new Promise<boolean>((resolve) => {
        // Add the request to pending
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        pendingApprovals.push(request);
        localStorage.setItem('pendingApprovals', JSON.stringify(pendingApprovals));
        
        // Also dispatch an event for components that are listening
        try {
          window.dispatchEvent(new CustomEvent('approval-request', { detail: request }));
        } catch (e) {
          console.error('Error dispatching event:', e);
        }
        
        // Create a function to check for approval decision
        const checkDecision = () => {
          const updatedPending = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
          
          // If the request is no longer in the list, the user made a decision
          const stillPending = updatedPending.some((r: any) => r.id === requestId);
          
          if (!stillPending) {
            // Check the decision from localStorage
            const decision = localStorage.getItem(`approval-${requestId}`);
            
            // Clean up
            localStorage.removeItem(`approval-${requestId}`);
            
            // Resolve the promise with the decision
            waitingForApproval = false;
            resolve(decision === 'true');
            return;
          }
          
          // Still waiting, check again soon
          setTimeout(checkDecision, 100);
        };
        
        // Start checking for decision
        checkDecision();
        
        // Set a timeout to auto-deny after 30 seconds
        setTimeout(() => {
          // If still waiting, auto-deny
          if (waitingForApproval) {
            console.log(`⏱️ Auto-denying after timeout for ${requestId}`);
            
            // Clean up
            const finalPending = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
            localStorage.setItem(
              'pendingApprovals', 
              JSON.stringify(finalPending.filter((r: any) => r.id !== requestId))
            );
            
            // Resolve with denial
            waitingForApproval = false;
            resolve(false);
          }
        }, 30000);
      });
    } else {
      // Not in browser or localStorage not available
      console.warn('Not in browser environment, auto-denying');
      waitingForApproval = false;
      return false;
    }
  } catch (error) {
    console.error('Error showing approval popup:', error);
    waitingForApproval = false;
    return false;
  }
}
