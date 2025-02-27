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
