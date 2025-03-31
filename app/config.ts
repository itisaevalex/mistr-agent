// Configuration for the application
export const config = {
  // Security configuration
  security: {
    // Security mode: 'full', 'simplified', or 'none'
    // Default to 'full' for now to test approval dialogs
    mode: process.env.NEXT_PUBLIC_SECURITY_MODE || 'full',
    
    // Timeout for security manager initialization (ms)
    initTimeout: 30000,
    
    // Auto-approve common tools
    autoApproveCommonTools: false,
    
    // Debug mode - logs all tool calls
    debug: true
  },
  
  // API configuration
  apiTimeout: 60000, // Increased timeout for API calls
  
  // Environment configuration
  devMode: process.env.NODE_ENV === 'development'
};
