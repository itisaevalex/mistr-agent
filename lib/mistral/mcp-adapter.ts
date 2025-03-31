// src/with-mcp/mcp-adapter.ts
import { ToolManager } from './tool-manager';
import { MistralClient, Message, ToolCall } from './mistral-client';
import { Config } from './config';
import { McpServerManager } from './mcp-server-manager';
import { loadMcpConfig } from './config/config-loader';
import { SecurityManager, ToolApprovalRequest } from './security-manager';
import { NegotiatedCapabilities } from './mcp-types';
import { ToolStateManager } from './tool-state-manager';
import { updateConversationHistory } from './conversation-store';

// Define the expected structure of toolResult
interface ToolResult { // Structure returned by individual tool execution
    tool_call_id: string;
    output: any;
}

// Define a general response format for the adapter's public methods
interface ResponseFormat {
    content: string | null;
    toolCalls?: ToolCall[];
    state?: string; // Can include states like 'awaiting_confirmation'
}

// Define error response shape for tool execution errors
interface ToolErrorResponse {
    error: string;
    status: 'error';
    details?: string | null;
    suggestion: string;
    expectedSchema?: {
        properties: Record<string, any>;
        required?: string[];
    };
    parameterMap?: Record<string, string>;
}

// Define validation error interface
interface ValidationError extends Error {
    expectedSchema?: {
        properties: Record<string, any>;
        required?: string[];
    };
    parameterMap?: Record<string, string>;
}

export class McpAdapter {
    private toolManager: ToolManager;
    private client: MistralClient;
    private conversations: Map<string, Message[]> = new Map();
    private config: Config;
    private serverManager: McpServerManager;
    private securityManager: SecurityManager;
    private toolStateManager: ToolStateManager;
    private initialized: boolean = false;

    constructor(config: Config, toolManager: ToolManager, toolStateManager: ToolStateManager, mcpConfigPath?: string) {
        this.toolManager = toolManager;
        this.config = config;
        this.client = new MistralClient(this.config);
        this.toolStateManager = toolStateManager;
        
        // Load MCP configuration
        const mcpConfig = loadMcpConfig(mcpConfigPath);
        this.serverManager = new McpServerManager(mcpConfig);
        
        // Initialize security manager
        this.securityManager = new SecurityManager();
        
        // Set approval callback - this would be connected to the UI in a full implementation
        this.securityManager.setApprovalCallback(this.handleToolApprovalRequest.bind(this));
        
        // Initialize MCP servers
        this.initializeServers().catch(error => {
            console.error("Failed to initialize MCP servers:", error);
        });
    }
    
    /**
     * Handle tool approval request - this is a placeholder that would be connected to the UI
     * In a real implementation, this would show a dialog to the user and return their choice
     */
    private async handleToolApprovalRequest(request: ToolApprovalRequest): Promise<boolean> {
        console.log('Tool approval request:', request);
        
        // In a real implementation, this would show a dialog to the user
        // For now, we'll automatically approve non-dangerous operations
        const dangerousOperation = this.securityManager.identifyDangerousOperation(
            request.toolName, 
            request.args
        );
        
        if (dangerousOperation) {
            console.warn(`Automatically denying dangerous operation: ${dangerousOperation}`);
            return false;
        }
        
        // For demonstration purposes, we'll approve all other requests
        // In a real implementation, this would await user input
        console.log(`Automatically approving non-dangerous operation: ${request.toolName}`);
        return true;
    }

    /**
     * Initialize servers and register available features
     */
    private async initializeServers(): Promise<void> {
        try {
            // Connect to all servers
            await this.serverManager.initializeServers();
            
            // Register tools from servers that support the tools capability
            await this.discoverAndRegisterTools();
            
            this.initialized = true;
            console.log("MCP adapter initialization completed successfully");
        } catch (error) {
            console.error("Error during MCP initialization:", error);
            throw error;
        }
    }

    /**
     * Discover and register tools from all servers that support the tools capability
     */
    private async discoverAndRegisterTools(): Promise<void> {
        // Get all servers with tools capability
        const serversWithTools = this.serverManager.getServersWithFeature('tools');
        console.log(`Discovered ${serversWithTools.length} servers with tools capability`);
        
        // Get tools from each server
        for (const serverId of serversWithTools) {
            try {
                const server = this.serverManager.getServer(serverId);
                const capabilities = this.serverManager.getCapabilities(serverId);
                
                // Get tools from the server
                const toolsResult = await server.client.listTools();
                
                // Check if server supports tool list change notifications
                const supportsToolChanges = this.serverManager.hasCapability(
                    serverId,
                    'tools.listChanged'
                );
                
                // Register tools
                for (const tool of toolsResult.tools) {
                    this.toolManager.registerMcpTool(serverId, tool, capabilities);
                }
                
                // Set up tool list change listener if supported
                if (supportsToolChanges) {
                    this.toolManager.setupToolListChangeListener(
                        serverId,
                        server.client,
                        true
                    );
                }
                
                console.log(`Registered ${toolsResult.tools.length} tools from server ${serverId}`);
            } catch (error) {
                console.error(`Error discovering tools from server ${serverId}:`, error);
            }
        }
    }

