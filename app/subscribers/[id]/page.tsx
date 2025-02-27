'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSubscriber, getSubscriptionsBySubscriberId, deleteSubscriber, getAccounts } from '@/lib/db-operations';
import { Subscriber, Account } from '@/types';
import Link from 'next/link';
import { generateText } from '@/lib/gemini';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default function SubscriberDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!params.id) {
          setError('Subscriber ID is missing');
          setLoading(false);
          return;
        }
        
        const subscriberId = Array.isArray(params.id) ? params.id[0] : params.id;
        
        const [subscriberData, subscriptionsData, accountsData] = await Promise.all([
          getSubscriber(subscriberId),
          getSubscriptionsBySubscriberId(subscriberId),
          getAccounts()
        ]);
        
        if (!subscriberData) {
          setError('Subscriber not found');
          setLoading(false);
          return;
        }
        
        setSubscriber(subscriberData);
        setAccounts(accountsData);
        
        // Enhance subscriptions with account information
        const enhancedSubscriptions = subscriptionsData.map(subscription => {
          const account = accountsData.find(acc => acc.id === subscription.accountId);
          return {
            ...subscription,
            accountEmail: account?.email || 'Unknown'
          };
        });
        
        setSubscriptions(enhancedSubscriptions);
        
        // Generate AI insight
        generateSubscriberInsight(subscriberData, enhancedSubscriptions);
      } catch (error) {
        console.error('Error fetching subscriber details:', error);
        setError('Failed to load subscriber details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [params.id]);
  
  const generateSubscriberInsight = async (subscriber: Subscriber, subscriptions: any[]) => {
    try {
      setInsightLoading(true);
      
      // Calculate some metrics
      const totalSpent = subscriptions.reduce((sum, sub) => sum + (sub.paidPrice || 0), 0);
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
      const paymentRate = subscriptions.length > 0 
        ? (subscriptions.filter(sub => sub.paymentStatus === 'paid').length / subscriptions.length) * 100 
        : 0;
      
      const prompt = `
        Analyze this subscriber:
        
        Name: ${subscriber.name}
        Contact: ${subscriber.contact}
        Email: ${subscriber.email || 'Not provided'}
        Subscriptions: ${subscriptions.length}
        Active: ${activeSubscriptions}
        Total spent: PKR ${totalSpent}
        Payment rate: ${paymentRate.toFixed(1)}%
        
        Provide a brief analysis of their value and payment behavior.
        Suggest ways to improve engagement.
        
        Use markdown formatting with headings and bullet points.
      `;
      
      const insight = await generateText(prompt);
      setAiInsight(insight);
    } catch (error) {
      console.error('Error generating subscriber insight:', error);
      setAiInsight('Unable to generate insights at this time.');
    } finally {
      setInsightLoading(false);
    }
  };
  
  const handleDeleteSubscriber = async () => {
    if (!subscriber) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete ${subscriber.name}?`);
    if (!confirmDelete) return;
    
    try {
      await deleteSubscriber(subscriber.id);
      router.push('/subscribers');
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      alert('Failed to delete subscriber');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (error || !subscriber) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-100 dark:border-red-800">
        <h2 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Error</h2>
        <p className="text-red-600 dark:text-red-400">{error || 'Subscriber not found'}</p>
        <Link href="/subscribers" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
          Back to Subscribers
        </Link>
      </div>
    );
  }
  
  // Calculate payment statistics
  const totalDue = subscriptions.reduce((sum, sub) => sum + (sub.paidPrice || 0), 0);
  const totalPaid = subscriptions.reduce((sum, sub) => 
    (sub.paymentStatus === 'paid' ? sum + (sub.paidPrice || 0) : sum), 0);
  const paymentRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold heading">Subscriber Details</h1>
        <div className="flex space-x-2">
          <Link 
            href={`/subscribers/${subscriber.id}/edit`}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Edit
          </Link>
          <button 
            onClick={handleDeleteSubscriber}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Subscriber Info Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow col-span-2">
          <h2 className="text-xl font-semibold mb-4 heading">Subscriber Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{subscriber.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Contact</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{subscriber.contact}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{subscriber.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{subscriber.address || 'Not provided'}</p>
            </div>
          </div>
        </div>
        
        {/* Payment Stats Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 heading">Payment Statistics</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Payment Rate</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{paymentRate}%</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
              <div 
                className="bg-green-600 h-2.5 rounded-full" 
                style={{ width: `${paymentRate}%` }}
              ></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid</p>
              <p className="text-lg font-medium text-green-600 dark:text-green-400">PKR {totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Due</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">PKR {totalDue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</p>
              <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                {subscriptions.filter(sub => sub.status === 'active').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Subscriptions</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{subscriptions.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Insight Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold heading">AI Subscriber Insight</h2>
          <button 
            onClick={() => generateSubscriberInsight(subscriber, subscriptions)}
            disabled={insightLoading}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            {insightLoading ? 'Analyzing...' : 'Refresh Insight'}
          </button>
        </div>
        {insightLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">Analyzing subscriber data...</div>
          </div>
        ) : (
          <div className="prose max-w-none dark:prose-invert">
            <MarkdownRenderer content={aiInsight} />
          </div>
        )}
      </div>
      
      {/* Subscription History */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 heading">Subscription History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {subscriptions.length > 0 ? (
                subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {new Date(subscription.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {new Date(subscription.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {subscription.accountEmail || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      PKR {subscription.paidPrice?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subscription.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : subscription.status === 'expired'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {subscription.status?.charAt(0).toUpperCase() + subscription.status?.slice(1) || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subscription.paymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : subscription.paymentStatus === 'unpaid'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {subscription.paymentStatus?.charAt(0).toUpperCase() + subscription.paymentStatus?.slice(1) || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No subscription history found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}