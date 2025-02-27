// Create a new file with this path - this will ONLY be used on the server
// This file should be imported only in API routes or Server Actions

import 'server-only';
import admin from 'firebase-admin';

// Initialize Firebase Admin - this only happens on the server
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error);
      return null;
    }
  }
  return admin.apps[0];
}

const firebaseAdmin = initializeFirebaseAdmin();
const auth = firebaseAdmin ? admin.auth() : null;
const db = firebaseAdmin ? admin.firestore() : null;

export { auth, db, firebaseAdmin }; 