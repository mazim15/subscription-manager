'use client';

import { useState } from 'react';
import SubscriberPaymentHistory from '@/components/SubscriberPaymentHistory';

interface SubscriberDetailsClientProps {
  subscriber: any;
}

export default function SubscriberDetailsClient({ subscriber }: SubscriberDetailsClientProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">Subscriber Details</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{subscriber.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Contact</p>
            <p className="font-medium">{subscriber.contact}</p>
          </div>
        </div>
      </div>
      
      {/* Payment History Component */}
      <SubscriberPaymentHistory 
        subscriberId={subscriber.id} 
        subscriberName={subscriber.name} 
      />
    </div>
  );
}
