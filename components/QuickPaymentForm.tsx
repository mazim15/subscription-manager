'use client';

import { useState } from 'react';
import { updateSubscription } from '@/lib/db-operations';

interface QuickPaymentFormProps {
  subscriptionId: string;
  currentAmount: number;
  startDate: Date;
  endDate: Date;
  onPaymentComplete: () => void;
}

export default function QuickPaymentForm({ 
  subscriptionId, 
  currentAmount, 
  startDate, 
  endDate, 
  onPaymentComplete 
}: QuickPaymentFormProps) {
  const [amount, setAmount] = useState(currentAmount.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        alert('Please enter a valid amount');
        return;
      }
      
      await updateSubscription(
        subscriptionId,
        startDate,
        endDate,
        parsedAmount,
        'paid'
      );
      
      alert('Payment recorded successfully!');
      onPaymentComplete();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-gray-800/30 p-3 rounded-lg">
      <div className="flex space-x-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          placeholder="Amount"
          step="0.01"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
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
            'Mark Paid'
          )}
        </button>
      </div>
    </form>
  );
} 