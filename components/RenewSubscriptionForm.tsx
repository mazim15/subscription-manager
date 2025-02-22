'use client';
import { useState, useEffect } from 'react';
import { ExtendedSubscription } from './SubscriptionList';
import { getAccounts, getSubscribers } from '@/lib/db-operations';
import { Account, Subscriber, Slot } from '@/types';

interface RenewSubscriptionFormProps {
  subscription: ExtendedSubscription;
  onRenew: (startDate: Date, endDate: Date, accountId: string, subscriberId: string, slotId: string) => void;
  onCancel: () => void;
}

const RenewSubscriptionForm: React.FC<RenewSubscriptionFormProps> = ({ subscription, onRenew, onCancel }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedAccount, setSelectedAccount] = useState(subscription.accountId);
  const [selectedSubscriber, setSelectedSubscriber] = useState(subscription.subscriberId);
  const [selectedSlot, setSelectedSlot] = useState(subscription.slotId);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [accountsData, subscribersData] = await Promise.all([
                    getAccounts(),
                    getSubscribers()
                ]);
                setAccounts(accountsData);
                setSubscribers(subscribersData);

                // Fetch available slots for the selected account and filter them
                const selectedAccountData = accountsData.find(acc => acc.id === selectedAccount);
                const allSlots = selectedAccountData?.slots || [];
                const availableSlots = allSlots.filter(slot => !slot.isOccupied);
                setAvailableSlots(availableSlots);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedAccount]);

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) {
            alert('Please select start and end dates');
            return;
        }
        onRenew(new Date(startDate), new Date(endDate), selectedAccount, selectedSubscriber, selectedSlot);
    };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Renew Subscription
        </h3>
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Enter the new start and end dates for the subscription.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-4">
            <label htmlFor="account" className="block text-gray-700 text-sm font-bold mb-2">
              Account:
            </label>
            <select
              id="account"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                // Update available slots when account changes
                const selectedAccountData = accounts.find(acc => acc.id === e.target.value);
                setAvailableSlots(selectedAccountData?.slots || []);
              }}
              required
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="subscriber" className="block text-gray-700 text-sm font-bold mb-2">
              Subscriber:
            </label>
            <select
              id="subscriber"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={selectedSubscriber}
              onChange={(e) => setSelectedSubscriber(e.target.value)}
              required
            >
              {subscribers.map((subscriber) => (
                <option key={subscriber.id} value={subscriber.id}>
                  {subscriber.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="slot" className="block text-gray-700 text-sm font-bold mb-2">
              Slot:
            </label>
            <select
              id="slot"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              required
            >
              {availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  Slot {slot.id}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2">
              Start Date:
            </label>
            <input
              type="date"
              id="startDate"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">
              End Date:
            </label>
            <input
              type="date"
              id="endDate"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Renew
            </button>
            <button
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenewSubscriptionForm;
