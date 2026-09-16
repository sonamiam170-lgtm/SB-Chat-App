import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, isFirebaseConfigured } from '../lib/firebase';
import { User } from '../types';

export interface RegisterParams {
  name: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
}

export interface LoginParams {
  loginIdentifier: string; // email or @username
  password: string;
}

// Convert Firestore document to app User type
export const mapDocToUser = (id: string, data: Record<string, any>): User => {
  return {
    id,
    name: data.name || 'Anonymous',
    username: data.username || id.slice(0, 8),
    email: data.email || '',
    phone: data.phone || '',
    avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.username || id}`,
    bio: data.bio || 'Hey there! I am using SB Messenger.',
    isVerified: Boolean(data.isVerified),
    isOnline: Boolean(data.isOnline),
    lastSeen: data.lastSeen ? (typeof data.lastSeen === 'string' ? data.lastSeen : 'Active recently') : undefined,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    isLocked: Boolean(data.isLocked),
  };
};

/**
 * Check if a username is already taken in Firestore
 */
export const checkUsernameAvailable = async (username: string): Promise<boolean> => {
  if (!isFirebaseConfigured) return true;
  const clean = username.trim().replace('@', '').toLowerCase();
  if (!clean) return false;

  const usernameRef = doc(db, 'usernames', clean);
  const snap = await getDoc(usernameRef);
  return !snap.exists();
};

/**
 * Upload an avatar image (base64 Data URL) to Firebase Storage
 * Falls back to returning the data URL if storage upload is unavailable.
 */
export const uploadAvatarToStorage = async (uid: string, dataUrl: string): Promise<string> => {
  if (!isFirebaseConfigured || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  try {
    const avatarRef = ref(storage, `avatars/${uid}_${Date.now()}.jpg`);
    await uploadString(avatarRef, dataUrl, 'data_url');
    const downloadUrl = await getDownloadURL(avatarRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage upload notice (using direct photo data):', err);
    return dataUrl;
  }
};

/**
 * Register a new user with Email, Password, Name, Username and Photo
 */
export const registerUser = async (params: RegisterParams): Promise<User> => {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not yet configured. Please provide your Firebase Web credentials in the environment settings.'
    );
  }

  const cleanName = params.name.trim();
  const cleanUsername = params.username.trim().replace('@', '').toLowerCase();
  const cleanEmail = params.email.trim().toLowerCase();

  if (!cleanName) throw new Error('Please enter your full name.');
  if (cleanUsername.length < 2) throw new Error('Username must be at least 2 characters.');
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please enter a valid email address.');
  if (params.password.length < 6) throw new Error('Password must be at least 6 characters.');

  // Check username availability in Firestore
  const isAvailable = await checkUsernameAvailable(cleanUsername);
  if (!isAvailable) {
    throw new Error(`The username @${cleanUsername} is already taken. Please choose another.`);
  }

  // 1. Create Firebase Auth account
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
  const fbUser = userCredential.user;

  // 2. Upload avatar if provided, otherwise generate clean dicebear
  let finalAvatarUrl =
    params.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

  if (params.avatar && params.avatar.startsWith('data:')) {
    finalAvatarUrl = await uploadAvatarToStorage(fbUser.uid, params.avatar);
  }

  // 3. Update Firebase Auth Profile
  await updateProfile(fbUser, {
    displayName: cleanName,
    photoURL: finalAvatarUrl,
  });

  const newUser: User = {
    id: fbUser.uid,
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    avatar: finalAvatarUrl,
    bio: params.bio?.trim() || 'Hey there! I am using SB Messenger.',
    isVerified: false,
    isOnline: true,
    createdAt: Date.now(),
    isLocked: false,
  };

  // 4. Save User record in Firestore `users/{uid}`
  await setDoc(doc(db, 'users', fbUser.uid), {
    name: newUser.name,
    username: newUser.username,
    email: newUser.email,
    avatar: newUser.avatar,
    bio: newUser.bio,
    isVerified: false,
    isOnline: true,
    createdAt: Date.now(),
    lastSeen: 'Just now',
    isLocked: false,
  });

  // 5. Reserve username in `usernames/{username}`
  await setDoc(doc(db, 'usernames', cleanUsername), {
    uid: fbUser.uid,
    email: cleanEmail,
    createdAt: Date.now(),
  });

  return newUser;
};

/**
 * Log in using either an Email address OR a @username + Password
 */
export const loginUser = async (params: LoginParams): Promise<User> => {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not yet configured. Please provide your Firebase Web credentials in the environment settings.'
    );
  }

  const identifier = params.loginIdentifier.trim();
  const password = params.password;

  if (!identifier) throw new Error('Please enter your email or username.');
  if (!password) throw new Error('Please enter your password.');

  let resolvedEmail = identifier.toLowerCase();

  // If user entered a username instead of an email address
  if (!identifier.includes('@') || !identifier.includes('.')) {
    const cleanUsername = identifier.replace('@', '').toLowerCase();
    const usernameDoc = await getDoc(doc(db, 'usernames', cleanUsername));

    if (usernameDoc.exists() && usernameDoc.data()?.email) {
      resolvedEmail = usernameDoc.data().email;
    } else {
      // Fallback: search users collection by username
      const q = query(
        collection(db, 'users'),
        where('username', '==', cleanUsername)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        resolvedEmail = querySnap.docs[0].data().email;
      } else {
        throw new Error(`No account found with username @${cleanUsername}`);
      }
    }
  }

  // 1. Authenticate with Firebase
  const userCredential = await signInWithEmailAndPassword(auth, resolvedEmail, password);
  const fbUser = userCredential.user;

  // 2. Fetch User profile from Firestore
  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    // If profile document does not exist yet, build one from auth details
    const fallbackUser: User = {
      id: fbUser.uid,
      name: fbUser.displayName || 'SB Messenger User',
      username: fbUser.email ? fbUser.email.split('@')[0] : `user_${fbUser.uid.slice(0, 6)}`,
      email: fbUser.email || '',
      avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      bio: 'Hey there! I am using SB Messenger.',
      isVerified: false,
      isOnline: true,
      createdAt: Date.now(),
      isLocked: false,
    };
    await setDoc(userDocRef, fallbackUser);
    return fallbackUser;
  }

  const userData = userDocSnap.data();

  // 3. Security Check: Locked or blocked account verification
  if (userData.isLocked || userData.isBlockedAccount) {
    await signOut(auth);
    throw new Error('This account has been locked or suspended by administrator.');
  }

  // 4. Mark online in Firestore
  await updateDoc(userDocRef, {
    isOnline: true,
    lastSeen: 'Just now',
  }).catch(() => {});

  return mapDocToUser(fbUser.uid, userData);
};

/**
 * Sign out user completely
 */
export const logoutUser = async (uid?: string): Promise<void> => {
  if (uid && isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isOnline: false,
        lastSeen: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {}
  }
  await signOut(auth);
};

/**
 * Subscribe to Firebase Auth state changes and real-time Firestore profile updates
 */
export const subscribeToAuth = (
  onUserChange: (user: User | null, loading: boolean) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    onUserChange(null, false);
    return () => {};
  }

  let unsubscribeUserDoc: (() => void) | null = null;

  const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (unsubscribeUserDoc) {
      unsubscribeUserDoc();
      unsubscribeUserDoc = null;
    }

    if (!fbUser) {
      onUserChange(null, false);
      return;
    }

    // Subscribe to the real-time user document in Firestore
    const userDocRef = doc(db, 'users', fbUser.uid);

    unsubscribeUserDoc = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          // If no doc yet, provide populated user from auth
          const basicUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || 'SB Messenger User',
            username: fbUser.email ? fbUser.email.split('@')[0] : `user_${fbUser.uid.slice(0, 6)}`,
            email: fbUser.email || '',
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
            bio: 'Hey there! I am using SB Messenger.',
            isVerified: false,
            isOnline: true,
            createdAt: Date.now(),
            isLocked: false,
          };
          onUserChange(basicUser, false);
          return;
        }

        const data = docSnap.data();

        // If locked, immediately sign out
        if (data.isLocked || data.isBlockedAccount) {
          signOut(auth);
          onUserChange(null, false);
          return;
        }

        const user = mapDocToUser(fbUser.uid, data);
        onUserChange(user, false);
      },
      (error) => {
        console.error('Firestore user snapshot error:', error);
        // Fallback user from auth token
        onUserChange(
          {
            id: fbUser.uid,
            name: fbUser.displayName || 'User',
            username: fbUser.email ? fbUser.email.split('@')[0] : 'user',
            email: fbUser.email || '',
            avatar: fbUser.photoURL || '',
            isOnline: true,
            createdAt: Date.now(),
          },
          false
        );
      }
    );
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeUserDoc) unsubscribeUserDoc();
  };
};

/**
 * Format Firebase Auth error codes into human-friendly messages
 */
export const formatFirebaseError = (error: any): string => {
  if (!error) return 'An unexpected error occurred.';
  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please log in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in your Firebase Console.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This account has been disabled or locked by an administrator.';
    case 'auth/user-not-found':
      return 'No account found with this email or username. Please check or sign up.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email/username or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Access to this account is temporarily disabled. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      return message.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim() ||
        'Authentication failed. Please verify your credentials.';
  }
};
