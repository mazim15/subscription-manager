import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';

interface ReminderHistoryItem {
  id: string;
  subscriberId: string;
  subscriberName: string;
  subscriberContact: string;
  amount: number;
  sentDate: Date;
  dueDate: Date;
  status: 'sent' | 'paid' | 'pending';
  notes?: string;
}

export default function PaymentReminderHistory() {
  const [reminderHistory, setReminderHistory] = useState<ReminderHistoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState('');
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Mock data for demonstration
  useEffect(() => {
    // In a real app, you would fetch this from your database
    const mockHistory: ReminderHistoryItem[] = [
      {
        id: '1',
        subscriberId: 'sub1',
        subscriberName: 'John Doe',
        subscriberContact: '+923001234567',
        amount: 1500,
        sentDate: new Date(2023, 5, 15),
        dueDate: new Date(2023, 5, 20),
        status: 'paid',
        notes: 'Paid on time'
      },
      {
        id: '2',
        subscriberId: 'sub2',
        subscriberName: 'Jane Smith',
        subscriberContact: '+923007654321',
        amount: 2000,
        sentDate: new Date(2023, 6, 1),
        dueDate: new Date(2023, 6, 10),
        status: 'pending',
        notes: 'Promised to pay by weekend'
      }
    ];
    
    setReminderHistory(mockHistory);
    
    // Mock subscribers
    setSubscribers([
      { id: 'sub1', name: 'John Doe', contact: '+923001234567' },
      { id: 'sub2', name: 'Jane Smith', contact: '+923007654321' },
      { id: 'sub3', name: 'Alice Johnson', contact: '+923009876543' }
    ]);
  }, []);
  
  const handleAddReminder = () => {
    if (!selectedSubscriber || !amount || !dueDate) {
      alert('Please fill all required fields');
      return;
    }
    
    const subscriber = subscribers.find(s => s.id === selectedSubscriber);
    
    const newReminder: ReminderHistoryItem = {
      id: Date.now().toString(),
      subscriberId: selectedSubscriber,
      subscriberName: subscriber?.name || 'Unknown',
      subscriberContact: subscriber?.contact || '',
      amount: parseFloat(amount),
      sentDate: new Date(),
      dueDate: new Date(dueDate),
      status: 'sent',
      notes: notes
    };
    
    setReminderHistory([newReminder, ...reminderHistory]);
    setShowAddModal(false);
    
    // Reset form
    setSelectedSubscriber('');
    setAmount('');
    setDueDate('');
    setNotes('');
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const filteredHistory = reminderHistory.filter(reminder => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'sent' && reminder.status === 'sent') return true;
    if (statusFilter === 'paid' && reminder.status === 'paid') return true;
    if (statusFilter === 'ignored' && reminder.status === 'pending') return true;
    return false;
  });
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden mt-6">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-medium heading">Payment Reminder History</h2>
      </div>
      
      <div className="p-4">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md text-sm ${
              statusFilter === 'all' 
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('sent')}
            className={`px-3 py-1 rounded-md text-sm ${
              statusFilter === 'sent' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1 rounded-md text-sm ${
              statusFilter === 'paid' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setStatusFilter('ignored')}
            className={`px-3 py-1 rounded-md text-sm ${
              statusFilter === 'ignored' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Ignored
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
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sent Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredHistory.map((reminder) => (
                <tr key={reminder.id}>
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
                      PKR {reminder.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(reminder.sentDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(reminder.dueDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(reminder.status)}`}>
                      {reminder.status.charAt(0).toUpperCase() + reminder.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {reminder.notes || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredHistory.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No reminder history for the selected filter.
          </div>
        )}
      </div>
      
      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Log New Payment Reminder</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subscriber
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedSubscriber}
                  onChange={(e) => setSelectedSubscriber(e.target.value)}
                  required
                >
                  <option value="">Select a subscriber</option>
                  {subscribers.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.contact})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (PKR)
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddReminder}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 