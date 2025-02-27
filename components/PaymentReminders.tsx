'use client';

import { useState, useEffect } from 'react';
import { getPaymentReminders, suspendSubscription, getAccounts, getSubscribers, getSubscriptionsBySubscriberId } from '@/lib/db-operations';
import { Timestamp } from 'firebase/firestore';
import { generatePaymentReminder, generateText } from '@/lib/gemini';
import { notify } from '@/lib/notifications';

export default function PaymentReminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [reminderText, setReminderText] = useState<string>('');
  const [selectedReminder, setSelectedReminder] = useState<any | null>(null);
  const [showWhatsAppTemplate, setShowWhatsAppTemplate] = useState(false);
  const [reminderType, setReminderType] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [remindersData, accountsData, subscribersData] = await Promise.all([
          getPaymentReminders(),
          getAccounts(),
          getSubscribers()
        ]);

        console.log("Reminders data:", remindersData);
        
        // Enhance reminder data with related information
        const enhancedReminders = remindersData.map(reminder => {
          const account = accountsData.find(acc => acc.id === reminder.accountId);
          const subscriber = subscribersData.find(s => s.id === reminder.subscriberId);
          
          return {
            ...reminder,
            accountEmail: account?.email || 'Unknown Account',
            subscriberName: subscriber?.name || 'Unknown Subscriber',
            subscriberContact: subscriber?.contact || 'No contact info',
          };
        });

        setReminders(enhancedReminders);
        setAccounts(accountsData);
        setSubscribers(subscribersData);
      } catch (error) {
        console.error('Error fetching payment reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    return date.toLocaleDateString();
  };

  const handleSendReminder = async (subscriberId: string, subscriptionId: string) => {
    // In a real implementation, this would send an email or SMS
    // For now, we'll just show an alert
    const subscriber = subscribers.find(s => s.id === subscriberId);
    alert(`Reminder sent to ${subscriber?.name} at ${subscriber?.contact}`);
  };

  const handleSuspendSubscription = async (subscriptionId: string) => {
    const confirmSuspend = window.confirm('Are you sure you want to suspend this subscription?');
    if (confirmSuspend) {
      try {
        await suspendSubscription(subscriptionId);
        // Refresh data
        const remindersData = await getPaymentReminders();
        setReminders(remindersData);
      } catch (error) {
        console.error('Error suspending subscription:', error);
      }
    }
  };

  const generatePaymentSummary = async (reminder: any) => {
    try {
      // Get subscriber's payment history
      const subscriptionHistory = await getSubscriptionsBySubscriberId(reminder.subscriberId);
      
      if (!Array.isArray(subscriptionHistory)) {
        throw new Error("Failed to retrieve subscription history");
      }
      
      // Calculate totals
      let totalDue = 0;
      let totalPaid = 0;
      
      subscriptionHistory.forEach(sub => {
        const price = sub.paidPrice || 0;
        totalDue += price;
        
        if (sub.paymentStatus === 'paid') {
          totalPaid += price;
        }
      });
      
      const remainingPayment = Math.max(0, totalDue - totalPaid);
      
      // Generate AI summary
      const prompt = `
        Generate a payment summary for this subscriber:
        
        Subscriber: ${reminder.subscriberName}
        Total paid to date: PKR ${totalPaid}
        Total due: PKR ${totalDue}
        Remaining to be paid: PKR ${remainingPayment}
        Current overdue amount: PKR ${reminder.paidPrice}
        Days overdue: ${reminder.daysOverdue || 0}
        
        Important context:
        - We do NOT offer free trials
        - All subscriptions require payment
        - This is for a streaming service subscription
        - The subscriber has not paid for their subscription yet
        
        Please provide:
        1. A brief summary of their payment status
        2. A polite but firm payment request message
        3. A suggested payment plan if the amount is significant
        
        Keep it concise (under 100 words).
      `;
      
      const result = await generateText(prompt);
      return {
        summary: result,
        totalPaid,
        totalDue,
        remainingPayment
      };
    } catch (error) {
      console.error('Error generating payment summary:', error);
      return {
        summary: 'Unable to generate payment summary at this time.',
        totalPaid: 0,
        totalDue: 0,
        remainingPayment: 0
      };
    }
  };

  const handleOpenWhatsApp = async (reminder: any) => {
    setSelectedReminder(reminder);
    setShowWhatsAppTemplate(true);
    
    // Show loading state
    setReminderText('Generating payment reminder...');
    
    try {
      // Get payment summary first
      const paymentSummary = await generatePaymentSummary(reminder);
      
      // Then generate the reminder with the payment context
      await generateAIReminderText({
        ...reminder,
        subscriberName: reminder.subscriberName,
        daysOverdue: reminder.daysOverdue || 0,
        amount: reminder.paidPrice,
        totalPaid: paymentSummary.totalPaid,
        totalDue: paymentSummary.totalDue,
        remainingPayment: paymentSummary.remainingPayment
      });
      notify.success('Payment reminder generated');
    } catch (error) {
      console.error('Error preparing payment reminder:', error);
      notify.error('Failed to generate payment reminder');
      setReminderText(
        `Dear ${reminder.subscriberName},\n\nThis is a reminder that your payment of PKR ${reminder.paidPrice} for your streaming subscription is overdue. Please make the payment at your earliest convenience.\n\nThank you,\nStreaming Manager`
      );
    }
  };
  
  const handleSendWhatsApp = () => {
    if (!selectedReminder) return;
    
    // Format phone number (remove spaces, add country code if needed)
    let phoneNumber = selectedReminder.subscriberContact;
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+92' + phoneNumber.replace(/^0/, ''); // Add Pakistan country code
    }
    phoneNumber = phoneNumber.replace(/\s+/g, '');
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(reminderText);
    
    // Open WhatsApp with the pre-filled message
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
    
    setShowWhatsAppTemplate(false);
  };
  
  const handleCopyText = () => {
    navigator.clipboard.writeText(reminderText);
    notify.success('Message copied to clipboard');
  };

  const generateAIReminderText = async (subscriber: any) => {
    try {
      // Calculate days overdue if not provided
      let daysOverdue = subscriber.daysOverdue;
      if (daysOverdue === undefined) {
        const dueDate = new Date(subscriber.dueDate);
        const today = new Date();
        daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      // Generate AI reminder with payment context
      const prompt = `
        Generate a polite but firm payment reminder message for a streaming service subscription.
        
        Details:
        - Subscriber name: ${subscriber.subscriberName}
        - Days overdue: ${daysOverdue}
        - Current amount due: PKR ${subscriber.amount}
        - Total paid to date: PKR ${subscriber.totalPaid || 0}
        - Total remaining balance: PKR ${subscriber.remainingPayment || subscriber.amount}
        
        The tone should be professional but friendly. Include a clear call to action.
        Mention the total remaining balance if it's different from the current amount due.
        Keep it concise (under 100 words).
      `;
      
      const reminderMessage = await generateText(prompt);
      setReminderText(reminderMessage);
    } catch (error) {
      console.error('Error generating AI reminder:', error);
      // Fallback to a default message
      setReminderText(
        `Dear ${subscriber.subscriberName},\n\nThis is a reminder that your payment of PKR ${subscriber.amount} for your streaming subscription is overdue. Please make the payment at your earliest convenience.\n\nThank you,\nStreaming Manager`
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading payment reminders...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-medium heading">Payment Reminders</h2>
      </div>
      
      <div className="p-4">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setReminderType('all')}
            className={`px-3 py-1 rounded-md text-sm ${
              reminderType === 'all' 
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setReminderType('due-soon')}
            className={`px-3 py-1 rounded-md text-sm ${
              reminderType === 'due-soon' 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Due Soon
          </button>
          <button
            onClick={() => setReminderType('overdue')}
            className={`px-3 py-1 rounded-md text-sm ${
              reminderType === 'overdue' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Overdue
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Subscriber
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reminders.map((reminder) => (
                <tr key={reminder.id} className={reminder.reminderType === 'overdue' ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {reminder.subscriberName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {reminder.subscriberContact}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {reminder.accountEmail}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      PKR {reminder.paidPrice.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(reminder.paymentDueDate)}
                    </div>
                    {reminder.reminderType === 'overdue' && (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {reminder.daysOverdue} days overdue
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      reminder.reminderType === 'overdue' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {reminder.reminderType === 'overdue' ? 'Overdue' : 'Due Soon'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleSendReminder(reminder.subscriberId, reminder.id)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3"
                    >
                      Send Reminder
                    </button>
                    {reminder.reminderType === 'overdue' && reminder.daysOverdue > 7 && (
                      <button
                        onClick={() => handleSuspendSubscription(reminder.id)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenWhatsApp(reminder)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {reminders.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No payment reminders for the selected filter.
          </div>
        )}
      </div>
      
      {/* WhatsApp Template Modal */}
      {showWhatsAppTemplate && selectedReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-medium mb-4">WhatsApp Reminder for {selectedReminder.subscriberName}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Template
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 h-48 focus:ring-blue-500 focus:border-blue-500"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 justify-end">
              <button
                onClick={handleCopyText}
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Copy Text
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Open in WhatsApp
              </button>
              <button
                onClick={() => setShowWhatsAppTemplate(false)}
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 