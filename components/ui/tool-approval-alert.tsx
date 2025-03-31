"use client";

import { useEffect, useState } from 'react';

export function ToolApprovalAlert() {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Check for pending approvals in localStorage
    const checkPendingApprovals = () => {
      try {
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        setCount(pendingApprovals.length);
        setShow(pendingApprovals.length > 0);
      } catch (e) {
        console.error('Error checking pending approvals:', e);
      }
    };
    
    // Check immediately
    checkPendingApprovals();
    
    // Set up event listener for approval requests
    const handleApprovalRequest = () => {
      checkPendingApprovals();
    };
    
    // Listen for custom event
    window.addEventListener('approval-request', handleApprovalRequest);
    
    // Also set up a storage listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pendingApprovals') {
        checkPendingApprovals();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Poll as a backup
    const interval = setInterval(checkPendingApprovals, 500);
    
    return () => {
      window.removeEventListener('approval-request', handleApprovalRequest);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  if (!show) {
    return null;
  }
  
  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex items-center rounded-lg bg-red-600 px-4 py-2 text-white shadow-lg"
      onClick={() => {
        // This will bring focus to any open dialogs
        window.dispatchEvent(new CustomEvent('focus-approval-dialog'));
      }}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="mr-2 h-6 w-6" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
      <div>
        <div className="font-medium">Tool Approval Required</div>
        <div className="text-sm">{count} pending {count === 1 ? 'request' : 'requests'}</div>
      </div>
    </div>
  );
}