    /**
     * Wait for server connection(s) to be established
     */
    async waitForConnection(serverId?: string, timeoutMs: number = 10000): Promise<void> {
        try {
            // Wait for server connection with a timeout
            const serverPromise = this.serverManager.waitForConnection(serverId, timeoutMs);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Connection timeout after ${timeoutMs}ms`)), timeoutMs);
            });
            
            // Race the connection promise against a timeout
            await Promise.race([serverPromise, timeoutPromise]);
            
            // If waiting for all servers, also wait for initialization to complete
            if (!serverId) {
                const startTime = Date.now();
                
                while (!this.initialized) {
                    if (Date.now() - startTime > timeoutMs) {
                        throw new Error(`MCP initialization timed out after ${timeoutMs}ms`);
                    }
                    
                    // Wait a bit and check again
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (error) {
            console.warn(`Wait for connection failed: ${error.message}`);
            // We still return normally here - the app will function without MCP if needed
        }
    }
    
    /**
     * Check if a specific feature is supported by any server
     */
    hasFeature(feature: keyof NegotiatedCapabilities): boolean {
        const serversWithFeature = this.serverManager.getServersWithFeature(feature);
        return serversWithFeature.length > 0;
    }
    
    /**
     * Get capabilities for a specific server
     */
    getServerCapabilities(serverId: string): NegotiatedCapabilities | undefined {
        return this.serverManager.getCapabilities(serverId);
    }
    
    /**
     * Get all server capabilities
     */
    getAllServerCapabilities(): Record<string, NegotiatedCapabilities> {
        const result: Record<string, NegotiatedCapabilities> = {};
        
        // Get all servers
        const servers = this.serverManager.getServers();
        
        for (const serverId of servers) {
            const capabilities = this.serverManager.getCapabilities(serverId);
            if (capabilities) {
                result[serverId] = capabilities;
            }
        }
        
        return result;
    }

    /**
     * Start a new conversation
     */
    async startConversation(): Promise<string> {
        const conversationId = Date.now().toString();
        this.conversations.set(conversationId, []);
        return conversationId;
    }

    /**
     * Send a message in a conversation with enhanced LLM integration
     */
    async sendMessage(conversationId: string, prompt: string, autoApprove: boolean = false): Promise<ResponseFormat> {
        if (!this.initialized) {
            throw new Error("MCP adapter is not fully initialized. Please wait for initialization to complete.");
        }

        if (!this.serverManager.isServerConnected()) {
            throw new Error("No MCP servers are connected. Please check server configuration.");
        }

        let conversation = this.conversations.get(conversationId);
        if (!conversation) {
            // Create new conversation with improved system prompt
            conversation = [];
            
            // Get available tool count for system prompt
            const allTools = this.toolManager.getMistralTools();
            const toolTypes = new Set(allTools.map(tool => {
                // Extract type from description or name
                const name = tool.function.name.toLowerCase();
                if (name.includes('weather')) return 'weather';
                if (name.includes('search') || name.includes('lookup')) return 'search';
                if (name.includes('calc')) return 'calculator';
                if (name.includes('file')) return 'file management';
                return 'utility';
            }));
            
            // Create a more informative system prompt based on available tools
            let systemPrompt = "You are a helpful assistant";
            
            if (allTools.length > 0) {
                systemPrompt += ` that can use ${allTools.length} different tools`;
                
                if (toolTypes.size > 0) {
                    const typesList = Array.from(toolTypes).join(', ');
                    systemPrompt += ` for ${typesList}`;
                }
                
                systemPrompt += ". Use these tools when appropriate to provide accurate and helpful information.";
            }
            
            conversation.push({
                role: 'system' as const, 
                content: systemPrompt
            });
            
            this.conversations.set(conversationId, conversation);
        }
        
        conversation.push({ role: 'user' as const, content: prompt });
        // Update history immediately after adding user message
        this.updateLocalConversationHistory(conversationId, conversation);
        
        // Get Mistral-compatible tools with enhanced descriptions
        const mistralTools = this.toolManager.getMistralTools();
        console.log(`Providing ${mistralTools.length} tools to Mistral`);
        
        // Call Mistral with enhanced logging
        console.log(`[${conversationId}] Sending initial message to Mistral...`);
        
        let response = await this.client.chat(conversation, { 
            tools: mistralTools, 
            toolChoice: 'auto' 
        });

        // Handle tool calls if present - enhanced version
        if (response.toolCalls && response.toolCalls.length > 0) {

            // ---> START AUTO-APPROVE CHECK <---
            if (autoApprove) {
                console.log(`[${conversationId}] Auto-approving: Handing off to processToolCalls...`);
                // Let processToolCalls handle the loop and final history saving
                // It expects the current history *before* the assistant's tool request
                const currentHistoryBeforeAssistantRequest = [...conversation];
                // processToolCalls will add the assistant request internally if needed
                const finalResponse = await this.processToolCalls(
                    conversationId,
                    response, // Pass the first response containing tool calls
                    currentHistoryBeforeAssistantRequest
                );
                // processToolCalls now returns the final ResponseFormat
                return finalResponse;
            } else {
                // ---> Original logic: PAUSE EXECUTION FOR USER CONFIRMATION --- <----
                console.log(`[${conversationId}] Tool calls detected. Pausing for user confirmation.`);
                
                // *** Update conversation history with messages up to this point ***
                // The caller (API route) is responsible for storing the full pending state 
                // using the returned information and the original Mistral response.
                await updateConversationHistory(conversationId, [...conversation]); // Pass only messages
                
                // Return intermediate state indicating confirmation needed
                return {
                    content: null, // No immediate content
                    toolCalls: response.toolCalls, // Send tool calls for frontend display
                    state: 'awaiting_confirmation' // Explicitly signal the state
                };
                // ---> END PAUSE LOGIC <-----
            }
            // ---> END AUTO-APPROVE CHECK <---
        }

        // No tool calls in the first response
        console.log(`[${conversationId}] No tool calls requested by Mistral.`);
        const assistantMessage = { 
            role: 'assistant' as const, 
            content: response.content,
            // Ensure tool_calls is null or undefined if none were returned
            tool_calls: undefined
        };
        conversation.push(assistantMessage);
        // Save the final history for this turn
        this.updateLocalConversationHistory(conversationId, conversation);
        
        // Return the direct response content
        return {
            content: response.content,
            toolCalls: undefined // Explicitly undefined
        };
    }

    /**
     * Process tool calls returned by the model, potentially involving multiple rounds.
     * Maintains correct history formatting to ensure Mistral API compatibility.
     */
    public async processToolCalls(
        conversationId: string,
        response: { toolCalls: ToolCall[], content: string | null },
        conversation: Message[]
    ): Promise<ResponseFormat> {
        let currentResponse = response;
        let currentConversation = [...conversation]; // Work on a mutable copy
        let maxRounds = 5; // Prevent infinite loops
        let round = 0;

        console.log(`[ProcessToolCalls-${conversationId}] Starting processing...`);

        while (currentResponse.toolCalls && currentResponse.toolCalls.length > 0 && round < maxRounds) {
            round++;
            console.log(`[ProcessToolCalls-${conversationId}] Processing round ${round}/${maxRounds}`);

            // --- Add Assistant Message Requesting Tools ---
            // Check if the last message is already the assistant message we need
            const lastMessage = currentConversation.length > 0 ? currentConversation[currentConversation.length - 1] : null;
            if (
                !(lastMessage?.role === 'assistant' &&
                JSON.stringify(lastMessage.tool_calls) === JSON.stringify(currentResponse.toolCalls))
            )
            {
                console.log(`[ProcessToolCalls-${conversationId}] Adding assistant message with ${currentResponse.toolCalls.length} tool calls to history`);
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: currentResponse.content, // Content from the message that included the tool calls
                    tool_calls: currentResponse.toolCalls
                };
                currentConversation.push(assistantMessage);
            } else {
                console.log(`[ProcessToolCalls-${conversationId}] Assistant message with tool calls already present.`);
            }
            // -----------------------------------------

            // --- Execute Tools ---
            console.log(`[ProcessToolCalls-${conversationId}] Executing ${currentResponse.toolCalls.length} tool calls.`);
            const toolMessages: Message[] = await this.executeToolCalls(currentResponse.toolCalls);
            console.log(`[ProcessToolCalls-${conversationId}] Finished executing tools.`);
            // Add results to temporary history
            currentConversation.push(...toolMessages);
            // --------------------

            // --- Call Mistral Again ---
            try {
                console.log(`[ProcessToolCalls-${conversationId}] Sending history (${currentConversation.length} msgs) with tool results back to Mistral.`);
                const nextApiResponse = await this.client.chat(currentConversation, {
                    toolChoice: 'auto'
                });
                console.log(`[ProcessToolCalls-${conversationId}] Received response from Mistral. Content: ${!!nextApiResponse.content}, Tool Calls: ${nextApiResponse.toolCalls?.length || 0}`);

                // Prepare for next iteration
                currentResponse = {
                    content: nextApiResponse.content,
                    toolCalls: nextApiResponse.toolCalls || []
                };

                // If this new response has NO tool calls, add the final assistant message now
                if (!currentResponse.toolCalls || currentResponse.toolCalls.length === 0) {
                    console.log(`[ProcessToolCalls-${conversationId}] Adding final assistant message.`);
                    const finalAssistantMessage: Message = {
                        role: 'assistant',
                        content: currentResponse.content,
                        tool_calls: undefined // Ensure tool_calls is not present
                    };
                    currentConversation.push(finalAssistantMessage);
                }

            } catch (error: any) {
                // ... (existing error handling, maybe return error responseformat) ...
                console.error(`[ProcessToolCalls-${conversationId}] ERROR calling Mistral API:`, error);
                
                // If we have status 400 with a "Not the same number of function calls and responses" error,
                // this suggests our history format is wrong. Log the specific error
                if (error.message && error.message.includes("400") && error.message.includes("Not the same number")) {
                    console.error(`[ProcessToolCalls-${conversationId}] History format error detected. Dumping full history for debugging:`);
                    currentConversation.forEach((msg, idx) => {
                        console.log(`  [${idx}] role=${msg.role}, ${JSON.stringify(msg)}`);
                    });
                }
                
                // Stop processing on API error
                this.updateLocalConversationHistory(conversationId, currentConversation); // Save history up to the error
                
                // Collect any tool calls that were made before the error
                const executedToolCalls: ToolCall[] = [];
                for (const message of currentConversation) {
                    if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
                        executedToolCalls.push(...message.tool_calls);
                    }
                }
                
                return { 
                    content: `Error communicating with Mistral after tool execution: ${error.message}`, 
                    // Include tool calls that were executed before the error
                    toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined 
                };
            }
            // --- End Call Mistral ---

            // Loop continues if currentResponse still has toolCalls
            if (!(currentResponse.toolCalls && currentResponse.toolCalls.length > 0)) {
                console.log(`[ProcessToolCalls-${conversationId}] No more tool calls in round ${round}. Exiting loop.`);
                break; // Exit loop if no more calls needed
            }
        } // End While Loop

        if (round >= maxRounds && currentResponse.toolCalls && currentResponse.toolCalls.length > 0) {
            // Handle max rounds case (existing code is okay)
            console.warn(`[ProcessToolCalls-${conversationId}] Reached maximum tool call rounds (${maxRounds}).`);
            // Return a message indicating we hit the limit
            const limitMessage: Message = { 
                role: 'assistant', 
                content: `I apologize, but I've reached the maximum number of tool call rounds (${maxRounds}). Let me summarize what I've learned so far: ${currentResponse.content || 'I was unable to complete all the requested tool operations.'}`
            };
            currentConversation.push(limitMessage);
            currentResponse.content = limitMessage.content; // Update content to return
            currentResponse.toolCalls = undefined; // Clear remaining calls
        }

        // --- SAVE FINAL HISTORY ONCE ---
        console.log(`[ProcessToolCalls-${conversationId}] Finished tool processing loop. Saving final history (${currentConversation.length} messages).`);
        this.updateLocalConversationHistory(conversationId, currentConversation);
        // --- END SAVE HISTORY ---

        // Collect all tool calls that were executed during this session
        // for inclusion in the response (for UI display purposes)
        const allToolCalls: ToolCall[] = [];
        
        // Scan through conversation to find all assistant messages with tool calls
        for (const message of currentConversation) {
            if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
                // Add any tool calls not already in the list
                for (const toolCall of message.tool_calls) {
                    // Check if this tool call is already in allToolCalls
                    const alreadyIncluded = allToolCalls.some(tc => tc.id === toolCall.id);
                    if (!alreadyIncluded) {
                        allToolCalls.push(toolCall);
                    }
                }
            }
        }

        console.log(`[ProcessToolCalls-${conversationId}] Finished processing. Returning final content with ${allToolCalls.length} total tool calls.`);
        
        return {
            content: currentResponse.content,
            // Include all tool calls in the response so UI can show what was executed
            toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined
        };
    }

    /**
     * Execute a batch of tool calls with enhanced error handling and schema feedback
     */
    private async executeToolCalls(toolCalls: ToolCall[]): Promise<Message[]> {
        const toolMessages: Message[] = [];
        
        console.log(`[ExecuteToolCalls] Processing ${toolCalls.length} tool calls in total`);
        
        // Process tool calls in parallel for better performance
        const toolCallPromises = toolCalls.map(async toolCall => {
            
            const { id, function: { name, arguments: argsString } } = toolCall;
            console.log(`Processing tool call: ${name}`);
            // --- Log arguments being passed --- 
            console.log(`Arguments for ${name} (ID: ${toolCall.id}):`, argsString);

            try {
                // Parse arguments
                const argsObject = JSON.parse(argsString);
                
                // Enhanced structured logging of tool call arguments
                console.log(`[ExecuteToolCalls] Structured arguments for ${name} (ID: ${id}):`);
                Object.entries(argsObject).forEach(([key, value]) => {
                    console.log(`  - ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                });
                
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
                    if (securityCheck.needsApproval) {
                        throw new Error(`Tool execution requires user approval. Please try again.`);
                    } else {
                        throw new Error(`Security check failed: ${securityCheck.reason || 'Operation not permitted'}`);
                    }
                }
                
                // Log the expected tool schema to help with debugging
                this.logToolSchema(name);
                
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
                
                console.log(`[ExecuteToolCalls] About to call serverManager.callTool for ${name} (ID: ${toolCall.id})`); // Log before call
                
                // Call the tool with capability checking
                const toolResult = await this.serverManager.callTool(
                    name, 
                    argsObject,
                    toolServer
                );

                console.log(`[ExecuteToolCalls] RAW response received for ${name} (ID: ${toolCall.id}):`, toolResult);

                console.log(`Tool ${name} executed successfully.`);
                
                // --- Log raw result received --- 
                console.log(`Raw result from ${name} (ID: ${toolCall.id}):`, JSON.stringify(toolResult));

                // Format the tool result for Mistral with enhanced processing
                return {
                    role: 'tool' as const,
                    tool_call_id: id,
                    name: name,
                    content: this.formatToolResult(name, toolResult),
                };
            } catch (error: any) {
                console.error(`[ExecuteToolCalls] CAUGHT ERROR processing tool ${name} (ID: ${toolCall.id}):`, error.name, error.message);
            
                let errorMessage = error.message || 'Unknown error';
                let errorStatus = 'error';
                let suggestionText = "An unexpected error occurred. Please check the tool details or try again.";
                let errorDetails: string | null = null;
                let schemaFeedback: object | null = null; // To hold schema info
            
                // Handle Validation Errors with standardized format
                if (error.name === 'ValidationError') {
                  errorDetails = "Tool argument validation failed.";
                  
                  // Use the error message directly, as we've already formatted it nicely in validateToolArguments
                  suggestionText = errorMessage;
                  
                  // Add extra context based on error type
                  if (error.errorType === 'unknown_parameter') {
                    // For unknown parameters, highlight the fix needed very clearly
                    const match = errorMessage.match(/Did you mean "([^"]+)"/);
                    if (match && match[1]) {
                      suggestionText = `PARAMETER ERROR: ${errorMessage} Please update your call to use the correct parameter name.`;
                    }
                  }
                  
                  if (error.expectedSchema) {
                    // Format parameters for clear display
                    const propertiesFormatted = Object.entries(error.expectedSchema.properties || {})
                        .map(([key, val]: [string, any]) => `  "${key}": (${val.type || 'any'})${val.description ? ` - ${val.description}` : ''}`)
                        .join('\n');
                    
                    const requiredText = error.expectedSchema.required && error.expectedSchema.required.length > 0 
                      ? `Required parameters: ${error.expectedSchema.required.map(p => `"${p}"`).join(', ')}`
                      : 'No required parameters';
                    
                    // Create a very explicit, helpful schema feedback
                    schemaFeedback = {
                        message: "CORRECT USAGE EXAMPLE:",
                        example: `${name}({\n${
                          Object.keys(error.expectedSchema.properties || {})
                            .map(key => `  "${key}": "${key === 'path' ? 'C:\\path\\to\\file.txt' : 'value'}"`)
                            .join(',\n')
                        }\n})`,
                        correctParameters: requiredText,
                        parameterDetails: `{\n${propertiesFormatted}\n}`
                    };
                  }
                }
                // Handle Security Errors
                else if (errorMessage.includes('Security check failed') || errorMessage.includes('requires user approval')) {
                   errorDetails = "Tool execution was blocked due to security policy or required approval.";
                   suggestionText = "Operation not permitted or requires explicit user approval.";
                }
                // Handle Argument Parsing Errors
                else if (errorMessage.includes('Invalid JSON arguments')) {
                     errorDetails = "The arguments provided for the tool were not valid JSON.";
                     suggestionText = "Please ensure the tool arguments are formatted as a valid JSON object string.";
                }
                // Handle other errors (e.g., tool execution errors from MCP server)
                 else {
                      errorDetails = "An error occurred during tool execution.";
                      // Suggestion might remain generic, or could be more specific if error message gives clues
                      suggestionText = `Tool execution failed: ${errorMessage}`;
                 }
            
                // Construct the error response object with clear, visible formatting
                const errorResponseObject: ToolErrorResponse = {
                  error: errorMessage,
                  status: 'error',
                  ...(errorDetails && { details: errorDetails }),
                  ...(schemaFeedback && { schemaFeedback: schemaFeedback }),
                  suggestion: suggestionText
                };
            
                console.log(`[ExecuteToolCalls] Sending ERROR response for ${name} (ID: ${id}):`, errorResponseObject);
                
                // For validation errors, make it extremely clear to the LLM what's wrong
                let errorContent = '';
                
                if (error.name === 'ValidationError') {
                  // Format for high visibility
                  errorContent = [
                    `ERROR: ${errorMessage}`,
                    '',
                    '=== TOOL PARAMETER REFERENCE ===',
                    schemaFeedback?.correctParameters || '',
                    '',
                    schemaFeedback?.example || '',
                    '',
                    '=== DETAILED ERROR INFO ===',
                    JSON.stringify(errorResponseObject, null, 2)
                  ].join('\n');
                } else {
                  // Standard error formatting
                  errorContent = JSON.stringify(errorResponseObject, null, 2);
                }
            
                // Return the formatted error message 
                return {
                  role: 'tool' as const,
                  tool_call_id: id,
                  name: name,
                  content: errorContent
                };
              }
        });
        
        // Wait for all tool calls to complete
        const results = await Promise.all(toolCallPromises);
        
        // Add all results to the tool messages array
        toolMessages.push(...results);
        
        // Log the complete tool messages before returning them
        console.log(`[ExecuteToolCalls] Final tool messages being returned (${toolMessages.length}):`);
        toolMessages.forEach((msg, i) => {
            const contentPreview = typeof msg.content === 'string' ? 
                (msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content) : 
                'NON-STRING CONTENT';
                
            console.log(`  Tool message ${i+1}: role=${msg.role}, name=${msg.name}, tool_call_id=${msg.tool_call_id}`);
            
            // Determine if this is an error or success message
            if (typeof msg.content === 'string' && msg.content.startsWith('Error:')) {
                console.log(`  [ERROR RESPONSE] ${contentPreview}`);
                
                // Log full error content for debugging (important for schema-related errors)
                if (msg.content.includes('CORRECT USAGE') || msg.content.includes('Required parameters')) {
                    console.log(`  [FULL ERROR DETAILS]\n${msg.content}`);
                }
            } else {
                console.log(`  [SUCCESS RESPONSE] ${contentPreview}`);
            }
        });
        
        return toolMessages;
    }

    /**
     * Validate tool arguments against the tool's schema with enhanced security
     */
    private async validateToolArguments(toolName: string, args: any): Promise<void> {
        try {
          const metadata = this.toolManager.getToolMetadata(toolName);
          if (!metadata || !metadata.parameters) {
            console.log(`[Validation] No metadata or parameters for ${toolName}, skipping detailed validation.`);
            return;
          }
    
          // Helper to create list of correct parameters for error messages
          const getCorrectParamsList = () => {
            if (!metadata.parameters) return "";
            
            const paramsList = Object.keys(metadata.parameters)
              .map(key => `"${key}"`)
              .join(', ');
              
            const requiredList = metadata.required && metadata.required.length > 0 
              ? ` (Required: ${metadata.required.map(p => `"${p}"`).join(', ')})`
              : '';
              
            return `${paramsList}${requiredList}`;
          };
    
          // Helper to throw structured validation errors with clear messages
          const throwValidationError = (message: string, errorType: string = 'general'): never => {
            try {
              const safeProperties = metadata.parameters ? JSON.parse(JSON.stringify(metadata.parameters)) : {};
              const safeRequired = metadata.required ? [...metadata.required] : [];
    
              // Create standard error message format with helpful details
              const correctParams = getCorrectParamsList();
              const standardMessage = `${message}. The correct parameters for tool "${toolName}" are: ${correctParams}.`;
    
              const error: ValidationError = new Error(standardMessage);
              error.name = 'ValidationError';
              error.errorType = errorType;
              error.expectedSchema = { properties: safeProperties, required: safeRequired };
              console.error(`[Validation] ${standardMessage}`);
              throw error;
            } catch (innerError) {
              console.error(`[Validation] Error creating ValidationError:`, innerError);
              throw new Error(message); // Fallback
            }
          };
          
          // Check for unknown parameters first - this helps catch common mistakes like "file_path" instead of "path"
          for (const paramName of Object.keys(args)) {
            if (!metadata.parameters[paramName]) {
              // Check if this might be a common alias for a known parameter
              const possibleMatch = this.findSimilarParameter(paramName, Object.keys(metadata.parameters));
              if (possibleMatch) {
                throwValidationError(
                  `Parameter "${paramName}" is incorrect. Did you mean "${possibleMatch}"?`,
                  'unknown_parameter'
                );
              } else {
                throwValidationError(
                  `Parameter "${paramName}" is not recognized for this tool`,
                  'unknown_parameter'
                );
              }
            }
          }
    
          // Check for missing required parameters
          if (metadata.required) {
            for (const requiredParam of metadata.required) {
              if (args[requiredParam] === undefined) {
                throwValidationError(`Missing required parameter: "${requiredParam}"`, 'missing_required');
              }
            }
          }
    
          // Validate provided parameters
          for (const [paramName, paramValue] of Object.entries(args)) {
            const paramSchema = metadata.parameters[paramName];
            if (!paramSchema) {
              // Already handled above, just skip
              continue;
            }
    
            // Check parameter type (if value is provided)
            if (paramSchema.type && paramValue !== undefined && paramValue !== null) {
              const actualType = typeof paramValue;
              let expectedType = paramSchema.type;
              if (expectedType === 'integer') expectedType = 'number'; // Treat integer as number
    
              if (expectedType === 'array' && !Array.isArray(paramValue)) {
                throwValidationError(
                  `Invalid type for parameter "${paramName}". Expected array, got ${actualType}`,
                  'type_mismatch'
                );
              } else if (expectedType !== 'array' && actualType !== expectedType) {
                throwValidationError(
                  `Invalid type for parameter "${paramName}". Expected ${expectedType}, got ${actualType}`,
                  'type_mismatch'
                );
              }
            }
          }
        } catch (error: any) {
          console.error(`[Validation] Error during validation for ${toolName}:`, error.message);
          throw error;
        }
      }
      
      /**
       * Find similar parameter name to help with common mistakes
       * This handles common aliases like "file_path" → "path"
       */
      private findSimilarParameter(paramName: string, validParams: string[]): string | undefined {
        // Simple string similarity check
        const normalized = paramName.toLowerCase();
        
        // Common parameter aliases
        const commonAliases: Record<string, string[]> = {
          'path': ['file_path', 'filepath', 'filename', 'file'],
          'content': ['text', 'data', 'value', 'file_content'],
          'query': ['search', 'q', 'question', 'prompt']
        };
        
        // Check if this is a common alias
        for (const [validParam, aliases] of Object.entries(commonAliases)) {
          if (aliases.includes(normalized) && validParams.includes(validParam)) {
            return validParam;
          }
        }
        
        // Check for slight misspellings or substrings
        for (const validParam of validParams) {
          const validNorm = validParam.toLowerCase();
          // Check if one is a substring of the other or very similar
          if (validNorm.includes(normalized) || normalized.includes(validNorm)) {
            return validParam;
          }
        }
        
        return undefined;
      }
    
    // Simple helper method for finding required parameters from metadata
    private getRequiredParameters(toolName: string): string[] {
        const metadata = this.toolManager.getToolMetadata(toolName);
        return metadata?.required || [];
    }

    /**
     * Format tool result for Mistral with improved handling
     */
    private formatToolResult(toolName: string, toolResult: any): string { // Accept 'any' for more flexible input
        // Log the raw result received by the formatter
        console.log(`[formatToolResult] Formatting result for ${toolName}:`, JSON.stringify(toolResult));

        // Check if the result has the expected MCP structure: { content: [{type: 'text', text: ...}] }
        if (toolResult && Array.isArray(toolResult.content) && toolResult.content.length > 0) {
            const firstContent = toolResult.content[0];
            if (firstContent && firstContent.type === 'text' && typeof firstContent.text === 'string') {
                console.log(`[formatToolResult] Extracted text content for ${toolName}.`);
                // Return the actual text content directly
                return firstContent.text;
            }
        }
        
        // Fallback for unexpected structures or potential errors
        console.warn(`[formatToolResult] Unexpected toolResult structure for ${toolName}. Using default formatting.`);
        
        // Keep original fallback logic for other cases or potential errors
        const output = toolResult?.output || toolResult; // Try output, or use the whole result

        if (typeof output === 'string') {
            return output;
        } else {
            // For non-text content or errors, return a formatted JSON response
            return JSON.stringify({
                status: 'success', // Might need to reflect error status if isError is true
                result: output // Serialize the entire received structure if it wasn't the expected text content
            }, null, 2);
        }
    }

    /**
     * Get a helpful suggestion for an error
     */
    private getSuggestionForError(toolName: string, error: any): string {
        const errorMessage = error.message?.toLowerCase() || '';
        
        // Get tool metadata for more specific suggestions
        const metadata = this.toolManager.getToolMetadata(toolName);
        
        // Check if this is a validation error with parameter mappings
        if (error.name === 'ValidationError' && error.parameterMap) {
            const mappings = Object.entries(error.parameterMap)
                .map(([from, to]) => `use "${to}" instead of "${from}"`)
                .join(', ');
            return `Please try again with the correct parameter names: ${mappings}.`;
        }
        
        // Handle specific error types with more helpful suggestions
        if (errorMessage.includes('required parameter')) {
            const paramName = errorMessage.match(/required parameter: (\w+)/)?.[1];
            if (paramName) {
                // Suggestion with parameter info if available
                if (metadata?.parameters?.[paramName]) {
                    const paramInfo = metadata.parameters[paramName];
                    const typeInfo = paramInfo.type ? ` of type ${paramInfo.type}` : '';
                    const descInfo = paramInfo.description ? `: ${paramInfo.description}` : '';
                    return `Please try again with the required "${paramName}" parameter${typeInfo}${descInfo}.`;
                }
                return `Please try again, including the required "${paramName}" parameter.`;
            }
            
            // If we have metadata, list all required parameters
            if (metadata?.required?.length > 0) {
                return `Please try again with all required parameters: ${metadata.required.join(', ')}.`;
            }
            
            return 'Please try again with all required parameters for this tool.';
        } else if (errorMessage.includes('invalid type')) {
            const typeMatch = errorMessage.match(/expected (\w+), got (\w+)/i);
            if (typeMatch) {
                return `Please try again with a ${typeMatch[1]} value instead of a ${typeMatch[2]} value.`;
            }
            return 'Please try again with the correct parameter types.';
        } else if (errorMessage.includes('invalid value') && errorMessage.includes('expected one of')) {
            // Try to extract the valid values from the error message
            const valuesMatch = errorMessage.match(/expected one of: (.+)/i);
            if (valuesMatch) {
                return `Please try again with one of the allowed values: ${valuesMatch[1]}.`;
            }
            return 'Please try again with one of the allowed values for this parameter.';
        } else if (errorMessage.includes('not available') || errorMessage.includes('not found')) {
            // List available tools if possible
            const availableTools = Object.keys(this.toolManager.getTools() || {}).join(', ');
            if (availableTools) {
                return `The tool "${toolName}" might not be available. Try using one of these available tools: ${availableTools}.`;
            }
            return `The tool "${toolName}" might not be available. Try using a different tool.`;
        } else if (errorMessage.includes('unknown parameter')) {
            const paramMatch = errorMessage.match(/unknown parameter: "([^"]+)"/i);
            if (paramMatch && metadata?.parameters) {
                // List valid parameters
                const validParams = Object.keys(metadata.parameters).join(', ');
                return `Unknown parameter "${paramMatch[1]}". Valid parameters are: ${validParams}. Please try again with the correct parameter names.`;
            }
            return 'One or more parameters are not recognized. Check the parameter names and try again.';
        } else if (errorMessage.includes('server') || errorMessage.includes('connection')) {
            return 'There might be a connection issue with the tool server. Please try again later.';
        } else if (errorMessage.includes('security') || errorMessage.includes('approval')) {
            return 'This operation requires approval or has security restrictions. Try a different approach or ask the user for authorization.';
        }
        
        // Generic fallback
        return 'Please try a different approach or tool to accomplish your task.';
    }

    /**
     * Get conversation history
     */
    getConversationHistory(conversationId: string): Message[] {
        return this.conversations.get(conversationId) || [];
    }

    /**
     * Disconnect from all servers
     */
    disconnect() {
        this.serverManager.disconnectAll();
    }

    /**
     * Get the server manager
     */
    getServerManager(): McpServerManager {
        return this.serverManager;
    }
    
    /**
     * Get the security manager
     */
    getSecurityManager(): SecurityManager {
        return this.securityManager;
    }
    
    /**
     * Get list of all servers and their connection status
     */
    getServers(): Record<string, boolean> {
        const result: Record<string, boolean> = {};
        const servers = this.serverManager.getServers();
        
        for (const serverId of servers) {
            result[serverId] = this.serverManager.isServerConnected(serverId);
        }
        
        return result;
    }
    
    /**
     * Get detailed server information, including capabilities
     */
    getServerInfo(): Record<string, any> {
        return this.serverManager.getServerInfo();
    }
    
    /**
     * Get list of available tools across all servers with capability awareness
     */
    getAvailableTools(): Record<string, any[]> {
        const result: Record<string, any[]> = {};
        
        // Get servers with tools capability
        const serversWithTools = this.toolManager.getServersWithTools();
        
        for (const serverId of serversWithTools) {
            // Only include servers that advertise tools capability
            const capabilities = this.serverManager.getCapabilities(serverId);
            if (capabilities && capabilities.tools) {
                const tools = this.toolManager.getToolsFromServer(serverId, capabilities);
                result[serverId] = tools;
            }
        }
        
        return result;
    }

    /**
     * Gets the internal conversation history for a given ID.
     * Used by the conversation store to initialize/sync history.
     */
    public getInternalHistory(conversationId: string): Message[] | undefined {
        return this.conversations.get(conversationId);
    }

    /**
     * Log the tool schema for debugging purposes
     */
    private logToolSchema(toolName: string): void {
        try {
            const metadata = this.toolManager.getToolMetadata(toolName);
            if (!metadata) {
                console.log(`[ToolSchema] No schema available for tool: ${toolName}`);
                return;
            }
            
            console.log(`[ToolSchema] Schema for tool: ${toolName}`);
            console.log(`  Description: ${metadata.description || 'No description'}`);
            
            // Log required parameters
            if (metadata.required && metadata.required.length > 0) {
                console.log(`  Required parameters: ${metadata.required.join(', ')}`);
            } else {
                console.log('  No required parameters');
            }
            
            // Log all parameters with their types
            console.log('  Parameters:');
            if (metadata.parameters) {
                Object.entries(metadata.parameters).forEach(([paramName, paramInfo]) => {
                    const type = paramInfo.type || 'any';
                    const desc = paramInfo.description ? ` - ${paramInfo.description}` : '';
                    const required = metadata.required?.includes(paramName) ? ' (required)' : '';
                    console.log(`    - ${paramName}: ${type}${required}${desc}`);
                });
            } else {
                console.log('    No parameters defined');
            }
            
            // Generate an example call for this tool (helpful for understanding expected format)
            try {
                const exampleParams: Record<string, any> = {};
                
                // Add examples for all parameters
                if (metadata.parameters) {
                    Object.entries(metadata.parameters).forEach(([paramName, paramInfo]) => {
                        const type = paramInfo.type || 'string';
                        
                        // Generate appropriate example value based on type
                        switch (type) {
                            case 'string':
                                exampleParams[paramName] = `"example-${paramName}"`;
                                break;
                            case 'number':
                            case 'integer':
                                exampleParams[paramName] = 42;
                                break;
                            case 'boolean':
                                exampleParams[paramName] = true;
                                break;
                            case 'array':
                                exampleParams[paramName] = [];
                                break;
                            case 'object':
                                exampleParams[paramName] = {};
                                break;
                            default:
                                exampleParams[paramName] = `"example-${paramName}"`;
                        }
                    });
                }
                
                console.log(`  Example usage: ${toolName}(${JSON.stringify(exampleParams, null, 2)})`);
            } catch (exampleError) {
                console.error(`[ToolSchema] Error generating example for ${toolName}:`, exampleError);
            }
            
        } catch (error) {
            console.error(`[ToolSchema] Error logging schema for tool ${toolName}:`, error);
        }
    }

    /**
     * Updates the conversation history both locally and in the shared store.
     */
    private updateLocalConversationHistory(conversationId: string, history: Message[]): void {
        const historyCopy = [...history]; // Work with a copy
        this.conversations.set(conversationId, historyCopy);
        // Also update the shared store
        updateConversationHistory(conversationId, historyCopy);
    }

    /**
     * Handles the case where the user denies tool usage.
     * Sends the updated history (including the denial message) back to the model.
     */
    public async continueConversation(
        conversationId: string,
        updatedHistory: Message[]
    ): Promise<ResponseFormat> {
        console.log(`[${conversationId}] Continuing conversation after tool denial.`);
        // Update local history first
        this.updateLocalConversationHistory(conversationId, updatedHistory);

        try {
            // Call the Mistral client with the updated history
            const newResponse = await this.client.chat(updatedHistory, {
                // model: this.config.model, // Model is usually configured in the client, not passed here
                toolChoice: 'none' // Explicitly prevent tool use this turn
            });

            // Add the assistant's new response to the history
            const assistantMessage: Message = { // Explicitly type the message
                role: 'assistant',
                content: newResponse.content
            };
            const finalHistory = [...updatedHistory, assistantMessage]; // Use the typed message
            this.updateLocalConversationHistory(conversationId, finalHistory);

            // Return the new response (should not contain tool calls)
            return { content: newResponse.content };

        } catch (error) {
            console.error(`[${conversationId}] Error continuing conversation after denial:`, error);
            // Return an error-like response
            return { content: "Sorry, I encountered an error trying to proceed without the tool." };
        }
    }
}