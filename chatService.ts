import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limitToLast,
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { User, Chat, Message, VoiceNote, MessageReplyInfo, MessageStatus } from '../types';
import { mapDocToUser } from './authService';

/**
 * Generate a deterministic conversation ID for two users (UID_A and UID_B sorted alphabetically)
 */
export const getDeterministicChatId = (userAId: string, userBId: string): string => {
  const sorted = [userAId, userBId].sort();
  return `chat_${sorted[0]}_${sorted[1]}`;
};

/**
 * Format relative last seen string
 */
export const formatLastSeen = (timestamp: number | string | undefined): string => {
  if (!timestamp) return 'Offline';
  if (typeof timestamp === 'string') return timestamp;
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/**
 * Get or create a 1-to-1 conversation in Firestore
 */
export const getOrCreateConversation = async (
  currentUser: User,
  targetUser: User
): Promise<Chat> => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured.');
  }

  const chatId = getDeterministicChatId(currentUser.id, targetUser.id);
  const chatRef = doc(db, 'conversations', chatId);
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    const data = chatSnap.data();
    return {
      id: chatId,
      participants: data.participants || [currentUser.id, targetUser.id],
      lastMessage: data.lastMessage || undefined,
      updatedAt: data.updatedAt || Date.now(),
      unreadCount: data.unreadCount?.[currentUser.id] || 0,
      isPinned: Boolean(data.isPinned?.[currentUser.id]),
      isMuted: Boolean(data.isMuted?.[currentUser.id]),
      disappearingTimer: data.disappearingTimer || 'off',
      customWallpaper: data.customWallpaper || 'doodle',
    };
  }

  // Create new conversation
  const newChatData = {
    id: chatId,
    participants: [currentUser.id, targetUser.id],
    participantDetails: {
      [currentUser.id]: {
        name: currentUser.name,
        username: currentUser.username,
        avatar: currentUser.avatar || '',
      },
      [targetUser.id]: {
        name: targetUser.name,
        username: targetUser.username,
        avatar: targetUser.avatar || '',
      },
    },
    updatedAt: Date.now(),
    unreadCount: {
      [currentUser.id]: 0,
      [targetUser.id]: 0,
    },
    typing: {},
    disappearingTimer: 'off',
    customWallpaper: 'doodle',
  };

  await setDoc(chatRef, newChatData);

  return {
    id: chatId,
    participants: [currentUser.id, targetUser.id],
    updatedAt: Date.now(),
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    disappearingTimer: 'off',
    customWallpaper: 'doodle',
  };
};

/**
 * Subscribe to all conversations for the current user in real time
 */
export const subscribeToUserConversations = (
  currentUserId: string,
  onUpdate: (chats: Chat[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!isFirebaseConfigured || !currentUserId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', currentUserId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const chats: Chat[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        // Check if other participant is typing (within the last 4 seconds)
        let isTyping = false;
        if (data.typing && typeof data.typing === 'object') {
          const now = Date.now();
          for (const [uid, time] of Object.entries(data.typing)) {
            if (uid !== currentUserId && typeof time === 'number' && now - time < 4000) {
              isTyping = true;
              break;
            }
          }
        }

        return {
          id: docSnap.id,
          participants: data.participants || [],
          lastMessage: data.lastMessage || undefined,
          updatedAt: data.updatedAt || 0,
          unreadCount: data.unreadCount?.[currentUserId] || 0,
          isTyping,
          isPinned: Boolean(data.isPinned?.[currentUserId]),
          isMuted: Boolean(data.isMuted?.[currentUserId]),
          disappearingTimer: data.disappearingTimer || 'off',
          customWallpaper: data.customWallpaper || 'doodle',
        };
      });

      // Sort by updatedAt descending
      chats.sort((a, b) => b.updatedAt - a.updatedAt);
      onUpdate(chats);
    },
    (err) => {
      console.warn('Conversations subscription notice:', err);
      onError?.(err);
    }
  );
};

/**
 * Subscribe to real-time messages in a specific conversation
 */
