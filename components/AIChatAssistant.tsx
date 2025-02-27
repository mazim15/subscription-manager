'use client';

import { useState, useRef, useEffect } from 'react';
import { generateText } from '@/lib/gemini';
import { getSubscriptions, getAccounts, getSubscribers } from '@/lib/db-operations';
import GeminiModelSelector from './GeminiModelSelector';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Hello! I\'m your AI assistant for subscription management. How can I help you today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentModel, setCurrentModel] = useState('gemini-2.0-flash-001');

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subscriptions, accounts, subscribers] = await Promise.all([
          getSubscriptions(),
          getAccounts(),
          getSubscribers()
        ]);
        
        setSubscriptionData({ subscriptions, accounts, subscribers });
      } catch (error) {
        console.error('Error fetching data for AI assistant:', error);
      }
    };
    
    fetchData();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Add user message
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Create context-aware prompt with subscription data
      let contextPrompt = input;
      
      if (subscriptionData) {
        contextPrompt = `
          Context: You are an AI assistant for a streaming subscription management system.
          
          Current system stats:
          - Total subscriptions: ${subscriptionData.subscriptions.length}
          - Total accounts: ${subscriptionData.accounts.length}
          - Total subscribers: ${subscriptionData.subscribers.length}
          
          User query: ${input}
        `;
      }
      
      // Get response from Gemini
      const response = await generateText(contextPrompt, currentModel);
      
      // Add assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again later.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
        {messages.map((message, index) => (
          <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block max-w-[80%] px-4 py-2 rounded-lg ${
              message.role === 'user' 
                ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100' 
                : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 shadow'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-left mb-4">
            <div className="inline-block max-w-[80%] px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse mr-1"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75 mr-1"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your subscriptions..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Ask about payment trends, subscriber behavior, or renewal strategies.
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
        <GeminiModelSelector 
          currentModel={currentModel}
          onModelChange={setCurrentModel}
        />
      </div>
    </div>
  );
} 