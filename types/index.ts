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
    email?: string;
    address?: string;
    subscriptions?: Subscription[];
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
    accountPrice: number;
    paymentDueDate: Timestamp;
    status: 'active' | 'expired' | 'pending-renewal' | 'suspended';
    paymentStatus: 'paid' | 'unpaid' | 'overdue' | 'pending' | 'partial' | 'free';
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }

export interface AccountUsage {
    id: string;
    accountId: string;
    activeSubscriptions: number;
    totalRevenue: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }

export interface SlotUsage {
    id: string;
    slotId: string;
    timesOccupied: number;
    totalRevenue: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }

export interface SubscriberUsage {
    id: string;
    subscriberId: string;
    totalSubscriptions: number;
    totalPayments: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }

export interface Payments {
    id?: string;
    subscriptionId: string;
    subscriberId: string;
    date: string;
    amount: number;
}

export interface SubscriberWithStats extends Subscriber {
  totalDue: number;
  totalPaid: number;
  outstandingBalance: number;
  subscriptionCount: number;
  activeSubscriptions: number;
  paymentScore: number;
}