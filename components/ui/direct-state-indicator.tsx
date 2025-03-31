"use client";

import React, { useState, useEffect } from 'react';

interface DirectStateIndicatorProps {
  isLoading: boolean;
}

export function DirectStateIndicator({ isLoading }: DirectStateIndicatorProps) {
  const [toolName, setToolName] = useState<string | null>(null);
  
  // Look for console logs that indicate tool usage
  useEffect(() => {
    if (!isLoading) {
      setToolName(null);
      return;
    }
    
    // Create a proxy for console.log
    const originalLog = console.log;
    
    console.log = function(...args: any[]) {
      // Call original function
      originalLog.apply(console, args);
      
      // Check for tool usage
      if (typeof args[0] === 'string') {
        const message = args[0];
        
        // Match "Processing tool call: toolName"
        const toolMatch = /Processing tool call: (\w+)/.exec(message);
        if (toolMatch && toolMatch[1]) {
          setToolName(toolMatch[1]);
        }
        
        // Reset when tool execution completes
        if (message.includes('executed successfully')) {
          setToolName(null);
        }
      }
    };
    
    // Restore original log on cleanup
    return () => {
      console.log = originalLog;
    };
  }, [isLoading]);
  
  if (!isLoading) {
    return null;
  }
  
  return (
    <div className="my-2 rounded-md bg-gray-100 p-3 dark:bg-gray-700/50">
      <div className="flex items-center">
        <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        
        {toolName ? (
          <div className="text-gray-700 dark:text-gray-300">
            Using tool: <span className="font-medium text-blue-600 dark:text-blue-400">{toolName}</span>
          </div>
        ) : (
          <div className="text-gray-700 dark:text-gray-300">
            Thinking...
          </div>
        )}
      </div>
    </div>
  );
}
