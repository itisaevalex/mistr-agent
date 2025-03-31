// src/cli.ts
import { MistralClient, Message } from './mistral-client.js';
import { Config } from './config.js';
import * as readline from 'readline';

// Load configuration (replace with your actual configuration)
const config: Config = {
  mistralApiKey: process.env.MISTRAL_API_KEY || 'YOUR_API_KEY', // Use environment variable or a placeholder
  mistralModel: 'mistral-medium', // Or your preferred model
  mistralApiEndpoint: 'https://api.mistral.ai/v1/chat/completions',
};

const client = new MistralClient(config);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function startChat() {
  const messages: Message[] = [
    { role: 'system', content: 'You are a helpful assistant.' }, // Optional system message
  ];

  console.log('Mistral Chat CLI (Type "exit" or "quit" to end)');

  while (true) {
    const userInput = await new Promise<string>((resolve) => {
      rl.question('You: ', (answer) => {
        resolve(answer);
      });
    });

    if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
      break;
    }

    messages.push({ role: 'user', content: userInput });

    try {
      const response = await client.chat(messages);
      console.log(`Mistral: ${response.content}`);
      messages.push({role: 'assistant', content: response.content}); // Add assistant response to chat history
    } catch (error) {
      console.error('Error:', error);
      break; // Exit on error (you might want to handle this more gracefully)
    }
  }

  rl.close();
  console.log('Chat ended.');
}

startChat();