import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  where,
  Timestamp,
  updateDoc,
  getDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth } from '../firebase';
import { Subscription, Slot } from '../../types';

interface SubscriptionInput extends Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'paidPrice' | 'accountPrice' | 'paymentStatus'> {
    startDate: Date;
    endDate: Date;
    paidPrice: number;
    accountPrice: number;
    paymentStatus: 'paid' | 'unpaid' | 'overdue' | 'pending' | 'partial';
}

interface SubscriptionData extends Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'startDate' | 'endDate'> {
  startDate: Date;
  endDate: Date;
}

export const createSubscription = async (subscription: SubscriptionInput) => {
    if (!auth?.currentUser) {
        throw new Error('User not authenticated');
    }

    const { startDate, endDate, paymentStatus, paymentDueDate, ...rest } = subscription;

    if (typeof rest.paidPrice !== 'number' || isNaN(rest.paidPrice) || 
        typeof rest.accountPrice !== 'number' || isNaN(rest.accountPrice)) {
        throw new Error('Paid price and account price must be valid numbers.');
    }

    // Set payment due date to the start date by default if not provided
    const dueDate = paymentDueDate || startDate;
    
    // If dueDate is a Timestamp, convert it to a Date
    const dueDateAsDate = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate;
    
    console.log("Creating subscription with due date:", dueDateAsDate);

    // Add subscription with the new accountPrice field
    const docRef = await addDoc(collection(db, 'subscriptions'), {
        ...rest,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        paymentDueDate: Timestamp.fromDate(dueDateAsDate),
        paymentStatus: paymentStatus || 'unpaid',
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });

    // Update account slot
    const accountRef = doc(db, 'accounts', subscription.accountId);
    const accountDoc = await getDoc(accountRef);
    const account = accountDoc.data();

    if (account) {
      const updatedSlots = account.slots.map((slot: Slot) => {
        if (slot.id === subscription.slotId) {
          return {
            ...slot,
            isOccupied: true,
            currentSubscriber: subscription.subscriberId,
            expiryDate: Timestamp.fromDate(subscription.endDate),
          };
        }
        return slot;
      });

      console.log('Updating slot:', subscription.slotId, 'for account:', subscription.accountId);
      console.log('Current slots:', account.slots);

      await updateDoc(accountRef, { slots: updatedSlots });
    }

    // Update subscriber with subscription
    const subscriberRef = doc(db, 'subscribers', subscription.subscriberId);
    const subscriberDoc = await getDoc(subscriberRef);
    const subscriberData = subscriberDoc.data();

    if (subscriberData) {
      const updatedSubscriptions = [...(subscriberData.subscriptions || []), { id: docRef.id, status: 'active' }];
      await updateDoc(subscriberRef, { subscriptions: updatedSubscriptions });

      // Update subscriber usage
      const subscriberUsageRef = doc(db, "subscriberUsages", subscription.subscriberId);
      const subscriberUsageSnap = await getDoc(subscriberUsageRef);

      if (subscriberUsageSnap.exists()) {
        const subscriberUsageData = subscriberUsageSnap.data();
        const updatedTotalSubscriptions = (subscriberUsageData.totalSubscriptions || 0) + 1;
        const updatedTotalPayments = (subscriberUsageData.totalPayments || 0) + subscription.paidPrice;
        await updateDoc(subscriberUsageRef, { totalSubscriptions: updatedTotalSubscriptions, totalPayments: updatedTotalPayments });
      } else {
        // If subscriber usage document doesn't exist, create it
        await setDoc(doc(db, "subscriberUsages", subscription.subscriberId), {
          subscriberId: subscription.subscriberId,
          totalSubscriptions: 1,
          totalPayments: subscription.paidPrice,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    }

    localStorage.setItem('newSubscriptionCreated', 'true');
    return docRef.id;
};

export const getSubscriptions = async () => {
  const querySnapshot = await getDocs(collection(db, 'subscriptions'));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      accountId: data.accountId,
      subscriberId: data.subscriberId,
      slotId: data.slotId,
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
      paidPrice: data.paidPrice || 0,
      accountPrice: data.accountPrice || 0,
      status: data.status,
      paymentStatus: data.paymentStatus,
      notes: data.notes,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as Subscription;
  });
};

export const checkExpiringSubscriptions = async () => {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.setDate(now.getDate() + 30));
  
  const q = query(
    collection(db, 'subscriptions'),
    where('endDate', '<=', Timestamp.fromDate(thirtyDaysFromNow)),
    where('status', '==', 'active')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Subscription));
};

