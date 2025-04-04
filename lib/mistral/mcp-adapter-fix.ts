// This patch needs to be applied to the executeToolCalls method in mcp-adapter.ts

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
      
      // NOTE: No longer requesting approval here as it's already happened in the hooks
      // Just log the security check for debugging purposes
      
      const context = `conversation-${Array.from(this.conversations.keys())[0] || 'unknown'}`;
      console.log(`Processing tool call: ${name} from ${toolServer || 'unknown'} in context ${context}`);
      
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