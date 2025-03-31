// Simple conversation storage utility using localStorage

/**
 * Conversation message interface
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  id: string;
  title: string;
  lastUpdated: number;
  messageCount: number;
}

/**
 * Get all saved conversation IDs
 */
export function getSavedConversationIds(): string[] {
  try {
    const conversationsKey = 'mistral-ui-conversations';
    const data = localStorage.getItem(conversationsKey);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting saved conversation IDs:', error);
    return [];
  }
}

/**
 * Get all saved conversations with metadata
 */
export function getSavedConversations(): ConversationMetadata[] {
  try {
    const ids = getSavedConversationIds();
    return ids.map(id => {
      const metadata = localStorage.getItem(`conversation-meta-${id}`);
      if (metadata) {
        return JSON.parse(metadata);
      }
      // Create basic metadata if none exists
      return {
        id,
        title: `Conversation ${id.slice(-6)}`,
        lastUpdated: Date.now(),
        messageCount: 0
      };
    }).sort((a, b) => b.lastUpdated - a.lastUpdated); // Sort by most recent first
  } catch (error) {
    console.error('Error getting saved conversations:', error);
    return [];
  }
}

/**
 * Save conversation metadata
 */
export function saveConversationMetadata(metadata: ConversationMetadata): void {
  try {
    // Save metadata
    localStorage.setItem(`conversation-meta-${metadata.id}`, JSON.stringify(metadata));
    
    // Update the list of conversation IDs
    const ids = getSavedConversationIds();
    if (!ids.includes(metadata.id)) {
      ids.push(metadata.id);
      localStorage.setItem('mistral-ui-conversations', JSON.stringify(ids));
    }
  } catch (error) {
    console.error('Error saving conversation metadata:', error);
  }
}

/**
 * Generate a title for a conversation based on its messages
 */
export function generateConversationTitle(messages: ConversationMessage[]): string {
  // Find the first user message
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (firstUserMessage && firstUserMessage.content) {
    // Truncate and clean the content
    const content = firstUserMessage.content.trim();
    const title = content.length > 30 ? `${content.slice(0, 30)}...` : content;
    return title;
  }
  
  // Fallback to a timestamp-based title
  return `Conversation ${new Date().toLocaleDateString()}`;
}

/**
 * Save messages for a conversation
 */
export function saveConversationMessages(conversationId: string, messages: ConversationMessage[]): void {
  try {
    localStorage.setItem(`conversation-${conversationId}`, JSON.stringify(messages));
    
    // Update metadata
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    // Generate title from the first user message
    const title = generateConversationTitle(messages);
    
    saveConversationMetadata({
      id: conversationId,
      title,
      lastUpdated: Date.now(),
      messageCount: userMessages.length + assistantMessages.length
    });
  } catch (error) {
    console.error('Error saving conversation messages:', error);
  }
}

/**
 * Load messages for a conversation
 */
export function loadConversationMessages(conversationId: string): ConversationMessage[] {
  try {
    const data = localStorage.getItem(`conversation-${conversationId}`);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading conversation messages:', error);
    return [];
  }
}

/**
 * Delete a conversation
 */
export function deleteConversation(conversationId: string): void {
  try {
    // Remove from the list of conversation IDs
    const ids = getSavedConversationIds();
    const newIds = ids.filter(id => id !== conversationId);
    localStorage.setItem('mistral-ui-conversations', JSON.stringify(newIds));
    
    // Remove the conversation data
    localStorage.removeItem(`conversation-${conversationId}`);
    localStorage.removeItem(`conversation-meta-${conversationId}`);
  } catch (error) {
    console.error('Error deleting conversation:', error);
  }
}

/**
 * Clear all saved conversations
 */
export function clearAllConversations(): void {
  try {
    const ids = getSavedConversationIds();
    
    // Remove all conversation data
    for (const id of ids) {
      localStorage.removeItem(`conversation-${id}`);
      localStorage.removeItem(`conversation-meta-${id}`);
    }
    
    // Clear the list of conversation IDs
    localStorage.removeItem('mistral-ui-conversations');
  } catch (error) {
    console.error('Error clearing all conversations:', error);
  }
}
