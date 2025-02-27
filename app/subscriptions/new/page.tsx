'use client';
import { useState } from 'react';
import SubscriptionForm from '@/components/SubscriptionForm';
import { useRouter } from 'next/navigation';

export default function NewSubscriptionPage() {
  const router = useRouter();
  
  const handleSuccess = () => {
    router.push('/subscriptions');
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create New Subscription</h1>
      <SubscriptionForm onSuccess={handleSuccess} />
    </div>
  );
} 