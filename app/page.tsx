"use client";

import React, { useState, useEffect, useCallback } from "react"; // Ensure React is imported
import ToolsPanel from "../components/tools/tools-panel-improved";
import ToolCall from "../components/tools/tool-call";
import { SecurityProvider } from "../components/tools/security-integration";
import { createSecurityManager, createSimplifiedSecurityManager } from "../lib/mistral/utils/security-utils";
import { SecurityStatus } from "../components/ui/security-status";
import { ChatbotStateIndicator } from "../components/ui/chatbot-state-indicator";
import { DarkModeToggle } from "../components/ui/dark-mode-toggle";
import { Button } from "../components/ui/button"; // Add Button import
import { config } from './config';
import {
  loadConversationMessages,
  saveConversationMessages,
  getSavedConversations,
  deleteConversation,
  ConversationMessage,
  ConversationMetadata
} from "../lib/storage/conversation-storage";
import { BotIcon } from "lucide-react"; // Add BotIcon

export default function Home() {
  const [message, setMessage] = useState("");
  
  // Interface definitions
  interface ToolCall {
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }

  interface Message {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [savedConversations, setSavedConversations] = useState<ConversationMetadata[]>([]);
  const [showConversations, setShowConversations] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[]>([]); // Add state for pending calls

  // Security states
  const [securityManager, setSecurityManager] = useState<any>(null);
  const [securityStatus, setSecurityStatus] = useState<'initializing' | 'active' | 'simplified' | 'disabled' | 'error'>('initializing');
  const [securityErrorMessage, setSecurityErrorMessage] = useState<string | undefined>(undefined);
  const [autoApproveChecked, setAutoApproveChecked] = useState(false);

  // adding hook for auto-approve tools
  useEffect(() => {
    // Ensure this runs only on the client
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem('autoApproveTools') === 'true';
      setAutoApproveChecked(storedValue);
      console.log(`Initialized autoApproveChecked from localStorage: ${storedValue}`);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Load saved conversations on component mount
  useEffect(() => {
    // This function needs to be client-side only due to localStorage
    if (typeof window !== 'undefined') {
      const conversations = getSavedConversations();
      setSavedConversations(conversations);
    }
  }, []);

  // Start a new conversation when the component mounts if none is already selected
  useEffect(() => {
    async function startConversation() {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
        });
        
        if (!response.ok) {
          throw new Error('Failed to start conversation');
        }
        
        const data = await response.json();
        setConversationId(data.conversationId);
      } catch (error) {
        console.error('Error starting conversation:', error);
      }
    }
    
    if (!conversationId) {
      startConversation();
    }
  }, [conversationId]);

  // Save messages when they change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      saveConversationMessages(conversationId, messages as ConversationMessage[]);
      
      // Refresh the saved conversations list
      const conversations = getSavedConversations();
      setSavedConversations(conversations);
    }
  }, [messages, conversationId]);

  // Initialize security manager based on configuration
  useEffect(() => {
    async function initializeSecurity() {
      try {
        console.log("🚀 Initializing security with mode:", config.security.mode);
        setSecurityStatus('initializing');
        
        // Different security modes
        if (config.security.mode === 'none') {
          console.log("🔓 Security disabled by configuration");
          setSecurityStatus('disabled');
          return;
        }
        
        if (config.security.mode === 'simplified') {
          console.log("🔄 Using simplified security mode");
          const manager = createSimplifiedSecurityManager();
          
          // Test the security manager by checking a dummy tool call
          console.log("🧪 Testing security manager...");
          const testResult = await manager.checkToolCall('test-tool', { test: 'data' }, 'test-server');
          console.log("✅ Security test result:", testResult);
          
          // Set up the security manager in state
          setSecurityManager(manager);
          setSecurityStatus('simplified');
          return;
        }
        
        // Full security mode with approval dialogs
        console.log("🔒 Setting up full security mode with approval dialogs");
        const manager = createSecurityManager();
        
        // Test if the security manager can handle approvals
        console.log("🧪 Testing approval mechanism...");
        
        // Set up a test tool policy that always requires approval
        manager.registerToolPolicy('test-tool', {
          requiresApproval: true,
          maxCallsPerMinute: 60
        });
        
        // Initialize the security manager (no actual timeout needed)
        setSecurityManager(manager);
        setSecurityStatus('active');
        console.log("✅ Security manager fully initialized with approval dialogs");
        
      } catch (error) {
        console.error("❌ Security initialization error:", error);
        
        // Fall back to simplified security rather than failing completely
        try {
          console.log("⚠️ Falling back to simplified security");
          const fallbackManager = createSimplifiedSecurityManager();
          setSecurityManager(fallbackManager);
          setSecurityStatus('error');
          setSecurityErrorMessage(error instanceof Error ? error.message : "Unknown error");
        } catch (fallbackError) {
          console.error("❌❌ Even simplified security failed:", fallbackError);
          setSecurityStatus('error');
          setSecurityErrorMessage("Complete security failure - proceeding without protection");
        }
      }
    }
    
    if (!securityManager) {
      initializeSecurity();
    }
  }, [securityManager]);

  // State for chatbot processing status
  const [processingState, setProcessingState] = useState<'idle' | 'processing'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId) return;

    // Add user message
    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);
    setProcessingState('processing');

    try {
      // --- Read auto-approve setting FROM STATE ---
      const autoApproveToSend = autoApproveChecked;
      // --- END Read from state ---
  
      console.log(`Sending message with autoApprove: ${autoApproveToSend}`); // Log the value being sent
  
      // Call our API endpoint
      const response = await fetch(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          autoApprove: autoApproveToSend // Send the state value
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      console.log('Message API response:', data);
      console.log('Response content type:', data.content !== undefined ? typeof data.content : 'undefined');
      console.log('Response state:', data.state || 'not provided');
      
      // Check the state from the backend
      if (data.state === 'awaiting_confirmation') {
        console.log('Received awaiting_confirmation state with tool calls:', data.toolCalls);
        // Store the pending tool calls to be displayed in the UI
        setPendingToolCalls(data.toolCalls || []); // Uncommented and using ToolCall[] type
        // Stop loading, but don't add a message yet
        setIsLoading(false); 
      } else if (data.content !== undefined && data.content !== null) {
        // Add assistant response even if the content is an empty string
        console.log(`Adding assistant message with content: "${data.content}"`);
        setMessages((prev) => [
          ...prev,
          // Create a message object using data.content
          { role: "assistant", content: data.content } as Message
        ]);
        setIsLoading(false);
      } else {
        // Only handle as error if both state is not 'awaiting_confirmation' AND content is undefined/null
        console.error('Invalid response format - missing content or state:', data);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Received an unexpected response format from the server."
          } as Message,
        ]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your message. Please try again."
        } as Message
      ]);
      setIsLoading(false);
      setProcessingState('idle');
    } finally {
      setIsLoading(false);
      setProcessingState('idle');
    }
  };

  const startNewChat = async () => {
    setMessages([]);
    setIsLoading(true);
    setShowConversations(false);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start new conversation');
      }
      
      const data = await response.json();
      setConversationId(data.conversationId);
    } catch (error) {
      console.error('Error starting new conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversation = (id: string) => {
    setShowConversations(false);
    setConversationId(id);
    const loadedMessages = loadConversationMessages(id);
    setMessages(loadedMessages as Message[]);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering loadConversation
    deleteConversation(id);
    
    // Refresh the saved conversations list
    const conversations = getSavedConversations();
    setSavedConversations(conversations);
    
    // If the deleted conversation was the active one, start a new chat
    if (id === conversationId) {
      startNewChat();
    }
  };

  // Retry security initialization
  const handleRetrySecurityInit = () => {
    setSecurityManager(null);
    setSecurityStatus('initializing');
    setSecurityErrorMessage(undefined);
  };

  // Function to handle the tool usage decision
  const handleToolDecision = useCallback(async (decision: 'allow' | 'deny') => {
    if (!conversationId) {
      console.error('Cannot make tool decision without a conversation ID.');
      // setError('Cannot make tool decision: Missing conversation ID.');
      return;
    }

    setIsLoading(true); // Indicate processing the decision
    // setError(null);
    
    try {
      const response = await fetch(`/api/tool_decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, decision }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit tool decision');
      }

      const data = await response.json();

      // Add the final assistant message (or continuation message) to the chat
      if (data.content !== undefined && data.content !== null) {
        console.log(`Adding assistant message from tool decision with content: "${data.content}"`);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.content } as Message,
        ]);
      } else if (decision === 'deny') {
        // Special case for denied tools - add a clear message
        console.log('Tool usage was denied by user');
        setMessages((prev) => [
          ...prev, 
          { role: 'assistant', content: 'I understand you prefer not to use this tool. How else can I assist you?' } as Message
        ]);
      } else {
        // Handle case where backend might not send content for other reasons
        console.log('Tool decision processed, no content returned from backend.');
        // No message added to avoid confusion - we'll rely on the next API response
      }

    } catch (err: any) {
      console.error('Error sending tool decision:', err);
      // setError(`Error processing tool decision: ${err.message}`);
      // Optionally add an error message to the chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error processing tool decision: ${err.message}`
        } as Message,
      ]);
    } finally {
      setPendingToolCalls([]); // Clear the pending calls regardless of outcome
      setIsLoading(false);
      setProcessingState('idle'); // Reset state
    }
  }, [conversationId, setMessages, setIsLoading, setPendingToolCalls, setProcessingState]); // Added dependencies

  // Helper function for formatting arguments
  const formatArguments = useCallback((argsString: string): string => {
    try {
      const argsObject = JSON.parse(argsString);
      return JSON.stringify(argsObject, null, 2); // Pretty print JSON
    } catch (e) {
      return argsString; // Return original string if not valid JSON
    }
  }, []); // No dependencies

  // Main UI rendering
  const renderMainContent = () => {
    // If security is still initializing and we don't have a fallback manager
    if (securityStatus === 'initializing' && !securityManager) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center p-4">
          <h2 className="text-xl font-semibold">Welcome to Mistr. Agent</h2>
          <p className="mt-2 text-gray-500">
            Initializing security components...
          </p>
          <div className="mt-4 w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
        </div>
      );
    }

    return (
      <>
        {/* Security Status Banner (if needed) */}
        <SecurityStatus 
          status={securityStatus} 
          errorMessage={securityErrorMessage}
          onRetry={handleRetrySecurityInit}
        />
        
        {/* Chat Messages */}
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-20">
            <h2 className="text-2xl font-semibold">Welcome to Mistr. Agent</h2>
            <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
              Ask me anything to get started!
            </p>
            <div className="mt-6 text-gray-400 dark:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg: any, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-lg p-4 text-base ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {msg.content}
                  
                  {/* Display tool calls if present */}
                  {msg.tool_calls && msg.tool_calls.map((toolCall: any) => (
                    <ToolCall 
                      key={toolCall.id}
                      name={toolCall.function.name}
                      args={toolCall.function.arguments}
                    />
                  ))}
                </div>
              </div>
            ))}
            
            {/* Show the proper state indicator with tool awareness */}
            {isLoading && (
              <div className="flex justify-start">
                <ChatbotStateIndicator conversationId={conversationId} />
              </div>
            )}
            
            {/* ========== TOOL CONFIRMATION SECTION ========== */}
            {pendingToolCalls.length > 0 && (
              <div className="mt-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  <BotIcon className="inline-block w-4 h-4 mr-1" /> 
                  Tool Confirmation Required:
                </p>
                {pendingToolCalls.map((toolCall) => (
                  <div key={toolCall.id} className="mb-2 p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600">
                    <p className="text-xs font-semibold dark:text-gray-300">Tool: <code className="text-blue-600 dark:text-blue-400">{toolCall.function.name}</code></p>
                    <p className="text-xs mt-1 dark:text-gray-300">Arguments:</p>
                    <pre className="text-xs p-1 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto dark:text-gray-300">
                      {formatArguments(toolCall.function.arguments)}
                    </pre>
                  </div>
                ))}
                <div className="flex justify-end space-x-2 mt-3">
                  <Button 
                    variant="outline"
                    size="sm" 
                    // Updated onClick for Deny:
                    onClick={() => {
                      setPendingToolCalls([]); // Clear UI immediately
                      handleToolDecision('deny'); // Then call backend
                    }} 
                    className="bg-red-100 hover:bg-red-200 text-red-700 border-red-300 dark:bg-red-900/30 dark:hover:bg-red-800/40 dark:text-red-300 dark:border-red-800"
                  >
                    Deny
                  </Button>
                  <Button 
                    size="sm" 
                    // Updated onClick for Allow:
                    onClick={() => {
                      setPendingToolCalls([]); // Clear UI immediately
                      handleToolDecision('allow'); // Then call backend
                    }} 
                    className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
                  >
                    Allow
                  </Button>
                </div>
              </div>
            )}
            {/* =============================================== */}
          </div>
        )}
      </>
    );
  };

  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">Mistr. Agent</h1>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-1.5 rounded bg-green-100 px-3 py-1.5 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <input
                type="checkbox"
                className="h-4 w-4"
                // Bind to the state variable
                checked={autoApproveChecked}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  // Update React state
                  setAutoApproveChecked(isChecked);
                  // Update localStorage
                  localStorage.setItem('autoApproveTools', isChecked ? 'true' : 'false');
                  console.log(`Set autoApproveChecked state and localStorage to: ${isChecked}`);
                }}
              />
            <span>Auto-approve Tools</span>
          </label>
          
          <DarkModeToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Chat Sessions */}
        <div className="hidden w-64 border-r bg-gray-50 dark:bg-gray-800 md:block">
          <div className="p-4">
            <button 
              className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              onClick={startNewChat}
              disabled={isLoading}
            >
              New Chat
            </button>
            
            <button
              className="w-full mt-2 rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              onClick={() => setShowConversations(!showConversations)}
            >
              {showConversations ? "Hide Chats" : "Show Saved Chats"}
            </button>
            
            {showConversations && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                <h2 className="font-semibold text-gray-700 dark:text-gray-200">Saved Conversations</h2>
                {savedConversations.length === 0 ? (
                  <p className="text-sm text-gray-500">No saved conversations</p>
                ) : (
                  savedConversations.map((conv) => (
                    <div 
                      key={conv.id} 
                      className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                        conv.id === conversationId 
                          ? 'bg-blue-100 dark:bg-blue-900' 
                          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => loadConversation(conv.id)}
                    >
                      <div className="truncate flex-1">
                        <div className="font-medium">{conv.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(conv.lastUpdated).toLocaleDateString()} · {conv.messageCount} msgs
                        </div>
                      </div>
                      <button 
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto max-w-4xl">
              {securityManager ? (
                <SecurityProvider securityManager={securityManager}>
                  {renderMainContent()}
                </SecurityProvider>
              ) : (
                // Content without security provider
                renderMainContent()
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t bg-white p-5 dark:bg-gray-900"
          >
            <div className="mx-auto max-w-4xl flex items-center gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-md border border-gray-300 p-3 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                disabled={isLoading || !conversationId}
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim() || !conversationId}
                className="rounded-md bg-blue-600 px-5 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
        
        {/* Right Sidebar - Tools Panel */}
        <ToolsPanel 
          onInsertToolExample={(example) => setMessage(message => message ? `${message} ${example}` : example)}
        />
      </div>
    </main>
  );
}
