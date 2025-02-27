'use client';
import { useState } from 'react';
import { createSubscription, getAccount, updateAccount, addAccount, addSubscriber } from '@/lib/db-operations';
import BatchEntryPreview from './BatchEntryPreview';
import BatchEntrySuccess from './BatchEntrySuccess';
import { motion } from 'framer-motion';

interface FormDataType {
  name: string;
  contact: string;
  slotNumber: string;
  paidPrice: string;
  accountEmail: string;
  pin: string;
  startDate: string;
  endDate: string;
  accountPassword: string;
  availableSlots: number[];
  totalSlots: number;
  accountPrice: string;
  paymentStatus: 'paid' | 'unpaid' | 'free';
}

interface Slot {
  id: string;
  isOccupied: boolean;
  pin: string;
}

interface BatchEntryFormProps {
  onSuccess: () => void;
  formData: {
    name: string;
    contact: string;
    slotNumber: string;
    paidPrice: string;
    accountEmail: string;
    pin: string;
    startDate: string;
    endDate: string;
    accountPassword: string;
    availableSlots: number[];
    totalSlots: number;
    accountPrice: string;
    paymentStatus: 'paid' | 'unpaid' | 'free';
  };
  setFormData: (data: FormDataType) => void;
  accountExists?: boolean;
}

export default function BatchEntryForm({ onSuccess, formData, setFormData, accountExists = false }: BatchEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdSubscriptionId, setCreatedSubscriptionId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    // Validate all required fields
    if (!formData.name || !formData.contact || !formData.accountEmail || 
        !formData.pin || !formData.startDate || !formData.endDate || 
        !formData.paidPrice) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return false;
    }

    // Validate dates
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setMessage({ type: 'error', text: 'Invalid date format' });
      return false;
    }

    if (startDate > endDate) {
      setMessage({ type: 'error', text: 'End date must be after start date' });
      return false;
    }

    // Validate price
    const paidPrice = parseFloat(formData.paidPrice);
    if (isNaN(paidPrice) || paidPrice < 0) {
      setMessage({ type: 'error', text: 'Invalid price format' });
      return false;
    }

    return true;
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let accountId: string;
      let assignedSlotNumber: number;
      
      // Create subscriber first
      const subscriberId = await addSubscriber({
        name: formData.name,
        contact: formData.contact
      });

      if (!subscriberId) {
        throw new Error('Failed to create subscriber');
      }

      if (!accountExists) {
        // For new accounts, use slot 1
        assignedSlotNumber = 1;
        const slots = Array.from({ length: 5 }, (_, index) => ({
          id: `slot-${index + 1}`,
          isOccupied: index + 1 === assignedSlotNumber,
          pin: index + 1 === assignedSlotNumber ? formData.pin : ''
        }));

        accountId = await addAccount({
          email: formData.accountEmail,
          password: formData.accountPassword,
          slots: slots
        });
      } else {
        const account = await getAccount(formData.accountEmail);
        if (!account) throw new Error('Account not found');
        accountId = account.id;

        // Find first available slot
        const availableSlotIndex = account.slots.findIndex((slot: Slot) => !slot.isOccupied);
        if (availableSlotIndex === -1) {
          throw new Error('No available slots in this account. Please choose another account.');
        }
        assignedSlotNumber = availableSlotIndex + 1;

        const updatedSlots = account.slots.map((slot: Slot, index: number) => ({
          ...slot,
          isOccupied: index === availableSlotIndex ? true : slot.isOccupied,
          pin: index === availableSlotIndex ? formData.pin : slot.pin
        }));

        await updateAccount(accountId, {
          email: formData.accountEmail,
          password: account.password,
          slots: updatedSlots
        });
      }

      // Create subscription with both accountId and subscriberId
      const subscriptionId = await createSubscription({
        accountId,
        subscriberId,
        slotId: `slot-${assignedSlotNumber}`,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        paidPrice: parseFloat(formData.paidPrice),
        accountPrice: parseFloat(formData.accountPrice || '0'),
        status: 'active',
        paymentStatus: formData.paymentStatus as 'paid' | 'unpaid' | 'free'
      });

      setCreatedSubscriptionId(subscriptionId);
      setShowSuccess(true);
      onSuccess();

    } catch (error) {
      console.error('Error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to process the request' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return <BatchEntrySuccess 
      subscriptionId={createdSubscriptionId} 
      onDismiss={() => {
        setShowSuccess(false);
        onSuccess();
      }} 
    />;
  }

  if (showPreview) {
    return <BatchEntryPreview 
      formData={formData} 
      onConfirm={handleSubmit} 
      onBack={() => setShowPreview(false)}
      loading={loading}
    />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      <h2 className="text-xl font-medium mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Enter Subscription Data</h2>
      
      {accountExists && (
        <div className="p-4 mb-4 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Account already exists. Password field is not required.</span>
          </div>
        </div>
      )}
      
      {message.text && (
        <div className={`p-4 mb-4 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handlePreview} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subscriber Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Number</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slot Number</label>
            <input
              type="text"
              name="slotNumber"
              value={formData.slotNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paid Price</label>
            <input
              type="number"
              name="paidPrice"
              value={formData.paidPrice}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Email</label>
            <input
              type="email"
              name="accountEmail"
              value={formData.accountEmail}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slot PIN</label>
            <input
              type="text"
              name="pin"
              value={formData.pin}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          
          {!accountExists && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Password</label>
              <input
                type="password"
                name="accountPassword"
                value={formData.accountPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                required={!accountExists}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account Price
            </label>
            <input
              type="number"
              name="accountPrice"
              value={formData.accountPrice}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="Enter account price"
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Preview & Submit
          </button>
        </div>
      </form>
    </motion.div>
  );
} 