'use client';
import { useState, useEffect } from 'react';
import { checkExpiringSubscriptions, getAccounts } from '@/lib/db-operations';
import DashboardStats from '@/components/DashboardStats';
import DashboardAnalytics from '@/components/DashboardAnalytics';
import ExpiringSubscriptions from '@/components/ExpiringSubscriptions';
import { Account, Subscription } from '@/types';
import GoogleSignIn from '@/components/GoogleSignIn';

export default function Dashboard() {
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<Subscription[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      const [subsData, accountsData] = await Promise.all([
        checkExpiringSubscriptions(),
        getAccounts()
      ]);
      setExpiringSubscriptions(subsData);
      setAccounts(accountsData);
    };
    
    fetchData();
  }, []);

  return (
    <div>
      <GoogleSignIn />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold heading">Dashboard</h1>
        <button 
          onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          {showDetailedAnalytics ? 'Show Simple View' : 'Show Detailed Analytics'}
        </button>
      </div>
      
      {showDetailedAnalytics ? (
        <DashboardAnalytics expiringCount={expiringSubscriptions.length} />
      ) : (
        <>
          <DashboardStats accounts={accounts} expiringCount={expiringSubscriptions.length} />
          <ExpiringSubscriptions subscriptions={expiringSubscriptions} />
        </>
      )}
    </div>
  );
}
