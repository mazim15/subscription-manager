'use client';
import { useState } from 'react';
import { addAccount } from '@/lib/db-operations';



interface AccountFormProps {
  onSuccess?: () => void;
}

export default function AccountForm({ onSuccess }: AccountFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slots, setSlots] = useState(
    Array(5).fill({ pin: '', isOccupied: false })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addAccount({
        email,
        password,
        slots: slots.map((slot, index) => ({
          id: `slot-${index + 1}`,
          ...slot
        })),
      });
      
      setEmail('');
      setPassword('');
      setSlots(Array(5).fill({ pin: '', isOccupied: false }));
      onSuccess?.();
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Slots</h3>
          <div className="space-y-2">
            {slots.map((slot, index) => (
              <div key={index}>
                <label className="block text-sm text-gray-500">Slot {index + 1} PIN</label>
                <input
                  type="text"
                  value={slot.pin}
                  onChange={(e) => {
                    const newSlots = [...slots];
                    newSlots[index] = { ...slot, pin: e.target.value };
                    setSlots(newSlots);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Add Account
        </button>
      </div>
    </form>
  );
}
