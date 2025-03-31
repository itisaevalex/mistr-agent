"use client";

import React from 'react';

interface UltraSimpleIndicatorProps {
  isLoading: boolean;
}

export function UltraSimpleIndicator({ isLoading }: UltraSimpleIndicatorProps) {
  if (!isLoading) {
    return null;
  }
  
  return (
    <div className="my-2 rounded-md bg-gray-100 p-3 dark:bg-gray-700/50">
      <div className="flex items-center">
        <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        <div className="text-gray-700 dark:text-gray-300">
          Processing request...
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        This might involve searching for information or using other tools.
      </div>
    </div>
  );
}
