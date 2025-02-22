'use client';
import { useState } from 'react';
import SubscriptionForm from '@/components/SubscriptionForm';
import SubscriptionList from '@/components/SubscriptionList';

export default function SubscriptionsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Create Subscription'}
        </button>
      </div>
      
      {showForm && <SubscriptionForm onSuccess={() => setShowForm(false)} />}
      <SubscriptionList />
    </div>
  );
}