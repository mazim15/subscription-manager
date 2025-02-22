'use client';
import { useState } from 'react';
import { addSubscriber } from '@/lib/db-operations';

interface SubscriberFormProps {
  onSuccess?: () => void;
}

export default function SubscriberForm({ onSuccess }: SubscriberFormProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await addSubscriber({
        name,
        contact,
        subscriptions: [],
      });

      setName('');
      setContact('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding subscriber:', error);
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
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
          Add Subscriber
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
    </form>
  );
}
