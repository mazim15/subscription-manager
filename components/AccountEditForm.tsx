'use client';

import { useState, useEffect } from 'react';
import { getAccount, updateAccount } from '@/lib/db-operations';
import { notify } from '@/lib/notifications';

interface AccountEditFormProps {
  account: {
    id: string;
    email: string;
    password: string;
    slots: { id: string; pin: string; isOccupied: boolean }[];
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AccountEditForm({ account, onSuccess, onCancel }: AccountEditFormProps) {
  const [formData, setFormData] = useState({
    email: account.email,
    password: account.password,
    pin1: account.slots[0].pin,
    pin2: account.slots[1].pin,
    pin3: account.slots[2].pin,
    pin4: account.slots[3].pin,
    pin5: account.slots[4].pin,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const slots = [
      { id: 'slot-1', isOccupied: Boolean(account.slots[0].isOccupied), pin: formData.pin1 },
      { id: 'slot-2', isOccupied: Boolean(account.slots[1].isOccupied), pin: formData.pin2 },
      { id: 'slot-3', isOccupied: Boolean(account.slots[2].isOccupied), pin: formData.pin3 },
      { id: 'slot-4', isOccupied: Boolean(account.slots[3].isOccupied), pin: formData.pin4 },
      { id: 'slot-5', isOccupied: Boolean(account.slots[4].isOccupied), pin: formData.pin5 },
    ];

    try {
      const currentAccount = await getAccount(account.email);
      
      const updatedSlots = slots.map((newSlot, index) => {
        const currentSlot = currentAccount?.slots[index];
        return {
          ...newSlot,
          currentSubscriber: currentSlot?.currentSubscriber || null,
          lastSubscriber: currentSlot?.lastSubscriber || null,
          isOccupied: currentSlot?.isOccupied || false,
          expiryDate: currentSlot?.expiryDate || null
        };
      });

      await updateAccount(account.id, {
        email: formData.email,
        password: formData.password,
        slots: updatedSlots,
        accountTypeId: formData.accountTypeId
      });

      notify.success('Account updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating account:', error);
      notify.error('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md text-black"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md text-black"
          required
        />
      </div>

      <div>
        <label htmlFor="pin1" className="block text-sm font-medium mb-1">
          PIN 1
        </label>
        <input
          type="text"
          id="pin1"
          value={formData.pin1}
          onChange={(e) => setFormData(prev => ({ ...prev, pin1: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md text-black"
          required
        />
      </div>

      <div>
        <label htmlFor="pin2" className="block text-sm font-medium mb-1">
          PIN 2
        </label>
        <input
          type="text"
          id="pin2"
          value={formData.pin2}
          onChange={(e) => setFormData(prev => ({ ...prev, pin2: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md text-black"
          required
        />
      </div>

      <div>
        <label htmlFor="pin3" className="block text-sm font-medium mb-1">
          PIN 3
        </label>
        <input
          type="text"
          id="pin3"
          value={formData.pin3}
          onChange={(e) => setFormData(prev => ({ ...prev, pin3: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md text-black"
          required
        />
      </div>

      <div>
        <label htmlFor="pin4" className="block text-sm font-medium mb-1">
          PIN 4
        </label>
        <input
          type="text"
          id="pin4"
          value={formData.pin4}
          onChange={(e) => setFormData(prev => ({ ...prev, pin4: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md text-black"
          required
        />
      </div>

      <div>
        <label htmlFor="pin5" className="block text-sm font-medium mb-1">
          PIN 5
        </label>
        <input
          type="text"
          id="pin5"
          value={formData.pin5}
          onChange={(e) => setFormData(prev => ({ ...prev, pin5: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md text-black"
          required
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <div className="flex justify-between">
        <button
          type="submit"
          disabled={loading}
          className={`w-1/2 py-2 px-4 rounded-md text-white ${
            loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? 'Updating...' : 'Update Account'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-1/2 py-2 px-4 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
