'use client';

import { useState, useEffect } from 'react';
import { getSubscriptions } from '@/lib/db-operations';
import { analyzeSubscriptions } from '@/lib/gemini';
import AIChatAssistant from '@/components/AIChatAssistant';

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateInsights = async () => {
      try {
        setLoading(true);
        const subscriptions = await getSubscriptions();
        
        // Only analyze if we have subscriptions
        if (subscriptions.length > 0) {
          const analysisResult = await analyzeSubscriptions(subscriptions);
          setInsights(analysisResult);
        } else {
          setInsights('No subscription data available for analysis yet.');
        }
      } catch (error) {
        console.error('Error generating AI insights:', error);
        setError('Failed to generate insights. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    generateInsights();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6 heading">AI Insights & Assistant</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Generated Insights */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 heading">Subscription Analysis</h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Generating insights...</div>
            </div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{insights}</div>
            </div>
          )}
        </div>
        
        {/* AI Chat Assistant */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 heading">AI Assistant</h2>
          <AIChatAssistant />
        </div>
      </div>
    </div>
  );
} 