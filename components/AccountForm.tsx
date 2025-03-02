'use client';

import { useState, useEffect } from 'react';
import { getAccountTypes, AccountType } from '@/lib/db-operations/accountTypes';
import { notify } from '@/lib/notifications';

interface AccountFormProps {
  onSuccess: () => void;
}

export default function AccountForm({ onSuccess }: AccountFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    pin1: '',
    pin2: '',
    pin3: '',
    pin4: '',
    pin5: '',
    accountTypeId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);
  const [customSlotCount, setCustomSlotCount] = useState(5);
  const [pinInputs, setPinInputs] = useState<string[]>(Array(5).fill(''));

  useEffect(() => {
    const fetchAccountTypes = async () => {
      try {
        const types = await getAccountTypes();
        setAccountTypes(types);
      } catch (error) {
        console.error('Error fetching account types:', error);
      }
    };
    
    fetchAccountTypes();
  }, []);

  const handleAccountTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const typeId = e.target.value;
    setFormData(prev => ({ ...prev, accountTypeId: typeId }));
    
    if (typeId === 'custom') {
      setSelectedAccountType(null);
      // Keep current pin inputs
    } else {
      const selectedType = accountTypes.find(type => type.id === typeId);
      setSelectedAccountType(selectedType || null);
      
      if (selectedType) {
        // Update pin inputs based on selected account type
        const newSlotCount = selectedType.slots;
        setCustomSlotCount(newSlotCount);
        setPinInputs(prev => {
          const newPins = [...prev];
          // Resize array to match new slot count
          return newPins.slice(0, newSlotCount).concat(Array(Math.max(0, newSlotCount - prev.length)).fill(''));
        });
      }
    }
  };

  const handlePinChange = (index: number, value: string) => {
    const newPins = [...pinInputs];
    newPins[index] = value;
    setPinInputs(newPins);
  };

  const handleCustomSlotCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value) || 1;
    const newCount = Math.max(1, Math.min(10, count)); // Limit between 1-10 slots
    setCustomSlotCount(newCount);
    
    // Resize pin inputs array
    setPinInputs(prev => {
      const newPins = [...prev];
      return newPins.slice(0, newCount).concat(Array(Math.max(0, newCount - prev.length)).fill(''));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Create slots based on selected account type or custom count
    const slotCount = selectedAccountType ? selectedAccountType.slots : customSlotCount;
    const slots = Array(slotCount).fill(null).map((_, index) => ({
      id: `slot-${index + 1}`,
      isOccupied: false,
      pin: pinInputs[index] || '',
    }));

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          slots: slots,
          accountTypeId: formData.accountTypeId === 'custom' ? null : formData.accountTypeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      setFormData({ 
        email: '', 
        password: '', 
        pin1: '', 
        pin2: '', 
        pin3: '', 
        pin4: '', 
        pin5: '',
        accountTypeId: '',
      });
      setPinInputs(Array(5).fill(''));
      setSelectedAccountType(null);
      setCustomSlotCount(5);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding account:', error);
      notify.error(error.message || 'Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  // Render pin input fields based on slot count
  const renderPinInputs = () => {
    const count = selectedAccountType ? selectedAccountType.slots : customSlotCount;
    
    return Array(count).fill(null).map((_, index) => (
      <div key={`pin-${index + 1}`} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          PIN for Slot {index + 1}
        </label>
        <input
          type="text"
          value={pinInputs[index] || ''}
          onChange={(e) => handlePinChange(index, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          placeholder={`PIN for slot ${index + 1}`}
        />
      </div>
    ));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 mb-6">
      <h3 className="text-xl font-medium mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
        Add New Account
      </h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>

        <div>
          <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Account Type
          </label>
          <select
            value={formData.accountTypeId}
            onChange={handleAccountTypeChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select Account Type</option>
            {accountTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.slots} slots)
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </div>

        {formData.accountTypeId === 'custom' && (
          <div>
            <label htmlFor="customSlotCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Number of Slots (1-10)
            </label>
            <input
              type="number"
              id="customSlotCount"
              value={customSlotCount}
              onChange={handleCustomSlotCountChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              min="1"
              max="10"
            />
          </div>
        )}

        {renderPinInputs()}

        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary inline-flex justify-center items-center mt-4"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </div>
    </form>
  );
}
