'use client';
import { useState, useEffect } from 'react';
import { getAccounts, deleteAccount } from '@/lib/db-operations'; // Import deleteAccount
import { Account } from '@/types';

interface AccountListProps {
  refresh: boolean;
}

export default function AccountList({ refresh }: AccountListProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Add error state

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await getAccounts();
        setAccounts(data);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [refresh]);

  const handleDeleteAccount = async (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await deleteAccount(accountId);
        // Refresh accounts after successful deletion
        const data = await getAccounts();
        setAccounts(data);
        setError(null); // Clear any previous error
      } catch (error: any) {
        setError(error.message); // Set error message
      }
    }
  };

  if (loading) {
    return <div>Loading accounts...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {error && <div className="text-red-500">{error}</div>} {/* Display error message */}
      {accounts.map((account) => (
        <div key={account.id} className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">{account.email}</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Slots:</p>
            {account.slots.map((slot, index) => (
              <div key={slot.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">Slot {index + 1}</p>
                  <p className="text-sm text-gray-600">PIN: {slot.pin}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    slot.isOccupied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {slot.isOccupied ? 'Occupied' : 'Available'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4 space-x-4">
            <button
              onClick={() => handleDeleteAccount(account.id)} // Use the new handler
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
            >
              Delete Account
            </button>
            <NetflixLoginComponent email={account.email} />
          </div>
        </div>
      ))}
    </div>
  );
}

import NetflixLoginComponent from './NetflixLogin';
