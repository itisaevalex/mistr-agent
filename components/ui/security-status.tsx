import React from 'react';

interface SecurityStatusProps {
  status: 'initializing' | 'active' | 'simplified' | 'disabled' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

/**
 * Component for displaying the current security status
 */
export function SecurityStatus({ status, errorMessage, onRetry }: SecurityStatusProps) {
  // If security is active and working fine, don't show anything
  if (status === 'active') {
    return null;
  }
  
  const getStatusDetails = () => {
    switch (status) {
      case 'initializing':
        return {
          icon: (
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          ),
          title: 'Initializing Security',
          message: 'Setting up security features. This should only take a moment...',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-800 dark:text-blue-200',
          messageColor: 'text-blue-700 dark:text-blue-300',
          buttonColor: 'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/60'
        };
        
      case 'simplified':
        return {
          icon: (
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          ),
          title: 'Simplified Security Mode',
          message: 'Using simplified security with auto-approval for common tools. This is suitable for personal use.',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          messageColor: 'text-yellow-700 dark:text-yellow-300',
          buttonColor: 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-200 dark:hover:bg-yellow-900/60'
        };
        
      case 'disabled':
        return {
          icon: (
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ),
          title: 'Security Disabled',
          message: 'Security features are currently disabled. Tools will run without verification.',
          bg: 'bg-gray-50 dark:bg-gray-800/50',
          textColor: 'text-gray-800 dark:text-gray-200',
          messageColor: 'text-gray-700 dark:text-gray-300',
          buttonColor: 'bg-gray-50 text-gray-800 hover:bg-gray-100 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-800/90'
        };
        
      case 'error':
      default:
        return {
          icon: (
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          title: 'Security Error',
          message: 'There was a problem initializing security features. A simplified version is active.',
          bg: 'bg-red-50 dark:bg-red-900/20',
          textColor: 'text-red-800 dark:text-red-200',
          messageColor: 'text-red-700 dark:text-red-300',
          buttonColor: 'bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60'
        };
    }
  };
  
  const details = getStatusDetails();
  
  return (
    <div className={`my-4 rounded-md p-4 ${details.bg}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {details.icon}
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${details.textColor}`}>
            {details.title}
          </h3>
          <div className={`mt-2 text-sm ${details.messageColor}`}>
            <p>{details.message}</p>
            {errorMessage && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Error details: {errorMessage}
              </p>
            )}
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className={`rounded-md px-2 py-1.5 text-sm font-medium ${details.buttonColor}`}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
