'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface BatchEntrySuccessProps {
  subscriptionId: string;
  onDismiss: () => void;
}

export default function BatchEntrySuccess({ subscriptionId, onDismiss }: BatchEntrySuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center"
    >
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Subscription Created!</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        The subscription has been successfully created and is now active.
      </p>
      
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Subscription ID</p>
        <p className="text-lg font-medium text-indigo-600 dark:text-indigo-400">{subscriptionId}</p>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
        <Link href={`/subscriptions`} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
          View All Subscriptions
        </Link>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Create Another
        </button>
      </div>
    </motion.div>
  );
} 