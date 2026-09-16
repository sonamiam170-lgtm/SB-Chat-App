import { collection, doc, onSnapshot, orderBy, query, setDoc, where, Unsubscribe } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { UserStatusStory } from '../types';

export const subscribeToStatuses = (onUpdate: (items: UserStatusStory[]) => void): Unsubscribe => {
  if (!isFirebaseConfigured) { onUpdate([]); return () => {}; }
  const q = query(collection(db, 'statuses'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snap => {
    const now = Date.now();
    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<UserStatusStory, 'id'>) }))
      .filter(s => now - Number(s.timestamp || 0) < 24 * 60 * 60 * 1000);
    onUpdate(items);
  }, () => onUpdate([]));
};

export const publishStatus = async (status: UserStatusStory) => {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured.');
  await setDoc(doc(db, 'statuses', status.id), status);
};
