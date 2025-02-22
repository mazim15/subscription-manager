'use client';
import { useState, useEffect } from 'react';
import { createSubscription, getAccounts, getSubscribers } from '@/lib/db-operations';

import { Account, Subscriber } from '@/types';

export default function SubscriptionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedSubscriber, setSelectedSubscriber] = useState('');
  const [paidPrice, setPaidPrice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = parseFloat(paidPrice);

    if (isNaN(parsedPrice)) {
      alert('Please enter a valid number for the paid price.');
      return;
    }

    try {
      await createSubscription(
        {
          accountId: selectedAccount,
          slotId: selectedSlot,
          subscriberId: selectedSubscriber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          paidPrice: parsedPrice,
          status: 'active'
        }
      );

      onSuccess?.();
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
  const availableSlots = selectedAccountData?.slots.filter(slot => !slot.isOccupied) || [];

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Account</label>
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setSelectedSlot('');
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select Account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.email}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Slot</label>
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
            disabled={!selectedAccount}
          >
            <option value="">Select Slot</option>
            {availableSlots.map(slot => (
              <option key={slot.id} value={slot.id}>Slot {slot.id} (PIN: {slot.pin})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Subscriber</label>
          <select
            value={selectedSubscriber}
            onChange={(e) => setSelectedSubscriber(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select Subscriber</option>
            {subscribers.map(subscriber => (
              <option key={subscriber.id} value={subscriber.id}>{subscriber.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Paid Price</label>
          <input
            type="number"
            value={paidPrice}
            onChange={(e) => setPaidPrice(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
      </div>
      
      <div className="mt-6">
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Create Subscription
        </button>
      </div>
    </form>
  );
}
