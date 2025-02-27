'use client';
import { useState, useEffect } from 'react';
import { getAccounts, deleteAccount, getAccountUsage } from '@/lib/db-operations';
import { Account } from '@/types';
import AccountEditForm from './AccountEditForm';
import NetflixLoginComponent from './NetflixLogin';
import { notify } from '@/lib/notifications';

interface AccountListProps {
  refresh?: boolean;
  searchTerm?: string;
  onStatsUpdate?: (stats: {
    total: number;
    active: number;
    available: number;
    utilization: number;
  }) => void;
}

export default function AccountList({ refresh, searchTerm = '', onStatsUpdate }: AccountListProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountUsages, setAccountUsages] = useState<{[key: string]: any}>({});

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await getAccounts();
        setAccounts(data);
        // Fetch account usages
        const usages: {[key: string]: any} = {};
        for (const account of data) {
          const usage = await getAccountUsage(account.id);
          usages[account.id] = usage;
        }
        setAccountUsages(usages);
        
        // Calculate account statistics
        if (onStatsUpdate) {
          const totalAccounts = data.length;
          const totalSlots = data.reduce((acc, account) => acc + account.slots.length, 0);
          const activeSlots = data.reduce(
            (acc, account) => acc + account.slots.filter(slot => slot.isOccupied).length, 0
          );
          const availableSlots = totalSlots - activeSlots;
          const utilization = totalSlots > 0 ? Math.round((activeSlots / totalSlots) * 100) : 0;
          
          onStatsUpdate({
            total: totalAccounts,
            active: activeSlots,
            available: availableSlots,
            utilization
          });
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [refresh, onStatsUpdate]);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    notify.success('Email copied to clipboard');
  };

  const handleCopyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
    notify.success('Password copied to clipboard');
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await deleteAccount(accountId);
        const data = await getAccounts();
        setAccounts(data);
        notify.success('Account deleted successfully');
      } catch (error: any) {
        console.error('Error deleting account:', error);
        notify.error(error.message || 'Failed to delete account');
      }
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
  };

  const handleCancelEdit = () => {
    setEditingAccount(null);
  };

  const handleAccountUpdated = async () => {
    setEditingAccount(null);
    const data = await getAccounts();
    setAccounts(data);
  };

  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      account.email.toLowerCase().includes(searchLower) ||
      // Add any other fields you want to search by
      account.slots.some(slot => slot.pin?.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return <div>Loading accounts...</div>;
  }

  return (
    <div>
      {error && <div className="text-red-500">{error}</div>}
      {editingAccount ? (
        <AccountEditForm
          account={editingAccount}
          onSuccess={handleAccountUpdated}
          onCancel={handleCancelEdit}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map((account) => (
            <div key={account.id} className="card p-6 hover:scale-[1.02] transition-all duration-200 border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              {/* Account Header with Gradient Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              
              <div className="flex flex-col mb-4">
                {/* Email row with copy button */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <h3 
                      className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:text-indigo-800 dark:hover:text-indigo-200 truncate"
                      onClick={() => handleCopyEmail(account.email)}
                    >
                      {account.email}
                    </h3>
                    <button
                      onClick={() => handleCopyEmail(account.email)}
                      className="p-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 flex-shrink-0 ml-2">
                    {account.slots.filter(slot => !slot.isOccupied).length} Available
                  </span>
                </div>

                {/* Password row with copy button */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">Password:</span>
                  <div className="flex items-center space-x-2 min-w-0">
                    <span 
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                      onClick={() => handleCopyPassword(account.password)}
                    >
                      {account.password}
                    </span>
                    <button
                      onClick={() => handleCopyPassword(account.password)}
                      className="p-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Slots:</p>
                {account.slots.map((slot, index) => (
                  <div key={slot.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                    <div>
                      <p className="font-medium">Slot {index + 1}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">PIN: {slot.pin}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        slot.isOccupied
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}
                    >
                      {slot.isOccupied ? 'Occupied' : 'Available'}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => handleEditAccount(account)}
                  className="flex-1 bg-indigo-500 text-white py-2 px-3 rounded hover:bg-indigo-600 transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="flex-1 bg-red-500 text-white py-2 px-3 rounded hover:bg-red-600 transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                <NetflixLoginComponent email={account.email} />
              </div>
            </div>
          ))}
          
          {filteredAccounts.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-500 dark:text-gray-400">
              {accounts.length === 0 ? 
                "No accounts found. Add your first account to get started." : 
                "No accounts match your search criteria."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
