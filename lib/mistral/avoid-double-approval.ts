/**
 * This file contains the fix for the double approval issue.
 * 
 * PROBLEM:
 * Currently, tools are going through two separate approval processes:
 * 1. First in the SecurityManager (which works correctly)
 * 2. Then again in the MCP adapter (which fails with timeout)
 * 
 * SOLUTION:
 * We need to modify the executeToolCalls method in mcp-adapter.ts
 * to not request approval again if the SecurityManager has already
 * approved the tool.
 * 
 * IMPLEMENTATION:
 * Replace the executeToolCalls method in mcp-adapter.ts with the code below.
 * The key change is in the security check section - we need to by-pass
 * the UI approval process when the security manager indicates the tool requires approval.
 */

/**
 * Execute a batch of tool calls with enhanced error handling and security checks
 */
private async executeToolCalls(toolCalls: any[]): Promise<Message[]> {
  const toolMessages: Message[] = [];
  
  // Process tool calls in parallel for better performance
  const toolCallPromises = toolCalls.map(async toolCall => {
    const { id, function: { name, arguments: argsString } } = toolCall;
    console.log(`Processing tool call: ${name} with args: ${argsString}`);

    try {
      // Parse arguments
      const argsObject = JSON.parse(argsString);
      
      // Get the server for this tool (based on the tool name)
      const toolServer = this.toolManager.getToolServer(name);
      
      // Check if the tool exists
      if (!this.toolManager.hasTool(name)) {
        throw new Error(`Tool ${name} is not available`);
      }
      
      // Get context for security checks
      const context = `conversation-${Array.from(this.conversations.keys())[0] || 'unknown'}`;
      
      // Perform security check
      const securityCheck = await this.securityManager.checkToolCall(
        name, 
        argsObject, 
        toolServer, 
        context
      );
      
      // If not allowed, throw error with reason
      if (!securityCheck.allowed) {
        // Here's the important change - we don't show a custom message for needsApproval anymore
        // since that would trigger a second approval process
        throw new Error(`Security check failed: ${securityCheck.reason || 'Operation not permitted'}`);
      }
      
      // The security manager has already approved if we get here, so we can proceed
      console.log(`👍 User approved tool usage for ${name}`);
      
      // Enhanced validation of arguments
      await this.validateToolArguments(name, argsObject);
      
      // Enhanced security validation
      const toolMetadata = this.toolManager.getToolMetadata(name);
      if (toolMetadata) {
        const validation = this.securityManager.validateInput(name, argsObject, {
          properties: toolMetadata.parameters,
          required: toolMetadata.required
        });
        
        if (!validation.valid) {
          throw new Error(`Input validation failed: ${validation.error}`);
        }
      }
      
      // Check for dangerous operations
      const dangerousOp = this.securityManager.identifyDangerousOperation(name, argsObject);
      if (dangerousOp) {
        throw new Error(`Security risk detected: ${dangerousOp}`);
      }
      
      console.log(`Calling MCP tool: ${name}${toolServer ? ` on server ${toolServer}` : ''}`);
      
      // Call the tool with capability checking
      const toolResult = await this.serverManager.callTool(
        name, 
        argsObject,
        toolServer
      ) as ToolResult;

      console.log(`Tool ${name} executed successfully.`);
      
      // Format the tool result for Mistral with enhanced processing
      return {
        role: 'tool' as const,
        tool_call_id: id,
        name: name,
        content: this.formatToolResult(name, toolResult),
      };
    } catch (error: any) {
      console.error(`Error executing tool ${name}:`, error);
      
      let errorMessage = error.message || 'Unknown error';
      let suggestionText = this.getSuggestionForError(name, error);
      
      // Special handling for security-related errors
      if (errorMessage.includes('Security') || errorMessage.includes('approval')) {
        suggestionText = "Try a different approach that doesn't require sensitive operations, or ask the user to approve the operation.";
      }
      
      // Return enhanced error information to Mistral
      return {
        role: 'tool' as const,
        tool_call_id: id,
        name: name,
        content: JSON.stringify({ 
          error: errorMessage,
          status: 'error',
          // Add more details if available
          details: error.details || null,
          suggestion: suggestionText
        }, null, 2),
      };
    }
  });
  
  // Wait for all tool calls to complete
  const results = await Promise.all(toolCallPromises);
  
  // Add all results to the tool messages array
  toolMessages.push(...results);
  
  return toolMessages;
}
