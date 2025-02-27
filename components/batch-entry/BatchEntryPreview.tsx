'use client';
import { motion } from 'framer-motion';

interface FormData {
  name: string;
  contact: string;
  slotNumber: string;
  paidPrice: string;
  accountEmail: string;
  pin: string;
  startDate: string;
  endDate: string;
  accountPassword: string;
}

interface BatchEntryPreviewProps {
  formData: FormData;
  onConfirm: (e: React.FormEvent) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

export default function BatchEntryPreview({ formData, onConfirm, onBack, loading }: BatchEntryPreviewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(e);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      <h2 className="text-xl font-medium mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Confirm Subscription Details</h2>
      
      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg mb-6 border border-indigo-100 dark:border-indigo-800">
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          Please review the subscription details before confirming. This will create a new subscription with the following information.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Subscriber Information</h3>
            <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-white">{formData.name}</p>
              <p className="text-gray-600 dark:text-gray-300">{formData.contact}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Information</h3>
            <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-white">{formData.accountEmail}</p>
              <p className="text-gray-600 dark:text-gray-300">Slot: {formData.slotNumber} • PIN: {formData.pin}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Subscription Period</h3>
            <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(formData.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">End Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(formData.endDate)}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Information</h3>
            <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">PKR {parseFloat(formData.paidPrice).toLocaleString()}</p>
              <p className="text-gray-600 dark:text-gray-300">
                {parseFloat(formData.paidPrice) > 0 ? 'Paid' : 'Unpaid'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Back to Edit
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-md flex items-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Confirm & Create
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
} 