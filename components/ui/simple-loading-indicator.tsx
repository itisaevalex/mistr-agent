"use client";

import React from 'react';

interface SimpleLoadingIndicatorProps {
  message?: string;
}

export default function SimpleLoadingIndicator({ message = "Processing..." }: SimpleLoadingIndicatorProps) {
  return (
    <div className="flex items-center space-x-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
      <div className="text-gray-700 dark:text-gray-300">{message}</div>
    </div>
  );
}
