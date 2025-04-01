"use client";

import React, { useState } from 'react';

// Simple standalone test dialog to debug UI issues
export default function TestApprovalDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Example request
  const exampleRequest = {
    id: "test-request-1",
    toolName: "perplexity_search_web",
    toolServer: "perplexity-direct-uvx",
    args: {
      query: "latest news",
      recency: "day"
    },
    timestamp: Date.now()
  };

  React.useEffect(() => {
    if (isOpen && autoApprove && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(c => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isOpen && autoApprove && countdown === 0) {
      handleApprove();
    }
  }, [isOpen, autoApprove, countdown]);

  const handleApprove = () => {
    console.log("Approval granted!");
    setIsOpen(false);
  };

  const handleDeny = () => {
    console.log("Approval denied!");
    setIsOpen(false);
  };

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

  return (
    <div className="p-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Approval Dialog Test</h1>
      
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
      >
        Show Test Dialog
      </button>

      {isOpen && (
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
                    {exampleRequest.toolName}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-lg">Server</h4>
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 text-gray-900 dark:text-gray-100">
                    {exampleRequest.toolServer}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-lg">Arguments</h4>
                  <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 overflow-auto max-h-60 text-sm text-gray-900 dark:text-gray-100">
                    {formatArgs(exampleRequest.args)}
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
                  onClick={handleDeny}
                >
                  Deny
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={handleApprove}
                >
                  {autoApprove ? `Approve (${countdown}s)` : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
