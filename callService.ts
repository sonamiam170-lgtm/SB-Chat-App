import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { CallType } from '../types';

export interface CallRecord {
  id: string;
  callerId: string;
  calleeId: string;
  type: CallType;
  status: 'ringing' | 'accepted' | 'ended' | 'declined';
}

export const createCall = async (callerId: string, calleeId: string, type: CallType) => {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured.');
  const ref = await addDoc(collection(db, 'calls'), {
    callerId, calleeId, type, status: 'ringing', createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateCallStatus = async (callId: string, status: CallRecord['status']) => {
  if (!isFirebaseConfigured || !callId) return;
  await updateDoc(doc(db, 'calls', callId), { status, updatedAt: serverTimestamp() });
};

export const subscribeToIncomingCalls = (
  userId: string,
  onCall: (call: CallRecord) => void
): Unsubscribe => {
  if (!isFirebaseConfigured || !userId) return () => {};
  // A simple user-scoped inbox avoids a compound Firestore query and keeps rules straightforward.
  return onSnapshot(collection(db, 'incomingCalls', userId, 'items'), async (snap) => {
    for (const change of snap.docChanges()) {
      if (change.type !== 'added' && change.type !== 'modified') continue;
      const data = change.doc.data() as any;
      if (data.status !== 'ringing') continue;
      const callSnap = await getDoc(doc(db, 'calls', data.callId));
      if (!callSnap.exists()) continue;
      onCall({ id: callSnap.id, ...(callSnap.data() as Omit<CallRecord, 'id'>) });
    }
  });
};

export const mirrorIncomingCall = async (callId: string, calleeId: string) => {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, 'incomingCalls', calleeId, 'items', callId), {
    callId, status: 'ringing', createdAt: serverTimestamp(),
  });
};