export const renewSubscription = async (subscriptionId: string) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
  const subscriptionDoc = await getDoc(subscriptionRef);
  const subscriptionData = subscriptionDoc.data() as SubscriptionData;

  if (subscriptionData) {
    type EndDateType = SubscriptionData['endDate'];
    const currentEndDate: Date = 'toDate' in subscriptionData.endDate ? (subscriptionData.endDate as any).toDate() : subscriptionData.endDate;
    const newStartDate = new Date(currentEndDate.getTime());
    newStartDate.setDate(currentEndDate.getDate() + 1);
    const newEndDate = new Date(newStartDate.setMonth(newStartDate.getMonth() + 1));

    const { accountId, slotId, subscriberId, paidPrice } = subscriptionData;

    // Add paymentDueDate to match the SubscriptionInput interface requirements
    await createSubscription({
      accountId,
      slotId,
      subscriberId,
      paidPrice,
      startDate: newStartDate,
      endDate: newEndDate,
      status: 'active',
      paymentStatus: 'unpaid',
      paymentDueDate: newStartDate, // Set payment due date to the start date
    });

    // Update account slot
    const accountRef = doc(db, 'accounts', accountId);
    const accountDoc = await getDoc(accountRef);
    const account = accountDoc.data();

    if (account) {
      const updatedSlots = account.slots.map((slot: Slot) => {
        if (slot.id === slotId) {
          return {
            ...slot,
            isOccupied: true,
            currentSubscriber: subscriberId,
            expiryDate: Timestamp.fromDate(newEndDate),
          };
        }
        return slot;
      });

      await updateDoc(accountRef, { slots: updatedSlots });
    }

    // Update subscriber's subscriptions array
    const subscriberRef = doc(db, 'subscribers', subscriptionData.subscriberId);
    const subscriberDoc = await getDoc(subscriberRef);
    const subscriberDataNew = subscriberDoc.data();

    if (subscriberDataNew) {
      const updatedSubscriptions = subscriberDataNew.subscriptions.filter((sub: any) => sub.id !== subscriptionId);
      await updateDoc(subscriberRef, { subscriptions: updatedSubscriptions });

      // Update subscriber usage
      const subscriberUsageRef = doc(db, "subscriberUsages", subscriptionData.subscriberId);
      const subscriberUsageSnap = await getDoc(subscriberUsageRef);

      if (subscriberUsageSnap.exists()) {
        const subscriberUsageData = subscriberUsageSnap.data();
        const updatedTotalSubscriptions = Math.max((subscriberUsageData.totalSubscriptions || 1) - 1, 0);
        await updateDoc(subscriberUsageRef, { totalSubscriptions: updatedTotalSubscriptions });
      }
    }
  }
};

export const deleteSubscription = async (subscriptionId: string) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
  const subscriptionDoc = await getDoc(subscriptionRef);
  const subscriptionData = subscriptionDoc.data();

  if (subscriptionData && subscriptionData.status === 'active') {
    await cancelSubscription(subscriptionId);
  }

  await deleteDoc(subscriptionRef);
};

