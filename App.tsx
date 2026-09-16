import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Chat,
  Message,
  AppSettings,
  CallSession,
  MessageStatus,
  UserStatusStory,
  CallLogItem,
  VoiceNote,
  ChannelItem,
  MessageReplyInfo,
} from './types';
import { DEFAULT_SETTINGS, exportAllBackupAsJson, getChatId } from './utils/storage';
import { sounds } from './utils/audio';
import { AuthModal } from './components/AuthModal';
import { NavigationRail, ActiveNavTab } from './components/NavigationRail';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { CallModal } from './components/CallModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { ImageLightbox } from './components/ImageLightbox';
import { StatusViewerModal } from './components/StatusViewerModal';
import { CreateStatusModal } from './components/CreateStatusModal';
import { Toast, ToastMessage } from './components/Toast';
import { subscribeToAuth, logoutUser } from './services/authService';
import {
  subscribeToUserConversations,
  subscribeToMessages,
  sendChatMessage,
  getOrCreateConversation,
  fetchUserProfile,
  markMessagesAsDelivered,
  markConversationAsSeen,
  toggleReactionOnMessage,
  deleteMessage as deleteFirestoreMessage,
} from './services/chatService';
import { isFirebaseConfigured, db } from './lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { MessageCircle } from 'lucide-react';
import { createCall, subscribeToIncomingCalls, updateCallStatus, mirrorIncomingCall } from './services/callService';
import { subscribeToStatuses, publishStatus } from './services/statusService';

