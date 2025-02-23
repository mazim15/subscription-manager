import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

export async function GET() {
  try {
    const accountsRef = collection(db, 'accounts');
    const q = query(accountsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const accounts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    }));
    
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const now = Timestamp.now();
    
    const docRef = await addDoc(collection(db, 'accounts'), {
      email: data.email,
      password: data.password,
      createdAt: now,
      updatedAt: now
    });
    
    return NextResponse.json({
      id: docRef.id,
      email: data.email,
      password: data.password,
      createdAt: now.toDate(),
      updatedAt: now.toDate()
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
