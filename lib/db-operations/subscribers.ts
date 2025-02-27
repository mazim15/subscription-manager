import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  deleteDoc,
  Timestamp,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { auth } from '../firebase';
import { Subscriber, SubscriberUsage, Subscription } from '../../types';

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

    let docRef;
    try {
        docRef = await addDoc(collection(db, 'subscribers'), {
            ...subscriber,
            subscriptions: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error('Error adding subscriber:', error);
        return null;
    }

    // Create subscriber usage document
    await setDoc(doc(db, 'subscriberUsages', docRef.id), {
      subscriberId: docRef.id,
      totalSubscriptions: 0,
      totalPayments: 0,
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
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Subscriber;
  });
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

export const getSubscriber = async (subscriberId: string): Promise<Subscriber | null> => {
    try {
        const subscriberRef = doc(db, 'subscribers', subscriberId);
        const subscriberSnap = await getDoc(subscriberRef);

        if (subscriberSnap.exists()) {
            const data = subscriberSnap.data();
            const subscriber: Subscriber = {
                id: subscriberSnap.id,
                name: data.name,
                contact: data.contact,
                subscriptions: [],
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            } as Subscriber;

            // Fetch subscription details
            if (data.subscriptions && data.subscriptions.length > 0) {
                subscriber.subscriptions = await Promise.all(
                    data.subscriptions.map(async (sub: any) => {
                        const subscriptionDoc = await getDoc(doc(db, 'subscriptions', sub.id));
                        if (subscriptionDoc.exists()) {
                            const subscriptionData = subscriptionDoc.data();
                            return {
                                id: subscriptionDoc.id,
                                subscriberId: subscriptionData.subscriberId,
                                slotId: subscriptionData.slotId,
                                startDate: subscriptionData.startDate.toMillis(),
                                endDate: subscriptionData.endDate.toMillis(),
                                paidPrice: subscriptionData.paidPrice,
                                accountPrice: subscriptionData.accountPrice,
                                status: subscriptionData.status,
                                paymentStatus: subscriptionData.paymentStatus,
                                createdAt: subscriptionData.createdAt.toMillis(),
                                updatedAt: subscriptionData.updatedAt.toMillis(),
                            } as Subscription;
                        }
                        return null;
                    })
                );
                subscriber.subscriptions = subscriber.subscriptions.filter(s => s !== null) as Subscription[];
            }

            return subscriber;
        } else {
            console.log("Subscriber not found");
            return null;
        }
    } catch (error) {
        console.error("Error getting subscriber:", error);
        return null;
    }
};
