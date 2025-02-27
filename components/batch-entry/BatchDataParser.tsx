'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { getAccount } from '@/lib/db-operations';

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

interface BatchDataParserProps {
  onDataParsed: (data: FormData, accountExists: boolean) => void;
}

export default function BatchDataParser({ onDataParsed }: BatchDataParserProps) {
  const [batchInput, setBatchInput] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBatchInput(e.target.value);
  };

  const parseAndFillForm = async () => {
    if (!batchInput.trim()) {
      setMessage({ type: 'error', text: 'Please enter batch data.' });
      return;
    }

    setIsProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      // First clean up extra whitespace and split into fields
      // This assumes tab-separated or consistent spacing format
      const input = batchInput.trim();
      
      // Try to intelligently parse based on expected number of fields
      let parts: string[];
      
      // Check if we have tabs or multiple spaces as separators
      if (input.includes('\t')) {
        parts = input.split('\t');
      } else {
        // For space-delimited input, we need to be smarter about parsing
        // Expected format: Name Contact SlotNumber PaidPrice Email Pin StartDate EndDate
        const matches = input.match(/^(.*?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+@\S+)\s+(\d+)\s+(\S+)\s+(\S+)$/);
        
        if (!matches || matches.length < 9) {
          setMessage({ type: 'error', text: 'Could not parse input. Please ensure format is correct.' });
          setIsProcessing(false);
          return;
        }
        
        // Remove the full match (index 0) and use the captured groups
        parts = matches.slice(1);
      }
      
      if (parts.length < 8) {
        setMessage({ type: 'error', text: 'Invalid format. Please ensure all data fields are provided.' });
        setIsProcessing(false);
        return;
      }

      // Parse dates
      const parseDateString = (dateStr: string) => {
        // Check format DD-MMM-YY (like 26-Jan-25)
        const dateParts = dateStr.split('-');
        if (dateParts.length !== 3) return '';
        
        const months: {[key: string]: string} = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
          'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        
        const day = dateParts[0].padStart(2, '0');
        const month = months[dateParts[1]] || '';
        const year = `20${dateParts[2]}`; // Convert YY to YYYY
        
        if (!month) return '';
        return `${year}-${month}-${day}`;
      };

      // Fill form data
      const parsedData = {
        name: parts[0],
        contact: parts[1],
        slotNumber: parts[2],
        paidPrice: parts[3],
        accountEmail: parts[4],
        pin: parts[5],
        startDate: parseDateString(parts[6]),
        endDate: parseDateString(parts[7]),
        accountPassword: '' // This will need to be filled in manually
      };

      // Check if account exists
      let accountExists = false;
      try {
        const account = await getAccount(parsedData.accountEmail);
        accountExists = !!account;
      } catch (error) {
        // Silently handle the error - account doesn't exist
        accountExists = false;
      }

      // Simulate processing delay for better UX
      setTimeout(() => {
        onDataParsed(parsedData, accountExists);
        setMessage({ 
          type: 'success', 
          text: 'Data parsed and filled into form. Please verify before submitting.' 
        });
        setIsProcessing(false);
        setBatchInput(''); // Clear the input after successful parsing
      }, 800);

    } catch (error) {
      console.error('Error parsing input:', error);
      setMessage({ type: 'error', text: 'Failed to parse input. Please check format.' });
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700"
    >
      <h2 className="text-xl font-medium mb-2 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Quick Data Input</h2>
      
      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-4 border border-blue-100 dark:border-blue-800">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Format Guide</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Paste data in format: <span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">Name Contact SlotNumber PaidPrice Email Pin StartDate EndDate</span>
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          Example: <span className="font-mono">Dil Nawaz 3310389109 1 450 an9403911@gmail.com 9696 26-Jan-25 23-Feb-25</span>
        </p>
      </div>
      
      {message.text && (
        <div className={`p-4 mb-4 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="mb-4">
        <textarea
          value={batchInput}
          onChange={handleTextareaChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          placeholder="Paste formatted data here..."
        />
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={parseAndFillForm}
          disabled={isProcessing}
          className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors flex items-center"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              Parse Data & Fill Form
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
} 