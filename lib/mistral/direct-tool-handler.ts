/**
 * Direct tool handler that ensures approval dialogs are shown
 */

import { SecurityManager } from './security-manager';
import { toolLogger } from './tool-logger';

/**
 * Direct tool handler wrapper that enforces security checks
 */
export class DirectToolHandler {
  private securityManager: SecurityManager;
  
  constructor(securityManager: SecurityManager) {
    this.securityManager = securityManager;
    toolLogger.log("DirectToolHandler initialized with security manager");
  }
  
  /**
   * Handle a tool call with security checks
   */
  async handleToolCall(
    toolName: string,
    args: any,
    originalHandler: (args: any) => Promise<any>,
    serverId?: string
  ): Promise<any> {
    try {
      toolLogger.log(`DirectToolHandler checking tool call: ${toolName}`);
      
      // Always register the tool if it's not already registered
      if (!this.securityManager['toolPolicies'][toolName]) {
        toolLogger.log(`Registering security policy for previously unknown tool: ${toolName}`);
        this.securityManager.registerToolPolicy(toolName, {
          requiresApproval: true,
          maxCallsPerMinute: 30
        });
      }
      
      // Perform security check with explicit approval
      const securityResult = await this.securityManager.checkToolCall(
        toolName,
        args,
        serverId,
        `Tool call from UI: ${new Date().toISOString()}`
      );
      
      if (!securityResult.allowed) {
        toolLogger.warn(`Tool call rejected by security manager: ${toolName}`, securityResult.reason);
        throw new Error(`Security check failed: ${securityResult.reason}`);
      }
      
      // Call the original handler
      toolLogger.log(`Executing approved tool call: ${toolName}`);
      const result = await originalHandler(args);
      toolLogger.log(`Tool call completed: ${toolName}`);
      
      return result;
    } catch (error) {
      toolLogger.error(`Error handling tool call: ${toolName}`, error);
      throw error;
    }
  }
}
