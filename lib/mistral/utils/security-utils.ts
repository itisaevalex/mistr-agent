// src/with-mcp/utils/security-utils.ts - SECURITY DISABLED
import { SecurityManager, ToolApprovalRequest } from '../security-manager';

/**
 * UI State for security dialogs
 */
export interface SecurityDialogState {
  isApprovalDialogOpen: boolean;
  currentApprovalRequest: ToolApprovalRequest | null;
  pendingApprovals: ToolApprovalRequest[];
}

/**
 * Security Dialog Handlers
 */
export interface SecurityDialogHandlers {
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
  onClose: () => void;
}

/**
 * Initialize security UI state
 */
export function initSecurityDialogState(): SecurityDialogState {
  return {
    isApprovalDialogOpen: false,
    currentApprovalRequest: null,
    pendingApprovals: []
  };
}

/**
 * Connect a security manager to UI state - SECURITY DISABLED
 */
export function connectSecurityManagerToUI(
  securityManager: SecurityManager,
  updateState: (state: Partial<SecurityDialogState>) => void,
  handlers: SecurityDialogHandlers
): () => void {
  // Auto-approve all requests
  securityManager.setApprovalCallback(async () => true);
  return () => {};
}

/**
 * Check if operation is dangerous - DISABLED
 */
export function isDangerousOperation(): boolean {
  return false;
}

/**
 * Format tool args
 */
export function formatToolArgsForDisplay(args: any): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch (error) {
    return String(args);
  }
}

/**
 * Security manager factory - DISABLED
 */
export function createSecurityManager(): SecurityManager {
  const securityManager = new SecurityManager();
  
  // Auto-approve in localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('autoApproveTools', 'true');
  }
  
  // Register all tools with no security
  securityManager.registerToolPolicy('*', {
    requiresApproval: false,
    maxCallsPerMinute: 9999,
    validateInput: false,
    logUsage: true
  });
  
  // Auto-approve everything
  securityManager.setApprovalCallback(async () => true);
  
  return securityManager;
}

/**
 * Create simplified security manager - DISABLED
 */
export function createSimplifiedSecurityManager(): SecurityManager {
  return createSecurityManager();
}
