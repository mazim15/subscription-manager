'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import BatchDataParser from '@/components/batch-entry/BatchDataParser';
import BatchEntryForm from '@/components/batch-entry/BatchEntryForm';
import { notify } from '@/lib/notifications';

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
  paymentStatus: 'paid' | 'unpaid' | 'free';
}

export default function BatchEntryPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormDataType>({
    name: '',
    contact: '',
    slotNumber: '',
    paidPrice: '',
    accountEmail: '',
    pin: '',
    startDate: '',
    endDate: '',
    accountPassword: '',
    availableSlots: [],
    totalSlots: 5,
    paymentStatus: 'unpaid'
  });
  const [accountExists, setAccountExists] = useState(false);
  const [entries, setEntries] = useState<Array<FormDataType>>([]);
  
  const handleDataParsed = (
    parsedData: Partial<FormDataType>, 
    exists: boolean, 
    availableSlots?: number[]
  ) => {
    // Ensure all values are strings or explicitly undefined
    const sanitizedData = {
      ...parsedData,
      accountEmail: parsedData.accountEmail || '',
      accountPassword: parsedData.accountPassword || '',
      name: parsedData.name || '',
      contact: parsedData.contact || '',
      slotNumber: parsedData.slotNumber || '',
      paidPrice: parsedData.paidPrice || '',
      pin: parsedData.pin || '',
      startDate: parsedData.startDate || '',
      endDate: parsedData.endDate || '',
      totalSlots: exists ? (parsedData.totalSlots || 5) : 5,
      paymentStatus: parsedData.paymentStatus || 'unpaid'
    };

    setFormData(prev => ({
      ...prev,
      ...sanitizedData,
      availableSlots: availableSlots || Array.from({ length: 5 }, (_, i) => i + 1),
      accountEmail: sanitizedData.accountEmail || prev.accountEmail || '',
      accountPassword: sanitizedData.accountPassword || prev.accountPassword || '',
      paymentStatus: sanitizedData.paymentStatus || prev.paymentStatus
    }));
    setAccountExists(exists);
  };
  
  const handleSuccess = () => {
    notify.success('Subscription created successfully!');
    setFormData(prev => ({
      ...prev,
      name: '',
      contact: '',
      slotNumber: '',
      paidPrice: '',
      pin: '',
      startDate: '',
      endDate: '',
      availableSlots: [],
      accountEmail: prev.accountEmail || '',
      accountPassword: prev.accountPassword || '',
      totalSlots: 5,
      paymentStatus: 'unpaid'
    }));
    setAccountExists(false);
  };

  const handleBatchEntry = (text: string) => {
    try {
      const rows = text.split('\n').filter(row => row.trim());
      const processedData = rows.map(row => {
        const columns = row.split('\t');
        
        // Handle cases where price might be empty
        const price = columns[3]?.trim() ? parseFloat(columns[3]) : 0;
        
        return {
          name: columns[0]?.trim() || '',
          contact: columns[1]?.trim() || '',
          slotNumber: columns[2]?.trim() || '',
          paidPrice: price.toString(),
          accountEmail: columns[4]?.trim() || '',
          pin: columns[5]?.trim() || '',
          startDate: columns[6]?.trim() || '',
          endDate: columns[7]?.trim() || '',
          paymentStatus: 'unpaid'
        };
      });

      // Update form data with the first row
      if (processedData.length > 0) {
        setFormData(prev => ({
          ...prev,
          ...processedData[0],
          availableSlots: prev.availableSlots,
          totalSlots: prev.totalSlots,
          accountPassword: prev.accountPassword,
          paymentStatus: processedData[0].paymentStatus
        }));
        notify.success('Data processed successfully');
      } else {
        notify.error('No valid data found');
      }
    } catch (error) {
      notify.error('Failed to process batch data');
      console.error('Error processing batch data:', error);
    }
  };

  const handleEntryChange = (index: number, field: keyof FormDataType, value: string) => {
    setEntries(prevEntries => {
      const updatedEntries = [...prevEntries];
      updatedEntries[index] = {
        ...updatedEntries[index],
        [field]: value as any
      };
      return updatedEntries;
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-2"
      >
        <div>
          <h1 className="text-2xl font-bold heading bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Batch Data Entry</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Quickly create subscriptions with batch data processing</p>
        </div>
      </motion.div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quick Entry</p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Paste & Process</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Preview</p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Verify Before Submit</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Instant</p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Account Creation</p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Batch Data Parser */}
      <BatchDataParser onDataParsed={handleDataParsed} />
      
      {/* Batch Entry Form */}
      <BatchEntryForm 
        onSuccess={handleSuccess}
        formData={formData}
        setFormData={setFormData}
        accountExists={accountExists}
      />
    </div>
  );
} 