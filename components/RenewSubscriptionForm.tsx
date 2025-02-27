'use client';
import { useState, useEffect } from 'react';
import { ExtendedSubscription } from './ExpiringSubscriptions';
import { getAccounts, getSubscribers, getSubscriptionsBySubscriberId } from '@/lib/db-operations';
import { Account, Subscriber, Slot } from '@/types';
import { generateText } from '@/lib/gemini';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface SubscriptionHistoryItem {
  startDate: any;
  endDate: any;
  paymentDueDate: any;
  accountPrice: any;
  paidPrice: any;
  id: string;
  paymentStatus?: 'paid' | 'unpaid' | 'free';
}

interface RenewSubscriptionFormProps {
  subscription: ExtendedSubscription;
  onRenew: (startDate: Date, endDate: Date, accountId: string, subscriberId: string, slotId: string) => void;
  onCancel: () => void;
}

export default function RenewSubscriptionForm({ subscription, onRenew, onCancel }: RenewSubscriptionFormProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedAccount, setSelectedAccount] = useState(subscription.accountId);
  const [selectedSubscriber, setSelectedSubscriber] = useState(subscription.subscriberId);
  const [selectedSlot, setSelectedSlot] = useState(subscription.slotId);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paidPrice, setPaidPrice] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'free'>(
    subscription.paymentStatus === 'free' ? 'free' : 'unpaid'
  );
  const [pricingRecommendation, setPricingRecommendation] = useState('');
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [remainingPayment, setRemainingPayment] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Calculate default dates when component mounts
  useEffect(() => {
    const currentEndDate = subscription.endDate instanceof Date 
      ? subscription.endDate 
      : subscription.endDate.toDate();
    
    // If subscription ends in more than 7 days, set start date to current end date + 1
    // Otherwise, set it to tomorrow
    const now = new Date();
    const daysUntilExpiry = Math.ceil((currentEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let newStartDate;
    if (daysUntilExpiry > 7) {
      // For subscriptions not ending soon, start from the day after current end date
      newStartDate = new Date(currentEndDate);
      newStartDate.setDate(newStartDate.getDate() + 1);
    } else {
      // For soon-to-expire subscriptions, start from tomorrow
      newStartDate = new Date();
      newStartDate.setDate(newStartDate.getDate() + 1);
    }
    
    setStartDate(newStartDate.toISOString().split('T')[0]);

    // Set end date to 28 days after start date
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + 28);
    setEndDate(newEndDate.toISOString().split('T')[0]);
  }, [subscription]);

  // Automatically calculate end date when start date changes
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    
    // Calculate new end date (28 days from start date)
    const calculatedEndDate = new Date(newStartDate);
    calculatedEndDate.setDate(calculatedEndDate.getDate() + 28);
    setEndDate(calculatedEndDate.toISOString().split('T')[0]);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsData, subscribersData] = await Promise.all([
          getAccounts(),
          getSubscribers()
        ]);
        setAccounts(accountsData);
        setSubscribers(subscribersData);

        // Fetch available slots for the selected account and filter them
        const selectedAccountData = accountsData.find(acc => acc.id === selectedAccount);
        const allSlots = selectedAccountData?.slots || [];
        const availableSlots = allSlots.filter(slot => !slot.isOccupied);
        setAvailableSlots(availableSlots);
        setLoading(false);

        // Set default payment due date to today
        const today = new Date();
        setPaymentDueDate(today.toISOString().split('T')[0]);

        // Fetch payment history
        if (selectedSubscriber) {
          const rawSubscriptionHistory = await getSubscriptionsBySubscriberId(selectedSubscriber);
          const subscriptionHistory = rawSubscriptionHistory.map(sub => ({
            ...sub,
            paymentStatus: sub.paidPrice > 0 ? 'paid' : 'unpaid'
          })) as SubscriptionHistoryItem[];
          
          if (Array.isArray(subscriptionHistory)) {
            // Calculate remaining payment
            let totalDue = 0;
            let totalPaid = 0;
            
            const history = subscriptionHistory.map(sub => {
              const price = sub.paymentStatus === 'free' ? 0 : (sub.paidPrice || 0);
              totalDue += price;
              
              if (sub.paymentStatus === 'paid') {
                totalPaid += price;
              }
              
              return {
                date: new Date(sub.startDate).toLocaleDateString(),
                amount: price,
                status: sub.paymentStatus
              };
            });
            
            setRemainingPayment(Math.max(0, totalDue - totalPaid));
            setPaymentHistory(history);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSubscriber, selectedAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onRenew(
        new Date(startDate),
        new Date(endDate),
        subscription.accountId,
        subscription.subscriberId,
        subscription.slotId
      );
    } catch (error) {
      console.error('Error renewing subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPricingRecommendation = async () => {
    try {
      setRecommendationLoading(true);
      
      const subscriber = subscribers.find(s => s.id === selectedSubscriber);
      const account = accounts.find(a => a.id === selectedAccount);
      
      if (!subscriber || !account) return;
      
      // Get subscriber's subscription history
      const subscriptionHistory = await getSubscriptionsBySubscriberId(selectedSubscriber);
      const processedHistory = subscriptionHistory.map(sub => ({
        ...sub,
        paymentStatus: sub.paidPrice > 0 ? 'paid' : 'unpaid'
      })) as SubscriptionHistoryItem[];
      
      // Make sure we have valid data
      if (!Array.isArray(processedHistory)) {
        throw new Error("Failed to retrieve subscription history");
      }
      
      // Calculate payment metrics
      let totalDue = 0;
      let totalPaid = 0;
      let unpaidCount = 0;
      
      processedHistory.forEach(sub => {
        const price = sub.paidPrice || 0;
        totalDue += price;
        
        if (sub.paymentStatus === 'paid') {
          totalPaid += price;
        } else {
          unpaidCount++;
        }
      });
      
      const customerData = {
        subscriberName: subscriber.name,
        accountEmail: account.email,
        currentPrice: subscription.paidPrice,
        totalDue: totalDue,
        totalPaid: totalPaid,
        unpaidAmount: totalDue - totalPaid,
        unpaidSubscriptions: unpaidCount,
        renewalCount: processedHistory.length,
        paymentReliability: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
        subscriptionHistory: processedHistory.map((sub: any) => ({
          startDate: new Date(sub.startDate).toLocaleDateString(),
          endDate: new Date(sub.endDate).toLocaleDateString(),
          price: sub.paidPrice || 0,
          paymentStatus: sub.paymentStatus || 'unknown'
        }))
      };
      
      const prompt = `
        As a pricing specialist, recommend an optimal renewal price for this customer:
        ${JSON.stringify(customerData, null, 2)}
        
        Important context:
        - We do NOT offer free trials
        - All subscriptions require payment
        - "unpaid" status means the customer has not paid yet
        - "paid" status means the customer has paid
        
        Consider:
        1. Customer payment history and reliability (${customerData.paymentReliability}% of payments made)
        2. Outstanding balance (PKR ${customerData.unpaidAmount})
        3. Renewal count (${customerData.renewalCount} subscriptions)
        
        Provide a specific price recommendation with brief justification.
        If they have unpaid subscriptions, address how to handle those first.
        Keep it concise (under 100 words).
      `;
      
      const result = await generateText(prompt);
      setPricingRecommendation(result);
    } catch (error) {
      console.error('Error getting pricing recommendation:', error);
      setPricingRecommendation('Unable to generate pricing recommendation at this time.');
    } finally {
      setRecommendationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white dark:bg-slate-800">
        <h3 className="text-xl font-medium mb-4 heading">Renew Subscription</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter the new details for the subscription renewal.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="account" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account
            </label>
            <select
              id="account"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                // Update available slots when account changes
                const selectedAccountData = accounts.find(acc => acc.id === e.target.value);
                setAvailableSlots(selectedAccountData?.slots || []);
              }}
              required
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="subscriber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subscriber
            </label>
            <select
              id="subscriber"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
              value={selectedSubscriber}
              onChange={(e) => setSelectedSubscriber(e.target.value)}
              required
            >
              {subscribers.map((subscriber) => (
                <option key={subscriber.id} value={subscriber.id}>
                  {subscriber.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="slot" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slot
            </label>
            <select
              id="slot"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              required
            >
              {availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  Slot {slot.id}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="paymentDueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                id="paymentDueDate"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label htmlFor="paidPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price (PKR)
              </label>
              <input
                type="number"
                id="paidPrice"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
                value={paidPrice}
                onChange={(e) => setPaidPrice(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Status
            </label>
            <div className="flex space-x-4 mt-1">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600 focus:ring-indigo-500"
                  name="paymentStatus"
                  value="paid"
                  checked={paymentStatus === 'paid'}
                  onChange={() => {
                    setPaymentStatus('paid');
                    setPaidPrice(subscription.paidPrice.toString());
                  }}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Paid</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600 focus:ring-indigo-500"
                  name="paymentStatus"
                  value="unpaid"
                  checked={paymentStatus === 'unpaid'}
                  onChange={() => setPaymentStatus('unpaid')}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Unpaid</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600 focus:ring-indigo-500"
                  name="paymentStatus"
                  value="free"
                  checked={paymentStatus === 'free'}
                  onChange={() => {
                    setPaymentStatus('free');
                    setPaidPrice('0');
                  }}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Free</span>
              </label>
            </div>
          </div>
          
          <div className="mt-1">
            <button
              type="button"
              onClick={getPricingRecommendation}
              className="text-sm text-indigo-600 hover:text-indigo-800"
              disabled={recommendationLoading}
            >
              {recommendationLoading ? 'Getting recommendation...' : 'Get price recommendation'}
            </button>
          </div>
          
          {pricingRecommendation && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">AI Pricing Recommendation</h4>
              <MarkdownRenderer content={pricingRecommendation} className="text-sm text-gray-700 dark:text-gray-300" />
            </div>
          )}
          
          {selectedSubscriber && remainingPayment > 0 && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-100 dark:border-red-800">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Outstanding Balance</h4>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">PKR {remainingPayment.toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  {showPaymentHistory ? 'Hide History' : 'View Payment History'}
                </button>
              </div>
              
              {showPaymentHistory && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-gray-700 mb-2">Payment History</h5>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentHistory.map((payment, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{payment.date}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">PKR {payment.amount.toLocaleString()}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full 
                                ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                  payment.status === 'unpaid' ? 'bg-red-100 text-red-800' : 
                                  'bg-gray-100 text-gray-800'}`}>
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="mt-3 text-sm text-gray-600">
                <p>Consider collecting the outstanding balance before renewing.</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
              Renew Subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