export default function App() {
  // 0. Auth loading state
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // 1. Current User session
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 2. All Registered Users
  const [users, setUsers] = useState<User[]>([]);

  // 3. Blocked User IDs
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  // 4. App Preferences & Theme
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // 5. Active Navigation Tab (Chats, Status, Channels, Communities, Calls, Starred)
  const [activeNavTab, setActiveNavTab] = useState<ActiveNavTab>('chats');

  // 6. Active Chat ID & Mobile Chat Screen Toggle
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // 7. Chats list
  const [chats, setChats] = useState<Chat[]>([]);

  // 8. Messages map (chatId -> Message[])
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});

  // 9. WhatsApp Channels
  const [channels, setChannels] = useState<ChannelItem[]>([]);

  // 10. Status Stories
  const [statuses, setStatuses] = useState<UserStatusStory[]>([]);

  // 11. Call Logs
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);

  // 12. Modal Visibility States
  const [activeModal, setActiveModal] = useState<
    'none' | 'edit_profile' | 'public_profile' | 'settings'
  >('none');
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // 13. Status Modals
  const [statusViewerState, setStatusViewerState] = useState<{
    open: boolean;
    index: number;
  }>({ open: false, index: 0 });
  const [isCreateStatusOpen, setIsCreateStatusOpen] = useState(false);

  // 14. Active Call Session
  const [callSession, setCallSession] = useState<CallSession | null>(null);

  // 15. Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (text: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `toast_${Date.now()}_${Math.random()}`;
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  // Cloud data is authoritative; localStorage is intentionally not used for chat state.

  // Cross-Tab Synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;
    const channel = new BroadcastChannel('sb_whatsapp_channel');

    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'NEW_MESSAGE') {
        const { message, chat } = payload;
        setMessagesMap((prev) => ({
          ...prev,
          [message.chatId]: [...(prev[message.chatId] || []), message],
        }));
        setChats((prev) => {
          const index = prev.findIndex((c) => c.id === chat.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], lastMessage: message, updatedAt: Date.now() };
            return updated;
          }
          return [chat, ...prev];
        });
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Handle User Login
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setUsers([user]);
    setChats([]);
    setMessagesMap({});
    setActiveChatId(null);
    showToast(`Welcome back, ${user.name}!`);
  };

  const handleRegisterUser = (newUser: User) => {
    setCurrentUser(newUser);
    setUsers([newUser]);
  };

  // Listen to Firebase Auth state for real persistent multi-device sessions
  useEffect(() => {
    const unsubscribe = subscribeToAuth((firebaseUser, loading) => {
      setIsAuthChecking(loading);
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        setUsers((prev) => {
          if (!prev.some((u) => u.id === firebaseUser.id)) {
            return [firebaseUser, ...prev];
          }
          return prev.map((u) => (u.id === firebaseUser.id ? firebaseUser : u));
        });
      } else {
        if (isFirebaseConfigured) {
          setCurrentUser(null);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Real incoming-call listener. No simulated/automatic answering.
  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) return;
    return subscribeToIncomingCalls(currentUser.id, async (call) => {
      const contact = await fetchUserProfile(call.callerId);
      if (!contact) return;
      setCallSession({
        callId: call.id, callerId: call.callerId, calleeId: currentUser.id, isActive: true,
        type: call.type, direction: 'incoming', contact, isMuted: false, isVideoOff: false,
      });
    });
  }, [currentUser?.id]);

  const handleLogout = async () => {
    try {
      if (currentUser?.id) {
        await logoutUser(currentUser.id);
      } else {
        await logoutUser();
      }
    } catch (err) {
      console.warn('Logout error:', err);
    }
    setCurrentUser(null);
    setActiveChatId(null);
    setIsMobileChatOpen(false);
    showToast('You have been logged out.');
  };

  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) { setStatuses([]); return; }
    return subscribeToStatuses(setStatuses);
  }, [currentUser?.id]);

  // Real-time Firestore conversation list and participant profiles
  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) {
      setChats([]);
      return;
    }
    return subscribeToUserConversations(currentUser.id, (nextChats) => {
      setChats(nextChats);
      if (activeChatId && !nextChats.some((c) => c.id === activeChatId)) {
        setActiveChatId(null);
      }
    });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const ids = Array.from(new Set(chats.flatMap((c) => c.participants).filter((id) => id !== currentUser.id)));
    let cancelled = false;
    Promise.all(ids.map((id) => fetchUserProfile(id))).then((profiles) => {
      if (cancelled) return;
      setUsers([currentUser, ...profiles.filter(Boolean) as User[]]);
    });
    return () => { cancelled = true; };
  }, [currentUser?.id, chats.map((c) => c.participants.join(',')).join('|')]);

  useEffect(() => {
    if (!activeChatId || !currentUser || !isFirebaseConfigured) return;
    return subscribeToMessages(activeChatId, (msgs) => {
      setMessagesMap((prev) => ({ ...prev, [activeChatId]: msgs }));
      void markMessagesAsDelivered(activeChatId, currentUser.id, msgs);
      if (document.visibilityState === 'visible') {
        void markConversationAsSeen(activeChatId, currentUser.id, msgs);
      }
    });
  }, [activeChatId, currentUser?.id]);

  // Find active chat & contact
  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const activeContactId = activeChat?.participants.find((id) => id !== currentUser?.id);
  const activeContact = users.find((u) => u.id === activeContactId) || null;
  const activeMessages = activeChatId ? messagesMap[activeChatId] || [] : [];

  // Mark messages as seen when opening a chat
  useEffect(() => {
    if (!activeChatId || !currentUser) return;

    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, unreadCount: 0 } : c))
    );

    setMessagesMap((prev) => {
      const msgs = prev[activeChatId];
      if (!msgs) return prev;
      let hasChange = false;
      const updated = msgs.map((m) => {
        if (m.senderId !== currentUser.id && m.status !== 'seen') {
          hasChange = true;
          return { ...m, status: 'seen' as MessageStatus };
        }
        return m;
      });
      return hasChange ? { ...prev, [activeChatId]: updated } : prev;
    });
  }, [activeChatId, currentUser]);

  // Send a real Firestore message; there is no fake/automatic contact reply.
  const handleSendMessage = async (
    text: string,
    image?: string,
    voiceNote?: VoiceNote,
    replyTo?: MessageReplyInfo
  ) => {
    if (!currentUser || !activeChatId || !activeContact || !isFirebaseConfigured) return;
    try {
      if (settings.notificationSound) sounds.playSent();
      await sendChatMessage({
        chatId: activeChatId,
        sender: currentUser,
        recipientId: activeContact.id,
        text,
        image,
        voiceNote,
        replyTo,
      });
    } catch (err) {
      console.error('Send message failed:', err);
      showToast('Message could not be sent. Please try again.', 'error');
    }
  };

  // Start new chat with a user
  const handleStartNewChatWithUser = async (contactUser: User) => {
    if (!currentUser || !isFirebaseConfigured) return;
    try {
      const chat = await getOrCreateConversation(currentUser, contactUser);
      setActiveChatId(chat.id);
      setActiveNavTab('chats');
      setIsMobileChatOpen(true);
    } catch (err) {
      console.error('Create conversation failed:', err);
      showToast('Could not open chat. Please try again.', 'error');
    }
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setIsMobileChatOpen(true);
  };

  // React to message
  const handleReactMessage = async (messageId: string, emoji: string) => {
    if (!activeChatId || !currentUser || !isFirebaseConfigured) return;
    await toggleReactionOnMessage(activeChatId, messageId, emoji, currentUser.username);
  };

  // Star / Unstar Message
  const handleToggleStarMessage = (messageId: string) => {
    if (!activeChatId) return;

    setMessagesMap((prev) => {
      const current = prev[activeChatId] || [];
      return {
        ...prev,
        [activeChatId]: current.map((m) =>
          m.id === messageId ? { ...m, isStarred: !m.isStarred } : m
        ),
      };
    });
  };

  const handleUnstarMessageFromSidebar = (messageId: string, chatId: string) => {
    setMessagesMap((prev) => {
      const current = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: current.map((m) =>
          m.id === messageId ? { ...m, isStarred: false } : m
        ),
      };
    });
    showToast('Message unstarred');
  };

  // Delete message
  const handleDeleteMessage = (messageId: string) => {
    if (!activeChatId) return;

    setMessagesMap((prev) => {
      const current = prev[activeChatId] || [];
      const filtered = current.filter((m) => m.id !== messageId);
      return { ...prev, [activeChatId]: filtered };
    });

    // Update last message if deleted message was the last one
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== activeChatId) return c;
        const msgs = (messagesMap[activeChatId] || []).filter((m) => m.id !== messageId);
        const last = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
        return { ...c, lastMessage: last };
      })
    );
  };

  // Disappearing messages timer update
  const handleUpdateChatDisappearing = (timer: 'off' | '24h' | '7d' | '90d') => {
    if (!activeChatId) return;
    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, disappearingTimer: timer } : c))
    );
  };

  // Pin / Unpin Chat
  const handleTogglePinChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c))
    );
    const target = chats.find((c) => c.id === chatId);
    showToast(target?.isPinned ? 'Chat unpinned' : 'Chat pinned to top');
  };

  // Mute / Unmute Chat
  const handleToggleMuteChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isMuted: !c.isMuted } : c))
    );
    const target = chats.find((c) => c.id === chatId);
    showToast(target?.isMuted ? 'Chat unmuted' : 'Chat muted');
  };

  // Follow / Unfollow WhatsApp Channel
  const handleToggleFollowChannel = (channelId: string) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id !== channelId) return ch;
        const nextFollow = !ch.isFollowed;
        return {
          ...ch,
          isFollowed: nextFollow,
          followersCount: nextFollow ? ch.followersCount + 1 : Math.max(0, ch.followersCount - 1),
        };
      })
    );
    const ch = channels.find((c) => c.id === channelId);
    showToast(ch?.isFollowed ? `Unfollowed ${ch.name}` : `Following ${ch?.name}!`);
  };

  // Clear single chat
  const handleClearChat = (chatId: string) => {
    setMessagesMap((prev) => ({ ...prev, [chatId]: [] }));
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, lastMessage: undefined } : c))
    );
  };

  // Clear all chats
  const handleClearAllChats = () => {
    setMessagesMap({});
    setChats((prev) => prev.map((c) => ({ ...c, lastMessage: undefined, unreadCount: 0 })));
  };

  // Download Full Account JSON Backup
  const handleDownloadFullBackup = () => {
    exportAllBackupAsJson({
      currentUser,
      users,
      chats,
      messagesMap,
      statuses,
      callLogs,
      settings,
      channels,
    });
  };

  // Block / Unblock User
  const handleToggleBlock = (userId: string) => {
    setBlockedIds((prev) => {
      const isBlocked = prev.includes(userId);
      if (isBlocked) {
        showToast('Contact unblocked');
        return prev.filter((id) => id !== userId);
      } else {
        showToast('Contact blocked');
        return [...prev, userId];
      }
    });
  };

  const handleCopyUsername = (username: string) => {
    navigator.clipboard.writeText(`@${username}`);
    showToast(`Copied @${username} to clipboard`);
  };

  // Profile Save
  const handleSaveProfile = async (updatedUser: Partial<User>) => {
    if (!currentUser) return;
    const updated: User = { ...currentUser, ...updatedUser };
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    showToast('Profile updated successfully!');

    if (isFirebaseConfigured && currentUser.id) {
      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, updatedUser);
      } catch (err) {
        console.warn('Failed to update profile in Firestore:', err);
      }
    }
  };

  // Status Creation
  const handleCreateStatus = (newStatus: UserStatusStory) => {
    setStatuses((prev) => [newStatus, ...prev]);
    showToast('Status updated!');
  };

  // Status Reply Forwarder
  const handleReplyToStatus = (story: UserStatusStory, text: string) => {
    if (!currentUser) return;
    const author = users.find((u) => u.id === story.userId);
    if (!author) return;

    const chatId = getChatId(currentUser.id, author.id);
    const existingChat = chats.find((c) => c.id === chatId);
    if (!existingChat) {
      const newChat: Chat = {
        id: chatId,
        participants: [currentUser.id, author.id],
        updatedAt: Date.now(),
        unreadCount: 0,
      };
      setChats((prev) => [newChat, ...prev]);
    }

    setActiveChatId(chatId);
    setActiveNavTab('chats');
    setIsMobileChatOpen(true);

    const replyMsgText = `[Replying to Status: "${story.caption || 'Story'}"]\n${text}`;
    handleSendMessage(replyMsgText);
    showToast(`Replied to ${author.name}'s status`);
  };

  // Call initiation via Firestore signalling + WebRTC in CallModal.
  const handleStartCall = async (contact: User, type: 'audio' | 'video') => {
    if (!currentUser) return;
    if (type === 'audio' && !settings.allowAudioCalls) { showToast('Audio calls are disabled in your settings.', 'info'); return; }
    if (type === 'video' && !settings.allowVideoCalls) { showToast('Video calls are disabled in your settings.', 'info'); return; }
    try {
      const callId = await createCall(currentUser.id, contact.id, type);
      await mirrorIncomingCall(callId, contact.id);
      setCallSession({ callId, callerId: currentUser.id, calleeId: contact.id, isActive: true, type, direction: 'outgoing', contact, isMuted: false, isVideoOff: false });
    } catch (err) {
      console.error('Call start failed:', err);
      showToast('Could not start the call.', 'error');
    }
  };

  const handleEndCall = async () => {
    const id = callSession?.callId;
    setCallSession(null);
    if (id) await updateCallStatus(id, 'ended').catch(() => {});
    sounds.playCallEnd();
    showToast('Call ended.');
  };

  const handleToggleMute = () => {
    setCallSession((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const handleToggleVideo = () => {
    setCallSession((prev) => (prev ? { ...prev, isVideoOff: !prev.isVideoOff } : null));
  };

  // Compute unread indicators
  const totalUnreadCount = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const totalStarredCount = Object.values(messagesMap).reduce<number>(
    (sum: number, list: unknown) =>
      sum + (Array.isArray(list) ? (list as Message[]).filter((m) => m.isStarred).length : 0),
    0
  );

  // Initial auth checking splash screen
  if (isAuthChecking && isFirebaseConfigured) {
    return (
      <div className="w-full h-screen bg-[#111b21] text-[#e9edef] flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#00a884] to-[#25d366] flex items-center justify-center shadow-lg shadow-[#00a884]/20 mb-4 animate-pulse">
          <MessageCircle className="w-8 h-8 text-white stroke-[2.5]" />
        </div>
        <p className="text-sm font-semibold text-white tracking-wide">SB Messenger</p>
        <div className="w-24 h-1 bg-[#202c33] rounded-full overflow-hidden mt-4">
          <div className="w-full h-full bg-[#00a884] rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  // Render Auth screen if not logged in
  if (!currentUser) {
    return (
      <div className="w-full h-screen bg-[#111b21] text-[#e9edef] flex items-center justify-center font-sans">
        <AuthModal
          onLoginSuccess={handleLoginSuccess}
          registeredUsers={users}
          onRegisterUser={handleRegisterUser}
        />
        <Toast
          toasts={toasts}
          onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
        />
      </div>
    );
  }

  // Get blocked User objects
  const blockedUsers = users.filter((u) => (blockedIds || []).includes(u.id));

  return (
    <div
      className={`w-full h-screen text-[#e9edef] flex overflow-hidden font-sans ${
        settings.theme === 'light' ? 'bg-[#eef2f5] text-[#111b21]' : 'bg-[#0c1317]'
      }`}
    >
      {/* App Main Shell Container */}
      <div className="w-full h-full max-w-[1760px] mx-auto flex overflow-hidden shadow-2xl relative">
        {/* 1. LEFT-MOST NAVIGATION RAIL (WhatsApp Web Primary Bar) */}
        <NavigationRail
          activeTab={activeNavTab}
          onSelectTab={(tab) => {
            setActiveNavTab(tab);
            if (isMobileChatOpen) setIsMobileChatOpen(false);
          }}
          currentUser={currentUser}
          unreadChatsCount={totalUnreadCount}
          hasUnreadStatus={Array.isArray(statuses) && statuses.some((s) => !s.isViewed)}
          starredCount={totalStarredCount}
          onOpenSettings={() => setActiveNavTab('settings')}
          onOpenProfile={() => setActiveNavTab('settings')}
        />

        {/* 2. CHAT & SECTION SIDEBAR */}
        <Sidebar
          currentUser={currentUser}
          chats={chats}
          messagesMap={messagesMap}
          users={users}
          channels={channels}
          activeChatId={activeChatId}
          activeNavTab={activeNavTab}
          statuses={statuses}
          callLogs={callLogs}
          onSelectChat={handleSelectChat}
          onOpenSettings={() => setActiveNavTab('settings')}
          onOpenProfile={() => setActiveNavTab('settings')}
          onOpenPublicProfile={(user) => {
            setSelectedUserForProfile(user);
            setActiveModal('public_profile');
          }}
          onLogout={handleLogout}
          onStartNewChatWithUser={handleStartNewChatWithUser}
          onCopyUsername={handleCopyUsername}
          onOpenStatusViewer={(index) =>
            setStatusViewerState({ open: true, index })
          }
          onOpenCreateStatus={() => setIsCreateStatusOpen(true)}
          onStartCall={handleStartCall}
          onTogglePinChat={handleTogglePinChat}
          onToggleMuteChat={handleToggleMuteChat}
          onToggleFollowChannel={handleToggleFollowChannel}
          onUnstarMessage={handleUnstarMessageFromSidebar}
          onDownloadFullBackup={handleDownloadFullBackup}
          onShowToast={showToast}
          settings={settings}
          onUpdateSettings={(newSettings) =>
            setSettings((prev) => ({ ...prev, ...newSettings }))
          }
          blockedUsers={blockedUsers}
          onUnblockUser={(id) =>
            setBlockedIds((prev) => (prev || []).filter((x) => x !== id))
          }
          onSelectNavTab={setActiveNavTab}
          onSaveProfile={handleSaveProfile}
          onClearAllChats={handleClearAllChats}
        />

        {/* 3. ACTIVE CHAT AREA */}
        <ChatArea
          currentUser={currentUser}
          activeChat={activeChat}
          contact={activeContact}
          messages={activeMessages}
          isMobileChatOpen={isMobileChatOpen}
          wallpaper={settings.chatWallpaper}
          onBack={() => setIsMobileChatOpen(false)}
          onSendMessage={handleSendMessage}
          onStartCall={handleStartCall}
          onOpenPublicProfile={(user) => {
            setSelectedUserForProfile(user);
            setActiveModal('public_profile');
          }}
          onClearChat={handleClearChat}
          onBlockUser={handleToggleBlock}
          onOpenImage={(url) => setLightboxImage(url)}
          onReactMessage={handleReactMessage}
          onToggleStarMessage={handleToggleStarMessage}
          onDeleteMessage={handleDeleteMessage}
          onUpdateChatDisappearing={handleUpdateChatDisappearing}
          onShowToast={showToast}
        />
      </div>

      {/* WhatsApp Status Story Viewer Modal */}
      {statusViewerState.open && (
        <StatusViewerModal
          statuses={statuses}
          initialIndex={statusViewerState.index}
          onClose={() => setStatusViewerState({ open: false, index: 0 })}
          onReply={handleReplyToStatus}
        />
      )}

      {/* WhatsApp Create Status Modal */}
      {isCreateStatusOpen && (
        <CreateStatusModal
          currentUser={currentUser}
          onClose={() => setIsCreateStatusOpen(false)}
          onPublish={handleCreateStatus}
        />
      )}

      {/* Profile Modal (Edit or View) */}
      {activeModal === 'edit_profile' && (
        <ProfileModal
          mode="edit"
          user={currentUser}
          onSaveProfile={handleSaveProfile}
          onClose={() => setActiveModal('none')}
          onCopyUsername={handleCopyUsername}
        />
      )}

      {activeModal === 'public_profile' && selectedUserForProfile && (
        <ProfileModal
          mode="view"
          user={selectedUserForProfile}
          isBlocked={Boolean((blockedIds || []).includes(selectedUserForProfile.id))}
          onClose={() => {
            setActiveModal('none');
            setSelectedUserForProfile(null);
          }}
          onStartChat={(user) => {
            handleStartNewChatWithUser(user);
            setActiveModal('none');
          }}
          onStartCall={handleStartCall}
          onToggleBlock={handleToggleBlock}
          onCopyUsername={handleCopyUsername}
        />
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSettings) =>
            setSettings((prev) => ({ ...prev, ...newSettings }))
          }
          onOpenEditProfile={() => setActiveModal('edit_profile')}
          onClose={() => setActiveModal('none')}
          blockedUsers={blockedUsers}
          onUnblockUser={(id) =>
            setBlockedIds((prev) => (prev || []).filter((x) => x !== id))
          }
          currentUser={currentUser}
          onDownloadFullBackup={handleDownloadFullBackup}
          onClearAllChats={handleClearAllChats}
          onShowToast={showToast}
          onLogout={handleLogout}
          onSaveProfile={handleSaveProfile}
        />
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Audio / Video Call Modal */}
      <CallModal
        session={callSession}
        currentUserId={currentUser.id}
        onAcceptCall={() => {
          setCallSession((prev) => prev ? { ...prev, direction: 'connected', startTime: Date.now() } : null);
        }}
        onEndCall={handleEndCall}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
      />

      {/* Toast Notifications */}
      <Toast
        toasts={toasts}
        onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
      />
    </div>
  );
}
