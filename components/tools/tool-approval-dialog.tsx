import React, { useState, useEffect } from 'react';
import { ToolApprovalRequest } from '../../lib/mistral/security-manager';

interface ToolApprovalDialogProps {
  isOpen: boolean;
  request: ToolApprovalRequest | null;
  onApprove: () => void;
  onDeny: () => void;
}

/**
 * Dialog component for approving or denying tool execution requests
 */
export function ToolApprovalDialog({ 
  isOpen, 
  request, 
  onApprove, 
  onDeny 
}: ToolApprovalDialogProps) {
  // State for auto-approve (remember user preference for this session)
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  
  // Auto-approve countdown
  const [countdown, setCountdown] = useState<number>(5);
  
  // Auto-approve countdown effect
  useEffect(() => {
    if (isOpen && request && autoApprove && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (isOpen && request && autoApprove && countdown === 0) {
      // Execute when countdown reaches zero
      onApprove();
    }
  }, [isOpen, request, autoApprove, countdown, onApprove]);
  
  // Reset countdown when a new request comes in
  useEffect(() => {
    if (request) {
      setCountdown(5);
    }
  }, [request?.id]);

  // If no request or dialog is not open, don't render anything
  if (!isOpen || !request) {
    return null;
  }
  
  // Format a friendly display of the arguments
  const formatArgs = (args: any) => {
    if (!args || typeof args !== 'object') {
      return String(args);
    }
    
    try {
      return JSON.stringify(args, null, 2);
    } catch (error) {
      return String(args);
    }
  };
  
  // Toggle auto-approve feature
  const toggleAutoApprove = () => {
    setAutoApprove(!autoApprove);
    // Reset countdown when toggling on
    if (!autoApprove) {
      setCountdown(5);
    }
  };
  
  // Get a friendly server name
  const serverName = request.toolServer || 'Unknown server';
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2">Approve Tool Execution</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The assistant wants to execute a tool that requires your approval:
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-lg">Tool</h4>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 text-gray-900 dark:text-gray-100">
                {request.toolName}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-lg">Server</h4>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 text-gray-900 dark:text-gray-100">
                {serverName}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-lg">Arguments</h4>
              <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 overflow-auto max-h-60 text-sm text-gray-900 dark:text-gray-100">
                {formatArgs(request.args)}
              </pre>
            </div>
          </div>
          
          {/* Auto-approve toggle */}
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="auto-approve"
              checked={autoApprove}
              onChange={toggleAutoApprove}
              className="mr-2 h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="auto-approve" className="text-sm text-gray-700 dark:text-gray-300">
              Auto-approve tool calls {autoApprove && `(executing in ${countdown}s)`}
            </label>
          </div>
          
          <div className="mt-6 flex justify-end space-x-2">
            <button
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
              onClick={onDeny}
            >
              Deny
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={onApprove}
            >
              {autoApprove ? `Approve (${countdown}s)` : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
