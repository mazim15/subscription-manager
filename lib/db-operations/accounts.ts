import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  where,
  deleteDoc,
  Timestamp,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { auth } from '../firebase';
import { Account } from '../../types';

export const addAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  const docRef = await addDoc(collection(db, 'accounts'), {
    email: account.email,
    password: account.password,
    slots: account.slots,
    accountTypeId: account.accountTypeId || null,
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
      accountTypeId: data.accountTypeId || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Account
  });
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

export const updateAccount = async (accountId: string, accountData: Partial<Account>) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const accountRef = doc(db, 'accounts', accountId);
    const currentAccountDoc = await getDoc(accountRef);
    
    if (!currentAccountDoc.exists()) {
      throw new Error('Account not found');
    }

    const currentAccount = currentAccountDoc.data();

    // Ensure slots maintain their subscriber information
    const updatedSlots = accountData.slots?.map((newSlot, index) => {
      const currentSlot = currentAccount.slots[index];
      return {
        ...newSlot,
        // Preserve all subscriber-related fields
        currentSubscriber: currentSlot?.currentSubscriber || null,
        lastSubscriber: currentSlot?.lastSubscriber || null,
        isOccupied: currentSlot?.isOccupied || false,
        expiryDate: currentSlot?.expiryDate || null,
        isSuspended: currentSlot?.isSuspended || false,
        suspensionReason: currentSlot?.suspensionReason || null
      };
    });

    await updateDoc(accountRef, {
      ...accountData,
      slots: updatedSlots || currentAccount.slots,
      updatedAt: Timestamp.now()
    });

    return true;
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};