export const subscribeToMessages = (
  chatId: string,
  onUpdate: (messages: Message[]) => void,
  limitCount = 80
): Unsubscribe => {
  if (!isFirebaseConfigured || !chatId) {
    onUpdate([]);
    return () => {};
  }

  const messagesRef = collection(db, 'conversations', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limitToLast(limitCount));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          chatId: data.chatId || chatId,
          senderId: data.senderId,
          senderName: data.senderName || 'User',
          senderUsername: data.senderUsername || '',
          text: data.text || '',
          image: data.image || undefined,
          voiceNote: data.voiceNote || undefined,
          timestamp: data.timestamp || Date.now(),
          status: (data.status || 'sent') as MessageStatus,
          reactions: data.reactions || undefined,
          isStarred: Boolean(data.isStarred),
          replyTo: data.replyTo || undefined,
          isDeleted: Boolean(data.isDeleted),
        };
      });
      onUpdate(msgs);
    },
    (err) => {
      console.warn('Messages subscription notice:', err);
    }
  );
};

/**
 * Send a real-time message to a conversation
 */
export const sendChatMessage = async (params: {
  chatId: string;
  sender: User;
  recipientId: string;
  text: string;
  image?: string;
  voiceNote?: VoiceNote;
  replyTo?: MessageReplyInfo;
}): Promise<Message> => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured.');
  }

  const { chatId, sender, recipientId, text, image, voiceNote, replyTo } = params;
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = Date.now();

  const messageDoc: Message = {
    id: msgId,
    chatId,
    senderId: sender.id,
    senderName: sender.name,
    senderUsername: sender.username,
    text,
    image,
    voiceNote,
    replyTo,
    timestamp,
    status: 'sent',
    isDeleted: false,
  };

  const messageRef = doc(db, 'conversations', chatId, 'messages', msgId);
  const chatRef = doc(db, 'conversations', chatId);

  // 1. Write the message document
  await setDoc(messageRef, {
    ...messageDoc,
    image: image || null,
    voiceNote: voiceNote || null,
    replyTo: replyTo || null,
  });

  // 2. Update conversation summary and increment recipient unread count
  await updateDoc(chatRef, {
    lastMessage: {
      id: msgId,
      text: text || (image ? '📷 Photo' : voiceNote ? '🎤 Voice message' : ''),
      senderId: sender.id,
      senderName: sender.name,
      timestamp,
      status: 'sent',
    },
    updatedAt: timestamp,
    [`unreadCount.${recipientId}`]: increment(1),
    [`typing.${sender.id}`]: 0,
  }).catch((err) => {
    console.warn('Failed to update chat meta:', err);
  });

  return messageDoc;
};

/**
 * Mark unread messages as delivered when recipient receives them
 */
export const markMessagesAsDelivered = async (
  chatId: string,
  currentUserId: string,
  messages: Message[]
): Promise<void> => {
  if (!isFirebaseConfigured || !chatId || messages.length === 0) return;

  const toDeliver = messages.filter(
    (m) => m.senderId !== currentUserId && m.status === 'sent' && !m.isDeleted
  );

  if (toDeliver.length === 0) return;

  try {
    const batch = writeBatch(db);
    toDeliver.forEach((m) => {
      const msgRef = doc(db, 'conversations', chatId, 'messages', m.id);
      batch.update(msgRef, { status: 'delivered' });
    });
    await batch.commit();
  } catch (err) {
    console.warn('markMessagesAsDelivered notice:', err);
  }
};

/**
 * Mark conversation messages as seen by the viewer
 */
