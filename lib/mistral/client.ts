// lib/mistral/client.ts
import axios from 'axios';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface MistralTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: MistralTool[];
  toolChoice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: any;
  toolCalls?: ToolCall[];
}

export class MistralClient {
  private apiKey: string;
  private model: string;
  private apiEndpoint: string;
  private retryCount: number = 3;
  private retryDelay: number = 1000;

  constructor(config: {
    apiKey: string;
    model?: string;
    apiEndpoint?: string;
  }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'mistral-medium';
    this.apiEndpoint = config.apiEndpoint || 'https://api.mistral.ai/v1/chat/completions';
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
    let attempt = 0;
    while (attempt < this.retryCount) {
      try {
        const requestBody: any = {
          model: this.model,
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens,
        };

        if (options.tools && options.tools.length > 0) {
          requestBody.tools = options.tools;
          requestBody.tool_choice = options.toolChoice || 'auto';
        }

        const response = await axios.post(
          this.apiEndpoint,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );

        const data = response.data;
        if (!data || !data.choices || data.choices.length === 0) {
          throw new Error('Invalid response from Mistral API: No choices returned.');
        }

        const message = data.choices[0].message;

        return {
          content: message.content || '',
          model: data.model,
          usage: data.usage,
          toolCalls: message.tool_calls
        };

      } catch (error: unknown) {
        attempt++;
        if (attempt >= this.retryCount) {
          if (error instanceof Error) {
            console.error(`Mistral API request failed: ${error.message}`, error);
            throw new Error('Failed to call Mistral API: ' + error.message);
          }
          throw new Error('Failed to call Mistral API after multiple attempts');
        }
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Failed to call Mistral API after multiple attempts');
  }
}