'use client';

import { useState } from 'react';
import PaymentReminders from '@/components/PaymentReminders';
import { notify } from '@/lib/notifications';

export default function PaymentsPage() {
  const handlePaymentSuccess = () => {
    notify.success('Payment recorded successfully');
  };

  const handlePaymentError = (error: string) => {
    notify.error(error || 'Failed to process payment');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold heading">Payment Management</h1>
        <p className="text-gray-600 dark:text-gray-300">Track and manage subscription payments</p>
      </div>
      
      <div className="space-y-6">
        <PaymentReminders 
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </div>
    </div>
  );
} 