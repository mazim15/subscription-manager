import { Timestamp } from 'firebase/firestore';

export interface Account {
    id: string;
    email: string;
    password: string;
    slots: Slot[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
  
  export interface Slot {
    id: string;
    pin: string;
    isOccupied: boolean;
    currentSubscriber?: string;
    expiryDate?: Date;
  }
  
export interface Subscriber {
    id: string;
    name: string;
    contact: string;
    subscriptions: Subscription[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
  
export interface Subscription {
    id: string;
    accountId: string;
    slotId: string;
    subscriberId: string;
    startDate: Timestamp;
    endDate: Timestamp;
    paidPrice: number;
    status: 'active' | 'expired' | 'pending-renewal';
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
