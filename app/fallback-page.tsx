"use client";

import { useState, useEffect } from "react";
import ToolsPanel from "../components/tools/tools-panel";
import ToolCall from "../components/tools/tool-call";

/**
 * Fallback page without MCP or security features
 * Used when there are issues with the full implementation
 */
export default function FallbackPage() {
  const [message, setMessage] = useState("");
  
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

  // Start a new conversation when the component mounts
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
    
    startConversation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId) return;

    // Add user message
    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      // Call our API endpoint
      const response = await fetch(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      console.log('Message API response:', data);
      
      // Add assistant response
      if (data.response) {
        setMessages((prev) => [
          ...prev,
          data.response,
        ]);
      } else {
        console.error('Invalid response format:', data);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Received an invalid response format from the server."
          } as Message,
        ]);
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
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = async () => {
    setMessages([]);
    setIsLoading(true);
    
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

  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 dark:bg-gray-900">
        <h1 className="text-xl font-bold">Mistr. Agent (Fallback Mode)</h1>
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
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <h2 className="text-xl font-semibold">Welcome to Mistr. Agent</h2>
                <p className="mt-2 text-gray-500">
                  Running in fallback mode (without security enhancements). Ask me anything!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700"
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
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t bg-white p-4 dark:bg-gray-900"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                disabled={isLoading || !conversationId}
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim() || !conversationId}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-400"
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
