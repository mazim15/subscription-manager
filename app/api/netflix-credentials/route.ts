import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    console.log('Email being received in /api/netflix-credentials:', email);

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const accountsRef = collection(db, 'accounts');
    const q = query(accountsRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'No Netflix credentials found for this email' },
        { status: 404 }
      );
    }

    const account = querySnapshot.docs[0].data();
    console.log('Credentials found for email:', email);

    return NextResponse.json({
      email: account.email,
      password: account.password,
    });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}