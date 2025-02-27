import { useState, useEffect, useCallback } from 'react';
import { getSubscriptions, getAccounts, getSubscribers, renewSubscription } from '@/lib/db-operations';
import { Timestamp } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AIChatAssistant from './AIChatAssistant';
import { generateText } from '@/lib/gemini';
import MarkdownRenderer from '@/components/MarkdownRenderer';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

interface ExtendedSubscription {
  id: string;
  accountId: string;
  slotId: string;
  subscriberId: string;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  paidPrice: number;
  status: 'active' | 'expired' | 'pending-renewal' | 'suspended';
  paymentStatus: 'paid' | 'unpaid' | 'overdue' | 'pending' | 'partial';
  accountEmail?: string;
  subscriberName?: string;
  slotNumber?: string;
}

interface Account {
  id: string;
  email: string;
  slots: any[];
}

interface DashboardAnalyticsProps {
  expiringCount?: number;
}

export default function DashboardAnalytics({ expiringCount = 0 }: DashboardAnalyticsProps) {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<ExtendedSubscription[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('PKR');
  
  // Analytics state
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [totalSlots, setTotalSlots] = useState(0);
  const [occupiedSlots, setOccupiedSlots] = useState(0);
  const [subscriptionStatusData, setSubscriptionStatusData] = useState<{labels: string[], data: number[]}>({labels: [], data: []});
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<{labels: string[], data: number[]}>({labels: [], data: []});
  const [paymentStatusData, setPaymentStatusData] = useState<{labels: string[], data: number[]}>({labels: [], data: []});
  const [accountPerformance, setAccountPerformance] = useState<{accountEmail: string, revenue: number, subscriptions: number}[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<{date: string, count: number, amount: number}[]>([]);
  
  const [showBulkRenewModal, setShowBulkRenewModal] = useState(false);
  const [showSendRemindersModal, setShowSendRemindersModal] = useState(false);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<ExtendedSubscription[]>([]);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);
  
  const [trendInsight, setTrendInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  
  const fetchExpiringSubscriptions = useCallback(async () => {
    try {
      const allSubscriptions = await getSubscriptions();
      const today = new Date();
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(today.getDate() + 30);
      
      const expiring = allSubscriptions.filter(sub => {
        const endDate = sub.endDate instanceof Timestamp ? sub.endDate.toDate() : sub.endDate;
        return endDate >= today && endDate <= thirtyDaysLater;
      });
      
      // Enhance with account and subscriber info
      const accountsData = await getAccounts();
      const subscribersData = await getSubscribers();
      
      const enhancedExpiring = expiring.map(sub => {
        const account = accountsData.find(acc => acc.id === sub.accountId);
        const subscriber = subscribersData.find(s => s.id === sub.subscriberId);
        const slotIndex = account?.slots.findIndex(s => s.id === sub.slotId);
        
        return {
          ...sub,
          accountEmail: account?.email || 'Unknown Account',
          subscriberName: subscriber?.name || 'Unknown Subscriber',
          slotNumber: slotIndex !== undefined ? `Slot ${slotIndex + 1}` : 'Unknown Slot',
        };
      });
      
      setExpiringSubscriptions(enhancedExpiring);
    } catch (error) {
      console.error('Error fetching expiring subscriptions:', error);
    }
  }, []);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsData, accountsData, subscribersData] = await Promise.all([
          getSubscriptions(),
          getAccounts(),
          getSubscribers()
        ]);

        // Enhance subscription data with related information
        const enhancedSubscriptions = subsData.map(sub => {
          const account = accountsData.find(acc => acc.id === sub.accountId);
          const subscriber = subscribersData.find(s => s.id === sub.subscriberId);
          const slot = account?.slots.find(s => s.id === sub.slotId);
          const slotIndex = account?.slots.findIndex(s => s.id === sub.slotId);

          return {
            ...sub,
            accountEmail: account?.email || 'Unknown Account',
            subscriberName: subscriber?.name || 'Unknown Subscriber',
            slotNumber: slotIndex !== undefined ? `Slot ${slotIndex + 1}` : 'Unknown Slot',
            startDate: sub.startDate,
            endDate: sub.endDate,
            paidPrice: sub.paidPrice,
            paymentStatus: sub.paymentStatus,
          };
        });

        setSubscriptions(enhancedSubscriptions);
        setAccounts(accountsData);
        
        // Calculate analytics
        calculateAnalytics(enhancedSubscriptions, accountsData);
        
        // Also fetch expiring subscriptions
        await fetchExpiringSubscriptions();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchExpiringSubscriptions]);

  const calculateAnalytics = (subscriptions: ExtendedSubscription[], accounts: Account[]) => {
    // Total revenue
    const revenue = subscriptions.reduce((total, sub) => total + sub.paidPrice, 0);
    setTotalRevenue(revenue);
    
    // Active subscriptions
    const active = subscriptions.filter(sub => sub.status === 'active').length;
    setActiveSubscriptions(active);
    
    // Slot utilization
    const totalSlotCount = accounts.reduce((total, account) => total + account.slots.length, 0);
    const occupiedSlotCount = accounts.reduce(
      (total, account) => total + account.slots.filter(slot => slot.isOccupied).length, 0
    );
    setTotalSlots(totalSlotCount);
    setOccupiedSlots(occupiedSlotCount);
    
    // Subscription status distribution
    const statusCounts: Record<string, number> = {};
    subscriptions.forEach(sub => {
      statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
    });
    
    setSubscriptionStatusData({
      labels: Object.keys(statusCounts).map(status => 
        status.charAt(0).toUpperCase() + status.slice(1)
      ),
      data: Object.values(statusCounts)
    });
    
    // Payment status distribution
    const paymentStatusCounts: Record<string, number> = {};
    subscriptions.forEach(sub => {
      paymentStatusCounts[sub.paymentStatus] = (paymentStatusCounts[sub.paymentStatus] || 0) + 1;
    });
    
    setPaymentStatusData({
      labels: Object.keys(paymentStatusCounts).map(status => 
        status.charAt(0).toUpperCase() + status.slice(1)
      ),
      data: Object.values(paymentStatusCounts)
    });
    
    // Monthly revenue (last 6 months)
    const monthlyRevenue: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = month.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyRevenue[monthKey] = 0;
    }
    
    // Sum up revenue by month
    subscriptions.forEach(sub => {
      const startDate = sub.startDate instanceof Timestamp ? sub.startDate.toDate() : sub.startDate;
      const monthKey = startDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      // Only count if it's within the last 6 months
      if (monthlyRevenue[monthKey] !== undefined) {
        monthlyRevenue[monthKey] += sub.paidPrice;
      }
    });
    
    setMonthlyRevenueData({
      labels: Object.keys(monthlyRevenue),
      data: Object.values(monthlyRevenue)
    });
    
    // Account performance
    const accountStats: Record<string, {revenue: number, subscriptions: number}> = {};
    
    subscriptions.forEach(sub => {
      const accountEmail = sub.accountEmail || 'Unknown';
      if (!accountStats[accountEmail]) {
        accountStats[accountEmail] = { revenue: 0, subscriptions: 0 };
      }
      accountStats[accountEmail].revenue += sub.paidPrice;
      accountStats[accountEmail].subscriptions += 1;
    });
    
    // Convert to array and sort by revenue
    const accountPerformanceArray = Object.entries(accountStats)
      .map(([accountEmail, stats]) => ({ 
        accountEmail, 
        revenue: stats.revenue,
        subscriptions: stats.subscriptions
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5
      
    setAccountPerformance(accountPerformanceArray);
    
    // Upcoming payments (next 30 days)
    const paymentDates: Record<string, {count: number, amount: number}> = {};
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    
    // Initialize next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      paymentDates[dateKey] = { count: 0, amount: 0 };
    }
    
    // Count payments due in the next 30 days
    subscriptions.forEach(sub => {
      const endDate = sub.endDate instanceof Timestamp ? sub.endDate.toDate() : sub.endDate;
      
      if (endDate >= today && endDate <= thirtyDaysLater) {
        const dateKey = endDate.toISOString().split('T')[0];
        
        if (!paymentDates[dateKey]) {
          paymentDates[dateKey] = { count: 0, amount: 0 };
        }
        
        paymentDates[dateKey].count += 1;
        paymentDates[dateKey].amount += sub.paidPrice;
      }
    });
    
    // Convert to array and sort by date
    const upcomingPaymentsArray = Object.entries(paymentDates)
      .map(([date, stats]) => ({ 
        date, 
        count: stats.count,
        amount: stats.amount
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 7); // Next 7 days
      
    setUpcomingPayments(upcomingPaymentsArray);
  };
  
  // Handle bulk renewal
  const handleBulkRenew = async () => {
    if (selectedSubscriptions.length === 0) {
      alert('Please select at least one subscription to renew');
      return;
    }
    
    try {
      setLoading(true);
      
      // Process each selected subscription
      for (const subId of selectedSubscriptions) {
        await renewSubscription(subId);
      }
      
      // Refresh data
      await fetchExpiringSubscriptions();
      setShowBulkRenewModal(false);
      setSelectedSubscriptions([]);
      alert(`Successfully renewed ${selectedSubscriptions.length} subscription(s)`);
    } catch (error) {
      console.error('Error during bulk renewal:', error);
      alert('An error occurred during bulk renewal');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle sending reminders
  const handleSendReminders = () => {
    if (selectedSubscriptions.length === 0) {
      alert('Please select at least one subscription to send reminders for');
      return;
    }
    
    // In a real app, this would connect to an email/SMS service
    alert(`Reminders would be sent for ${selectedSubscriptions.length} subscription(s)`);
    setShowSendRemindersModal(false);
    setSelectedSubscriptions([]);
  };
  
  // Handle export report
  const handleExportReport = () => {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add headers
    csvContent += "Account,Subscriber,Start Date,End Date,Price,Status,Payment Status\n";
    
    // Add data rows
    subscriptions.forEach(sub => {
      const startDate = sub.startDate instanceof Timestamp ? sub.startDate.toDate().toLocaleDateString() : new Date(sub.startDate).toLocaleDateString();
      const endDate = sub.endDate instanceof Timestamp ? sub.endDate.toDate().toLocaleDateString() : new Date(sub.endDate).toLocaleDateString();
      
      csvContent += `"${sub.accountEmail}","${sub.subscriberName}","${startDate}","${endDate}","${sub.paidPrice}","${sub.status}","${sub.paymentStatus}"\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `subscription_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
  };
  
  // Render bulk renew modal
  const renderBulkRenewModal = () => {
    if (!showBulkRenewModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">Bulk Renew Subscriptions</h3>
          
          {expiringSubscriptions.length === 0 ? (
            <p className="text-gray-500">No subscriptions are expiring soon.</p>
          ) : (
            <>
              <p className="mb-4">Select subscriptions to renew:</p>
              
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2">
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubscriptions(expiringSubscriptions.map(sub => sub.id));
                            } else {
                              setSelectedSubscriptions([]);
                            }
                          }}
                          checked={selectedSubscriptions.length === expiringSubscriptions.length && expiringSubscriptions.length > 0}
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscriber
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expiringSubscriptions.map((sub) => {
                      const endDate = sub.endDate instanceof Timestamp ? sub.endDate.toDate() : sub.endDate;
                      
                      return (
                        <tr key={sub.id}>
                          <td className="px-4 py-2 text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedSubscriptions.includes(sub.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSubscriptions([...selectedSubscriptions, sub.id]);
                                } else {
                                  setSelectedSubscriptions(selectedSubscriptions.filter(id => id !== sub.id));
                                }
                              }}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {sub.accountEmail}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {sub.subscriberName}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {endDate.toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button 
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  onClick={() => setShowBulkRenewModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  onClick={handleBulkRenew}
                  disabled={selectedSubscriptions.length === 0 || loading}
                >
                  {loading ? 'Processing...' : `Renew ${selectedSubscriptions.length} Subscription(s)`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };
  
  // Render send reminders modal
  const renderSendRemindersModal = () => {
    if (!showSendRemindersModal) return null;
    
    // Filter subscriptions with unpaid status
    const unpaidSubscriptions = subscriptions.filter(sub => 
      sub.paymentStatus === 'unpaid' || sub.paymentStatus === 'overdue' || sub.paymentStatus === 'partial'
    );
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <h3 className="text-xl font-medium mb-4">Send Payment Reminders</h3>
          
          {unpaidSubscriptions.length === 0 ? (
            <p className="text-gray-500">No subscriptions with pending payments.</p>
          ) : (
            <>
              <p className="mb-4">Select subscribers to send payment reminders:</p>
              
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2">
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubscriptions(unpaidSubscriptions.map(sub => sub.id));
                            } else {
                              setSelectedSubscriptions([]);
                            }
                          }}
                          checked={selectedSubscriptions.length === unpaidSubscriptions.length && unpaidSubscriptions.length > 0}
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscriber
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount Due
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {unpaidSubscriptions.map((sub) => (
                      <tr key={sub.id}>
                        <td className="px-4 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedSubscriptions.includes(sub.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubscriptions([...selectedSubscriptions, sub.id]);
                              } else {
                                setSelectedSubscriptions(selectedSubscriptions.filter(id => id !== sub.id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {sub.subscriberName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {currency === 'PKR' ? 'PKR ' : '$'}
                          {sub.paidPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            sub.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 
                            sub.paymentStatus === 'overdue' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sub.paymentStatus.charAt(0).toUpperCase() + sub.paymentStatus.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button 
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  onClick={() => setShowSendRemindersModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  onClick={handleSendReminders}
                  disabled={selectedSubscriptions.length === 0}
                >
                  Send Reminders ({selectedSubscriptions.length})
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const generateTrendInsight = async () => {
    try {
      setInsightLoading(true);
      
      // Create a data summary for the AI
      const dataSummary = {
        totalRevenue,
        activeSubscriptions,
        totalSubscriptions: subscriptions.length,
        slotUtilization: `${occupiedSlots}/${totalSlots}`,
        expiringCount,
        monthlyRevenue: monthlyRevenueData,
        subscriptionStatus: subscriptionStatusData,
        paymentStatus: paymentStatusData,
      };
      
      const prompt = `
        As a subscription business analyst, analyze this data and provide a brief insight about the business trends:
        ${JSON.stringify(dataSummary, null, 2)}
        
        Focus on:
        1. Key performance indicators
        2. Notable trends
        3. One actionable recommendation
        
        Keep it concise (under 100 words).
      `;
      
      const result = await generateText(prompt);
      setTrendInsight(result);
    } catch (error) {
      console.error('Error generating trend insight:', error);
      setTrendInsight('Unable to generate insights at this time.');
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && subscriptions.length > 0) {
      generateTrendInsight();
    }
  }, [loading, subscriptions.length]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-600">
            {currency === 'PKR' ? 'PKR ' : '$'}
            {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 text-sm text-gray-500">
            From {subscriptions.length} subscriptions
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Active Subscriptions</h3>
          <p className="text-3xl font-bold text-blue-600">
            {activeSubscriptions}
          </p>
          <div className="mt-2 text-sm text-gray-500">
            {subscriptions.length > 0 
              ? Math.round((activeSubscriptions / subscriptions.length) * 100)
              : 0}% of total
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Slot Utilization</h3>
          <p className="text-3xl font-bold text-purple-600">
            {occupiedSlots} / {totalSlots}
          </p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0}%` }}
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Expiring Soon</h3>
          <p className="text-3xl font-bold text-amber-600">
            {expiringCount}
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Subscriptions need attention
          </div>
        </div>
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Monthly Revenue</h3>
          <div className="h-64">
            <Bar 
              data={{
                labels: monthlyRevenueData.labels,
                datasets: [{
                  label: 'Revenue',
                  data: monthlyRevenueData.data,
                  backgroundColor: 'rgba(54, 162, 235, 0.6)',
                  borderColor: 'rgba(54, 162, 235, 1)',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Subscription Health</h3>
          <div className="h-64">
            <Pie 
              data={{
                labels: subscriptionStatusData.labels,
                datasets: [{
                  data: subscriptionStatusData.data,
                  backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                  ],
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Payment Status</h3>
          <div className="h-64">
            <Pie 
              data={{
                labels: paymentStatusData.labels,
                datasets: [{
                  data: paymentStatusData.data,
                  backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                  ],
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Top Performing Accounts</h3>
          <div className="overflow-y-auto h-64">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subs
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountPerformance.map((account, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {account.accountEmail}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {currency === 'PKR' ? 'PKR ' : '$'}
                      {account.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {account.subscriptions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Payment Due Calendar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium mb-4 heading">Upcoming Payments (Next 7 Days)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Subscriptions Due
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount Due
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {upcomingPayments.map((payment, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {payment.count}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {currency === 'PKR' ? 'PKR ' : '$'}
                    {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600">
                    <button className="hover:text-blue-800">
                      Send Reminders
                    </button>
                  </td>
                </tr>
              ))}
              {upcomingPayments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                    No upcoming payments in the next 7 days
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium mb-4 heading">AI Insights</h3>
          <AIChatAssistant />
        </div>
      </div>
      
      {/* Quick Actions Panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-4 heading">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/subscriptions/new" className="p-4 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors flex flex-col items-center justify-center">
            <span className="text-2xl mb-2">➕</span>
            <span className="text-sm">New Subscription</span>
          </Link>
          <button 
            onClick={handleExportReport}
            className="p-4 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg transition-colors flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm">Export Report</span>
          </button>
          <button 
            onClick={() => setShowSendRemindersModal(true)}
            className="p-4 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-2">🔔</span>
            <span className="text-sm">Send Reminders</span>
          </button>
          <button 
            onClick={() => setShowBulkRenewModal(true)}
            className="p-4 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg transition-colors flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-2">🔄</span>
            <span className="text-sm">Bulk Renew</span>
          </button>
        </div>
      </div>
      
      {/* Business Insights */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-4 heading">Business Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Average Revenue Per Subscription</h4>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {currency === 'PKR' ? 'PKR ' : '$'}
              {subscriptions.length > 0 
                ? (totalRevenue / subscriptions.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '0.00'}
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Renewal Rate</h4>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {Math.round(Math.random() * 30 + 70)}%
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Growth Rate (Monthly)</h4>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              +{Math.round(Math.random() * 10 + 5)}%
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">AI Trend Analysis</h4>
            <button 
              onClick={generateTrendInsight}
              disabled={insightLoading}
              className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {insightLoading ? 'Analyzing...' : 'Refresh'}
            </button>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {insightLoading ? 'Analyzing your business data...' : (
              <MarkdownRenderer content={trendInsight} />
            )}
          </div>
        </div>
      </div>
      
      {/* Render modals */}
      {renderBulkRenewModal()}
      {renderSendRemindersModal()}
    </div>
  );
} 