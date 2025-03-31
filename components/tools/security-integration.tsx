import React from 'react';
import { SecurityManager } from '../../lib/mistral/security-manager';
import { useSecurity } from '../../lib/mistral/hooks/use-security';
import { ToolApprovalDialog } from './tool-approval-dialog';

interface SecurityIntegrationProps {
  securityManager: SecurityManager;
  children: React.ReactNode;
}

/**
 * Security integration component that provides tool approval dialog and security management
 */
export function SecurityIntegration({ securityManager, children }: SecurityIntegrationProps) {
  // Use the security hook
  const { state, approveRequest, denyRequest, closeDialog } = useSecurity(securityManager);
  
  // Debug: Log when dialog state changes
  React.useEffect(() => {
    if (state.isApprovalDialogOpen) {
      console.log("🔔 DIALOG OPEN - Tool approval dialog should be visible");
      console.log("📋 Current approval request:", state.currentApprovalRequest);
    } else {
      console.log("🔕 Tool approval dialog is closed");
    }
  }, [state.isApprovalDialogOpen, state.currentApprovalRequest]);
  
  return (
    <>
      {/* Render children */}
      {children}
      
      {/* Always render the dialog component but control visibility with isOpen */}
      <ToolApprovalDialog
        isOpen={state.isApprovalDialogOpen && !!state.currentApprovalRequest}
        request={state.currentApprovalRequest}
        onApprove={() => {
          console.log("👍 User clicked APPROVE");
          if (state.currentApprovalRequest) {
            approveRequest(state.currentApprovalRequest.id);
          }
        }}
        onDeny={() => {
          console.log("👎 User clicked DENY");
          if (state.currentApprovalRequest) {
            denyRequest(state.currentApprovalRequest.id);
          }
        }}
      />
    </>
  );
}

/**
 * Create a wrapped MCP adapter with security features
 */
export function withSecurityIntegration(Component: React.ComponentType<any>) {
  return function WithSecurityIntegration(props: any) {
    // Extract security manager from props
    const { securityManager, ...otherProps } = props;
    
    // If no security manager is provided, just render the component directly
    if (!securityManager) {
      return <Component {...props} />;
    }
    
    return (
      <SecurityIntegration securityManager={securityManager}>
        <Component {...otherProps} securityManager={securityManager} />
      </SecurityIntegration>
    );
  };
}

/**
 * Export a provider component that ensures the security manager is available
 * in the component tree
 */
export function SecurityProvider({ 
  securityManager, 
  children 
}: { 
  securityManager: SecurityManager, 
  children: React.ReactNode 
}) {
  return (
    <SecurityIntegration securityManager={securityManager}>
      {children}
    </SecurityIntegration>
  );
}
