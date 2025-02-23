import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const { email, password, slots } = data;
    const accountId = (await params).id;
    const accountRef = doc(db, 'accounts', accountId);
    const now = Timestamp.now();

    await updateDoc(accountRef, {
      email: email,
      password: password,
      slots: slots,
      updatedAt: now
    });

    return NextResponse.json({
      id: accountId,
      email: email,
      password: password,
      slots: slots,
      createdAt: now.toDate(),
      updatedAt: now.toDate()
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}
