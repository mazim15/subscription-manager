import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  Timestamp,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { auth } from '../firebase';

export interface AccountType {
  id: string;
  name: string;
  slots: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const addAccountType = async (accountType: Omit<AccountType, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  const docRef = await addDoc(collection(db, 'accountTypes'), {
    name: accountType.name,
    slots: accountType.slots,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getAccountTypes = async (): Promise<AccountType[]> => {
  const querySnapshot = await getDocs(collection(db, 'accountTypes'));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      slots: data.slots,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as AccountType;
  });
};

export const deleteAccountType = async (id: string) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }
  
  await deleteDoc(doc(db, 'accountTypes', id));
};

export const updateAccountType = async (id: string, accountType: Partial<AccountType>) => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }
  
  const accountTypeRef = doc(db, 'accountTypes', id);
  await updateDoc(accountTypeRef, {
    ...accountType,
    updatedAt: Timestamp.now(),
  });
};

export const getAccountType = async (accountTypeId: string): Promise<AccountType | null> => {
  try {
    const accountTypeRef = doc(db, 'accountTypes', accountTypeId);
    const accountTypeSnap = await getDoc(accountTypeRef);
    
    if (accountTypeSnap.exists()) {
      const data = accountTypeSnap.data();
      return {
        id: accountTypeSnap.id,
        name: data.name,
        slots: data.slots,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as AccountType;
    }
    return null;
  } catch (error) {
    console.error('Error getting account type:', error);
    return null;
  }
}; 