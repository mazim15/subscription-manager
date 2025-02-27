import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { AccountUsage, SlotUsage, SubscriberUsage } from "@/types";

// Account Usage
export const getAccountUsage = async (accountId: string): Promise<AccountUsage | null> => {
  try {
    const accountUsageRef = doc(db, "accountUsages", accountId);
    const accountUsageSnap = await getDoc(accountUsageRef);

    if (accountUsageSnap.exists()) {
      return {
        id: accountUsageSnap.id,
        ...accountUsageSnap.data(),
      } as AccountUsage;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting account usage:", error);
    return null;
  }
};

export const setAccountUsage = async (accountId: string, accountUsage: Omit<AccountUsage, "id">): Promise<void> => {
  try {
    await setDoc(doc(db, "accountUsages", accountId), accountUsage);
  } catch (error) {
    console.error("Error setting account usage:", error);
  }
};

export const updateAccountUsage = async (accountId: string, updates: Partial<Omit<AccountUsage, "id">>): Promise<void> => {
  try {
    const accountUsageRef = doc(db, "accountUsages", accountId);
    await updateDoc(accountUsageRef, updates);
  } catch (error) {
    console.error("Error updating account usage:", error);
  }
};

// Slot Usage
export const getSlotUsage = async (slotId: string): Promise<SlotUsage | null> => {
  try {
    const slotUsageRef = doc(db, "slotUsages", slotId);
    const slotUsageSnap = await getDoc(slotUsageRef);

    if (slotUsageSnap.exists()) {
      return {
        id: slotUsageSnap.id,
        ...slotUsageSnap.data(),
      } as SlotUsage;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting slot usage:", error);
    return null;
  }
};

export const setSlotUsage = async (slotId: string, slotUsage: Omit<SlotUsage, "id">): Promise<void> => {
  try {
    await setDoc(doc(db, "slotUsages", slotId), slotUsage);
  } catch (error) {
    console.error("Error setting slot usage:", error);
  }
};

export const updateSlotUsage = async (slotId: string, updates: Partial<Omit<SlotUsage, "id">>): Promise<void> => {
  try {
    const slotUsageRef = doc(db, "slotUsages", slotId);
    await updateDoc(slotUsageRef, updates);
  } catch (error) {
    console.error("Error updating slot usage:", error);
  }
};

// Subscriber Usage
export const getSubscriberUsage = async (subscriberId: string): Promise<SubscriberUsage | null> => {
  try {
    const subscriberUsageRef = doc(db, "subscriberUsages", subscriberId);
    const subscriberUsageSnap = await getDoc(subscriberUsageRef);

    if (subscriberUsageSnap.exists()) {
      return {
        id: subscriberUsageSnap.id,
        ...subscriberUsageSnap.data(),
      } as SubscriberUsage;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting subscriber usage:", error);
    return null;
  }
};

export const setSubscriberUsage = async (subscriberId: string, subscriberUsage: Omit<SubscriberUsage, "id">): Promise<void> => {
  try {
    await setDoc(doc(db, "subscriberUsages", subscriberId), subscriberUsage);
  } catch (error) {
    console.error("Error setting subscriber usage:", error);
  }
};

export const updateSubscriberUsage = async (subscriberId: string, updates: Partial<Omit<SubscriberUsage, "id">>): Promise<void> => {
  try {
    const subscriberUsageRef = doc(db, "subscriberUsages", subscriberId);
    await updateDoc(subscriberUsageRef, updates);
  } catch (error) {
    console.error("Error updating subscriber usage:", error);
  }
};
