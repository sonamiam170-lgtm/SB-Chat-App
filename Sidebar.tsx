import React, { useState } from 'react';
import { User, Chat, UserStatusStory, CallLogItem, Message, ChannelItem, AppSettings } from '../types';
import { ActiveNavTab } from './NavigationRail';
import { SettingsPanel } from './SettingsPanel';
import {
  Search,
  Settings,
  LogOut,
  CheckCheck,
  Check,
  Image as ImageIcon,
  Plus,
  X,
  BadgeCheck,
  MessageSquare,
  CircleDashed,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Camera,
  MoreVertical,
  Mic,
  Pin,
  Lock,
  Star,
  BellOff,
  Download,
  Users,
  Radio,
  Share2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
  Loader2,
} from 'lucide-react';
import { exportChatAsTxt } from '../utils/storage';
import { searchRegisteredUsers } from '../services/chatService';

interface SidebarProps {
  currentUser: User;
  chats: Chat[];
  messagesMap: Record<string, Message[]>;
  users: User[];
  channels: ChannelItem[];
  activeChatId: string | null;
  activeNavTab: ActiveNavTab;
  statuses: UserStatusStory[];
  callLogs: CallLogItem[];
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenPublicProfile: (user: User) => void;
  onLogout: () => void;
  onStartNewChatWithUser: (user: User) => void;
  onCopyUsername: (username: string) => void;
  onOpenStatusViewer: (index: number) => void;
  onOpenCreateStatus: () => void;
  onStartCall: (contact: User, type: 'audio' | 'video') => void;
  onTogglePinChat: (chatId: string) => void;
  onToggleMuteChat: (chatId: string) => void;
  onToggleFollowChannel: (channelId: string) => void;
  onUnstarMessage: (messageId: string, chatId: string) => void;
  onDownloadFullBackup: () => void;
  onShowToast: (msg: string) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  blockedUsers: User[];
  onUnblockUser: (userId: string) => void;
  onSelectNavTab: (tab: ActiveNavTab) => void;
  onSaveProfile: (updated: Partial<User>) => void;
  onClearAllChats?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  chats,
  messagesMap,
  users,
  channels,
  activeChatId,
  activeNavTab,
  statuses,
  callLogs,
  onSelectChat,
  onOpenSettings,
  onOpenProfile,
  onOpenPublicProfile,
  onLogout,
  onStartNewChatWithUser,
  onCopyUsername,
  onOpenStatusViewer,
  onOpenCreateStatus,
  onStartCall,
  onTogglePinChat,
  onToggleMuteChat,
  onToggleFollowChannel,
  onUnstarMessage,
  onDownloadFullBackup,
  onShowToast,
  settings,
  onUpdateSettings,
  blockedUsers,
  onUnblockUser,
  onSelectNavTab,
  onSaveProfile,
  onClearAllChats,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChip, setFilterChip] = useState<'all' | 'unread' | 'favorites' | 'groups'>('all');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [registeredSearchResults, setRegisteredSearchResults] = useState<User[]>([]);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [chatContextMenuId, setChatContextMenuId] = useState<string | null>(null);

  const handleSearchRegisteredUsers = async (queryStr: string) => {
    setNewChatSearchQuery(queryStr);
    const clean = queryStr.trim().replace('@', '');
    if (!clean) {
      setRegisteredSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const results = await searchRegisteredUsers(clean, currentUser.id);
      setRegisteredSearchResults(results);
    } catch {
      setRegisteredSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Helper to get contact user for a chat
  const getContactForChat = (chat: Chat): User | undefined => {
    const otherId = chat.participants.find((id) => id !== currentUser.id);
    return users.find((u) => u.id === otherId);
  };

  // Format message time
  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Sort chats: pinned first, then by last updated
  const sortedChats = [...chats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  // Filter chats
  const filteredChats = sortedChats.filter((chat) => {
    const contact = getContactForChat(chat);
    if (!contact) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = contact.name?.toLowerCase().includes(q) ?? false;
      const matchUsername = contact.username?.toLowerCase().includes(q) ?? false;
      const msgs = Array.isArray(messagesMap[chat.id]) ? messagesMap[chat.id] : [];
      const matchMsg = msgs.some((m) => m.text?.toLowerCase().includes(q));
      if (!matchName && !matchUsername && !matchMsg) return false;
    }

    // Filter chip
    if (filterChip === 'unread') {
      return (chat.unreadCount || 0) > 0;
    }
    if (filterChip === 'favorites') {
      return contact.isVerified || chat.isPinned;
    }
    return true;
  });

  // Collect all starred messages across chats
  const allStarredMessages: { message: Message; contact: User; chatId: string }[] = [];
  Object.entries(messagesMap).forEach(([chatId, msgs]) => {
    const chat = chats.find((c) => c.id === chatId);
    const contact = chat ? getContactForChat(chat) : undefined;
    if (contact && Array.isArray(msgs)) {
      (msgs as Message[]).forEach((m) => {
        if (m.isStarred) {
          allStarredMessages.push({ message: m, contact, chatId });
        }
      });
    }
  });

  // Handle export single chat
  const handleExportSingleChat = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    const contact = getContactForChat(chat);
    if (!contact) return;
    const msgs = messagesMap[chat.id] || [];
    exportChatAsTxt(contact.name, msgs);
    onShowToast(`Exported chat history with ${contact.name}`);
    setChatContextMenuId(null);
  };

  if (activeNavTab === 'settings') {
    return (
      <aside className="w-full md:w-[380px] lg:w-[410px] h-full bg-[#111b21] border-r border-[#222e35] flex flex-col shrink-0 relative select-none z-20">
        <SettingsPanel
          currentUser={currentUser}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onSaveProfile={onSaveProfile}
          blockedUsers={blockedUsers}
          onUnblockUser={onUnblockUser}
          onBack={() => onSelectNavTab('chats')}
          onLogout={onLogout}
          onDownloadFullBackup={onDownloadFullBackup}
          onClearAllChats={onClearAllChats}
          onShowToast={onShowToast}
        />
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-[380px] lg:w-[410px] h-full bg-[#111b21] border-r border-[#222e35] flex flex-col shrink-0 relative select-none z-20">
      {/* HEADER BAR */}
      <div className="h-[60px] px-4 bg-[#202c33] border-b border-[#222e35] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-[#e9edef] capitalize tracking-tight">
            {activeNavTab === 'chats' && 'Chats'}
            {activeNavTab === 'status' && 'Status'}
            {activeNavTab === 'channels' && 'Channels'}
            {activeNavTab === 'communities' && 'Communities'}
            {activeNavTab === 'calls' && 'Calls'}
            {activeNavTab === 'starred' && 'Starred Messages'}
          </h1>
        </div>

        {/* Header Icons */}
        <div className="flex items-center gap-1">
          {activeNavTab === 'chats' && (
            <>
              {/* New chat icon */}
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374248] rounded-full transition"
                title="New Chat"
              >
                <Plus className="w-5 h-5" />
              </button>
            </>
          )}

          {activeNavTab === 'status' && (
            <button
              onClick={onOpenCreateStatus}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374248] rounded-full transition"
              title="Add Status"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}

          {/* Three dots menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374248] rounded-full transition"
              title="Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenuDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenuDropdown(false)}
                />
                <div className="absolute right-0 top-11 w-60 py-2 bg-[#233138] border border-[#2a3942] rounded-2xl shadow-2xl z-50 text-sm text-[#d1d7db] animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setIsNewChatModalOpen(true);
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 hover:bg-[#182229] text-left flex items-center gap-3 transition"
                  >
                    <MessageSquare className="w-4 h-4 text-[#00a884]" />
                    New chat
                  </button>
                  <button
                    onClick={() => {
                      onDownloadFullBackup();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 hover:bg-[#182229] text-left flex items-center gap-3 text-[#25d366] transition font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download full backup
                  </button>
                  <button
                    onClick={() => {
                      onSelectNavTab('settings');
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 hover:bg-[#182229] text-left flex items-center gap-3 transition"
                  >
                    <BadgeCheck className="w-4 h-4 text-[#53bdeb]" />
                    My profile & QR
                  </button>
                  <button
                    onClick={() => {
                      onSelectNavTab('settings');
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 hover:bg-[#182229] text-left flex items-center gap-3 transition"
                  >
                    <Settings className="w-4 h-4 text-[#aebac1]" />
                    Settings
                  </button>
                  <div className="h-px bg-[#2a3942] my-1" />
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 hover:bg-rose-950/40 text-rose-400 text-left flex items-center gap-3 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH BAR (For Chats) */}
      {activeNavTab === 'chats' && (
        <div className="p-2.5 bg-[#111b21] space-y-2 shrink-0 border-b border-[#222e35]/60">
          <div className="relative flex items-center bg-[#202c33] rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884] transition">
            <Search className="w-4 h-4 text-[#8696a0] mr-3 shrink-0" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#8696a0] hover:text-[#e9edef] p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* WhatsApp Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'favorites', label: 'Favorites' },
                { id: 'groups', label: 'Groups' },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilterChip(chip.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  filterChip === chip.id
                    ? 'bg-[#00a884] text-[#111b21] font-semibold'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: CHATS LIST VIEW */}
      {activeNavTab === 'chats' && (
        <div className="flex-1 overflow-y-auto divide-y divide-[#222e35]/30">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#8696a0] space-y-3">
              <MessageSquare className="w-12 h-12 stroke-[1.2] text-[#374248]" />
              <p className="text-sm">No chats found.</p>
              {searchQuery.trim() ? (
                <button
                  onClick={() => {
                    setIsNewChatModalOpen(true);
                    handleSearchRegisteredUsers(searchQuery);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  Search &quot;{searchQuery.replace('@', '')}&quot; in users
                </button>
              ) : (
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] text-xs font-bold transition"
                >
                  Start a new conversation
                </button>
              )}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const contact = getContactForChat(chat);
              if (!contact) return null;
              const isActive = activeChatId === chat.id;
              const lastMsg = chat.lastMessage;

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setChatContextMenuId(chatContextMenuId === chat.id ? null : chat.id);
                  }}
                  className={`group relative flex items-center gap-3.5 px-3.5 py-3 cursor-pointer transition ${
                    isActive
                      ? 'bg-[#2a3942]'
                      : 'hover:bg-[#202c33]'
                  }`}
                >
                  {/* Contact Avatar with Online Dot */}
                  <div className="relative shrink-0">
                    <img
                      src={
                        contact.avatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`
                      }
                      alt={contact.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {contact.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00a884] ring-2 ring-[#111b21]"></span>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-[15px] font-semibold text-[#e9edef] truncate flex items-center gap-1.5">
                        {contact.name}
                        {contact.isVerified && (
                          <BadgeCheck className="w-4 h-4 text-[#00a884] shrink-0" />
                        )}
                      </h2>
                      <span
                        className={`text-xs ${
                          (chat.unreadCount || 0) > 0
                            ? 'text-[#25d366] font-semibold'
                            : 'text-[#8696a0]'
                        }`}
                      >
                        {formatTime(lastMsg?.timestamp || chat.updatedAt)}
                      </span>
                    </div>

                    {/* Subtitle / Last Message Preview */}
                    <div className="flex items-center justify-between text-[13px] text-[#8696a0]">
                      <div className="truncate flex items-center gap-1 mr-2">
                        {chat.isTyping ? (
                          <span className="text-[#25d366] font-medium animate-pulse">
                            typing...
                          </span>
                        ) : lastMsg ? (
                          <>
                            {lastMsg.senderId === currentUser.id && (
                              <span className="shrink-0">
                                {lastMsg.status === 'seen' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                ) : lastMsg.status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                                )}
                              </span>
                            )}
                            {lastMsg.voiceNote ? (
                              <span className="flex items-center gap-1 text-[#e9edef]">
                                <Mic className="w-3.5 h-3.5 text-[#00a884]" />
                                Voice message ({lastMsg.voiceNote.duration}s)
                              </span>
                            ) : lastMsg.image ? (
                              <span className="flex items-center gap-1 text-[#e9edef]">
                                <ImageIcon className="w-3.5 h-3.5 text-[#53bdeb]" />
                                Photo
                              </span>
                            ) : (
                              <span className="truncate">{lastMsg.text}</span>
                            )}
                          </>
                        ) : (
                          <span className="italic text-[#8696a0]">Tap to start chatting</span>
                        )}
                      </div>

                      {/* Right icons: Pin, Mute, Unread Pill */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {chat.isMuted && (
                          <BellOff className="w-3.5 h-3.5 text-[#8696a0]" />
                        )}
                        {chat.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-[#8696a0] fill-current" />
                        )}
                        {(chat.unreadCount || 0) > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#25d366] text-[#111b21] text-[11px] font-bold flex items-center justify-center">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Context Menu Button on Hover */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatContextMenuId(
                          chatContextMenuId === chat.id ? null : chat.id
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#8696a0] hover:text-white rounded transition"
                      title="Chat options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {chatContextMenuId === chat.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChatContextMenuId(null);
                          }}
                        />
                        <div className="absolute right-0 top-6 w-48 py-1.5 bg-[#233138] border border-[#2a3942] rounded-xl shadow-2xl z-50 text-xs text-[#d1d7db] animate-in fade-in duration-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePinChat(chat.id);
                              setChatContextMenuId(null);
                            }}
                            className="w-full px-3 py-2 hover:bg-[#182229] text-left flex items-center gap-2.5 transition"
                          >
                            <Pin className="w-3.5 h-3.5" />
                            {chat.isPinned ? 'Unpin chat' : 'Pin chat'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleMuteChat(chat.id);
                              setChatContextMenuId(null);
                            }}
                            className="w-full px-3 py-2 hover:bg-[#182229] text-left flex items-center gap-2.5 transition"
                          >
                            <BellOff className="w-3.5 h-3.5" />
                            {chat.isMuted ? 'Unmute notifications' : 'Mute notifications'}
                          </button>
                          <button
                            onClick={(e) => handleExportSingleChat(chat, e)}
                            className="w-full px-3 py-2 hover:bg-[#182229] text-left flex items-center gap-2.5 text-[#00a884] transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Export / Download chat
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPublicProfile(contact);
                              setChatContextMenuId(null);
                            }}
                            className="w-full px-3 py-2 hover:bg-[#182229] text-left flex items-center gap-2.5 transition"
                          >
                            <BadgeCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                            View contact info
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: STATUS / STORIES VIEW */}
      {activeNavTab === 'status' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* My Status */}
          <div
            onClick={onOpenCreateStatus}
            className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-[#202c33] cursor-pointer transition"
          >
            <div className="relative">
              <img
                src={
                  currentUser.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`
                }
                alt={currentUser.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center font-bold text-xs ring-2 ring-[#111b21]">
                +
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[#e9edef]">My status</h3>
              <p className="text-xs text-[#8696a0]">Tap to add status update</p>
            </div>
          </div>

          <div className="h-px bg-[#222e35]" />

          {/* Recent Status Updates */}
          <div>
            <div className="text-xs font-bold text-[#8696a0] uppercase tracking-wider mb-2">
              Recent updates
            </div>
            <div className="space-y-1">
              {statuses.map((status, idx) => (
                <div
                  key={status.id}
                  onClick={() => onOpenStatusViewer(idx)}
                  className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-[#202c33] cursor-pointer transition"
                >
                  <div className="p-0.5 rounded-full border-2 border-[#00a884]">
                    <img
                      src={
                        status.userAvatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${status.userUsername}`
                      }
                      alt={status.userName}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#e9edef] truncate">
                      {status.userName}
                    </h4>
                    <p className="text-xs text-[#8696a0]">
                      {new Date(status.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#202c33]/60 rounded-2xl border border-[#222e35] text-xs text-[#8696a0] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#00a884] shrink-0" />
            <span>Your status updates are end-to-end encrypted and disappear after 24 hours.</span>
          </div>
        </div>
      )}

      {/* TAB 3: CHANNELS VIEW */}
      {activeNavTab === 'channels' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#e9edef]">Stay updated on topics</h3>
              <p className="text-xs text-[#8696a0]">Find channels to follow</p>
            </div>
          </div>

          <div className="space-y-3">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="p-3.5 rounded-2xl bg-[#202c33] border border-[#2a3942] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={ch.avatar}
                      alt={ch.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-sm font-semibold text-[#e9edef] flex items-center gap-1">
                        {ch.name}
                        {ch.verified && (
                          <BadgeCheck className="w-4 h-4 text-[#00a884]" />
                        )}
                      </div>
                      <div className="text-xs text-[#8696a0]">{ch.followers}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleFollowChannel(ch.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                      ch.isFollowed
                        ? 'bg-[#2a3942] text-[#00a884]'
                        : 'bg-[#00a884] text-[#111b21] hover:bg-[#25d366]'
                    }`}
                  >
                    {ch.isFollowed ? 'Following' : 'Follow'}
                  </button>
                </div>
                <p className="text-xs text-[#d1d7db]">{ch.description}</p>
                <div className="p-2.5 rounded-xl bg-[#111b21] border border-[#222e35] text-xs text-[#8696a0]">
                  <span className="text-[#00a884] font-medium mr-1.5">Latest:</span>
                  {ch.lastPostText}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: COMMUNITIES VIEW */}
      {activeNavTab === 'communities' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="p-4 rounded-2xl bg-[#202c33] border border-[#2a3942] text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#00a884]/20 text-[#00a884] flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#e9edef]">Stay connected with a community</h3>
            <p className="text-xs text-[#8696a0]">
              Communities bring members together in topic-based groups, and make it easy to get admin announcements.
            </p>
            <button
              onClick={() => onShowToast('Community creation opened')}
              className="mt-2 px-4 py-2 rounded-xl bg-[#00a884] hover:bg-[#25d366] text-[#111b21] text-xs font-bold transition"
            >
              Start your community
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-[#8696a0] uppercase tracking-wider">
              Featured Communities
            </div>

            <div className="p-3 rounded-2xl bg-[#202c33] border border-[#2a3942] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600/30 text-violet-400 flex items-center justify-center font-bold">
                  DP
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">Developers Playground</h4>
                  <p className="text-xs text-[#8696a0]">4 groups • 1,280 members</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8696a0]" />
            </div>

            <div className="p-3 rounded-2xl bg-[#202c33] border border-[#2a3942] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold">
                  UX
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">Designers Guild</h4>
                  <p className="text-xs text-[#8696a0]">2 groups • 850 members</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8696a0]" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CALLS VIEW */}
      {activeNavTab === 'calls' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="text-xs font-bold text-[#8696a0] uppercase tracking-wider">
            Recent Calls
          </div>

          <div className="space-y-1 divide-y divide-[#222e35]/40">
            {callLogs.map((call) => {
              const contact = users.find((u) => u.id === call.contactId);
              if (!contact) return null;

              return (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#202c33] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        contact.avatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`
                      }
                      alt={contact.name}
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#e9edef] truncate">
                        {contact.name}
                      </div>
                      <div className="text-xs flex items-center gap-1.5 text-[#8696a0]">
                        {call.direction === 'incoming' && (
                          <PhoneIncoming className="w-3.5 h-3.5 text-[#00a884]" />
                        )}
                        {call.direction === 'outgoing' && (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-[#00a884]" />
                        )}
                        {call.direction === 'missed' && (
                          <PhoneMissed className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>
                          {new Date(call.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                          ,{' '}
                          {new Date(call.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onStartCall(contact, 'audio')}
                      className="p-2 rounded-full text-[#00a884] hover:bg-[#111b21] transition"
                      title="Audio Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onStartCall(contact, 'video')}
                      className="p-2 rounded-full text-[#00a884] hover:bg-[#111b21] transition"
                      title="Video Call"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: STARRED MESSAGES VIEW */}
      {activeNavTab === 'starred' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#8696a0] uppercase tracking-wider">
              Starred ({allStarredMessages.length})
            </div>
            {allStarredMessages.length > 0 && (
              <button
                onClick={() => {
                  let content = `Starred Messages Backup\nExported: ${new Date().toLocaleString()}\n\n`;
                  allStarredMessages.forEach(({ message, contact }) => {
                    content += `[${new Date(message.timestamp).toLocaleString()}] ${contact.name}: ${message.text}\n`;
                  });
                  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `WhatsApp_Starred_Messages_${Date.now()}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  onShowToast('Downloaded starred messages file!');
                }}
                className="text-xs text-[#00a884] hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download list
              </button>
            )}
          </div>

          {allStarredMessages.length === 0 ? (
            <div className="text-center py-12 text-[#8696a0] space-y-2">
              <Star className="w-10 h-10 mx-auto text-[#374248]" />
              <p className="text-sm">No starred messages yet.</p>
              <p className="text-xs">Hover any message in a chat and click Star to save it here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allStarredMessages.map(({ message, contact, chatId }) => (
                <div
                  key={message.id}
                  onClick={() => onSelectChat(chatId)}
                  className="p-3 rounded-2xl bg-[#202c33] border border-[#2a3942] hover:border-[#00a884]/40 cursor-pointer transition space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={
                          contact.avatar ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`
                        }
                        alt={contact.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs font-semibold text-[#e9edef]">{contact.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#8696a0]">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnstarMessage(message.id, chatId);
                          onShowToast('Removed from Starred');
                        }}
                        className="text-[#f59e0b] hover:text-rose-400 p-0.5"
                        title="Unstar"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#d1d7db] line-clamp-2">{message.text || '[Media]'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button (New Chat or Status) */}
      <div className="absolute bottom-5 right-5 z-20">
        <button
          onClick={() => {
            if (activeNavTab === 'status') {
              onOpenCreateStatus();
            } else {
              setIsNewChatModalOpen(true);
            }
          }}
          className="w-13 h-13 rounded-2xl bg-[#00a884] hover:bg-[#25d366] text-[#111b21] shadow-xl shadow-[#00a884]/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title={activeNavTab === 'status' ? 'Add Status' : 'New Chat'}
        >
          {activeNavTab === 'status' ? (
            <Camera className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <MessageSquare className="w-6 h-6 fill-current" />
          )}
        </button>
      </div>

      {/* New Chat Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111b21] border border-[#222e35] rounded-3xl p-5 shadow-2xl text-[#e9edef] animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">New Chat</h3>
              <button
                onClick={() => {
                  setIsNewChatModalOpen(false);
                  setNewChatSearchQuery('');
                  setRegisteredSearchResults([]);
                }}
                className="p-1 text-[#8696a0] hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Username Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by @username..."
                value={newChatSearchQuery}
                onChange={(e) => handleSearchRegisteredUsers(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[#202c33] text-sm text-[#e9edef] rounded-xl outline-none border border-[#2a3942] focus:border-[#00a884] placeholder-[#8696a0]"
                autoFocus
              />
              {newChatSearchQuery && (
                <button
                  onClick={() => handleSearchRegisteredUsers('')}
                  className="absolute right-2.5 top-2.5 text-[#8696a0] hover:text-[#e9edef]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List of Users */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {isSearchingUsers ? (
                <div className="py-8 text-center text-xs text-[#8696a0] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00a884]" />
                  Searching registered users...
                </div>
              ) : (() => {
                  // Merge registered search results and known users, deduplicating by ID
                  const displayedList = newChatSearchQuery.trim()
                    ? [
                        ...registeredSearchResults,
                        ...users.filter(
                          (u) =>
                            u.id !== currentUser.id &&
                            (u.username.toLowerCase().includes(newChatSearchQuery.toLowerCase().replace('@', '')) ||
                              u.name.toLowerCase().includes(newChatSearchQuery.toLowerCase())) &&
                            !registeredSearchResults.some((r) => r.id === u.id)
                        ),
                      ]
                    : users.filter((u) => u.id !== currentUser.id);

                  if (displayedList.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-[#8696a0] space-y-1">
                        <p className="font-semibold text-[#d1d7db]">No registered users found</p>
                        <p className="text-[11px]">Make sure the @username matches an existing account.</p>
                      </div>
                    );
                  }

                  return displayedList.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        onStartNewChatWithUser(u);
                        setIsNewChatModalOpen(false);
                        setNewChatSearchQuery('');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[#202c33] transition text-left border border-[#222e35] cursor-pointer group"
                    >
                      <img
                        src={
                          u.avatar ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`
                        }
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                          {u.name}
                          {u.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-[#00a884]" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#00a884]">@{u.username}</div>
                        <div className="text-[10px] text-[#8696a0] truncate">{u.bio || 'Available'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPublicProfile(u);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[11px] text-[#8696a0] hover:text-[#00a884] px-2 py-1 rounded-lg hover:bg-[#2a3942] transition"
                        title="View Profile"
                      >
                        Profile
                      </button>
                    </div>
                  ));
                })()}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
