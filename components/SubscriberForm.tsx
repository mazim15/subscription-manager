'use client';
import { useState } from 'react';
import { addSubscriber } from '@/lib/db-operations';
import { Subscriber } from '@/types';
import { notify } from '@/lib/notifications';

interface SubscriberFormProps {
  onSuccess?: () => void;
}

export default function SubscriberForm({ onSuccess }: SubscriberFormProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const newSubscriber: Omit<Subscriber, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        contact,
      };
      await addSubscriber(newSubscriber);

      setName('');
      setContact('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding subscriber:', error);
      setError(error.message);
      notify.error(error.message || 'Failed to add subscriber');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 mb-6">
      <h3 className="text-xl font-medium mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
        Add New Subscriber
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>
      </div>
      
      <div className="mt-6">
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary inline-flex justify-center items-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Add Subscriber'
          )}
        </button>
      </div>
      {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
    </form>
  );
}
