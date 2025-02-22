'use client';
import { useState, useEffect } from 'react';
import { checkExpiringSubscriptions, getAccounts } from '@/lib/db-operations';
import DashboardStats from '@/components/DashboardStats';
import ExpiringSubscriptions from '@/components/ExpiringSubscriptions';
import { Account, Subscription } from '@/types';
import GoogleSignIn from '@/components/GoogleSignIn';

export default function Dashboard() {
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<Subscription[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
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
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <DashboardStats accounts={accounts} expiringCount={expiringSubscriptions.length} />
      <ExpiringSubscriptions subscriptions={expiringSubscriptions} />
    </div>
  );
}
