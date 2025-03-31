"use client";

import { useState, useEffect, useRef } from 'react';

interface ApprovalRequest {
  id: string;
  toolName: string;
  toolServer?: string;
  args: any;
  timestamp: number;
  callingContext: string;
}

export function useApprovalChecker(pollingInterval = 500) {
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [currentApproval, setCurrentApproval] = useState<ApprovalRequest | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const processingIdRef = useRef<string | null>(null);

  // Poll for pending approvals
  useEffect(() => {
    let mounted = true;
    
    const checkForApprovals = async () => {
      if (isChecking || isSubmitting) return;
      
      try {
        setIsChecking(true);
        const response = await fetch('/api/approval-state');
        
        if (!response.ok) {
          throw new Error('Failed to check for pending approvals');
        }
        
        const data = await response.json();
        
        if (mounted) {
          if (data.pendingApprovals && data.pendingApprovals.length > 0) {
            // Filter out any approvals we're already processing
            const newApprovals = data.pendingApprovals.filter(
              (a: ApprovalRequest) => a.id !== processingIdRef.current
            );
            
            if (newApprovals.length > 0) {
              console.log('🔔 Found pending approvals:', newApprovals.length);
              setPendingApprovals(newApprovals);
              
              // Set the first approval as current if we don't have one
              if (!currentApproval && !processingIdRef.current) {
                setCurrentApproval(newApprovals[0]);
              }
            }
          } else if (data.pendingApprovals && data.pendingApprovals.length === 0) {
            // Only clear approvals if we're not currently processing one
            if (!processingIdRef.current) {
              if (pendingApprovals.length > 0) {
                setPendingApprovals([]);
              }
              if (currentApproval) {
                setCurrentApproval(null);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking for approvals:', error);
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };
    
    // Immediately check
    checkForApprovals();
    
    // Set up polling
    const intervalId = setInterval(checkForApprovals, pollingInterval);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [pollingInterval, isChecking, isSubmitting, currentApproval, pendingApprovals.length]);

  // Function to submit approval decision
  const submitDecision = async (requestId: string, approved: boolean) => {
    if (isSubmitting || processingIdRef.current) {
      console.log('Already submitting a decision, please wait...');
      return false;
    }
    
    try {
      // Mark as submitting and store the ID
      setIsSubmitting(true);
      processingIdRef.current = requestId;
      
      console.log(`Submitting decision for ${requestId}: ${approved ? 'APPROVED' : 'DENIED'}`);
      
      // Clear current approval immediately for better UX
      setCurrentApproval(null);
      
      const response = await fetch('/api/approval-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          approved
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit approval decision');
      }
      
      // Update pending approvals - remove the one we just processed
      setPendingApprovals(prev => prev.filter(a => a.id !== requestId));
      
      return true;
    } catch (error) {
      console.error('Error submitting approval decision:', error);
      return false;
    } finally {
      // Clear submission state after a delay to prevent flicker
      setTimeout(() => {
        setIsSubmitting(false);
        processingIdRef.current = null;
      }, 2000);
    }
  };

  return {
    pendingApprovals,
    currentApproval,
    submitDecision,
    isChecking,
    isSubmitting
  };
}
