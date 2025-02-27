// This file should never be imported directly on client-side components

// We'll only execute this code on the server
let auth = null;
let db = null;
let firebaseAdmin = null;

if (typeof window === 'undefined') {
  // Server-side only code
  const admin = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore } = require('firebase-admin/firestore');
  
  function initializeFirebaseAdmin() {
    if (!admin.getApps().length) {
      try {
        const app = admin.initializeApp({
          credential: admin.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        return app;
      } catch (error) {
        console.error('Firebase admin initialization error', error.stack);
        return null;
      }
    } else {
      return admin.getApps()[0];
    }
  }
  
  firebaseAdmin = initializeFirebaseAdmin();
  auth = firebaseAdmin ? getAuth(firebaseAdmin) : null;
  db = firebaseAdmin ? getFirestore(firebaseAdmin) : null;
}

export { auth, db, firebaseAdmin }; 