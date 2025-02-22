
'use client';
import { useState, useEffect } from 'react';
import { getSubscriptions, getAccounts, getSubscribers, cancelSubscription, createSubscription, deleteSubscription } from '@/lib/db-operations';
import { Timestamp } from 'firebase/firestore';

interface ExtendedSubscription {
  id: string;
  accountId: string;
  slotId: string;
  subscriberId: string;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  paidPrice: number;
  status: 'active' | 'expired' | 'pending-renewal';
  accountEmail?: string;
  subscriberName?: string;
  slotNumber?: string;
}

export type { ExtendedSubscription };

import RenewSubscriptionForm from './RenewSubscriptionForm';

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
    const [selectedSubscription, setSelectedSubscription] = useState<ExtendedSubscription | null>(null);

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
            paidPrice: sub.paidPrice, // Add this line
          };
        });

        setSubscriptions(enhancedSubscriptions);
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

    const handleRenew = async (startDate: Date, endDate: Date, accountId: string, subscriberId: string, slotId: string) => {
        if (!selectedSubscription) return;

        try {
            await createSubscription({
                accountId: accountId,
                slotId: slotId,
                subscriberId: subscriberId,
                paidPrice: selectedSubscription.paidPrice || 0,
                startDate: startDate,
                endDate: endDate,
                status: 'active',
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading subscriptions...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Subscriptions</h2>
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Subscriptions</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending-renewal">Pending Renewal</option>
            </select>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="USD">USD</option>
              <option value="PKR">PKR</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account & Slot
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subscriber
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSubscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {subscription.accountEmail}
                  </div>
                  <div className="text-sm text-gray-500">
                    {subscription.slotNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {subscription.subscriberName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    Start: {formatDate(subscription.startDate)}
                  </div>
                  <div className="text-sm text-gray-500">
                    End: {formatDate(subscription.endDate)}
                  </div>
                </td>
<td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-gray-900">
    {typeof subscription.paidPrice === 'number' ? `PKR ${subscription.paidPrice.toFixed(2)}` : 'N/A'}
  </div>
</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(subscription.status)}`}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    onClick={() => handleRenewClick(subscription)}
                  >
                    Renew
                  </button>
                  <button
                    className="text-red-600 hover:text-red-900"
                    onClick={() => {
                      cancelSubscription(subscription.id);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-red-600 hover:text-red-900 ml-3"
                    onClick={async () => {
                      const confirmDelete = window.confirm(
                        `Are you sure you want to delete this subscription?`
                      );
                      if (confirmDelete) {
                        setLoading(true);
                        await deleteSubscription(subscription.id);
                        const subsData = await getSubscriptions();
                        setSubscriptions(subsData);
                        setLoading(false);
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSubscriptions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
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
    </div>
  );
}