export const cancelSubscription = async (subscriptionId: string) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
    const subscriptionDoc = await getDoc(subscriptionRef);
    
    if (!subscriptionDoc.exists()) {
      throw new Error('Subscription not found');
    }
    
    const subscriptionData = subscriptionDoc.data();
    const { accountId, slotId, subscriberId } = subscriptionData;
    
    // Update subscription status
    await updateDoc(subscriptionRef, {
      status: 'cancelled',
      updatedAt: Timestamp.now()
    });
    
    // Update account slot - keep track of last subscriber
    const accountRef = doc(db, 'accounts', accountId);
    const accountDoc = await getDoc(accountRef);
    
    if (accountDoc.exists()) {
      const accountData = accountDoc.data();
      const updatedSlots = accountData.slots.map((slot: any) => {
        if (slot.id === slotId) {
          return {
            ...slot,
            isOccupied: false,
            currentSubscriber: null,
            lastSubscriber: subscriberId, // Store the last subscriber ID
            expiryDate: null
          };
        }
        return slot;
      });
      
      await updateDoc(accountRef, { 
        slots: updatedSlots,
        updatedAt: Timestamp.now()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

export const updateSubscription = async (
    id: string, 
    startDate: Date, 
    endDate: Date, 
    paidPrice: number, 
    paymentStatus: 'paid' | 'unpaid',
    notes: string
) => {
    if (!auth?.currentUser) {
        throw new Error('User not authenticated');
    }

    try {
        const subscriptionRef = doc(db, 'subscriptions', id);
        await updateDoc(subscriptionRef, {
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
            paidPrice,
            paymentStatus,
            notes,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        throw error;
    }
};

export const getPaymentReminders = async () => {
  const now = new Date();
  
  // Get subscriptions where payment is due within 7 days
  const upcomingDueQuery = query(
    collection(db, 'subscriptions'),
    where('paymentDueDate', '<=', Timestamp.fromDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))),
    where('paymentDueDate', '>', Timestamp.fromDate(now)),
    where('paymentStatus', 'in', ['unpaid', 'partial', 'pending'])
  );
  
  // Get overdue subscriptions
  const overdueQuery = query(
    collection(db, 'subscriptions'),
    where('paymentDueDate', '<', Timestamp.fromDate(now)),
    where('paymentStatus', 'in', ['unpaid', 'partial', 'pending'])
  );
  
  const [upcomingSnapshot, overdueSnapshot] = await Promise.all([
    getDocs(upcomingDueQuery),
    getDocs(overdueQuery)
  ]);
  
  const upcomingPayments = upcomingSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      accountPrice: data.accountPrice || 0,
      paidPrice: data.paidPrice || 0,
      paymentDueDate: data.paymentDueDate,
      reminderType: 'upcoming'
    };
  });
  
  const overduePayments = overdueSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      accountPrice: data.accountPrice || 0,
      paidPrice: data.paidPrice || 0,
      paymentDueDate: data.paymentDueDate,
      reminderType: 'overdue',
      daysOverdue: Math.floor((now.getTime() - data.paymentDueDate.toDate().getTime()) / (24 * 60 * 60 * 1000))
    };
  });
  
  return [...upcomingPayments, ...overduePayments];
};

export const suspendSubscription = async (subscriptionId: string) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
  await updateDoc(subscriptionRef, {
    status: 'suspended',
    updatedAt: Timestamp.now(),
  });

  // Update account slot
  const subscriptionDoc = await getDoc(subscriptionRef);
  const subscriptionData = subscriptionDoc.data();

  if (subscriptionData) {
    // Update account slot
    const accountRef = doc(db, 'accounts', subscriptionData.accountId);
    const accountDoc = await getDoc(accountRef);
    const account = accountDoc.data();

    if (account) {
      const updatedSlots = account.slots.map((slot: Slot) =>
        slot.id === subscriptionData.slotId
          ? {
            ...slot,
            isSuspended: true,
            suspensionReason: 'payment_overdue',
          }
          : slot
      );

      await updateDoc(accountRef, { slots: updatedSlots });
    }

    // Update subscriber's subscriptions array
    const subscriberRef = doc(db, 'subscribers', subscriptionData.subscriberId);
    const subscriberDoc = await getDoc(subscriberRef);
    const subscriberData = subscriberDoc.data();

    if (subscriberData && subscriberData.subscriptions) {
      // Update the status of this subscription in the subscriber's array
      const updatedSubscriptions = subscriberData.subscriptions.map((sub: any) => {
        if (sub.id === subscriptionId) {
          return { ...sub, status: 'suspended' };
        }
        return sub;
      });
      
      await updateDoc(subscriberRef, { subscriptions: updatedSubscriptions });
    }
  }
};

export const handleSubscriptionExpiry = async (subscriptionId: string) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
    const subscriptionDoc = await getDoc(subscriptionRef);
    
    if (!subscriptionDoc.exists()) {
      throw new Error('Subscription not found');
    }
    
    const subscriptionData = subscriptionDoc.data();
    const { accountId, slotId, subscriberId } = subscriptionData;
    
    // Update subscription status
    await updateDoc(subscriptionRef, {
      status: 'expired',
      updatedAt: Timestamp.now()
    });
    
    // Update account slot - keep track of last subscriber
    const accountRef = doc(db, 'accounts', accountId);
    const accountDoc = await getDoc(accountRef);
    
    if (accountDoc.exists()) {
      const accountData = accountDoc.data();
      const updatedSlots = accountData.slots.map((slot: any) => {
        if (slot.id === slotId) {
          return {
            ...slot,
            isOccupied: false,
            currentSubscriber: null,
            lastSubscriber: subscriberId, // Store the last subscriber ID
            expiryDate: null
          };
        }
        return slot;
      });
      
      await updateDoc(accountRef, { 
        slots: updatedSlots,
        updatedAt: Timestamp.now()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error handling subscription expiry:', error);
    throw error;
  }
};
