'use client';
import { useState, useEffect } from 'react';
import { getSubscribers, deleteSubscriber } from '@/lib/db-operations';
import { Subscriber } from '@/types';

interface SubscriberListProps {
  refresh: boolean;
}

export default function SubscriberList({ refresh }: SubscriberListProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Add error state

  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        const data = (await getSubscribers()) as Subscriber[];
        setSubscribers(data);
      } catch (error) {
        console.error('Error fetching subscribers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscribers();
  }, [refresh]);

  const handleDeleteSubscriber = async (subscriberId: string) => {
    setLoading(true); // Start loading before deletion
    try {
      await deleteSubscriber(subscriberId);
      const data = (await getSubscribers()) as Subscriber[];
      setSubscribers(data);
      setError(null); // Clear any previous error
    } catch (error: any) {
      setError(error.message); // Set error message
    } finally {
      setLoading(false); // End loading after deletion attempt
    }
  };

  if (loading) {
    return <div>Loading subscribers...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {error && <div className="text-red-500">{error}</div>} {/* Display error message */}
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Active Subscriptions
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {subscribers.map((subscriber) => (
            <tr key={subscriber.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{subscriber.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{subscriber.contact}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {Array.isArray(subscriber.subscriptions) ? subscriber.subscriptions.filter(sub => sub.status === 'active').length : 0}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-blue-600 hover:text-blue-900">View Details</button>
                <button
                  className="text-red-600 hover:text-red-900 ml-2"
                  onClick={() => handleDeleteSubscriber(subscriber.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