export const markConversationAsSeen = async (
  chatId: string,
  currentUserId: string,
  messages: Message[]
): Promise<void> => {
  if (!isFirebaseConfigured || !chatId) return;

  try {
    // 1. Clear unreadCount on conversation
    const chatRef = doc(db, 'conversations', chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${currentUserId}`]: 0,
    }).catch(() => {});

    // 2. Mark unseen messages as 'seen'
    const toSeen = messages.filter(
      (m) => m.senderId !== currentUserId && m.status !== 'seen' && !m.isDeleted
    );

    if (toSeen.length > 0) {
      const batch = writeBatch(db);
      toSeen.forEach((m) => {
        const msgRef = doc(db, 'conversations', chatId, 'messages', m.id);
        batch.update(msgRef, { status: 'seen' });
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('markConversationAsSeen notice:', err);
  }
};

/**
 * Broadcast typing state to Firestore (throttled)
 */
export const setTypingIndicator = async (
  chatId: string,
  currentUserId: string,
  isTyping: boolean
): Promise<void> => {
  if (!isFirebaseConfigured || !chatId) return;
  try {
    const chatRef = doc(db, 'conversations', chatId);
    await updateDoc(chatRef, {
      [`typing.${currentUserId}`]: isTyping ? Date.now() : 0,
    });
  } catch {}
};

/**
 * Soft delete or remove a message
 */
export const deleteMessage = async (
  chatId: string,
  messageId: string
): Promise<void> => {
  if (!isFirebaseConfigured || !chatId || !messageId) return;
  try {
    const msgRef = doc(db, 'conversations', chatId, 'messages', messageId);
    await updateDoc(msgRef, {
      isDeleted: true,
      text: 'This message was deleted',
      image: null,
      voiceNote: null,
    });
  } catch (err) {
    console.warn('deleteMessage error:', err);
  }
};

/**
 * Add or remove reaction on a message
 */
export const toggleReactionOnMessage = async (
  chatId: string,
  messageId: string,
  emoji: string,
  username: string
): Promise<void> => {
  if (!isFirebaseConfigured || !chatId || !messageId) return;
  try {
    const msgRef = doc(db, 'conversations', chatId, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const reactions = snap.data().reactions || {};
    const usersForEmoji = (reactions[emoji] || []) as string[];
    let updatedUsers: string[];

    if (usersForEmoji.includes(username)) {
      updatedUsers = usersForEmoji.filter((u) => u !== username);
    } else {
      updatedUsers = [...usersForEmoji, username];
    }

    if (updatedUsers.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = updatedUsers;
    }

    await updateDoc(msgRef, { reactions });
  } catch (err) {
    console.warn('toggleReactionOnMessage notice:', err);
  }
};

/**
 * Search registered users in Firestore by @username or Name
 */
export const searchRegisteredUsers = async (
  searchStr: string,
  currentUserId: string
): Promise<User[]> => {
  if (!isFirebaseConfigured) return [];
  const clean = searchStr.trim().replace('@', '').toLowerCase();
  if (!clean) return [];

  try {
    // 1. Search by exact username match first
    const exactUsernameDoc = await getDoc(doc(db, 'usernames', clean));
    if (exactUsernameDoc.exists()) {
      const uid = exactUsernameDoc.data()?.uid;
      if (uid && uid !== currentUserId) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          return [mapDocToUser(uid, userDoc.data())];
        }
      }
    }

    // 2. Query prefix search in users collection
    const q = query(
      collection(db, 'users'),
      where('username', '>=', clean),
      where('username', '<=', clean + '\uf8ff')
    );
    const snap = await getDocs(q);
    const results: User[] = [];

    snap.docs.forEach((d) => {
      if (d.id !== currentUserId) {
        results.push(mapDocToUser(d.id, d.data()));
      }
    });

    return results;
  } catch (err) {
    console.warn('searchRegisteredUsers notice:', err);
    return [];
  }
};

/**
 * Fetch a single user profile from Firestore
 */
export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  if (!isFirebaseConfigured || !userId) return null;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return mapDocToUser(userId, snap.data());
    }
  } catch (err) {
    console.warn('fetchUserProfile error:', err);
  }
  return null;
};

/**
 * Subscribe to a contact's real-time presence (online status and lastSeen)
 */
export const subscribeToPresence = (
  userId: string,
  onPresenceUpdate: (presence: { isOnline: boolean; lastSeen?: string }) => void
): Unsubscribe => {
  if (!isFirebaseConfigured || !userId) {
    return () => {};
  }

  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onPresenceUpdate({
          isOnline: Boolean(data.isOnline),
          lastSeen: formatLastSeen(data.lastSeen),
        });
      }
    },
    () => {}
  );
};

/**
 * Update current user presence in Firestore
 */
export const updateUserPresence = async (
  userId: string,
  isOnline: boolean
): Promise<void> => {
  if (!isFirebaseConfigured || !userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isOnline,
      lastSeen: isOnline ? 'Online' : Date.now(),
    });
  } catch {}
};

/**
 * Block a user in Firestore
 */
export const blockUserInFirestore = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  if (!isFirebaseConfigured || !currentUserId || !targetUserId) return;
  try {
    const userRef = doc(db, 'users', currentUserId);
    await updateDoc(userRef, {
      blockedUserIds: arrayUnion(targetUserId),
    });
  } catch (err) {
    console.warn('blockUserInFirestore error:', err);
  }
};

/**
 * Unblock a user in Firestore
 */
export const unblockUserInFirestore = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  if (!isFirebaseConfigured || !currentUserId || !targetUserId) return;
  try {
    const userRef = doc(db, 'users', currentUserId);
    await updateDoc(userRef, {
      blockedUserIds: arrayRemove(targetUserId),
    });
  } catch (err) {
    console.warn('unblockUserInFirestore error:', err);
  }
};
