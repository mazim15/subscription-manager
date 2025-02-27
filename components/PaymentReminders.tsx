'use client';

import { useState, useEffect } from 'react';
import { getPaymentReminders, suspendSubscription, getAccounts, getSubscribers, getSubscriptionsBySubscriberId, getSubscriber } from '@/lib/db-operations';
import { Timestamp } from 'firebase/firestore';
import { generatePaymentReminder, generateText } from '@/lib/gemini';
import { notify } from '@/lib/notifications';
import { Subscription, Subscriber } from '@/types';

interface PaymentRemindersProps {
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

interface PaymentReminderItem {
  id: string;
  subscriberId: string;
  subscriberName?: string;
  subscriberContact?: string;
  amount: number;
  accountPrice: number;
  paidPrice: number;
  paymentDueDate: Timestamp;
  paymentStatus: string;
  reminderType: 'upcoming' | 'overdue';
  daysOverdue?: number;
  outstanding?: number;
}

// Add a new interface for grouped reminders
interface GroupedReminders {
  subscriberId: string;
  subscriberName: string;
  subscriberContact: string;
  totalOutstanding: number;
  totalDue: number;
  totalPaid: number;
  reminders: PaymentReminderItem[];
}

export default function PaymentReminders({ onPaymentSuccess, onPaymentError }: PaymentRemindersProps) {
  const [reminders, setReminders] = useState<PaymentReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [reminderText, setReminderText] = useState<string>('');
  const [selectedReminder, setSelectedReminder] = useState<PaymentReminderItem | null>(null);
  const [showWhatsAppTemplate, setShowWhatsAppTemplate] = useState(false);
  const [reminderType, setReminderType] = useState('all');
  const [groupedReminders, setGroupedReminders] = useState<GroupedReminders[]>([]);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        setLoading(true);
        const remindersData = await getPaymentReminders() as unknown as Partial<Subscription>[];
        
        // Enhance reminders with subscriber info and payment calculations
        const enhancedReminders = await Promise.all(remindersData.map(async (reminder) => {
          const subscriber = await getSubscriber(reminder.subscriberId!);
          const outstanding = calculateOutstanding(reminder.accountPrice || 0, reminder.paidPrice || 0);
          
          return {
            ...reminder,
            subscriberName: subscriber?.name || 'Unknown',
            subscriberContact: subscriber?.contact || 'No contact',
            accountPrice: reminder.accountPrice || 0,
            paidPrice: reminder.paidPrice || 0,
            outstanding,
            amount: reminder.accountPrice || 0,
            paymentStatus: reminder.paymentStatus || 'unknown',
            reminderType: reminder.paymentStatus === 'overdue' ? 'overdue' : 'upcoming'
          } as PaymentReminderItem;
        }));

        // Group reminders by subscriber
        const grouped = enhancedReminders.reduce((acc: GroupedReminders[], reminder) => {
          const existingGroup = acc.find(g => g.subscriberId === reminder.subscriberId);
          
          if (existingGroup) {
            existingGroup.reminders.push(reminder);
            existingGroup.totalOutstanding += reminder.outstanding || 0;
            existingGroup.totalDue += reminder.accountPrice;
            existingGroup.totalPaid += reminder.paidPrice;
          } else {
            acc.push({
              subscriberId: reminder.subscriberId,
              subscriberName: reminder.subscriberName || 'Unknown',
              subscriberContact: reminder.subscriberContact || 'No contact',
              totalOutstanding: reminder.outstanding || 0,
              totalDue: reminder.accountPrice,
              totalPaid: reminder.paidPrice,
              reminders: [reminder]
            });
          }
          
          return acc;
        }, []);

        setGroupedReminders(grouped);
        setReminders(enhancedReminders);
      } catch (error) {
        console.error('Error fetching reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return 'Invalid Date';
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
        const remindersData = await getPaymentReminders() as unknown as Partial<Subscription>[];
        const enhancedReminders = await Promise.all(remindersData.map(async (reminder) => {
          const subscriber = await getSubscriber(reminder.subscriberId!);
          const outstanding = calculateOutstanding(reminder.accountPrice || 0, reminder.paidPrice || 0);
          
          return {
            ...reminder,
            subscriberName: subscriber?.name || 'Unknown',
            subscriberContact: subscriber?.contact || 'No contact',
            accountPrice: reminder.accountPrice || 0,
            paidPrice: reminder.paidPrice || 0,
            outstanding,
            amount: reminder.accountPrice || 0,
            paymentStatus: reminder.paymentStatus || 'unknown',
            reminderType: reminder.paymentStatus === 'overdue' ? 'overdue' : 'upcoming'
          } as PaymentReminderItem;
        }));
        
        setReminders(enhancedReminders);
      } catch (error) {
        console.error('Error suspending subscription:', error);
      }
    }
  };

  const generatePaymentSummary = async (reminder: PaymentReminderItem) => {
    try {
      // Get all subscriptions for this subscriber
      const subscriptions = await getSubscriptionsBySubscriberId(reminder.subscriberId);
      
      // Calculate totals across all subscriptions
      const summary = subscriptions.reduce((acc, sub) => {
        return {
          totalDue: acc.totalDue + (sub.accountPrice || 0),
          totalPaid: acc.totalPaid + (sub.paidPrice || 0),
        };
      }, { totalDue: 0, totalPaid: 0 });

      const totalOutstanding = Math.max(0, summary.totalDue - summary.totalPaid);

      return {
        totalDue: summary.totalDue,
        totalPaid: summary.totalPaid,
        remainingPayment: totalOutstanding
      };
    } catch (error) {
      console.error('Error generating payment summary:', error);
      throw error;
    }
  };

  const handleOpenWhatsApp = async (reminder: PaymentReminderItem) => {
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
    if (!selectedReminder?.subscriberContact) return;
    
    // Format phone number (remove spaces, add country code if needed)
    let phoneNumber = selectedReminder.subscriberContact;
    if (phoneNumber && !phoneNumber.startsWith('+')) {
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
      // Get all subscriptions for this subscriber
      const subscriptions = await getSubscriptionsBySubscriberId(subscriber.subscriberId);
      
      // Calculate totals across all subscriptions
      const totals = subscriptions.reduce((acc, sub) => ({
        totalDue: acc.totalDue + (sub.accountPrice || 0),
        totalPaid: acc.totalPaid + (sub.paidPrice || 0),
        subscriptionCount: acc.subscriptionCount + 1
      }), { totalDue: 0, totalPaid: 0, subscriptionCount: 0 });

      const totalOutstanding = Math.max(0, totals.totalDue - totals.totalPaid);

      // Generate AI reminder with aggregated payment context
      const prompt = `
        Generate a polite but firm payment reminder message for streaming service subscriptions.
        
        Details:
        - Subscriber name: ${subscriber.subscriberName}
        - Number of subscriptions: ${totals.subscriptionCount}
        - Total Account Price: PKR ${totals.totalDue}
        - Total Amount Paid: PKR ${totals.totalPaid}
        - Total Outstanding: PKR ${totalOutstanding}
        
        Important context:
        - This is for multiple streaming service subscriptions
        - The payment is overdue
        - Be clear about the total outstanding amount
        - Include the total amount that needs to be paid
        
        The tone should be professional but firm. Include a clear call to action for payment.
        Keep it concise (under 100 words).
      `;
      
      const reminderMessage = await generateText(prompt);
      setReminderText(reminderMessage);
    } catch (error) {
      console.error('Error generating AI reminder:', error);
      // Fallback to a default message with correct values
      setReminderText(
        `Dear ${subscriber.subscriberName},\n\n` +
        `This is a reminder regarding your streaming service subscriptions. ` +
        `Your total outstanding balance is PKR ${subscriber.totalOutstanding} ` +
        `(Total due: PKR ${subscriber.totalDue}, Total paid: PKR ${subscriber.totalPaid}). ` +
        `Please make the payment at your earliest convenience.\n\n` +
        `Thank you,\nStreaming Manager`
      );
    }
  };

  const calculateOutstanding = (accountPrice: number, paidPrice: number) => {
    return Math.max(0, accountPrice - paidPrice);
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
        
        <div className="space-y-4">
          {groupedReminders.map((group) => (
            <div key={group.subscriberId} className="border dark:border-gray-700 rounded-lg">
              <div className="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-t-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {group.subscriberName}
                    </h3>
                    <p className="text-sm text-gray-500">{group.subscriberContact}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total Outstanding</p>
                    <p className={`text-base font-semibold ${
                      group.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      PKR {group.totalOutstanding.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenWhatsApp(group.reminders[0])}
                      className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                      </svg>
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Due Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Account Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Paid</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Outstanding</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {group.reminders.map((reminder) => (
                      <tr 
                        key={reminder.id}
                        className={reminder.reminderType === 'overdue' ? 'bg-red-50/50 dark:bg-red-900/20' : ''}
                      >
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm">{formatDate(reminder.paymentDueDate)}</div>
                          {reminder.daysOverdue && reminder.daysOverdue > 0 && (
                            <div className="text-xs text-red-600">
                              {reminder.daysOverdue}d overdue
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          PKR {reminder.accountPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          PKR {reminder.paidPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`text-sm ${
                            (reminder.outstanding ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            PKR {(reminder.outstanding ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            reminder.reminderType === 'overdue' 
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {reminder.reminderType === 'overdue' ? 'Overdue' : 'Due Soon'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          {reminder.reminderType === 'overdue' && (reminder.daysOverdue ?? 0) > 7 && (
                            <button
                              onClick={() => handleSuspendSubscription(reminder.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Suspend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {groupedReminders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No payment reminders found.
            </div>
          )}
        </div>
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