// src/with-mcp/hooks/use-security.ts
import { useState, useEffect, useCallback } from 'react';
import { SecurityManager, ToolApprovalRequest } from '../security-manager';
import { 
  SecurityDialogState, 
  SecurityDialogHandlers, 
  initSecurityDialogState,
  connectSecurityManagerToUI
} from '../utils/security-utils';

import React from 'react';

/**
 * React hook for handling security dialogs and approvals
 */
export function useSecurity(securityManager: SecurityManager) {
  // Initialize state
  const [securityState, setSecurityState] = useState<SecurityDialogState>(
    initSecurityDialogState()
  );
  
  // Create handlers with empty implementations that will be overridden
  // Use ref to ensure handlers are always the latest version
  const handlersRef = React.useRef<SecurityDialogHandlers>({
    onApprove: () => {
      console.log("Default onApprove called - not yet connected");
    },
    onDeny: () => {
      console.log("Default onDeny called - not yet connected");
    },
    onClose: () => {
      console.log("Default onClose called - not yet connected");
    }
  });
  
  // Update state handler
  const updateSecurityState = useCallback((newState: Partial<SecurityDialogState>) => {
    console.log("📋 Updating security state:", newState);
    setSecurityState(prevState => ({
      ...prevState,
      ...newState
    }));
  }, []);
  
  // Set up connection between security manager and UI
  useEffect(() => {
    console.log("🔌 Connecting security manager to UI");
    
    // Force register a test tool that requires approval
    securityManager.registerToolPolicy('perplexity_search_web', {
      requiresApproval: true,
      maxCallsPerMinute: 30
    });
    
    // Force set a new approval callback to ensure it's properly registered
    securityManager.setApprovalCallback(async (request) => {
      console.log("🔔🔔 APPROVAL REQUESTED for:", request);
      
      return new Promise<boolean>((resolve) => {
        console.log("⏳ Creating new approval promise for request:", request.id);
        
        // Update UI state immediately to show the dialog
        updateSecurityState({
          isApprovalDialogOpen: true,
          currentApprovalRequest: request,
          pendingApprovals: securityManager.getPendingApprovals()
        });
        
        // Create temporary locals for this specific request
        let timeoutId: NodeJS.Timeout | null = null;
        
        // Set timeout for auto-deny after 5 minutes
        timeoutId = setTimeout(() => {
          console.log("⏰ Auto-denying after timeout for request:", request.id);
          resolve(false);
          
          // Clean up UI
          updateSecurityState({
            isApprovalDialogOpen: false,
            currentApprovalRequest: null
          });
        }, 5 * 60 * 1000);
        
        // Create custom handlers for this specific request
        const approve = () => {
          console.log("✅ Approving request:", request.id);
          if (timeoutId) clearTimeout(timeoutId);
          resolve(true);
          
          // Clean up UI
          updateSecurityState({
            isApprovalDialogOpen: false,
            currentApprovalRequest: null
          });
        };
        
        const deny = () => {
          console.log("❌ Denying request:", request.id);
          if (timeoutId) clearTimeout(timeoutId);
          resolve(false);
          
          // Clean up UI
          updateSecurityState({
            isApprovalDialogOpen: false,
            currentApprovalRequest: null
          });
        };
        
        // Update our handlers to use these callbacks
        handlersRef.current = {
          onApprove: approve,
          onDeny: deny,
          onClose: deny // Treat close as deny
        };
      });
    });
    
    const cleanup = connectSecurityManagerToUI(
      securityManager,
      updateSecurityState,
      handlersRef.current
    );
    
    // Clean up function
    return () => {
      console.log("🧹 Cleaning up security manager connection");
      cleanup();
    };
  }, [securityManager, updateSecurityState]);
  
  // Public methods for components
  const approveRequest = useCallback((requestId: string) => {
    console.log("👍 Component called approveRequest for:", requestId);
    handlersRef.current.onApprove(requestId);
  }, []);
  
  const denyRequest = useCallback((requestId: string) => {
    console.log("👎 Component called denyRequest for:", requestId);
    handlersRef.current.onDeny(requestId);
  }, []);
  
  const closeDialog = useCallback(() => {
    console.log("🚪 Component called closeDialog");
    handlersRef.current.onClose();
  }, []);
  
  // Fetch pending approvals periodically
  useEffect(() => {
    console.log("🔍 Setting up approval polling");
    
    const checkApprovals = () => {
      const pendingApprovals = securityManager.getPendingApprovals();
      
      // If we have pending approvals but no current request, show the first one
      if (pendingApprovals.length > 0 && !securityState.currentApprovalRequest) {
        console.log("🔔 Found pending approvals:", pendingApprovals);
        updateSecurityState({ 
          pendingApprovals,
          isApprovalDialogOpen: true,
          currentApprovalRequest: pendingApprovals[0]
        });
      }
    };
    
    // Check immediately
    checkApprovals();
    
    // Then set up interval
    const intervalId = setInterval(checkApprovals, 500); // Check more frequently
    
    return () => clearInterval(intervalId);
  }, [securityManager, updateSecurityState, securityState.currentApprovalRequest]);
  
  return {
    state: securityState,
    approveRequest,
    denyRequest,
    closeDialog,
    securityManager
  };
}
