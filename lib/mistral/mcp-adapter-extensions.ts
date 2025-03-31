/**
 * Extensions to the MCP Adapter class
 * This file adds additional functionality to the McpAdapter without modifying the original file
 */

import { McpAdapter } from './mcp-adapter';
import { SecurityManager } from './security-manager';

// Extend the McpAdapter prototype to add new methods
declare module './mcp-adapter' {
  interface McpAdapter {
    replaceSecurityManager(securityManager: SecurityManager): void;
  }
}

// Add a method to replace the security manager
McpAdapter.prototype.replaceSecurityManager = function(securityManager: SecurityManager): void {
  console.log('Replacing security manager in MCP adapter');
  
  // Store the original security manager
  const originalSecurityManager = this.getSecurityManager();
  
  // Replace the security manager
  (this as any).securityManager = securityManager;
  
  console.log('Security manager successfully replaced');
};
