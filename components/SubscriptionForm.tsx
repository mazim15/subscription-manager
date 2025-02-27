'use client';
import { useState, useEffect } from 'react';
import { createSubscription, getAccounts, getSubscribers, getSubscriptionsBySubscriberId } from '@/lib/db-operations';
import { Account, Subscriber } from '@/types';
import { generateText } from '@/lib/gemini';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const SUBSCRIPTION_DAYS = 27;

export default function SubscriptionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedSubscriber, setSelectedSubscriber] = useState('');
  const [paidPrice, setPaidPrice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState('');
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [remainingPayment, setRemainingPayment] = useState(0);
  const [hasOutstandingBalance, setHasOutstandingBalance] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'free'>('unpaid');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsData, subscribersData] = await Promise.all([
          getAccounts(),
          getSubscribers()
        ]);
        setAccounts(accountsData);
        setSubscribers(subscribersData);
        const today = new Date();
        setPaymentDueDate(today.toISOString().split('T')[0]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const checkPaymentHistory = async () => {
      if (!selectedSubscriber) {
        setHasOutstandingBalance(false);
        setRemainingPayment(0);
        return;
      }
      
      try {
        const subscriptionHistory = await getSubscriptionsBySubscriberId(selectedSubscriber);
        
        if (Array.isArray(subscriptionHistory) && subscriptionHistory.length > 0) {
          // Calculate remaining payment
          let totalDue = 0;
          let totalPaid = 0;
          
          subscriptionHistory.forEach(sub => {
            const price = sub.paidPrice || 0;
            totalDue += price;
            
            if (sub.paymentStatus === 'paid') {
              totalPaid += price;
            }
          });
          
          const remaining = Math.max(0, totalDue - totalPaid);
          setRemainingPayment(remaining);
          setHasOutstandingBalance(remaining > 0);
        } else {
          setHasOutstandingBalance(false);
          setRemainingPayment(0);
        }
      } catch (error) {
        console.error('Error checking payment history:', error);
      }
    };
    
    checkPaymentHistory();
  }, [selectedSubscriber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = parseFloat(paidPrice);

    if (isNaN(parsedPrice)) {
      alert('Please enter a valid number for the paid price.');
      return;
    }

    try {
      await createSubscription(
        {
          accountId: selectedAccount,
          slotId: selectedSlot,
          subscriberId: selectedSubscriber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          paymentDueDate: new Date(paymentDueDate),
          paidPrice: parsedPrice,
          status: 'active',
          paymentStatus: paymentStatus,
        }
      );

      onSuccess?.();
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  const getSubscriptionRecommendation = async () => {
    if (!selectedSubscriber || !selectedAccount) return;
    
    try {
      setRecommendationLoading(true);
      
      const subscriber = subscribers.find(s => s.id === selectedSubscriber);
      const account = accounts.find(a => a.id === selectedAccount);
      
      if (!subscriber || !account) return;
      
      // Get subscriber's payment history
      const subscriptionHistory = await getSubscriptionsBySubscriberId(selectedSubscriber);
      
      // Calculate payment metrics if there's history
      let paymentReliability = 100; // Default to 100% if no history
      let unpaidAmount = 0;
      
      if (Array.isArray(subscriptionHistory) && subscriptionHistory.length > 0) {
        let totalDue = 0;
        let totalPaid = 0;
        
        subscriptionHistory.forEach(sub => {
          const price = sub.paidPrice || 0;
          totalDue += price;
          
          if (sub.paymentStatus === 'paid') {
            totalPaid += price;
          }
        });
        
        unpaidAmount = Math.max(0, totalDue - totalPaid);
        paymentReliability = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;
      }
      
      const prompt = `
        As a subscription management expert, recommend the best subscription option for this customer:
        
        Customer: ${subscriber.name}
        Account: ${account.email}
        Available slots: ${availableSlots.length}
        Payment reliability: ${paymentReliability}%
        Outstanding balance: PKR ${unpaidAmount}
        
        Important context:
        - We do NOT offer free trials
        - All subscriptions require payment
        - This is for a streaming service subscription
        
        Consider factors like:
        1. Optimal pricing strategy based on payment history
        2. Subscription duration
        3. Any special offers that might increase retention
        4. How to handle any outstanding balance
        
        Keep your recommendation concise and actionable (under 150 words).
      `;
      
      const result = await generateText(prompt);
      setRecommendation(result);
      setShowRecommendation(true);
    } catch (error) {
      console.error('Error getting recommendation:', error);
    } finally {
      setRecommendationLoading(false);
    }
  };

  const handlePaymentStatusChange = (status: 'paid' | 'unpaid' | 'free') => {
    setPaymentStatus(status);
    if (status === 'free') {
      setPaidPrice('0');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
  const availableSlots = selectedAccountData?.slots.filter(slot => !slot.isOccupied) || [];

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm mb-6">
      <h3 className="text-xl font-medium mb-4 heading">Create New Subscription</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setSelectedSlot('');
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          >
            <option value="">Select Account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.email}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slot</label>
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
            disabled={!selectedAccount}
          >
            <option value="">Select Slot</option>
            {availableSlots.map(slot => (
              <option key={slot.id} value={slot.id}>Slot {slot.id} (PIN: {slot.pin})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subscriber</label>
          <select
            value={selectedSubscriber}
            onChange={(e) => setSelectedSubscriber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          >
            <option value="">Select Subscriber</option>
            {subscribers.map(subscriber => (
              <option key={subscriber.id} value={subscriber.id}>{subscriber.name}</option>
            ))}
          </select>
        </div>

        {selectedSubscriber && (
          <div className="mt-2">
            <button
              type="button"
              onClick={getSubscriptionRecommendation}
              className="text-sm text-indigo-600 hover:text-indigo-800"
              disabled={recommendationLoading}
            >
              {recommendationLoading ? 'Getting recommendations...' : 'Get AI recommendations'}
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paid Price</label>
          <input
            type="number"
            value={paidPrice}
            onChange={(e) => setPaidPrice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
            step="0.01"
            disabled={paymentStatus === 'free'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              const newStartDate = new Date(e.target.value);
              const newEndDate = new Date(newStartDate.setDate(newStartDate.getDate() + SUBSCRIPTION_DAYS));
              
              const formattedEndDate = newEndDate.toISOString().split('T')[0];
              setEndDate(formattedEndDate);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="paymentDueDate" className="block text-gray-700 text-sm font-bold mb-2">
            Payment Due Date:
          </label>
          <input
            type="date"
            id="paymentDueDate"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={paymentDueDate}
            onChange={(e) => setPaymentDueDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                onChange={() => handlePaymentStatusChange('paid')}
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
                onChange={() => handlePaymentStatusChange('unpaid')}
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
                onChange={() => handlePaymentStatusChange('free')}
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">Free</span>
            </label>
          </div>
        </div>

        {hasOutstandingBalance && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-100 dark:border-red-800">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Outstanding Balance</h4>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">PKR {remainingPayment.toLocaleString()}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              This subscriber has an outstanding balance. Consider collecting payment before creating a new subscription.
            </p>
          </div>
        )}
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
              Creating...
            </>
          ) : (
            'Create Subscription'
          )}
        </button>
      </div>

      {showRecommendation && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <h4 className="text-sm font-medium text-indigo-800 mb-2">AI Recommendation</h4>
          <MarkdownRenderer content={recommendation} className="text-sm text-gray-700" />
        </div>
      )}
    </form>
  );
}
