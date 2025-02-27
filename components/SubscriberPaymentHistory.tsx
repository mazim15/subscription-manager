'use client';

import { useState, useEffect } from 'react';
import { getSubscriptionsBySubscriberId } from '@/lib/db-operations';
import { analyzePaymentHistory } from '@/lib/gemini';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface SubscriberPaymentHistoryProps {
  subscriberId: string;
  subscriberName: string;
}

export default function SubscriberPaymentHistory({ subscriberId, subscriberName }: SubscriberPaymentHistoryProps) {
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [remainingPayment, setRemainingPayment] = useState(0);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        setLoading(true);
        const subscriptions = await getSubscriptionsBySubscriberId(subscriberId);
        
        if (!Array.isArray(subscriptions)) {
          throw new Error("Failed to retrieve subscription data");
        }
        
        // Calculate totals
        let paid = 0;
        let due = 0;
        
        // Create payment history from subscriptions
        const history = subscriptions.map(sub => {
          const price = sub.paidPrice || 0;
          due += price;
          
          // Assume paid if payment status is 'paid'
          if (sub.paymentStatus === 'paid') {
            paid += price;
          }
          
          return {
            date: new Date(sub.startDate).toLocaleDateString(),
            amount: price,
            status: sub.paymentStatus || 'unknown',
            dueDate: new Date(sub.paymentDueDate).toLocaleDateString(),
            subscriptionPeriod: `${new Date(sub.startDate).toLocaleDateString()} - ${new Date(sub.endDate).toLocaleDateString()}`
          };
        });
        
        setPaymentHistory(history);
        setTotalPaid(paid);
        setTotalDue(due);
        setRemainingPayment(Math.max(0, due - paid));
        
        // Generate analysis
        if (history.length > 0) {
          generateAnalysis(history, paid, due, subscriberName);
        }
      } catch (error) {
        console.error('Error fetching payment history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentHistory();
  }, [subscriberId, subscriberName]);
  
  const generateAnalysis = async (history: any[], paid: number, due: number, name: string) => {
    try {
      setAnalysisLoading(true);
      const prompt = `
        Analyze payment history for ${name}:
        
        Total paid: PKR ${paid}
        Total due: PKR ${due}
        Remaining: PKR ${Math.max(0, due - paid)}
        
        Provide:
        1. Payment behavior summary
        2. Recommendations
        3. A payment request message
        
        Use markdown formatting.
      `;
      
      const result = await analyzePaymentHistory(name, history, paid, due);
      setAnalysis(result);
    } catch (error) {
      console.error('Error generating payment analysis:', error);
      setAnalysis('Unable to analyze payment history at this time.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-gray-500">Loading payment history...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Payment History & Analysis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Total Paid</h3>
          <p className="text-2xl font-bold text-blue-600">PKR {totalPaid.toLocaleString()}</p>
        </div>
        
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
          <h3 className="text-sm font-medium text-amber-800 mb-1">Total Due</h3>
          <p className="text-2xl font-bold text-amber-600">PKR {totalDue.toLocaleString()}</p>
        </div>
        
        <div className="p-4 bg-red-50 rounded-lg border border-red-100">
          <h3 className="text-sm font-medium text-red-800 mb-1">Remaining Payment</h3>
          <p className="text-2xl font-bold text-red-600">PKR {remainingPayment.toLocaleString()}</p>
        </div>
      </div>
      
      {/* Payment History Table */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Payment History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentHistory.map((payment, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">PKR {payment.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : 
                        payment.status === 'unpaid' ? 'bg-red-100 text-red-800' : 
                        payment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.dueDate}</td>
                </tr>
              ))}
              {paymentHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No payment history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* AI Analysis */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">AI Payment Analysis</h3>
          <button 
            onClick={() => generateAnalysis(paymentHistory, totalPaid, totalDue, subscriberName)}
            disabled={analysisLoading}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {analysisLoading ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>
        
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          {analysisLoading ? (
            <div className="text-center py-4 text-gray-500">Analyzing payment history...</div>
          ) : (
            <MarkdownRenderer content={analysis} />
          )}
        </div>
      </div>
    </div>
  );
} 