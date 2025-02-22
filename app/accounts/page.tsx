'use client';
import { useState } from 'react';
import AccountForm from '@/components/AccountForm';
import AccountList from '@/components/AccountList';

export default function AccountsPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshAccounts, setRefreshAccounts] = useState(false);

  const handleAccountAdded = () => {
    setRefreshAccounts(!refreshAccounts);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Add Account'}
        </button>
      </div>
      
      {showForm && <AccountForm onSuccess={handleAccountAdded} />}
      <AccountList refresh={refreshAccounts} />
    </div>
  );
}
