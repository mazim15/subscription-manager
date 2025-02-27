'use client';
import Link from "next/link";
import { useState, useEffect, useMemo } from 'react';
import { getSubscribers, deleteSubscriber, getSubscriberUsage, getSubscriptionsBySubscriberId } from '@/lib/db-operations';
import { Subscriber } from '@/types';
import { generateText } from '@/lib/gemini';
import { notify } from '@/lib/notifications';

interface SubscriberListProps {
  refresh: boolean;
  searchTerm?: string;
  onStatsUpdate?: () => void;
}

interface SubscriberWithScore extends Subscriber {
  paymentScore: number;
  totalDue: number;
  totalPaid: number;
  paymentRate: number;
  activeSubscriptions: number;
  totalPayments: number;
}

export default function SubscriberList({ refresh, searchTerm = '', onStatsUpdate }: SubscriberListProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Add error state
  const [subscriberUsages, setSubscriberUsages] = useState<{[key: string]: any}>({});
  const [selectedSubscriberForAnalysis, setSelectedSubscriberForAnalysis] = useState<string | null>(null);
  const [subscriberAnalysis, setSubscriberAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [subscribersWithScores, setSubscribersWithScores] = useState<SubscriberWithScore[]>([]);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);

  const calculatePaymentScore = async (subscribers: Subscriber[]) => {
    const enhancedSubscribers: SubscriberWithScore[] = [];
    
    for (const subscriber of subscribers) {
      try {
        // Get subscriber's subscriptions
        const subscriptionHistory = await getSubscriptionsBySubscriberId(subscriber.id);
        
        // Default values if no subscription history
        let paymentScore = 0;
        let totalDue = 0;
        let totalPaid = 0;
        let paymentRate = 0;
        let activeSubscriptions = 0;
        
        if (Array.isArray(subscriptionHistory) && subscriptionHistory.length > 0) {
          // Calculate payment metrics
          let paidCount = 0;
          
          subscriptionHistory.forEach(sub => {
            const price = sub.paidPrice || 0;
            totalDue += price;
            
            if (sub.paymentStatus === 'paid') {
              totalPaid += price;
              paidCount++;
            }
            
            // Count active subscriptions
            if (sub.status === 'active') {
              activeSubscriptions++;
            }
          });
          
          // Calculate payment rate (percentage of subscriptions paid)
          paymentRate = Math.round((paidCount / subscriptionHistory.length) * 100);
          
          // Calculate payment score (0-100)
          // 70% weight to amount paid vs due, 30% weight to number of paid subscriptions
          const amountRatio = totalDue > 0 ? (totalPaid / totalDue) : 0;
          paymentScore = Math.round((amountRatio * 70) + (paymentRate * 0.3));
          
          // Cap score at 100
          paymentScore = Math.min(100, paymentScore);
        }
        
        enhancedSubscribers.push({
          ...subscriber,
          paymentScore,
          totalDue,
          totalPaid,
          paymentRate,
          activeSubscriptions,
          totalPayments: totalPaid
        });
      } catch (error) {
        console.error(`Error calculating payment score for ${subscriber.name}:`, error);
        enhancedSubscribers.push({
          ...subscriber,
          paymentScore: 0,
          totalDue: 0,
          totalPaid: 0,
          paymentRate: 0,
          activeSubscriptions: 0,
          totalPayments: 0
        });
      }
    }
    
    return enhancedSubscribers;
  };

  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        setLoading(true);
        const data = (await getSubscribers()) as Subscriber[];
        setSubscribers(data);

        // Calculate payment scores
        const subscribersWithScores = await calculatePaymentScore(data);
        setSubscribersWithScores(subscribersWithScores);

        // Fetch subscriber usages
        const usages: {[key: string]: any} = {};
        for (const subscriber of data) {
          const usage = await getSubscriberUsage(subscriber.id);
          usages[subscriber.id] = usage;
        }
        setSubscriberUsages(usages);
      } catch (error) {
        console.error('Error fetching subscribers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscribers();
  }, [refresh]);

  const handleDeleteSubscriber = async (subscriberId: string) => {
    if (window.confirm('Are you sure you want to delete this subscriber?')) {
      try {
        await deleteSubscriber(subscriberId);
        const data = await getSubscribers();
        setSubscribers(data);
        notify.success('Subscriber deleted successfully');
      } catch (error: any) {
        console.error('Error deleting subscriber:', error);
        notify.error(error.message || 'Failed to delete subscriber');
      }
    }
  };

  const handleCopyContact = (contact: string) => {
    navigator.clipboard.writeText(contact);
    notify.success('Contact number copied to clipboard');
  };

  const handleSubscriberUpdated = async () => {
    setSelectedSubscriberForAnalysis(null);
    const data = await getSubscribers();
    setSubscribers(data);
    notify.success('Subscriber updated successfully');
  };

  const analyzeSubscriber = async (subscriberId: string) => {
    try {
      setAnalysisLoading(true);
      setSelectedSubscriberForAnalysis(subscriberId);
      
      const subscriber = subscribers.find(s => s.id === subscriberId);
      if (!subscriber) return;
      
      // Get subscriber's subscriptions
      const subscriptionHistory = await getSubscriptionsBySubscriberId(subscriberId);
      
      if (!Array.isArray(subscriptionHistory) || subscriptionHistory.length === 0) {
        setSubscriberAnalysis("This subscriber has no subscription history yet.");
        return;
      }
      
      // Calculate payment metrics
      let totalDue = 0;
      let totalPaid = 0;
      let unpaidCount = 0;
      let paidCount = 0;
      
      subscriptionHistory.forEach(sub => {
        const price = sub.paidPrice || 0;
        totalDue += price;
        
        if (sub.paymentStatus === 'paid') {
          totalPaid += price;
          paidCount++;
        } else {
          unpaidCount++;
        }
      });
      
      const subscriberData = {
        name: subscriber.name,
        contact: subscriber.contact,
        subscriptionsCount: subscriptionHistory.length,
        totalDue: totalDue,
        totalPaid: totalPaid,
        unpaidAmount: totalDue - totalPaid,
        paidSubscriptions: paidCount,
        unpaidSubscriptions: unpaidCount,
        paymentRate: subscriptionHistory.length > 0 ? 
          Math.round((paidCount / subscriptionHistory.length) * 100) : 0,
        subscriptionHistory: subscriptionHistory.map((sub: any) => ({
          startDate: new Date(sub.startDate).toLocaleDateString(),
          endDate: new Date(sub.endDate).toLocaleDateString(),
          price: sub.paidPrice || 0,
          status: sub.status || 'unknown',
          paymentStatus: sub.paymentStatus || 'unknown'
        }))
      };
      
      const prompt = `
        Analyze this subscriber's payment data and provide insights:
        ${JSON.stringify(subscriberData, null, 2)}
        
        Important context:
        - We do NOT offer free trials
        - All subscriptions require payment
        - "unpaid" status means the customer has not paid yet
        - "paid" status means the customer has paid
        
        Please provide:
        1. A summary of their payment behavior (are they paying on time, late, or not at all?)
        2. Their value as a customer (total paid amount and payment reliability)
        3. Recommendations for collecting any unpaid amounts
        4. Suggestions for improving their payment behavior if needed
        
        Keep it concise and actionable (under 150 words).
      `;
      
      const result = await generateText(prompt);
      setSubscriberAnalysis(result);
    } catch (error) {
      console.error('Error analyzing subscriber:', error);
      setSubscriberAnalysis('Unable to analyze subscriber data at this time.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-blue-100 text-blue-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    if (score >= 30) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Average';
    if (score >= 30) return 'Poor';
    return 'Very Poor';
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedSubscribers = useMemo(() => {
    return [...subscribersWithScores].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'paymentScore':
          comparison = a.paymentScore - b.paymentScore;
          break;
        case 'totalPaid':
          comparison = a.totalPaid - b.totalPaid;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [subscribersWithScores, sortField, sortDirection]);

  const filteredSubscribers = useMemo(() => {
    if (scoreFilter === 'all') return sortedSubscribers;
    if (scoreFilter === 'excellent') return sortedSubscribers.filter(s => s.paymentScore >= 90);
    if (scoreFilter === 'good') return sortedSubscribers.filter(s => s.paymentScore >= 70 && s.paymentScore < 90);
    if (scoreFilter === 'average') return sortedSubscribers.filter(s => s.paymentScore >= 50 && s.paymentScore < 70);
    if (scoreFilter === 'poor') return sortedSubscribers.filter(s => s.paymentScore >= 30 && s.paymentScore < 50);
    if (scoreFilter === 'very-poor') return sortedSubscribers.filter(s => s.paymentScore < 30);
    return sortedSubscribers;
  }, [sortedSubscribers, scoreFilter]);

  const paymentStats = useMemo(() => {
    const totalSubscribers = subscribersWithScores.length;
    const excellentPayers = subscribersWithScores.filter(s => s.paymentScore >= 90).length;
    const goodPayers = subscribersWithScores.filter(s => s.paymentScore >= 70 && s.paymentScore < 90).length;
    const averagePayers = subscribersWithScores.filter(s => s.paymentScore >= 50 && s.paymentScore < 70).length;
    const poorPayers = subscribersWithScores.filter(s => s.paymentScore >= 30 && s.paymentScore < 50).length;
    const veryPoorPayers = subscribersWithScores.filter(s => s.paymentScore < 30).length;
    
    const totalDue = subscribersWithScores.reduce((sum, s) => sum + s.totalDue, 0);
    const totalPaid = subscribersWithScores.reduce((sum, s) => sum + s.totalPaid, 0);
    const totalUnpaid = totalDue - totalPaid;
    
    return {
      totalSubscribers,
      excellentPayers,
      goodPayers,
      averagePayers,
      poorPayers,
      veryPoorPayers,
      totalDue,
      totalPaid,
      totalUnpaid,
      paymentRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0
    };
  }, [subscribersWithScores]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubscribers(subscribers.map(sub => sub.id));
    } else {
      setSelectedSubscribers([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubscribers.length === 0) {
      alert('Please select at least one subscriber to delete');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedSubscribers.length} subscriber(s)?`
    );

    if (confirmDelete) {
      setLoading(true);
      try {
        // Delete each selected subscriber
        for (const subscriberId of selectedSubscribers) {
          await deleteSubscriber(subscriberId);
        }
        
        // Refresh the list
        const data = await getSubscribers();
        setSubscribers(data);
        setSelectedSubscribers([]);
        notify.success(`Successfully deleted ${selectedSubscribers.length} subscriber(s)`);
      } catch (error) {
        console.error('Error during bulk deletion:', error);
        notify.error('Some subscribers could not be deleted. They may have active subscriptions.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <div>Loading subscribers...</div>;
  }

  return (
    <div>
      {error && <div className="text-red-500">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Statistics</h3>
          <div className="text-2xl font-bold heading">
            {paymentStats.paymentRate}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Overall payment rate
          </div>
          <div className="mt-2 flex justify-between">
            <div className="text-green-500">PKR {paymentStats.totalPaid.toLocaleString()}</div>
            <div className="text-gray-500 dark:text-gray-400">PKR {paymentStats.totalDue.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Subscriber Quality</h3>
          <div className="mt-2 relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div className="w-full bg-gradient-to-r from-green-500 via-blue-500 to-red-500 rounded-full h-2.5">
              </div>
            </div>
            <div className="mt-2 grid grid-cols-5 text-xs text-center">
              <div><span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>{paymentStats.excellentPayers}</div>
              <div><span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>{paymentStats.goodPayers}</div>
              <div><span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>{paymentStats.averagePayers}</div>
              <div><span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-1"></span>{paymentStats.poorPayers}</div>
              <div><span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>{paymentStats.veryPoorPayers}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Outstanding Payments</h3>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">PKR {paymentStats.totalUnpaid.toLocaleString()}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total unpaid amount</div>
          <button 
            className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            onClick={() => setScoreFilter('very-poor')}
          >
            View subscribers with poor payment history →
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-medium heading">Subscribers</h2>
          <div className="flex space-x-2">
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All Payment Scores</option>
              <option value="excellent">Excellent (90-100)</option>
              <option value="good">Good (75-89)</option>
              <option value="average">Average (50-74)</option>
              <option value="poor">Poor (25-49)</option>
              <option value="very-poor">Very Poor (0-24)</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {selectedSubscribers.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : `Delete Selected (${selectedSubscribers.length})`}
                </button>
              )}
            </div>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={selectedSubscribers.length === subscribers.length && subscribers.length > 0}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Active Subscriptions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Payment Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Payments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSubscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedSubscribers.includes(subscriber.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSubscribers([...selectedSubscribers, subscriber.id]);
                        } else {
                          setSelectedSubscribers(selectedSubscribers.filter(id => id !== subscriber.id));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {subscriber.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {subscriber.contact}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {subscriber.activeSubscriptions || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mr-2">
                        {subscriber.paymentScore || 0}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getScoreColor(subscriber.paymentScore || 0)}`}>
                        {getScoreLabel(subscriber.paymentScore || 0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    PKR {subscriber.totalPayments?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/subscribers/${subscriber.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3">
                      View Details
                    </Link>
                    <button
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      onClick={() => handleDeleteSubscriber(subscriber.id)}
                    >
                      Delete
                    </button>
                    <button
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 ml-3"
                      onClick={() => analyzeSubscriber(subscriber.id)}
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredSubscribers.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No subscribers found.
          </div>
        )}
      </div>
      
      {selectedSubscriberForAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Subscriber Analysis
              </h3>
              <button 
                onClick={() => setSelectedSubscriberForAnalysis(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>
            
            {analysisLoading ? (
              <div className="py-4 text-center text-gray-500">Analyzing subscriber data...</div>
            ) : (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap">{subscriberAnalysis}</div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedSubscriberForAnalysis(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
