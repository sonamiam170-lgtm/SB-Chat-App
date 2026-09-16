import React, { useState, useRef } from 'react';
import { AppSettings, User, Chat, Message, CallLogItem } from '../types';
import {
  ArrowLeft,
  Search,
  Bell,
  Lock,
  Shield,
  Palette,
  Image as ImageIcon,
  MessageSquare,
  Database,
  Keyboard,
  HelpCircle,
  LogOut,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Camera,
  QrCode,
  Download,
  Share2,
  Edit2,
  Trash2,
  UserCheck,
  ShieldCheck,
  HardDrive,
  Eye,
  CheckCheck,
  Volume2,
  VolumeX,
  X,
  Phone,
  Video,
  FileText,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

export type SettingsScreen =
  | 'main'
  | 'profile'
  | 'notifications'
  | 'privacy'
  | 'security'
  | 'theme'
  | 'wallpaper'
  | 'chats'
  | 'storage'
  | 'shortcuts'
  | 'help';

interface SettingsPanelProps {
  currentUser: User;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onSaveProfile: (updated: Partial<User>) => void;
  blockedUsers: User[];
  onUnblockUser: (userId: string) => void;
  onBack: () => void;
  onLogout: () => void;
  onDownloadFullBackup: () => void;
  onClearAllChats?: () => void;
  onShowToast: (msg: string) => void;
}

const CLASSIC_WHATSAPP_ABOUTS = [
  'Available',
  'Busy',
  'At school',
  'At the movies',
  'At work',
  'Battery about to die',
  "Can't talk, WhatsApp only",
  'In a meeting',
  'At the gym',
  'Sleeping',
  'Urgent calls only',
  'Product Designer & Tech enthusiast 🚀',
  'Coffee, code and quiet moments ☕️',
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
];

const SHORTCUTS_DATA = [
  { action: 'Mark as unread', keys: ['Ctrl', 'Alt', 'Shift', 'U'] },
  { action: 'Mute chat', keys: ['Ctrl', 'Alt', 'Shift', 'M'] },
  { action: 'Archive chat', keys: ['Ctrl', 'Alt', 'Shift', 'E'] },
  { action: 'Delete chat', keys: ['Ctrl', 'Alt', 'Backspace'] },
  { action: 'Pin chat', keys: ['Ctrl', 'Alt', 'Shift', 'P'] },
  { action: 'Search', keys: ['Ctrl', 'Alt', '/'] },
  { action: 'Search in chat', keys: ['Ctrl', 'Alt', 'Shift', 'F'] },
  { action: 'New chat', keys: ['Ctrl', 'Alt', 'N'] },
  { action: 'Next chat', keys: ['Ctrl', 'Alt', 'Tab'] },
  { action: 'Previous chat', keys: ['Ctrl', 'Alt', 'Shift', 'Tab'] },
  { action: 'New group', keys: ['Ctrl', 'Alt', 'Shift', 'N'] },
  { action: 'Profile & About', keys: ['Ctrl', 'Alt', 'P'] },
  { action: 'Settings', keys: ['Ctrl', 'Alt', ','] },
  { action: 'Close chat / Back', keys: ['Escape'] },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentUser,
  settings,
  onUpdateSettings,
  onSaveProfile,
  blockedUsers,
  onUnblockUser,
  onBack,
  onLogout,
  onDownloadFullBackup,
  onClearAllChats,
  onShowToast,
}) => {
  const [currentScreen, setCurrentScreen] = useState<SettingsScreen>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Profile edit states
  const [editName, setEditName] = useState(currentUser.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editAbout, setEditAbout] = useState(currentUser.status || 'Available');
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState(currentUser.avatar || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut search state
  const [shortcutSearch, setShortcutSearch] = useState('');

  // Handle avatar upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setCustomAvatarUrl(result);
        onSaveProfile({ avatar: result });
        onShowToast('Profile photo updated successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      onSaveProfile({ name: editName.trim() });
      setIsEditingName(false);
      onShowToast('Name updated');
    }
  };

  const handleSaveAbout = (newAbout: string) => {
    setEditAbout(newAbout);
    onSaveProfile({ status: newAbout });
    setIsEditingAbout(false);
    onShowToast('About status updated');
  };

  // Main Category Items definition
  const SETTINGS_CATEGORIES = [
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Message, audio tones, reaction alerts',
      icon: Bell,
    },
    {
      id: 'privacy',
      title: 'Privacy',
      subtitle: 'Block contacts, disappearing messages, read receipts',
      icon: Lock,
    },
    {
      id: 'security',
      title: 'Security',
      subtitle: 'Security notifications, two-step verification',
      icon: Shield,
    },
    {
      id: 'theme',
      title: 'Theme',
      subtitle: settings.theme === 'dark' ? 'Dark' : 'Light',
      icon: Palette,
    },
    {
      id: 'wallpaper',
      title: 'Chat wallpaper',
      subtitle:
        settings.chatWallpaper === 'doodle'
          ? 'WhatsApp Doodle'
          : settings.chatWallpaper === 'emerald'
          ? 'Emerald Night'
          : settings.chatWallpaper === 'warm'
          ? 'Warm Charcoal'
          : 'Solid Dark',
      icon: ImageIcon,
    },
    {
      id: 'chats',
      title: 'Chats',
      subtitle: 'Font size, enter is send, chat backup',
      icon: MessageSquare,
    },
    {
      id: 'storage',
      title: 'Storage and data',
      subtitle: 'Network usage, media auto-download',
      icon: Database,
    },
    {
      id: 'shortcuts',
      title: 'Keyboard shortcuts',
      subtitle: 'Official keyboard shortcuts',
      icon: Keyboard,
    },
    {
      id: 'help',
      title: 'Help',
      subtitle: 'Help center, contact us, licenses',
      icon: HelpCircle,
    },
  ] as const;

  const filteredCategories = SETTINGS_CATEGORIES.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#111b21] text-[#e9edef] select-none overflow-hidden">
      {/* ============================================================ */}
      {/* 1. MAIN SETTINGS SCREEN                                      */}
      {/* ============================================================ */}
      {currentScreen === 'main' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={onBack}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
              title="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Settings</h2>
          </div>

          {/* Search bar inside settings */}
          <div className="p-3 bg-[#111b21] border-b border-[#222e35]/60">
            <div className="relative flex items-center bg-[#202c33] rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884] transition">
              <Search className="w-4 h-4 text-[#8696a0] mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Search settings"
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
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-[#222e35]/50">
            {/* PROFILE TILE (WhatsApp Web Signature row) */}
            {!searchQuery && (
              <div
                onClick={() => setCurrentScreen('profile')}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-[#202c33] cursor-pointer transition group"
              >
                <div className="relative shrink-0">
                  <img
                    src={
                      currentUser.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`
                    }
                    alt={currentUser.name}
                    className="w-14 h-14 rounded-full object-cover border border-[#2a3942]"
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00a884] ring-2 ring-[#111b21]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-[#e9edef] truncate">
                    {currentUser.name}
                  </h3>
                  <p className="text-xs text-[#8696a0] truncate mt-0.5">
                    {currentUser.status || 'Hey there! I am using WhatsApp.'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8696a0] group-hover:text-[#e9edef] transition shrink-0" />
              </div>
            )}

            {/* CATEGORY ROWS */}
            <div className="divide-y divide-[#222e35]/40">
              {filteredCategories.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => setCurrentScreen(item.id as SettingsScreen)}
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-[#202c33] cursor-pointer transition group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#202c33] group-hover:bg-[#2a3942] flex items-center justify-center shrink-0 text-[#8696a0] group-hover:text-[#00a884] transition">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[15px] font-medium text-[#e9edef] truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#8696a0] truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8696a0] group-hover:text-[#e9edef] transition shrink-0" />
                  </div>
                );
              })}
            </div>

            {/* LOG OUT BUTTON */}
            <div className="p-4 pt-5 pb-8">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-[#ea4335]/10 text-[#ea4335] transition font-semibold text-sm group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#ea4335]/10 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <span>Log out</span>
              </button>
              <p className="text-[11px] text-[#8696a0] text-center mt-4">
                WhatsApp Web • End-to-End Encrypted
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. PROFILE SCREEN                                            */}
      {/* ============================================================ */}
      {currentScreen === 'profile' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Profile</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
            {/* Avatar section */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <img
                  src={
                    currentUser.avatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`
                  }
                  alt={currentUser.name}
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-[#202c33]"
                />
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition cursor-pointer"
                  title="Change profile photo"
                >
                  <Camera className="w-7 h-7 mb-1" />
                  <span className="text-[11px] uppercase tracking-wider font-semibold">
                    Change photo
                  </span>
                </button>
              </div>

              {/* Avatar pickers */}
              {showAvatarPicker && (
                <div className="mt-4 p-4 w-full bg-[#202c33] rounded-2xl border border-[#2a3942] space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e9edef]">
                      Choose preset or upload
                    </span>
                    <button
                      onClick={() => setShowAvatarPicker(false)}
                      className="text-xs text-[#8696a0] hover:text-[#e9edef]"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    {PRESET_AVATARS.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="preset"
                        onClick={() => {
                          onSaveProfile({ avatar: url });
                          setShowAvatarPicker(false);
                          onShowToast('Profile photo updated');
                        }}
                        className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-[#00a884] transition"
                      />
                    ))}
                  </div>
                  <div className="pt-2 border-t border-[#2a3942]">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 rounded-xl bg-[#00a884] text-[#111b21] font-bold text-xs hover:bg-[#00a884]/90 transition"
                    >
                      Upload custom photo
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Display Name */}
            <div className="p-4 bg-[#202c33] rounded-2xl border border-[#2a3942] space-y-2">
              <span className="text-xs text-[#00a884] font-medium">Your name</span>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    maxLength={25}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-[#111b21] border border-[#00a884] rounded-xl px-3 py-2 text-sm text-[#e9edef] outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-2 bg-[#00a884] text-[#111b21] rounded-xl font-bold"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#e9edef]">
                    {currentUser.name}
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-[#8696a0] hover:text-[#00a884] transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-[11px] text-[#8696a0] leading-relaxed pt-1">
                This is not your username or pin. This name will be visible to your WhatsApp
                contacts.
              </p>
            </div>

            {/* About / Status */}
            <div className="p-4 bg-[#202c33] rounded-2xl border border-[#2a3942] space-y-2">
              <span className="text-xs text-[#00a884] font-medium">About</span>
              {isEditingAbout ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editAbout}
                    maxLength={70}
                    onChange={(e) => setEditAbout(e.target.value)}
                    className="flex-1 bg-[#111b21] border border-[#00a884] rounded-xl px-3 py-2 text-sm text-[#e9edef] outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveAbout(editAbout)}
                    className="p-2 bg-[#00a884] text-[#111b21] rounded-xl font-bold"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#e9edef]">
                    {currentUser.status || 'Available'}
                  </span>
                  <button
                    onClick={() => setIsEditingAbout(true)}
                    className="p-1 text-[#8696a0] hover:text-[#00a884] transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Quick classic about presets */}
              <div className="pt-2 border-t border-[#2a3942]/60">
                <span className="text-[11px] text-[#8696a0] font-medium block mb-2">
                  Select classic status:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                  {CLASSIC_WHATSAPP_ABOUTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSaveAbout(item)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                        currentUser.status === item
                          ? 'border-[#00a884] bg-[#00a884]/20 text-[#00a884]'
                          : 'border-[#2a3942] text-[#8696a0] hover:text-[#e9edef] hover:border-[#8696a0]'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* QR Code Action Button */}
            <div className="p-4 bg-[#202c33] rounded-2xl border border-[#2a3942] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111b21] flex items-center justify-center text-[#00a884]">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">My QR Code</h4>
                  <p className="text-xs text-[#8696a0]">Scan to add or share profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(true)}
                className="px-3 py-1.5 bg-[#00a884] text-[#111b21] text-xs font-bold rounded-xl hover:bg-[#00a884]/90 transition"
              >
                View QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. NOTIFICATIONS SCREEN                                      */}
      {/* ============================================================ */}
      {currentScreen === 'notifications' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Notifications</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider">
              Messages
            </div>

            <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] divide-y divide-[#2a3942]/60 overflow-hidden">
              {/* Message notifications */}
              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2a3942]/30 transition">
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">
                    Message notifications
                  </h4>
                  <p className="text-xs text-[#8696a0] mt-0.5">
                    Show notification banners for new incoming messages
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => onUpdateSettings({ notifications: e.target.checked })}
                  className="w-5 h-5 accent-[#00a884] cursor-pointer"
                />
              </label>

              {/* Message audio sounds */}
              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2a3942]/30 transition">
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">
                    Turn on message audio tones
                  </h4>
                  <p className="text-xs text-[#8696a0] mt-0.5">
                    Play chime sounds for incoming & sent messages
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.messageSounds}
                  onChange={(e) => onUpdateSettings({ messageSounds: e.target.checked })}
                  className="w-5 h-5 accent-[#00a884] cursor-pointer"
                />
              </label>

              {/* Show previews */}
              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2a3942]/30 transition">
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">Show previews</h4>
                  <p className="text-xs text-[#8696a0] mt-0.5">
                    Display message text inside new message notifications
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => {}}
                  className="w-5 h-5 accent-[#00a884] cursor-pointer"
                />
              </label>

              {/* Show reaction notifications */}
              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2a3942]/30 transition">
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">
                    Reaction notifications
                  </h4>
                  <p className="text-xs text-[#8696a0] mt-0.5">
                    Get notified when someone reacts to a message you send
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => {}}
                  className="w-5 h-5 accent-[#00a884] cursor-pointer"
                />
              </label>
            </div>

            <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider pt-2">
              Calls & Ringtones
            </div>

            <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] divide-y divide-[#2a3942]/60 overflow-hidden">
              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2a3942]/30 transition">
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">
                    Incoming call ringtones
                  </h4>
                  <p className="text-xs text-[#8696a0] mt-0.5">
                    Play ringtone chime during voice and video calls
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.callSounds}
                  onChange={(e) => onUpdateSettings({ callSounds: e.target.checked })}
                  className="w-5 h-5 accent-[#00a884] cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. PRIVACY SCREEN                                            */}
      {/* ============================================================ */}
      {currentScreen === 'privacy' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Privacy</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            {/* Who can see personal info */}
            <div>
              <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-2">
                Who can see my personal info
              </div>
              <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] divide-y divide-[#2a3942]/60 overflow-hidden">
                {/* Last seen */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">
                      Last seen and online
                    </h4>
                    <p className="text-xs text-[#8696a0]">
                      {settings.privacyLastSeen === 'everyone'
                        ? 'Everyone'
                        : settings.privacyLastSeen === 'contacts'
                        ? 'My contacts'
                        : 'Nobody'}
                    </p>
                  </div>
                  <select
                    value={settings.privacyLastSeen}
                    onChange={(e) =>
                      onUpdateSettings({
                        privacyLastSeen: e.target.value as AppSettings['privacyLastSeen'],
                      })
                    }
                    className="bg-[#111b21] border border-[#2a3942] rounded-xl px-2.5 py-1.5 text-xs text-[#e9edef] outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                {/* Profile photo visibility */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">Profile photo</h4>
                    <p className="text-xs text-[#8696a0]">Everyone</p>
                  </div>
                  <select
                    defaultValue="everyone"
                    className="bg-[#111b21] border border-[#2a3942] rounded-xl px-2.5 py-1.5 text-xs text-[#e9edef] outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                {/* About visibility */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">About</h4>
                    <p className="text-xs text-[#8696a0]">Everyone</p>
                  </div>
                  <select
                    defaultValue="everyone"
                    className="bg-[#111b21] border border-[#2a3942] rounded-xl px-2.5 py-1.5 text-xs text-[#e9edef] outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Read receipts */}
            <div>
              <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-2">
                Messaging
              </div>
              <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">Read receipts</h4>
                    <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                      If turned off, you won't send or receive Read receipts (blue double
                      checkmarks). Read receipts are always sent for group chats.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.privacyReadReceipts}
                    onChange={(e) =>
                      onUpdateSettings({ privacyReadReceipts: e.target.checked })
                    }
                    className="w-5 h-5 accent-[#00a884] cursor-pointer ml-3"
                  />
                </label>
              </div>
            </div>

            {/* Disappearing messages */}
            <div>
              <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-2">
                Disappearing messages
              </div>
              <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">
                      Default message timer
                    </h4>
                    <p className="text-xs text-[#8696a0] mt-0.5">
                      Start new chats with disappearing messages set to this timer
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {(
                    [
                      { id: 'off', label: 'Off' },
                      { id: '24h', label: '24 hours' },
                      { id: '7d', label: '7 days' },
                      { id: '90d', label: '90 days' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onUpdateSettings({ disappearingTimer: t.id })}
                      className={`p-2 rounded-xl text-xs font-medium border transition ${
                        settings.disappearingTimer === t.id
                          ? 'border-[#00a884] bg-[#00a884]/15 text-[#00a884]'
                          : 'border-[#2a3942] text-[#8696a0] hover:text-[#e9edef]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Blocked contacts */}
            <div>
              <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-2">
                Blocked contacts ({blockedUsers.length})
              </div>
              <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] p-4">
                {blockedUsers.length === 0 ? (
                  <p className="text-xs text-[#8696a0] italic text-center py-2">
                    No blocked contacts
                  </p>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#111b21] border border-[#2a3942]"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-xs font-semibold text-[#e9edef]">
                              {u.name}
                            </div>
                            <div className="text-[10px] text-[#8696a0]">@{u.username}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onUnblockUser(u.id);
                            onShowToast(`Unblocked ${u.name}`);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-[#00a884] hover:bg-[#00a884]/10 rounded-lg transition"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. SECURITY SCREEN                                           */}
      {/* ============================================================ */}
      {currentScreen === 'security' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Security</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            {/* Encryption notice */}
            <div className="p-4 rounded-2xl bg-[#00a884]/10 border border-[#00a884]/30 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-[#00a884] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-[#00a884]">
                  Your chats and calls are private
                </h4>
                <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                  End-to-end encryption keeps your personal messages and calls between you and
                  the people you choose. Not even WhatsApp or SB Messenger can read or listen
                  to them.
                </p>
              </div>
            </div>

            {/* Security notifications toggle */}
            <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">
                    Show security notifications on this computer
                  </h4>
                  <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                    Get notified when your security code changes for a contact's phone.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.securityNotifications}
                  onChange={(e) =>
                    onUpdateSettings({ securityNotifications: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#00a884] cursor-pointer ml-3"
                />
              </label>
            </div>

            {/* Two-step verification */}
            <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-[#00a884] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">
                      Two-step verification PIN
                    </h4>
                    <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                      For extra security, require a 6-digit PIN when registering your phone
                      number with WhatsApp again.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.twoStepVerification}
                  onChange={(e) =>
                    onUpdateSettings({ twoStepVerification: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#00a884] cursor-pointer ml-3"
                />
              </label>
            </div>

            {/* Request Account Info */}
            <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] p-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#e9edef]">
                  Request account information
                </h4>
                <p className="text-xs text-[#8696a0] mt-0.5">
                  Download a report of your WhatsApp account information and settings
                </p>
              </div>
              <button
                onClick={() => {
                  onDownloadFullBackup();
                  onShowToast('Account report exported');
                }}
                className="px-3 py-1.5 bg-[#00a884] text-[#111b21] rounded-xl text-xs font-bold hover:bg-[#00a884]/90 transition"
              >
                Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. THEME SCREEN                                              */}
      {/* ============================================================ */}
      {currentScreen === 'theme' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Theme</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] divide-y divide-[#2a3942]/60 overflow-hidden">
              {/* Dark */}
              <label
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2a3942]/30 transition"
              >
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-[#00a884]" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">Dark (Default)</h4>
                    <p className="text-xs text-[#8696a0]">
                      Classic WhatsApp Web dark interface
                    </p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === 'dark'}
                  onChange={() => onUpdateSettings({ theme: 'dark' })}
                  className="w-4 h-4 accent-[#00a884] cursor-pointer"
                />
              </label>

              {/* Light */}
              <label
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2a3942]/30 transition"
              >
                <div className="flex items-center gap-3">
                  <Sun className="w-5 h-5 text-[#f59e0b]" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">Light</h4>
                    <p className="text-xs text-[#8696a0]">Bright and clean layout</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === 'light'}
                  onChange={() => onUpdateSettings({ theme: 'light' })}
                  className="w-4 h-4 accent-[#00a884] cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. CHAT WALLPAPER SCREEN                                     */}
      {/* ============================================================ */}
      {currentScreen === 'wallpaper' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Chat wallpaper</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider">
              Choose wallpaper
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: 'doodle',
                  name: 'WhatsApp Doodle',
                  bg: 'bg-[#0b141a]',
                  pattern: 'radial-gradient(#202c33 1px, transparent 1px)',
                },
                { id: 'dark', name: 'Solid Dark', bg: 'bg-[#0b141a]' },
                { id: 'emerald', name: 'Emerald Night', bg: 'bg-[#00221c]' },
                { id: 'warm', name: 'Warm Charcoal', bg: 'bg-[#181310]' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onUpdateSettings({
                      chatWallpaper: item.id as AppSettings['chatWallpaper'],
                    });
                    onShowToast(`Wallpaper updated: ${item.name}`);
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-2.5 transition ${
                    settings.chatWallpaper === item.id
                      ? 'border-[#00a884] bg-[#202c33] ring-1 ring-[#00a884]'
                      : 'border-[#2a3942] bg-[#202c33]/40 hover:border-[#8696a0]'
                  }`}
                >
                  <div
                    className={`w-full h-20 rounded-xl ${item.bg} border border-[#2a3942] flex items-center justify-center`}
                    style={{
                      backgroundImage: item.pattern,
                      backgroundSize: '8px 8px',
                    }}
                  >
                    {settings.chatWallpaper === item.id && (
                      <Check className="w-5 h-5 text-[#00a884]" />
                    )}
                  </div>
                  <span className="text-xs text-[#e9edef] font-semibold">{item.name}</span>
                </button>
              ))}
            </div>

            {/* Doodle pattern toggle */}
            <div className="p-4 bg-[#202c33] rounded-2xl border border-[#2a3942]">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">
                    Add WhatsApp doodles
                  </h4>
                  <p className="text-xs text-[#8696a0] mt-0.5">
                    Draw subtle messenger icons and doodles over the background
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.chatWallpaper === 'doodle'}
                  onChange={(e) =>
                    onUpdateSettings({
                      chatWallpaper: e.target.checked ? 'doodle' : 'dark',
                    })
                  }
                  className="w-5 h-5 accent-[#00a884] cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. CHATS SCREEN                                              */}
      {/* ============================================================ */}
      {currentScreen === 'chats' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Chats</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            {/* Display Options */}
            <div>
              <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-2">
                Display
              </div>
              <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] divide-y divide-[#2a3942]/60 overflow-hidden">
                {/* Enter is send */}
                <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2a3942]/30 transition">
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">Enter is send</h4>
                    <p className="text-xs text-[#8696a0] mt-0.5">
                      Enter key sends message; Shift + Enter adds a new line
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enterIsSend}
                    onChange={(e) => onUpdateSettings({ enterIsSend: e.target.checked })}
                    className="w-5 h-5 accent-[#00a884] cursor-pointer"
                  />
                </label>

                {/* Font Size */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#e9edef]">Font size</h4>
                    <span className="text-xs text-[#00a884] capitalize font-medium">
                      {settings.fontSize}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => onUpdateSettings({ fontSize: size })}
                        className={`py-2 rounded-xl text-xs font-semibold capitalize border transition ${
                          settings.fontSize === size
                            ? 'border-[#00a884] bg-[#00a884]/20 text-[#00a884]'
                            : 'border-[#2a3942] text-[#8696a0] hover:text-[#e9edef]'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Backup */}
            <div>
              <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-2">
                Chat Backup
              </div>
              <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <HardDrive className="w-5 h-5 text-[#00a884] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#e9edef]">
                      Back up messages and media
                    </h4>
                    <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                      Download a full timestamped JSON backup of all conversations, contacts,
                      call records, and media attachments.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onDownloadFullBackup();
                    onShowToast('Full WhatsApp backup downloaded');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#00a884] text-[#111b21] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#00a884]/90 transition"
                >
                  <Download className="w-4 h-4" />
                  Download full backup (.json)
                </button>
              </div>
            </div>

            {/* Chat Management / Dangerous */}
            <div>
              <div className="text-xs font-bold text-[#ea4335] uppercase tracking-wider mb-2">
                Management
              </div>
              <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] p-4 space-y-3">
                <button
                  onClick={() => setShowClearChatsConfirm(true)}
                  className="w-full py-2.5 rounded-xl border border-[#ea4335]/40 text-[#ea4335] hover:bg-[#ea4335]/10 font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all messages
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. STORAGE AND DATA SCREEN                                   */}
      {/* ============================================================ */}
      {currentScreen === 'storage' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Storage and data</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            {/* Storage bar */}
            <div className="p-4 bg-[#202c33] rounded-2xl border border-[#2a3942] space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-[#e9edef]">Local Storage</span>
                <span className="text-[#00a884]">4.2 MB used</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#111b21] overflow-hidden">
                <div className="h-full w-[28%] bg-[#00a884] rounded-full"></div>
              </div>
              <p className="text-[11px] text-[#8696a0]">
                Photos, voice messages and chat texts cached in browser memory
              </p>
            </div>

            {/* Media Auto Download */}
            <div>
              <div className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-2">
                Media auto-download
              </div>
              <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] divide-y divide-[#2a3942]/60 overflow-hidden">
                {['Photos', 'Audio & Voice Notes', 'Videos', 'Documents'].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2a3942]/30 transition"
                  >
                    <span className="text-sm font-medium text-[#e9edef]">{item}</span>
                    <input
                      type="checkbox"
                      defaultChecked={idx < 2}
                      className="w-5 h-5 accent-[#00a884] cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Clear cache */}
            <div className="p-4 bg-[#202c33] rounded-2xl border border-[#2a3942] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#e9edef]">
                  Clear temporary media cache
                </h4>
                <p className="text-xs text-[#8696a0]">
                  Free up memory without deleting chat history
                </p>
              </div>
              <button
                onClick={() => onShowToast('Media cache cleared')}
                className="px-3 py-1.5 bg-[#2a3942] hover:bg-[#374248] text-xs font-semibold text-[#e9edef] rounded-xl transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 10. KEYBOARD SHORTCUTS SCREEN                                */}
      {/* ============================================================ */}
      {currentScreen === 'shortcuts' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Keyboard shortcuts</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            <div className="relative flex items-center bg-[#202c33] rounded-xl px-3 py-1.5 border border-[#2a3942] mb-3">
              <Search className="w-4 h-4 text-[#8696a0] mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search shortcuts"
                value={shortcutSearch}
                onChange={(e) => setShortcutSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-[#e9edef] placeholder-[#8696a0] outline-none"
              />
            </div>

            <div className="space-y-2">
              {SHORTCUTS_DATA.filter((s) =>
                s.action.toLowerCase().includes(shortcutSearch.toLowerCase())
              ).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#202c33] border border-[#2a3942]/60"
                >
                  <span className="text-xs text-[#e9edef] font-medium">{item.action}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, ki) => (
                      <kbd
                        key={ki}
                        className="px-1.5 py-0.5 rounded-md bg-[#111b21] border border-[#2a3942] text-[10px] text-[#00a884] font-mono shadow-xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 11. HELP SCREEN                                              */}
      {/* ============================================================ */}
      {currentScreen === 'help' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-[#202c33] px-4 flex items-center gap-4 shrink-0 border-b border-[#2a3942]">
            <button
              onClick={() => setCurrentScreen('main')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-[#e9edef]">Help</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            <div className="bg-[#202c33] rounded-2xl border border-[#2a3942] divide-y divide-[#2a3942]/60 overflow-hidden">
              <button
                onClick={() =>
                  onShowToast('Help Center: Visit https://faq.whatsapp.com for support')
                }
                className="w-full flex items-center justify-between p-4 hover:bg-[#2a3942]/40 transition text-left"
              >
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">Help Center</h4>
                  <p className="text-xs text-[#8696a0]">Browse common questions and answers</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8696a0]" />
              </button>

              <button
                onClick={() => onShowToast('Contact support: feedback logged')}
                className="w-full flex items-center justify-between p-4 hover:bg-[#2a3942]/40 transition text-left"
              >
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">Contact us</h4>
                  <p className="text-xs text-[#8696a0]">Questions? Need help with messenger?</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8696a0]" />
              </button>

              <button
                onClick={() => onShowToast('Terms and Privacy Policy loaded')}
                className="w-full flex items-center justify-between p-4 hover:bg-[#2a3942]/40 transition text-left"
              >
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef]">
                    Terms and Privacy Policy
                  </h4>
                  <p className="text-xs text-[#8696a0]">Read our terms and conditions</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8696a0]" />
              </button>
            </div>

            <div className="p-4 bg-[#202c33]/40 rounded-2xl border border-[#2a3942]/60 text-center space-y-1">
              <div className="text-xs font-semibold text-[#e9edef]">WhatsApp Web Client</div>
              <div className="text-[11px] text-[#8696a0]">Version 2.26.1 • Beta Release</div>
              <div className="text-[10px] text-[#00a884] pt-1">
                🔒 Protected by End-to-End Encryption
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QR CODE MODAL DIALOG                                         */}
      {/* ============================================================ */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#202c33] rounded-3xl border border-[#2a3942] p-6 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#e9edef]">My WhatsApp QR Code</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Card Container */}
            <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center shadow-lg">
              <div className="relative mb-2">
                <img
                  src={
                    currentUser.avatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`
                  }
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#00a884]"
                />
              </div>
              <div className="text-sm font-bold text-gray-900 mb-0.5">
                {currentUser.name}
              </div>
              <div className="text-xs text-[#00a884] font-medium mb-3">
                @{currentUser.username}
              </div>

              {/* High fidelity SVG QR representation */}
              <div className="p-2 bg-white rounded-xl border border-gray-200">
                <svg
                  viewBox="0 0 160 160"
                  className="w-44 h-44"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="160" height="160" fill="white" />
                  {/* Outer corner boxes */}
                  <rect x="10" y="10" width="40" height="40" fill="#111b21" rx="4" />
                  <rect x="18" y="18" width="24" height="24" fill="white" rx="2" />
                  <rect x="24" y="24" width="12" height="12" fill="#00a884" rx="2" />

                  <rect x="110" y="10" width="40" height="40" fill="#111b21" rx="4" />
                  <rect x="118" y="18" width="24" height="24" fill="white" rx="2" />
                  <rect x="124" y="24" width="12" height="12" fill="#00a884" rx="2" />

                  <rect x="10" y="110" width="40" height="40" fill="#111b21" rx="4" />
                  <rect x="18" y="118" width="24" height="24" fill="white" rx="2" />
                  <rect x="24" y="124" width="12" height="12" fill="#00a884" rx="2" />

                  {/* QR Pattern Matrix Dots */}
                  <rect x="60" y="15" width="8" height="8" fill="#111b21" />
                  <rect x="75" y="15" width="8" height="8" fill="#111b21" />
                  <rect x="90" y="25" width="8" height="8" fill="#111b21" />
                  <rect x="65" y="35" width="8" height="8" fill="#111b21" />
                  <rect x="80" y="45" width="8" height="8" fill="#00a884" />

                  <rect x="20" y="65" width="8" height="8" fill="#111b21" />
                  <rect x="35" y="75" width="8" height="8" fill="#111b21" />
                  <rect x="50" y="65" width="8" height="8" fill="#111b21" />
                  <rect x="70" y="70" width="20" height="20" fill="#111b21" rx="4" />
                  <circle cx="80" cy="80" r="5" fill="#00a884" />

                  <rect x="100" y="65" width="8" height="8" fill="#111b21" />
                  <rect x="115" y="75" width="8" height="8" fill="#111b21" />
                  <rect x="135" y="65" width="8" height="8" fill="#111b21" />

                  <rect x="60" y="110" width="8" height="8" fill="#111b21" />
                  <rect x="75" y="125" width="8" height="8" fill="#111b21" />
                  <rect x="90" y="110" width="8" height="8" fill="#111b21" />
                  <rect x="110" y="120" width="8" height="8" fill="#111b21" />
                  <rect x="125" y="135" width="8" height="8" fill="#00a884" />
                </svg>
              </div>

              <p className="text-[11px] text-gray-500 mt-2 font-medium">
                Your QR code is private. If you share it, anyone can scan it to message you.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#ffffff"/><text x="150" y="50" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#00a884">${currentUser.name}</text><text x="150" y="80" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#666">@${currentUser.username}</text><rect x="50" y="100" width="200" height="150" rx="10" fill="#202c33"/></svg>`;
                  const blob = new Blob([svgData], { type: 'image/svg+xml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `WhatsApp_QR_${currentUser.username}.svg`;
                  a.click();
                  URL.revokeObjectURL(url);
                  onShowToast('QR Code SVG downloaded');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#00a884] text-[#111b21] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#00a884]/90 transition"
              >
                <Download className="w-4 h-4" />
                Download QR
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://whatsapp.com/contact/${currentUser.username}`
                  );
                  onShowToast('Link copied to clipboard');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#2a3942] text-[#e9edef] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-[#374248] transition"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LOGOUT CONFIRMATION MODAL                                    */}
      {/* ============================================================ */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-[#202c33] rounded-3xl border border-[#2a3942] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ea4335]/15 flex items-center justify-center text-[#ea4335] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e9edef]">Log out?</h3>
                <p className="text-xs text-[#8696a0] mt-0.5">
                  Are you sure you want to log out of WhatsApp?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-[#2a3942] text-[#e9edef] font-semibold text-xs hover:bg-[#374248] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2 rounded-xl bg-[#ea4335] text-white font-bold text-xs hover:bg-[#ea4335]/90 transition"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CLEAR CHATS CONFIRMATION MODAL                               */}
      {/* ============================================================ */}
      {showClearChatsConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setShowClearChatsConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-[#202c33] rounded-3xl border border-[#2a3942] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ea4335]/15 flex items-center justify-center text-[#ea4335] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e9edef]">Clear all messages?</h3>
                <p className="text-xs text-[#8696a0] mt-0.5">
                  This will delete messages in all chats on this device.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowClearChatsConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-[#2a3942] text-[#e9edef] font-semibold text-xs hover:bg-[#374248] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClearChatsConfirm(false);
                  onClearAllChats?.();
                  onShowToast('All chat messages cleared');
                }}
                className="flex-1 py-2 rounded-xl bg-[#ea4335] text-white font-bold text-xs hover:bg-[#ea4335]/90 transition"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
