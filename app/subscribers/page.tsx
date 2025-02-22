'use client';
import { useState } from 'react';
import SubscriberForm from '@/components/SubscriberForm';
import SubscriberList from '@/components/SubscriberList';

export default function SubscribersPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshSubscribers, setRefreshSubscribers] = useState(false);

  const handleSubscriberAdded = () => {
    setRefreshSubscribers(!refreshSubscribers);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subscribers</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Add Subscriber'}
        </button>
      </div>
      
      {showForm && <SubscriberForm onSuccess={handleSubscriberAdded} />}
      <SubscriberList refresh={refreshSubscribers} />
    </div>
  );
}
