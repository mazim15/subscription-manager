'use client';

import { useState } from 'react';

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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
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
          className="w-full px-3 py-2 border rounded-md"
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
          className="w-full px-3 py-2 border rounded-md"
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
          className="w-full px-3 py-2 border rounded-md"
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
          className="w-full px-3 py-2 border rounded-md"
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
          className="w-full px-3 py-2 border rounded-md"
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
          className="w-full px-3 py-2 border rounded-md"
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
          className="w-full px-3 py-2 border rounded-md"
          required
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 px-4 rounded-md text-white ${
          loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {loading ? 'Creating...' : 'Create Account'}
      </button>
    </form>
  );
}
