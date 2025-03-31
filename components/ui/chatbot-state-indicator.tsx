"use client";

import React, { useEffect, useState, useRef } from "react";
import { useApprovalChecker } from '../../hooks/use-approval-checker';

interface ChatbotStateIndicatorProps {
  conversationId: string | null;
  pollingInterval?: number; // How often to check for state updates (ms)
}

type ChatbotState = 'idle' | 'thinking' | 'using_tool' | 'awaiting_confirmation';

interface StateData {
  conversationId: string;
  state: ChatbotState;
  toolName?: string;
  lastUpdated: number;
  pendingToolCalls?: any[]; // For awaiting_confirmation state
}

interface ApprovalStatusEvent {
  status: 'started' | 'approved' | 'denied';
  id?: string;
}

export function ChatbotStateIndicator({ 
  conversationId,
  pollingInterval = 2000 // Poll every 2 seconds
}: ChatbotStateIndicatorProps) {
  const [stateData, setStateData] = useState<StateData | null>(null);
  const [pollCount, setPollCount] = useState(0); // For debugging
  const [manualState, setManualState] = useState<string | null>(null);
  const manualStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get access to the approval checker for handling tool decisions
  const { currentApproval, submitDecision } = useApprovalChecker();
  
  // Listen for approval status changes from the dialog
  useEffect(() => {
    const handleApprovalStatusChange = (event: CustomEvent<ApprovalStatusEvent>) => {
      const { status } = event.detail;
      
      if (status === 'approved') {
        // Show processing state immediately without waiting for the next poll
        setManualState('processing');
        
        // Clear any existing timeout
        if (manualStateTimeoutRef.current) {
          clearTimeout(manualStateTimeoutRef.current);
        }
        
        // Set a timeout to clear the manual state
        manualStateTimeoutRef.current = setTimeout(() => {
          setManualState(null);
        }, 10000); // Keep showing processing for up to 10 seconds
      } else if (status === 'denied') {
        // Show temporary denied state
        setManualState('denied');
        
        // Clear any existing timeout
        if (manualStateTimeoutRef.current) {
          clearTimeout(manualStateTimeoutRef.current);
        }
        
        // Set a shorter timeout for denied state
        manualStateTimeoutRef.current = setTimeout(() => {
          setManualState(null);
        }, 3000);
      }
    };
    
    // Add custom event listener for approval status changes
    window.addEventListener('approval-status-change', 
      handleApprovalStatusChange as EventListener);
    
    return () => {
      // Clean up event listener and timeout on unmount
      window.removeEventListener('approval-status-change', 
        handleApprovalStatusChange as EventListener);
      
      if (manualStateTimeoutRef.current) {
        clearTimeout(manualStateTimeoutRef.current);
      }
    };
  }, []);
  
  // Fetch the current state
  useEffect(() => {
    if (!conversationId) {
      return;
    }
    
    let mounted = true;
    
    const fetchState = async () => {
      try {
        const response = await fetch(`/api/state?conversationId=${conversationId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch chatbot state');
        }
        
        const data = await response.json();
        
        if (mounted) {
          // Log state changes for debugging
          if (!stateData || 
              stateData.state !== data.state || 
              stateData.toolName !== data.toolName) {
            console.log(`🔄 State changed to: ${data.state}${data.toolName ? ` (Tool: ${data.toolName})` : ''}`);
          }
          
          setStateData(data);
          setPollCount(prev => prev + 1);

          // ---> START AUTO-APPROVAL LOGIC <---
          if (data.state === 'awaiting_confirmation' && data.pendingToolCalls && data.pendingToolCalls.length > 0) {
            const autoApprove = localStorage.getItem('autoApproveTools') === 'true';
            if (autoApprove) {
              console.log("🤖 Auto-approving tool calls...");
              data.pendingToolCalls.forEach(async (toolCall: any) => {
                if (toolCall.id) {
                  try {
                    await fetch('/api/tool_decision', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        conversationId: conversationId,
                        toolCallId: toolCall.id,
                        decision: 'approve'
                      }),
                    });
                    console.log(`✅ Auto-approved tool call: ${toolCall.id}`);
                     // Optionally, trigger a state refetch or manual state update here
                     // For now, rely on the next poll cycle to reflect the change.
                     // setManualState('processing'); // Example manual update
                  } catch (approvalError) {
                    console.error(`❌ Failed to auto-approve tool call ${toolCall.id}:`, approvalError);
                  }
                } else {
                  console.warn("⚠️ Pending tool call missing ID, cannot auto-approve:", toolCall);
                }
              });
            }
          }
          // ---> END AUTO-APPROVAL LOGIC <---

        }
      } catch (error) {
        console.error('Error fetching chatbot state:', error);
      }
    };
    
    // Poll for state changes
    fetchState();
    const interval = setInterval(fetchState, pollingInterval);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [conversationId, pollingInterval]); 
  
  // If no state data or idle state, render default "thinking" state
  if (!stateData || stateData.state === 'idle') {
    return (
      <div className="my-3 rounded-md bg-gray-100 p-4 dark:bg-gray-700/50">
        <div className="flex items-center">
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <div className="text-base text-gray-700 dark:text-gray-300">
            Thinking...
          </div>
        </div>
      </div>
    );
  }
  
  // Determine what to render based on manual state override or actual state
  const renderState = manualState || stateData.state;
  
  return (
    <div className="my-3 rounded-md bg-gray-100 p-4 dark:bg-gray-700/50">
      <div className="flex items-center">
        {/* Show spinner for all states except denied */}
        {renderState !== 'denied' && (
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        )}
        
        {/* Different icon for denied state */}
        {renderState === 'denied' && (
          <div className="mr-3 h-5 w-5 flex items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
        )}
        
        {/* Content based on state */}
        {renderState === 'thinking' && (
          <div className="text-base text-gray-700 dark:text-gray-300">
            Thinking...
          </div>
        )}
        
        {renderState === 'using_tool' && stateData.toolName && (
          <div className="text-base text-gray-700 dark:text-gray-300">
            Using tool: <span className="font-medium text-blue-600 dark:text-blue-400">{stateData.toolName}</span>
          </div>
        )}
        
        {renderState === 'awaiting_confirmation' && (
          <div className="text-base text-gray-700 dark:text-gray-300">
            Waiting for approval...
          </div>
        )}
        
        {renderState === 'processing' && (
          <div className="text-base text-blue-600 dark:text-blue-400 font-medium">
            Processing request...
          </div>
        )}
        
        {renderState === 'denied' && (
          <div className="text-base text-red-600 dark:text-red-400 font-medium">
            Tool use denied
          </div>
        )}
      </div>
    </div>
  );
}
