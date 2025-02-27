'use client';

import { useState } from 'react';
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const slots = [
      { id: 'slot-1', isOccupied: false, pin: formData.pin1 },
      { id: 'slot-2', isOccupied: false, pin: formData.pin2 },
      { id: 'slot-3', isOccupied: false, pin: formData.pin3 },
      { id: 'slot-4', isOccupied: false, pin: formData.pin4 },
      { id: 'slot-5', isOccupied: false, pin: formData.pin5 },
    ];

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      setFormData({ email: '', password: '', pin1: '', pin2: '', pin3: '', pin4: '', pin5: '' });
      onSuccess();
    } catch (error: any) {
      console.error('Error adding account:', error);
      notify.error(error.message || 'Failed to add account');
    } finally {
      setLoading(false);
    }
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
          <label htmlFor="pin1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            PIN 1
          </label>
          <input
            type="text"
            id="pin1"
            value={formData.pin1}
            onChange={(e) => setFormData(prev => ({ ...prev, pin1: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>

        <div>
          <label htmlFor="pin2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            PIN 2
          </label>
          <input
            type="text"
            id="pin2"
            value={formData.pin2}
            onChange={(e) => setFormData(prev => ({ ...prev, pin2: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>

        <div>
          <label htmlFor="pin3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            PIN 3
          </label>
          <input
            type="text"
            id="pin3"
            value={formData.pin3}
            onChange={(e) => setFormData(prev => ({ ...prev, pin3: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>

        <div>
          <label htmlFor="pin4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            PIN 4
          </label>
          <input
            type="text"
            id="pin4"
            value={formData.pin4}
            onChange={(e) => setFormData(prev => ({ ...prev, pin4: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>

        <div>
          <label htmlFor="pin5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            PIN 5
          </label>
          <input
            type="text"
            id="pin5"
            value={formData.pin5}
            onChange={(e) => setFormData(prev => ({ ...prev, pin5: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200"
            required
          />
        </div>

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
