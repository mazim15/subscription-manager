import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { Payments } from "@/types";

export async function addPayment(payment: Omit<Payments, 'id'>) {
  try {
    console.log("Payment object:", payment);
    const docRef = await addDoc(collection(db, "payments"), payment);
    console.log("Document written with ID: ", docRef.id);

    // Update subscriber usage
    const subscriberUsageRef = doc(db, "subscriberUsages", payment.subscriberId);
    const subscriberUsageSnap = await getDoc(subscriberUsageRef);

    if (subscriberUsageSnap.exists()) {
      const subscriberUsageData = subscriberUsageSnap.data();
      const updatedTotalPayments = (subscriberUsageData.totalPayments || 0) + payment.amount;
      await updateDoc(subscriberUsageRef, { totalPayments: updatedTotalPayments });
    } else {
      // If subscriber usage document doesn't exist, create it
      await setDoc(doc(db, "subscriberUsages", payment.subscriberId), {
        subscriberId: payment.subscriberId,
        totalPayments: payment.amount,
      });
    }

    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    return null;
  }
}

export async function getPaymentsBySubscriptionId(subscriptionId: string): Promise<Payments[]> {
  try {
    const paymentsRef = collection(db, "payments");
    const q = query(paymentsRef, where("subscriptionId", "==", subscriptionId));
    const querySnapshot = await getDocs(q);
    const payments: Payments[] = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payments);
    });
    return payments;
  } catch (error) {
    console.error("Error getting payments: ", error);
    return [];
  }
}
