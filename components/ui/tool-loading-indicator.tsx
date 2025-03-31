"use client";

import React from "react";

interface ToolLoadingIndicatorProps {
  toolName?: string;
  message?: string;
}

export function ToolLoadingIndicator({ 
  toolName, 
  message = "Processing request..." 
}: ToolLoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center space-y-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
      <div className="flex items-center space-x-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        <div className="font-medium">
          {toolName ? (
            <>Using tool: <span className="text-blue-600 dark:text-blue-400">{toolName}</span></>
          ) : (
            "Processing..."
          )}
        </div>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{message}</div>
    </div>
  );
}
