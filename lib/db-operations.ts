import { collection, query, where, getDocs, Timestamp, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export * from './db-operations/accounts';
export * from './db-operations/subscribers';
export * from './db-operations/subscriptions';
export * from './db-operations/payments';
export * from './db-operations/usage';

/**
 * Get all subscriptions for a specific subscriber
 */
export const getSubscriptionsBySubscriberId = async (subscriberId: string) => {
  try {
    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(subscriptionsRef, where('subscriberId', '==', subscriberId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : data.endDate,
        paymentDueDate: data.paymentDueDate instanceof Timestamp ? data.paymentDueDate.toDate() : data.paymentDueDate
      };
    });
  } catch (error) {
    console.error('Error getting subscriptions by subscriber ID:', error);
    throw error;
  }
};

/**
 * Get a single account by ID or email
 */
export const getAccount = async (accountIdOrEmail: string) => {
  try {
    console.log(`Attempting to get account with ID or email: ${accountIdOrEmail}`);
    
    // First try to get by ID
    const accountRef = doc(db, 'accounts', accountIdOrEmail);
    const accountDoc = await getDoc(accountRef);
    
    if (accountDoc.exists()) {
      console.log(`Found account by ID: ${accountIdOrEmail}`);
      const data = accountDoc.data();
      return {
        id: accountDoc.id,
        email: data.email,
        password: data.password,
        slots: data.slots || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    }
    
    console.log(`Account not found by ID, trying email: ${accountIdOrEmail}`);
    
    // If not found by ID, try to find by email
    const accountsRef = collection(db, 'accounts');
    const q = query(accountsRef, where('email', '==', accountIdOrEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`Account not found by email: ${accountIdOrEmail}`);
      throw new Error(`Account not found: ${accountIdOrEmail}`);
    }
    
    console.log(`Found account by email: ${accountIdOrEmail}`);
    const accountData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      email: accountData.email,
      password: accountData.password,
      slots: accountData.slots || [],
      createdAt: accountData.createdAt,
      updatedAt: accountData.updatedAt,
    };
  } catch (error) {
    console.error('Error getting account:', error);
    throw error;
  }
};

/**
 * Update an account
 */
export const updateAccount = async (accountId: string, accountData: any) => {
  try {
    const accountRef = doc(db, 'accounts', accountId);
    await updateDoc(accountRef, {
      email: accountData.email,
      password: accountData.password,
      slots: accountData.slots,
      updatedAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};
