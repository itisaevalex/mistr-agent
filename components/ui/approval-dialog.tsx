"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useApprovalChecker } from '../../hooks/use-approval-checker';

// Create a global event emitter for approval events
const emitApprovalEvent = (status: 'started' | 'approved' | 'denied', id?: string) => {
  window.dispatchEvent(new CustomEvent('approval-status-change', { 
    detail: { status, id } 
  }));
};

export function ApprovalDialog() {
  const { currentApproval, submitDecision } = useApprovalChecker();
  const [countdown, setCountdown] = useState<number>(20);
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [processingDecision, setProcessingDecision] = useState<boolean>(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Handle visibility based on approval state
  useEffect(() => {
    if (currentApproval && !visible && !processingDecision) {
      // Only show if we have an approval and we're not already processing
      setVisible(true);
      setCountdown(20);
      // Emit global event
      emitApprovalEvent('started', currentApproval.id);
    } else if (!currentApproval && visible && !processingDecision) {
      // Only hide automatically if not processing (let manual hide take priority)
      setVisible(false);
    }
  }, [currentApproval, visible, processingDecision]);
  
  // Auto-approve countdown
  useEffect(() => {
    if (currentApproval && autoApprove && countdown > 0 && !processingDecision) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (currentApproval && autoApprove && countdown === 0 && !processingDecision) {
      // Auto-approve when countdown reaches zero
      handleDecision(true);
    }
  }, [currentApproval, autoApprove, countdown, processingDecision]);
  
  // Handle focus events
  useEffect(() => {
    const handleFocusDialog = () => {
      if (dialogRef.current) {
        dialogRef.current.focus();
      }
    };
    
    window.addEventListener('focus-approval-dialog', handleFocusDialog);
    return () => window.removeEventListener('focus-approval-dialog', handleFocusDialog);
  }, []);
  
  // Don't render if not visible
  if (!visible) {
    return null;
  }
  
  // Handler for approval decisions
  const handleDecision = (approved: boolean) => {
    if (!currentApproval || processingDecision) return;
    
    // Mark as processing to prevent double-clicks
    setProcessingDecision(true);
    
    // Hide dialog immediately - this must happen before any async operations
    setVisible(false);
    
    // Force a DOM update to hide the dialog
    requestAnimationFrame(() => {
      document.body.style.pointerEvents = 'none';
      
      // Store ID locally
      const approvalId = currentApproval.id;
      
      // Emit global event immediately
      emitApprovalEvent(approved ? 'approved' : 'denied', approvalId);
      
      // Clear DOM blocking after forcing a repaint
      requestAnimationFrame(() => {
        document.body.style.pointerEvents = '';
        
        try {
          // Now submit the decision to the backend
          submitDecision(approvalId, approved);
        } catch (error) {
          console.error("Error submitting tool decision:", error);
        } finally {
          // Clear processing state after a delay
          setTimeout(() => {
            setProcessingDecision(false);
          }, 1000);
        }
      });
    });
  };
  
  // Format tool arguments for display
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
  
  // Based on the screenshot, this needs darkening in dark mode
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div 
        ref={dialogRef}
        tabIndex={-1}
        className="bg-gray-50 dark:bg-gray-900 rounded-lg max-w-xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <span className="text-amber-700 dark:text-amber-400 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </span>
            <h3 className="text-xl font-semibold">Tool Confirmation Required</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The assistant wants to execute a tool that requires your approval:
          </p>
          
          {currentApproval && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-lg">Tool</h4>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded mt-1 text-blue-700 dark:text-blue-300 font-mono">
                  {currentApproval.toolName}
                </div>
              </div>
              
              {currentApproval.toolServer && (
                <div>
                  <h4 className="font-medium text-lg">Server</h4>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded mt-1 text-gray-800 dark:text-gray-200">
                    {currentApproval.toolServer}
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-lg">Arguments</h4>
                <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded mt-1 overflow-auto max-h-60 text-sm text-gray-800 dark:text-gray-200">
                  {formatArgs(currentApproval.args)}
                </pre>
              </div>
            </div>
          )}
          
          {/* Auto-approve toggle */}
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="auto-approve"
              checked={autoApprove}
              onChange={() => setAutoApprove(!autoApprove)}
              className="mr-2 h-4 w-4 rounded border-gray-300"
              disabled={processingDecision}
            />
            <label htmlFor="auto-approve" className="text-sm text-gray-600 dark:text-gray-400">
              Auto-approve tool calls {autoApprove && `(executing in ${countdown}s)`}
            </label>
          </div>
          
          <div className="mt-6 flex justify-end space-x-2">
            <button
              className="px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-800/40 text-red-700 dark:text-red-300"
              onClick={() => handleDecision(false)}
              disabled={processingDecision}
            >
              Deny
            </button>
            <button
              className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
              onClick={() => handleDecision(true)}
              disabled={processingDecision}
            >
              {autoApprove ? `Allow (${countdown}s)` : 'Allow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
