import { initializeApp, getApps, getApp } from 'firebase/app';
import appletConfig from '../../firebase-applet-config.json';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Production configuration comes only from the user's own Firebase Web App.
// Do not ship the old AI Studio/project configuration.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey.trim().length > 0 &&
  firebaseConfig.projectId.trim().length > 0
);

// Initialize Firebase only once
const app = getApps().length > 0
  ? getApp()
  : initializeApp(isFirebaseConfigured ? firebaseConfig : {
      apiKey: 'sb-chat-unconfigured',
      projectId: 'sb-chat-unconfigured',
      appId: 'sb-chat-unconfigured',
    });

export const auth = getAuth(app);

// Use provisioned firestoreDatabaseId if configured
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable persistent authentication across browser sessions
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase Auth local persistence note:', err);
  });
}

// Test connection on boot
if (typeof window !== 'undefined' && isFirebaseConfigured) {
  getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase connectivity.');
    }
  });
}

export default app;
