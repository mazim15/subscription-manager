'use client';

import { useState } from 'react';

interface NetflixLoginProps {
  email: string;
}

export default function NetflixLoginComponent({ email }: NetflixLoginProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    console.log('Starting Netflix login process for:', email);
    try {
      setStatus('loading');
      setError(null);

      // Step 1: Get credentials
      const credentialsResponse = await fetch(`/api/netflix-credentials?email=${encodeURIComponent(email)}`);
      const credentialsData = await credentialsResponse.json();
      
      if (!credentialsResponse.ok) {
        throw new Error(credentialsData.error || 'Failed to retrieve credentials');
      }
      console.log('Credentials retrieved successfully');

      // Step 2: Initiate automated login
      const loginResponse = await fetch('/api/netflix-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentialsData.email,
          password: credentialsData.password,
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.error || 'Automation failed');
      }

      setStatus('idle');
      console.log('Netflix login automation completed successfully');
    } catch (error) {
      setStatus('error');
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Login automation error:', error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleLogin}
        disabled={status === 'loading'}
        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
          status === 'loading'
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700'
        } text-white`}
      >
        {status === 'loading' ? 'Logging in...' : 'Login to Netflix'}
      </button>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}