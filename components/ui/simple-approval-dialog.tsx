"use client";

import { useEffect, useState } from 'react';

// Very simple storage for pending approvals
interface SimpleApprovalRequest {
  id: string;
  toolName: string;
  args: any;
  timestamp: number;
}

// Global variable to store approval callbacks
const globalApprovalCallbacks: Record<string, (approved: boolean) => void> = {};

// Function to register an approval request
export function registerApprovalRequest(
  request: SimpleApprovalRequest, 
  callback: (approved: boolean) => void
): void {
  console.log('🔐 Registering approval request:', request);
  
  // Store the callback
  globalApprovalCallbacks[request.id] = callback;
  
  // Store the request in localStorage
  try {
    // Get existing requests
    const existingRequests = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
    
    // Add new request
    existingRequests.push(request);
    
    // Save back to localStorage
    localStorage.setItem('pendingApprovals', JSON.stringify(existingRequests));
    
    // Also dispatch an event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('approval-request', { detail: request }));
      console.log('📢 Dispatched approval-request event');
    }
  } catch (error) {
    console.error('Error saving approval request:', error);
  }
}

// Make this function globally available for the security manager
if (typeof window !== 'undefined') {
  (window as any).registerToolApprovalUI = registerApprovalRequest;
}

// Component that shows approval dialogs
export function SimpleApprovalDialog() {
  const [pendingRequests, setPendingRequests] = useState<SimpleApprovalRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<SimpleApprovalRequest | null>(null);
  
  // Load pending requests from localStorage
  useEffect(() => {
    try {
      // Load on mount
      const storedRequests = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
      console.log('📋 Loaded pending approval requests:', storedRequests.length);
      
      if (storedRequests.length > 0) {
        setPendingRequests(storedRequests);
        setCurrentRequest(storedRequests[0]);
      }
      
      // Set up event listener for new requests
      const handleNewRequest = (event: any) => {
        console.log('📣 Received approval-request event:', event.detail);
        
        // Load fresh data from localStorage to ensure we have all requests
        const updatedRequests = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        setPendingRequests(updatedRequests);
        
        // If we don't have a current request, set the first one
        if (!currentRequest && updatedRequests.length > 0) {
          setCurrentRequest(updatedRequests[0]);
        }
      };
      
      // Register event listener
      window.addEventListener('approval-request', handleNewRequest);
      
      // Set up localStorage change listener
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'pendingApprovals') {
          console.log('📦 pendingApprovals changed in localStorage');
          const updatedRequests = JSON.parse(event.newValue || '[]');
          setPendingRequests(updatedRequests);
          
          // If we don't have a current request, set the first one
          if (!currentRequest && updatedRequests.length > 0) {
            setCurrentRequest(updatedRequests[0]);
          }
        }
      };
      
      // Register storage listener
      window.addEventListener('storage', handleStorageChange);
      
      // Set up polling as a backup
      const interval = setInterval(() => {
        const storedRequests = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        if (storedRequests.length > 0 && (!currentRequest || !pendingRequests.length)) {
          console.log('🔄 Poll found new requests:', storedRequests.length);
          setPendingRequests(storedRequests);
          setCurrentRequest(storedRequests[0]);
        }
      }, 500);
      
      // Clean up
      return () => {
        window.removeEventListener('approval-request', handleNewRequest);
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    } catch (error) {
      console.error('Error in SimpleApprovalDialog effect:', error);
    }
  }, [currentRequest, pendingRequests.length]);
  
  // Function to handle approval
  const handleDecision = (approved: boolean) => {
    if (!currentRequest) return;
    
    try {
      console.log(`🔓 Decision for request ${currentRequest.id}: ${approved ? 'APPROVED' : 'DENIED'}`);
      
      // Call the callback if registered
      const callback = globalApprovalCallbacks[currentRequest.id];
      if (callback) {
        callback(approved);
        delete globalApprovalCallbacks[currentRequest.id];
      } else {
        console.warn('⚠️ No callback found for request', currentRequest.id);
        
        // Try to send the decision via API as a fallback
        fetch('/api/approval-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: currentRequest.id, approved })
        }).catch(err => console.error('Error sending approval decision:', err));
        
        // Also try the tool-approval API as another fallback
        fetch('/api/tool-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            approved, 
            toolName: currentRequest.toolName,
            conversationId: 'unknown' // This is a limitation but better than nothing
          })
        }).catch(err => console.error('Error sending tool approval:', err));
        
        // Also try direct global pendingApprovals map (if any tool with this name is pending)
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const savedToolName = currentRequest.toolName;
            
            // Check if there's any pending approval with this tool name in localStorage
            const pendingCallbackKeys = Object.keys(globalApprovalCallbacks);
            for (const key of pendingCallbackKeys) {
              if (key.includes(savedToolName)) {
                console.log(`🔍 Found potential match for tool ${savedToolName} in callbacks: ${key}`);
                const matchingCallback = globalApprovalCallbacks[key];
                matchingCallback(approved);
                delete globalApprovalCallbacks[key];
              }
            }
          }
        } catch (e) {
          console.error('Error with callback matching:', e);
        }
      }
      
      // Remove from pending requests
      const updatedRequests = pendingRequests.filter(r => r.id !== currentRequest.id);
      setPendingRequests(updatedRequests);
      
      // Update localStorage
      localStorage.setItem('pendingApprovals', JSON.stringify(updatedRequests));
      
      // Move to next request if available
      setCurrentRequest(updatedRequests.length > 0 ? updatedRequests[0] : null);
    } catch (error) {
      console.error('Error handling approval decision:', error);
    }
  };
  
  // No dialog if no current request
  if (!currentRequest) {
    return null;
  }
  
  // Format args for display
  const formatArgs = (args: any) => {
    if (!args) return 'null';
    try {
      return typeof args === 'string' ? args : JSON.stringify(args, null, 2);
    } catch (e) {
      return String(args);
    }
  };
  
  // Render the dialog
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-xl overflow-hidden rounded-lg bg-white dark:bg-gray-800">
        <div className="p-6">
          <h3 className="mb-2 text-xl font-semibold">Tool Approval Required</h3>
          <p className="mb-4 text-gray-500 dark:text-gray-400">
            The assistant wants to use a tool that requires your approval:
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-medium">Tool</h4>
              <div className="mt-1 rounded bg-gray-100 p-2 text-gray-900 dark:bg-gray-700 dark:text-gray-100">
                {currentRequest.toolName}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium">Arguments</h4>
              <pre className="mt-1 max-h-60 overflow-auto rounded bg-gray-100 p-2 text-sm text-gray-900 dark:bg-gray-700 dark:text-gray-100">
                {formatArgs(currentRequest.args)}
              </pre>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-2">
            <button
              className="rounded bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleDecision(false)}
            >
              Deny
            </button>
            <button
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              onClick={() => handleDecision(true)}
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
