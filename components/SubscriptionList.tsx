'use client';
import { useState, useEffect } from 'react';
import { getSubscriptions, getAccounts, getSubscribers, cancelSubscription, createSubscription, deleteSubscription, updateSubscription } from '@/lib/db-operations';
import { Timestamp } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Dialog } from '@headlessui/react';
import { notify } from '@/lib/notifications';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

export type { ExtendedSubscription };

import RenewSubscriptionForm from './RenewSubscriptionForm';
import SubscriptionEditForm from './SubscriptionEditForm';

interface RenewSubscriptionFormProps {
    subscription: ExtendedSubscription;
    onRenew: (startDate: Date, endDate: Date, accountId: string, subscriberId: string, slotId: string) => void;
    onCancel: () => void;
}

export default function SubscriptionList() {
    const [subscriptions, setSubscriptions] = useState<ExtendedSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'expired'
    const [currency, setCurrency] = useState('PKR'); // 'USD' | 'PKR'
    const [showRenewForm, setShowRenewForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<ExtendedSubscription | null>(null);
    
    // New state variables for analytics
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [subscriptionStatusData, setSubscriptionStatusData] = useState<{labels: string[], data: number[]}>({labels: [], data: []});
    const [monthlyRevenueData, setMonthlyRevenueData] = useState<{labels: string[], data: number[]}>({labels: [], data: []});
    const [paymentStatusData, setPaymentStatusData] = useState<{labels: string[], data: number[]}>({labels: [], data: []});
    const [accountPerformance, setAccountPerformance] = useState<{accountEmail: string, revenue: number}[]>([]);
    const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedSubscriptionForDetail, setSelectedSubscriptionForDetail] = useState<ExtendedSubscription | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsData, accountsData, subscribersData] = await Promise.all([
          getSubscriptions(),
          getAccounts(),
          getSubscribers()
        ]);

        // Enhance subscription data with related information
        const enhancedSubscriptions = subsData.map(sub => {
          const account = accountsData.find(acc => acc.id === sub.accountId);
          const subscriber = subscribersData.find(s => s.id === sub.subscriberId);
          const slot = account?.slots.find(s => s.id === sub.slotId);
          const slotIndex = account?.slots.findIndex(s => s.id === sub.slotId);

          return {
            ...sub,
            accountEmail: account?.email || 'Unknown Account',
            subscriberName: subscriber?.name || 'Unknown Subscriber',
            slotNumber: slotIndex !== undefined ? `Slot ${slotIndex + 1}` : 'Unknown Slot',
            startDate: sub.startDate,
            endDate: sub.endDate,
            paidPrice: sub.paidPrice,
            paymentStatus: sub.paymentStatus,
          };
        });

        setSubscriptions(enhancedSubscriptions);
        
        // Calculate analytics data
        calculateAnalyticsData(enhancedSubscriptions);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending-renewal':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    return date.toLocaleDateString();
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filter === 'all') return true;
    return sub.status === filter;
  });

  const handleRenewClick = (subscription: ExtendedSubscription) => {
        setSelectedSubscription(subscription);
        setShowRenewForm(true);
    };

    const handleEditClick = (subscription: ExtendedSubscription) => {
        setSelectedSubscription(subscription);
        setShowEditForm(true);
    };

    const handleUpdate = async (id: string, startDate: Date, endDate: Date, paidPrice: number, paymentStatus: 'paid' | 'unpaid', notes: string) => {
        if (!selectedSubscription) return;

        try {
            await updateSubscription(id, startDate, endDate, paidPrice, paymentStatus, notes);
            setShowEditForm(false);

            // Refresh subscriptions
            const subsData = await getSubscriptions();
            const accountsData = await getAccounts();
            const subscribersData = await getSubscribers();

            // Enhance subscription data with related information
            const enhancedSubscriptions = subsData.map(sub => ({
                ...sub,
                accountEmail: accountsData.find(acc => acc.id === sub.accountId)?.email || 'Unknown Account',
                subscriberName: subscribersData.find(s => s.id === sub.subscriberId)?.name || 'Unknown Subscriber',
                slotNumber: accountsData.find(acc => acc.id === sub.accountId)?.slots.findIndex(s => s.id === sub.slotId) !== undefined 
                    ? `Slot ${accountsData.find(acc => acc.id === sub.accountId)?.slots.findIndex(s => s.id === sub.slotId)! + 1}` 
                    : 'Unknown Slot',
            }));

            setSubscriptions(enhancedSubscriptions);
            notify.success('Subscription updated successfully');
        } catch (error) {
            console.error('Error updating subscription:', error);
            notify.error('Failed to update subscription');
        }
    };

    const handleCancelEdit = () => {
        setShowEditForm(false);
        setSelectedSubscription(null);
    };

    const handleRenew = async (startDate: Date, endDate: Date, accountId: string, subscriberId: string, slotId: string) => {
        if (!selectedSubscription) return;

        try {
            await createSubscription({
                accountId: accountId,
                slotId: slotId,
                subscriberId: subscriberId,
                paidPrice: 0,
                startDate: startDate,
                endDate: endDate,
                status: 'active',
                paymentStatus: 'unpaid',
                paymentDueDate: Timestamp.fromDate(startDate),
            });
            setShowRenewForm(false);
            // Refresh subscriptions
            const subsData = await getSubscriptions();
            const accountsData = await getAccounts();
            const subscribersData = await getSubscribers();

            // Enhance subscription data with related information
            const enhancedSubscriptions = subsData.map(sub => {
                const account = accountsData.find(acc => acc.id === sub.accountId);
                const subscriber = subscribersData.find(s => s.id === sub.subscriberId);
                const slot = account?.slots.find(s => s.id === sub.slotId);
                const slotIndex = account?.slots.findIndex(s => s.id === sub.slotId);

                return {
                    ...sub,
                    accountEmail: account?.email || 'Unknown Account',
                    subscriberName: subscriber?.name || 'Unknown Subscriber',
                    slotNumber: slotIndex !== undefined ? `Slot ${slotIndex + 1}` : 'Unknown Slot',
                    startDate: sub.startDate,
                    endDate: sub.endDate,
                    paidPrice: sub.paidPrice,
                    paymentStatus: sub.paymentStatus,
                };
            });

            setSubscriptions(enhancedSubscriptions);
        } catch (error) {
            console.error('Error creating subscription:', error);
        }
    };

  const handleCancelRenew = () => {
    setShowRenewForm(false);
    setSelectedSubscription(null);
  };

  // Add this new function to calculate analytics data
  const calculateAnalyticsData = (subscriptions: ExtendedSubscription[]) => {
    // Calculate total revenue
    const revenue = subscriptions.reduce((total, sub) => total + sub.paidPrice, 0);
    setTotalRevenue(revenue);
    
    // Calculate subscription status distribution
    const statusCounts: Record<string, number> = {};
    subscriptions.forEach(sub => {
        statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
    });
    
    setSubscriptionStatusData({
        labels: Object.keys(statusCounts).map(status => 
            status.charAt(0).toUpperCase() + status.slice(1)
        ),
        data: Object.values(statusCounts)
    });
    
    // Calculate payment status distribution
    const paymentStatusCounts: Record<string, number> = {};
    subscriptions.forEach(sub => {
        paymentStatusCounts[sub.paymentStatus] = (paymentStatusCounts[sub.paymentStatus] || 0) + 1;
    });
    
    setPaymentStatusData({
        labels: Object.keys(paymentStatusCounts).map(status => 
            status.charAt(0).toUpperCase() + status.slice(1)
        ),
        data: Object.values(paymentStatusCounts)
    });
    
    // Calculate monthly revenue (for the last 6 months)
    const monthlyRevenue: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = month.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyRevenue[monthKey] = 0;
    }
    
    // Sum up revenue by month
    subscriptions.forEach(sub => {
        const startDate = sub.startDate instanceof Timestamp ? sub.startDate.toDate() : sub.startDate;
        const monthKey = startDate.toLocaleString('default', { month: 'short', year: '2-digit' });
        
        // Only count if it's within the last 6 months
        if (monthlyRevenue[monthKey] !== undefined) {
            monthlyRevenue[monthKey] += sub.paidPrice;
        }
    });
    
    setMonthlyRevenueData({
        labels: Object.keys(monthlyRevenue),
        data: Object.values(monthlyRevenue)
    });
    
    // Calculate revenue by account
    const accountRevenue: Record<string, number> = {};
    subscriptions.forEach(sub => {
        const accountEmail = sub.accountEmail || 'Unknown';
        accountRevenue[accountEmail] = (accountRevenue[accountEmail] || 0) + sub.paidPrice;
    });
    
    // Convert to array and sort by revenue (descending)
    const accountPerformanceArray = Object.entries(accountRevenue)
        .map(([accountEmail, revenue]) => ({ accountEmail, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); // Top 5 accounts
        
    setAccountPerformance(accountPerformanceArray);
  };

  // Add this to the return statement, before the table
  const renderAnalyticsDashboard = () => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 heading">Subscription Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <h3 className="text-lg font-medium mb-2 heading">Total Revenue</h3>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {currency === 'PKR' ? 'PKR ' : '$'}
                        {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                
                <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <h3 className="text-lg font-medium mb-2 heading">Active Subscriptions</h3>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {subscriptions.filter(sub => sub.status === 'active').length}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                        out of {subscriptions.length} total
                    </p>
                </div>
                
                <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <h3 className="text-lg font-medium mb-2 heading">Payment Collection Rate</h3>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {subscriptions.length > 0 
                            ? Math.round((subscriptions.filter(sub => sub.paymentStatus === 'paid').length / subscriptions.length) * 100)
                            : 0}%
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <h3 className="text-lg font-medium mb-2 heading">Subscription Status</h3>
                    <div className="h-64">
                        <Pie 
                            data={{
                                labels: subscriptionStatusData.labels,
                                datasets: [{
                                    data: subscriptionStatusData.data,
                                    backgroundColor: [
                                        'rgba(75, 192, 192, 0.6)',
                                        'rgba(255, 99, 132, 0.6)',
                                        'rgba(255, 206, 86, 0.6)',
                                        'rgba(153, 102, 255, 0.6)',
                                    ],
                                    borderWidth: 1
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                            }}
                        />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <h3 className="text-lg font-medium mb-2 heading">Payment Status</h3>
                    <div className="h-64">
                        <Pie 
                            data={{
                                labels: paymentStatusData.labels,
                                datasets: [{
                                    data: paymentStatusData.data,
                                    backgroundColor: [
                                        'rgba(75, 192, 192, 0.6)',
                                        'rgba(255, 99, 132, 0.6)',
                                        'rgba(255, 206, 86, 0.6)',
                                        'rgba(153, 102, 255, 0.6)',
                                        'rgba(54, 162, 235, 0.6)',
                                    ],
                                    borderWidth: 1
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                            }}
                        />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <h3 className="text-lg font-medium mb-2 heading">Monthly Revenue</h3>
                    <div className="h-64">
                        <Bar 
                            data={{
                                labels: monthlyRevenueData.labels,
                                datasets: [{
                                    label: 'Revenue',
                                    data: monthlyRevenueData.data,
                                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 1
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <h3 className="text-lg font-medium mb-2 heading">Top Performing Accounts</h3>
                    <div className="overflow-y-auto h-64">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Account
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Revenue
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {accountPerformance.map((account, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {account.accountEmail}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {currency === 'PKR' ? 'PKR ' : '$'}
                                            {account.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubscriptions(filteredSubscriptions.map(sub => sub.id));
    } else {
      setSelectedSubscriptions([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubscriptions.length === 0) {
      alert('Please select at least one subscription to delete');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedSubscriptions.length} subscription(s)?`
    );

    if (confirmDelete) {
      setLoading(true);
      try {
        // Delete each selected subscription
        for (const subscriptionId of selectedSubscriptions) {
          await deleteSubscription(subscriptionId);
        }
        
        // Refresh the list
        const subsData = await getSubscriptions();
        setSubscriptions(subsData);
        setSelectedSubscriptions([]);
        notify.success('Successfully deleted selected subscriptions');
      } catch (error) {
        console.error('Error during bulk deletion:', error);
        notify.error('Some subscriptions could not be deleted. They may be active.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleShowDetails = (subscription: ExtendedSubscription) => {
    setSelectedSubscriptionForDetail(subscription);
    setShowDetailModal(true);
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        await deleteSubscription(subscriptionId);
        setSubscriptions(subscriptions.filter(sub => sub.id !== subscriptionId));
        notify.success('Subscription deleted successfully');
      } catch (error) {
        console.error('Error deleting subscription:', error);
        notify.error('Failed to delete subscription');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading subscriptions...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium heading">Subscriptions</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </button>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All Subscriptions</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending-renewal">Pending Renewal</option>
            </select>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="USD">USD</option>
              <option value="PKR">PKR</option>
            </select>
          </div>
        </div>
      </div>

      {showAnalytics && renderAnalyticsDashboard()}

      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {selectedSubscriptions.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              disabled={loading}
            >
              {loading ? 'Deleting...' : `Delete Selected (${selectedSubscriptions.length})`}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checked={selectedSubscriptions.length === filteredSubscriptions.length && filteredSubscriptions.length > 0}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Account & Slot
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Subscriber
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Price
              </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Payment Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredSubscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedSubscriptions.includes(subscription.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubscriptions([...selectedSubscriptions, subscription.id]);
                      } else {
                        setSelectedSubscriptions(selectedSubscriptions.filter(id => id !== subscription.id));
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {subscription.accountEmail || 'Unknown'}
                    </span>
                    <button
                      onClick={() => {
                        if (subscription.accountEmail) {
                          navigator.clipboard.writeText(subscription.accountEmail);
                          alert('Email copied to clipboard!');
                        }
                      }}
                      className="p-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 flex-shrink-0"
                      disabled={!subscription.accountEmail}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {subscription.subscriberName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    Start: {formatDate(subscription.startDate)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    End: {formatDate(subscription.endDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {typeof subscription.paidPrice === 'number' ? `PKR ${subscription.paidPrice.toFixed(2)}` : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(subscription.status)}`}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    subscription.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {subscription.paymentStatus.charAt(0).toUpperCase() + subscription.paymentStatus.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                    onClick={() => handleRenewClick(subscription)}
                  >
                    Renew
                  </button>
                  <button
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                    onClick={() => handleEditClick(subscription)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    onClick={() => handleDeleteSubscription(subscription.id)}
                  >
                    Delete
                  </button>
                  <button
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                    onClick={() => handleShowDetails(subscription)}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSubscriptions.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No subscriptions found for the selected filter.
        </div>
      )}

      {showRenewForm && selectedSubscription && (
        <RenewSubscriptionForm
          subscription={selectedSubscription}
          onRenew={handleRenew}
          onCancel={handleCancelRenew}
        />
      )}

      {showEditForm && selectedSubscription && (
        <SubscriptionEditForm
          subscription={selectedSubscription as any}
          onUpdate={handleUpdate}
          onCancel={handleCancelEdit}
        />
      )}

      {showDetailModal && selectedSubscriptionForDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-black opacity-30" />

            <div className="relative bg-white dark:bg-slate-800 rounded-lg max-w-3xl w-full mx-4 p-6 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold heading">
                  Subscription Details
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Subscriber</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
                    {selectedSubscriptionForDetail.subscriberName}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Account</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
                    {selectedSubscriptionForDetail.accountEmail}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Slot</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
                    {selectedSubscriptionForDetail.slotNumber}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
                    PKR {selectedSubscriptionForDetail.paidPrice?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(selectedSubscriptionForDetail.startDate)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</h3>
                  <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(selectedSubscriptionForDetail.endDate)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedSubscriptionForDetail.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : selectedSubscriptionForDetail.status === 'expired'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {selectedSubscriptionForDetail.status?.charAt(0).toUpperCase() + selectedSubscriptionForDetail.status?.slice(1)}
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Status</h3>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedSubscriptionForDetail.paymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {selectedSubscriptionForDetail.paymentStatus?.charAt(0).toUpperCase() + selectedSubscriptionForDetail.paymentStatus?.slice(1)}
                    </span>
                  </p>
                </div>
              </div>

              {selectedSubscriptionForDetail.notes && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedSubscriptionForDetail.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleRenewClick(selectedSubscriptionForDetail);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Renew
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEditClick(selectedSubscriptionForDetail);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
