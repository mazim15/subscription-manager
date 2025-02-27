'use client';
import { useState, useEffect } from 'react';
import { getSubscriptions, getAccounts, getSubscribers } from '@/lib/db-operations';
import { Timestamp } from 'firebase/firestore';
import RenewSubscriptionForm from '@/components/RenewSubscriptionForm';
import { notify } from '@/lib/notifications';
import { Bar } from 'react-chartjs-2';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ExtendedSubscription {
  id: string;
  accountId: string;
  slotId: string;
  subscriberId: string;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  paidPrice: number;
  status: 'active' | 'expired' | 'pending-renewal' | 'suspended';
  paymentStatus: 'paid' | 'unpaid' | 'overdue' | 'pending' | 'partial';
  accountEmail?: string;
  subscriberName?: string;
  slotNumber?: string;
  notes?: string;
}

export default function ExpiringSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<ExtendedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRenewForm, setShowRenewForm] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<ExtendedSubscription | null>(null);
  const [expiryFilter, setExpiryFilter] = useState('30'); // '7', '15', '30', '60' days
  const [sortBy, setSortBy] = useState('expiry'); // 'expiry', 'subscriber', 'account'
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [expiryDistribution, setExpiryDistribution] = useState<{labels: string[], data: number[]}>({
    labels: [],
    data: []
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const [subsData, accountsData, subscribersData] = await Promise.all([
        getSubscriptions(),
        getAccounts(),
        getSubscribers()
      ]);

      // Enhance subscription data
      const enhancedSubs = subsData.map(sub => ({
        ...sub,
        accountEmail: accountsData.find(acc => acc.id === sub.accountId)?.email || 'Unknown Account',
        subscriberName: subscribersData.find(s => s.id === sub.subscriberId)?.name || 'Unknown Subscriber',
        slotNumber: accountsData.find(acc => acc.id === sub.accountId)?.slots.findIndex(s => s.id === sub.slotId) !== undefined 
          ? `Slot ${accountsData.find(acc => acc.id === sub.accountId)?.slots.findIndex(s => s.id === sub.slotId)! + 1}` 
          : 'Unknown Slot',
      }));

      setSubscriptions(enhancedSubs);
      calculateExpiryDistribution(enhancedSubs);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      notify.error('Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const calculateExpiryDistribution = (subs: ExtendedSubscription[]) => {
    const distribution: Record<string, number> = {
      '0-7 days': 0,
      '8-15 days': 0,
      '16-30 days': 0,
      '31-60 days': 0,
      '60+ days': 0
    };

    subs.forEach(sub => {
      const endDate = sub.endDate instanceof Timestamp ? sub.endDate.toDate() : sub.endDate;
      const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 7) distribution['0-7 days']++;
      else if (daysUntilExpiry <= 15) distribution['8-15 days']++;
      else if (daysUntilExpiry <= 30) distribution['16-30 days']++;
      else if (daysUntilExpiry <= 60) distribution['31-60 days']++;
      else distribution['60+ days']++;
    });

    setExpiryDistribution({
      labels: Object.keys(distribution),
      data: Object.values(distribution)
    });
  };

  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    return date.toLocaleDateString();
  };

  const getDaysUntilExpiry = (endDate: Date | Timestamp) => {
    const end = endDate instanceof Timestamp ? endDate.toDate() : endDate;
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredSubscriptions = subscriptions
    .filter(sub => {
      const daysUntilExpiry = getDaysUntilExpiry(sub.endDate);
      return daysUntilExpiry <= parseInt(expiryFilter);
    })
    .sort((a, b) => {
      if (sortBy === 'expiry') {
        const aDate = a.endDate instanceof Timestamp ? a.endDate.toDate() : a.endDate;
        const bDate = b.endDate instanceof Timestamp ? b.endDate.toDate() : b.endDate;
        return aDate.getTime() - bDate.getTime();
      }
      if (sortBy === 'subscriber') {
        return (a.subscriberName || '').localeCompare(b.subscriberName || '');
      }
      return (a.accountEmail || '').localeCompare(b.accountEmail || '');
    });

  const handleRenewClick = (subscription: ExtendedSubscription) => {
    setSelectedSubscription(subscription);
    setShowRenewForm(true);
  };

  const handleRenew = async (startDate: Date, endDate: Date, accountId: string, subscriberId: string, slotId: string) => {
    // Implementation similar to SubscriptionList component
    setShowRenewForm(false);
    setSelectedSubscription(null);
    await fetchSubscriptions();
    notify.success('Subscription renewed successfully');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading expiring subscriptions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold heading">Expiring Subscriptions</h1>
        <div className="flex space-x-4">
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="7">Next 7 days</option>
            <option value="15">Next 15 days</option>
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="expiry">Sort by Expiry Date</option>
            <option value="subscriber">Sort by Subscriber</option>
            <option value="account">Sort by Account</option>
          </select>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </button>
        </div>
      </div>

      {showAnalytics && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 heading">Expiry Distribution</h2>
          <div className="h-64">
            <Bar
              data={{
                labels: expiryDistribution.labels,
                datasets: [{
                  label: 'Number of Subscriptions',
                  data: expiryDistribution.data,
                  backgroundColor: 'rgba(59, 130, 246, 0.5)',
                  borderColor: 'rgb(59, 130, 246)',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Subscriber & Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Days Left
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSubscriptions.map((subscription) => {
                const daysLeft = getDaysUntilExpiry(subscription.endDate);
                return (
                  <tr key={subscription.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {subscription.subscriberName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {subscription.accountEmail} ({subscription.slotNumber})
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(subscription.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        daysLeft <= 7 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                          : daysLeft <= 15
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {daysLeft} days
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div className="max-w-xs overflow-hidden text-ellipsis">
                        {subscription.notes || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleRenewClick(subscription)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                      >
                        Renew
                      </button>
                      <Link
                        href={`/subscriptions/${subscription.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No subscriptions expiring within the selected time frame.
          </div>
        )}
      </div>

      {showRenewForm && selectedSubscription && (
        <RenewSubscriptionForm
          subscription={selectedSubscription}
          onRenew={handleRenew}
          onCancel={() => {
            setShowRenewForm(false);
            setSelectedSubscription(null);
          }}
        />
      )}
    </div>
  );
} 