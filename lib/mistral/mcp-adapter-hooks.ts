/**
 * Direct hooks into the MCP Adapter
 */

import { McpAdapter } from './mcp-adapter';
import { toolStateManager } from './tool-state-manager';

/**
 * Install hooks for the McpAdapter to track tool usage
 * This uses a direct approach to hook into the adapter's methods
 */
export function installMcpAdapterHooks(adapter: McpAdapter) {
  // Only patch once
  if ((adapter as any).__hooksInstalled) {
    return;
  }
  
  console.log('📡 Installing MCP Adapter hooks to track tool usage...');
  
  try {
    // Get the prototype to patch methods
    const proto = Object.getPrototypeOf(adapter);
    
    // Patch the executeToolCalls method to track tool execution
    const originalExecToolCalls = proto.executeToolCalls;
    
    if (originalExecToolCalls) {
      proto.executeToolCalls = async function(toolCalls: any[]) {
        const conversationId = Array.from(this.conversations.keys())[0];
        
        if (conversationId && toolCalls.length > 0) {
          const firstTool = toolCalls[0];
          const toolName = firstTool?.function?.name;
          
          if (toolName) {
            console.log(`🔧 STARTING TOOL: ${toolName} for conversation ${conversationId}`);
            
            // Update the state to using_tool
            await toolStateManager.startToolUsage(conversationId, toolName);
          }
        }
        
        // Call the original method
        try {
          const result = await originalExecToolCalls.apply(this, arguments);
          
          // Tool execution completed
          if (conversationId) {
            console.log(`✅ TOOL COMPLETED for conversation ${conversationId}`);
            await toolStateManager.endToolUsage();
          }
          
          return result;
        } catch (error) {
          // Tool execution failed
          if (conversationId) {
            console.log(`❌ TOOL FAILED for conversation ${conversationId}:`, error);
            await toolStateManager.endToolUsage();
          }
          
          throw error;
        }
      };
      
      // Patch the sendMessage method to track when processing starts/ends
      const originalSendMessage = proto.sendMessage;
      
      if (originalSendMessage) {
        proto.sendMessage = async function(conversationId: string, prompt: string) {
          console.log(`📨 STARTING MESSAGE for conversation ${conversationId}`);
          
          // Update the state to thinking
          await toolStateManager.setThinking(conversationId);
          
          try {
            const result = await originalSendMessage.apply(this, arguments);
            
            // Processing completed
            console.log(`📩 MESSAGE COMPLETED for conversation ${conversationId}`);
            await toolStateManager.setIdle(conversationId);
            
            return result;
          } catch (error) {
            // Processing failed
            console.log(`📉 MESSAGE FAILED for conversation ${conversationId}:`, error);
            await toolStateManager.setIdle(conversationId);
            
            throw error;
          }
        };
      }
      
      // Mark as patched
      (adapter as any).__hooksInstalled = true;
      
      console.log('✅ MCP Adapter hooks installed successfully!');
    } else {
      console.error('❌ Could not find executeToolCalls method to patch');
    }
  } catch (error) {
    console.error('❌ Failed to install MCP Adapter hooks:', error);
  }
}
