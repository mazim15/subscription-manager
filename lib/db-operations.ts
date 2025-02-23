import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth } from './firebase';
import { Account, Slot, Subscriber, Subscription } from '../types';

export const addAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  const docRef = await addDoc(collection(db, 'accounts'), {
    email: account.email,
    password: account.password,
    slots: account.slots,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getAccounts = async () => {
  const querySnapshot = await getDocs(collection(db, 'accounts'));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      password: data.password,
      slots: data.slots || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Account
  });
};

export const addSubscriber = async (subscriber: Omit<Subscriber, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  // Check for duplicates
  const q = query(
    collection(db, 'subscribers'),
    where('name', '==', subscriber.name),
    where('contact', '==', subscriber.contact)
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    throw new Error('Subscriber with this name and contact already exists');
  }

  const docRef = await addDoc(collection(db, 'subscribers'), {
    ...subscriber,
    subscriptions: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getSubscribers = async () => {
  const querySnapshot = await getDocs(collection(db, 'subscribers'));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      contact: data.contact,
      subscriptions: data.subscriptions || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Subscriber;
  });
};

interface SubscriptionInput extends Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'paidPrice'> {
  startDate: Date;
  endDate: Date;
  paidPrice: number;
}

export const createSubscription = async (subscription: SubscriptionInput) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  const { startDate, endDate, ...rest } = subscription;

  if (typeof rest.paidPrice !== 'number' || isNaN(rest.paidPrice)) {
    throw new Error('Paid price must be a valid number.');
  }

  // Add subscription
  const docRef = await addDoc(collection(db, 'subscriptions'), {
    ...rest,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    status: 'active',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

    // Update subscriber's subscriptions array
    const subscriberRef = doc(db, 'subscribers', subscription.subscriberId);
    const subscriberDoc = await getDoc(subscriberRef);
    const subscriberData = subscriberDoc.data();

    if (subscriberData && subscriberData.subscriptions) {
      const updatedSubscriptions = [...subscriberData.subscriptions, docRef.id];
      await updateDoc(subscriberRef, { subscriptions: updatedSubscriptions });
    }

  // Update account slot
  const accountRef = doc(db, 'accounts', subscription.accountId);
  const accountDoc = await getDoc(accountRef);
  const account = accountDoc.data();

  if (account) {
    const updatedSlots = account.slots.map((slot: Slot) =>
      slot.id === subscription.slotId
        ? {
          ...slot,
          isOccupied: true,
          currentSubscriber: subscription.subscriberId,
          expiryDate: Timestamp.fromDate(endDate),
        }
        : slot
    );

    await updateDoc(accountRef, { slots: updatedSlots });
  }

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
      startDate: data.startDate.toDate(), // Convert to Date
      endDate: data.endDate.toDate(), // Convert to Date
      paidPrice: data.paidPrice,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
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

interface SubscriptionData extends Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'startDate' | 'endDate'> {
  startDate: Date;
  endDate: Date;
}

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

    // Add status: 'active' here
    await createSubscription({
      accountId,
      slotId,
      subscriberId,
      paidPrice,
      startDate: newStartDate,
      endDate: newEndDate,
      status: 'active',
    });
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

    // Update account slot
    //const subscriptionDoc = await getDoc(subscriptionRef);
    //const subscriptionData = subscriptionDoc.data();

    if (subscriptionData) {
      const accountRef = doc(db, 'accounts', subscriptionData.accountId);
      const accountDoc = await getDoc(accountRef);
      const account = accountDoc.data();

      if (account) {
        const updatedSlots = account.slots.map((slot: Slot) => {
          if (slot.id === subscriptionData.slotId) {
            // Check if there's another active subscription using the same slot
            const isActive = account.slots.some(
              (otherSlot: Slot) =>
                otherSlot.id === slot.id &&
                otherSlot.isOccupied &&
                otherSlot.currentSubscriber !== null
            );

            if (!isActive) {
              return {
                ...slot,
                isOccupied: false,
                currentSubscriber: null,
                expiryDate: null,
              };
            }
          }
          return slot;
        });

        await updateDoc(accountRef, { slots: updatedSlots });
      }
    }

  await deleteDoc(subscriptionRef);
};

export const cancelSubscription = async (subscriptionId: string) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
  await updateDoc(subscriptionRef, {
    status: 'cancelled',
    updatedAt: Timestamp.now(),
  });

  // Update account slot
  const subscriptionDoc = await getDoc(subscriptionRef);
  const subscriptionData = subscriptionDoc.data();

  if (subscriptionData) {
    const accountRef = doc(db, 'accounts', subscriptionData.accountId);
    const accountDoc = await getDoc(accountRef);
    const account = accountDoc.data();

    if (account) {
      const updatedSlots = account.slots.map((slot: Slot) =>
        slot.id === subscriptionData.slotId
          ? {
            ...slot,
            isOccupied: false,
            currentSubscriber: null,
            expiryDate: null,
          }
          : slot
      );

      await updateDoc(accountRef, { slots: updatedSlots });
    }
  }
};

export const deleteSubscriber = async (subscriberId: string) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  // Check for active subscriptions
  const q = query(
    collection(db, 'subscriptions'),
    where('subscriberId', '==', subscriberId),
    where('status', '==', 'active')
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    throw new Error('Subscriber has active subscriptions and cannot be deleted');
  }

  const subscriberRef = doc(db, 'subscribers', subscriberId);
  await deleteDoc(subscriberRef);
};

export const deleteAccount = async (accountId: string) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  // Check for active subscriptions
  const q = query(
    collection(db, 'subscriptions'),
    where('accountId', '==', accountId),
    where('status', '==', 'active')
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    throw new Error('Account has active subscriptions and cannot be deleted');
  }

  const accountRef = doc(db, 'accounts', accountId);
  await deleteDoc(accountRef);
};
