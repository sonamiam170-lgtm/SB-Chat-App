import React, { useState, useRef } from 'react';
import { User } from '../types';
import {
  X,
  Camera,
  Copy,
  MessageSquare,
  Phone,
  Video,
  BadgeCheck,
  Ban,
  Check,
  QrCode,
  Download,
  Share2,
  Edit2,
  Smile,
  ShieldCheck,
} from 'lucide-react';

interface ProfileModalProps {
  mode: 'edit' | 'view';
  user: User;
  isBlocked?: boolean;
  onSaveProfile?: (updatedUser: Partial<User>) => void;
  onClose: () => void;
  onStartChat?: (user: User) => void;
  onStartCall?: (user: User, type: 'audio' | 'video') => void;
  onToggleBlock?: (userId: string) => void;
  onCopyUsername?: (username: string) => void;
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

export const ProfileModal: React.FC<ProfileModalProps> = ({
  mode,
  user,
  isBlocked = false,
  onSaveProfile,
  onClose,
  onStartChat,
  onStartCall,
  onToggleBlock,
  onCopyUsername,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'qr'>('profile');
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [phone, setPhone] = useState(user.phone || '+880 1712 345678');
  const [bio, setBio] = useState(user.bio || 'Available');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    if (onCopyUsername) onCopyUsername(text);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    const cleanUsername = (
      username.trim().startsWith('@') ? username.trim().slice(1) : username.trim()
    ).toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (onSaveProfile) {
      onSaveProfile({
        name: name.trim(),
        username: cleanUsername,
        phone: phone.trim(),
        bio: bio.trim(),
        avatar: avatar || undefined,
      });
    }
    onClose();
  };

  const downloadQrCode = () => {
    // Generate a downloadable SVG representation of the WhatsApp QR code
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480" fill="#111b21">
      <rect width="400" height="480" rx="30" fill="#111b21"/>
      <rect x="20" y="20" width="360" height="440" rx="20" fill="#202c33" stroke="#00a884" stroke-width="2"/>
      <text x="200" y="60" fill="#e9edef" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">WhatsApp QR Code</text>
      <text x="200" y="85" fill="#00a884" font-family="sans-serif" font-size="14" text-anchor="middle">@${user.username}</text>
      <rect x="60" y="110" width="280" height="280" rx="16" fill="#ffffff"/>
      <!-- QR Pattern -->
      <g fill="#111b21">
        <rect x="80" y="130" width="60" height="60" rx="8"/>
        <rect x="95" y="145" width="30" height="30" fill="#ffffff"/>
        <rect x="260" y="130" width="60" height="60" rx="8"/>
        <rect x="275" y="145" width="30" height="30" fill="#ffffff"/>
        <rect x="80" y="310" width="60" height="60" rx="8"/>
        <rect x="95" y="325" width="30" height="30" fill="#ffffff"/>
        <rect x="150" y="140" width="20" height="20"/>
        <rect x="190" y="140" width="40" height="15"/>
        <rect x="150" y="170" width="30" height="30"/>
        <rect x="200" y="170" width="40" height="20"/>
        <rect x="160" y="215" width="80" height="30" rx="6" fill="#00a884"/>
        <rect x="150" y="260" width="40" height="30"/>
        <rect x="210" y="260" width="40" height="30"/>
        <rect x="260" y="220" width="60" height="30"/>
        <rect x="160" y="310" width="50" height="40"/>
        <rect x="230" y="310" width="60" height="40"/>
      </g>
      <text x="200" y="420" fill="#8696a0" font-family="sans-serif" font-size="12" text-anchor="middle">Scan this code to start chatting with ${user.name}</text>
    </svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WhatsApp_QR_${user.username}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111b21] border border-[#222e35] rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222e35]">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[#e9edef]">
              {mode === 'edit' ? 'Profile Settings' : 'Contact Profile'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8696a0] hover:text-white rounded-xl hover:bg-[#202c33] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher for Edit mode: Profile vs My QR */}
        {mode === 'edit' && (
          <div className="flex border-b border-[#222e35] my-3">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-[#00a884] text-[#00a884]'
                  : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              Profile Info
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeTab === 'qr'
                  ? 'border-[#00a884] text-[#00a884]'
                  : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              My QR Code
            </button>
          </div>
        )}

        {/* MODE 1: EDIT PROFILE */}
        {mode === 'edit' && activeTab === 'profile' && (
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Avatar picker */}
            <div className="flex flex-col items-center justify-center mb-2">
              <div className="relative group">
                <img
                  src={
                    avatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${username || 'user'}`
                  }
                  alt="Profile Avatar"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-[#202c33] shadow-lg"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 text-white"
                  title="Change profile photo"
                >
                  <Camera className="w-6 h-6 mb-1 text-[#00a884]" />
                  <span className="text-[10px] font-semibold uppercase">Change</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />

              {/* Quick Preset Avatars */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] text-[#8696a0]">Presets:</span>
                {PRESET_AVATARS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(p)}
                    className="w-7 h-7 rounded-full overflow-hidden border border-[#2a3942] hover:border-[#00a884] transition"
                  >
                    <img src={p} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs text-center">
                {error}
              </div>
            )}

            {/* Name Input */}
            <div>
              <div className="flex items-center justify-between text-xs text-[#00a884] font-medium mb-1">
                <span>Your name</span>
                <span className="text-[#8696a0] text-[10px]">{25 - name.length}</span>
              </div>
              <div className="relative flex items-center bg-[#202c33] rounded-xl px-3 py-2 border border-[#2a3942] focus-within:border-[#00a884]">
                <input
                  type="text"
                  maxLength={25}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#e9edef] outline-none"
                  placeholder="Enter your name"
                />
                <Edit2 className="w-4 h-4 text-[#8696a0]" />
              </div>
              <p className="text-[11px] text-[#8696a0] mt-1">
                This is not your username. This name will be visible to your WhatsApp contacts.
              </p>
            </div>

            {/* About / Bio Input + Classic Presets */}
            <div>
              <label className="text-xs text-[#00a884] font-medium block mb-1">
                About
              </label>
              <div className="relative flex items-center bg-[#202c33] rounded-xl px-3 py-2 border border-[#2a3942] focus-within:border-[#00a884]">
                <input
                  type="text"
                  maxLength={120}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#e9edef] outline-none"
                  placeholder="What's on your mind?"
                />
              </div>

              {/* Classic WhatsApp Status Presets */}
              <div className="mt-2 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8696a0] tracking-wider block">
                  Select an About preset
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-[#182229] rounded-xl border border-[#222e35]">
                  {CLASSIC_WHATSAPP_ABOUTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBio(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition ${
                        bio === preset
                          ? 'bg-[#00a884] text-[#111b21] font-semibold'
                          : 'bg-[#202c33] text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Phone & Username Display */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#8696a0] block mb-1">Username</label>
                <div className="bg-[#202c33] rounded-xl px-3 py-2 border border-[#2a3942] text-xs text-[#e9edef] flex items-center justify-between">
                  <span className="truncate">@{username}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(`@${username}`)}
                    className="text-[#00a884] hover:text-[#25d366] ml-1"
                    title="Copy username"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#8696a0] block mb-1">Phone</label>
                <div className="bg-[#202c33] rounded-xl px-3 py-2 border border-[#2a3942] text-xs text-[#e9edef] flex items-center justify-between">
                  <span className="truncate">{phone}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(phone)}
                    className="text-[#00a884] hover:text-[#25d366] ml-1"
                    title="Copy phone"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#25d366] text-[#111b21] text-xs font-bold transition shadow-md"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* MODE 1 (TAB 2): MY QR CODE */}
        {mode === 'edit' && activeTab === 'qr' && (
          <div className="flex flex-col items-center py-4 space-y-4 text-center">
            <div className="p-5 bg-[#202c33] rounded-3xl border-2 border-[#00a884] shadow-2xl relative">
              {/* QR Pattern visual */}
              <div className="w-48 h-48 bg-white rounded-2xl p-3 flex flex-col items-center justify-center relative shadow-inner">
                {/* Classic QR matrix */}
                <div className="w-full h-full border-4 border-[#111b21] rounded-xl p-2 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-9 h-9 border-4 border-[#111b21] rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-[#111b21] rounded-sm" />
                    </div>
                    <div className="w-9 h-9 border-4 border-[#111b21] rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-[#111b21] rounded-sm" />
                    </div>
                  </div>
                  {/* Center user avatar badge in QR */}
                  <div className="mx-auto w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-md -my-2 bg-[#00a884] flex items-center justify-center">
                    <img
                      src={
                        avatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
                      }
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-9 h-9 border-4 border-[#111b21] rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-[#111b21] rounded-sm" />
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <div className="w-6 h-3 bg-[#111b21] rounded-xs" />
                      <div className="w-3 h-3 bg-[#00a884] rounded-xs" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-bold text-[#e9edef]">{name}</h4>
                <p className="text-xs text-[#00a884]">@{username}</p>
              </div>
            </div>

            <p className="text-xs text-[#8696a0] max-w-xs">
              Your QR code is private. If you share it with someone, they can scan it with their WhatsApp camera to message you.
            </p>

            <div className="flex items-center gap-2 w-full pt-1">
              <button
                onClick={downloadQrCode}
                className="flex-1 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#25d366] text-[#111b21] font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Download QR Code
              </button>
              <button
                onClick={() => handleCopyText(`https://wa.me/${username}`)}
                className="py-2.5 px-4 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] font-semibold text-xs flex items-center gap-2 transition"
              >
                <Share2 className="w-4 h-4" />
                {copied ? 'Copied' : 'Share link'}
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: VIEW OTHER USER'S PROFILE */}
        {mode === 'view' && (
          <div className="space-y-4 pt-4">
            {/* Header info */}
            <div className="flex flex-col items-center text-center p-4 bg-[#202c33] rounded-3xl border border-[#2a3942]">
              <img
                src={
                  user.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                }
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover mb-3 ring-4 ring-[#111b21]"
              />
              <h3 className="text-lg font-bold text-[#e9edef] flex items-center gap-1.5">
                {user.name}
                {user.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-[#00a884]" />
                )}
              </h3>
              <p className="text-xs text-[#00a884] font-medium">@{user.username}</p>
              <p className="text-xs text-[#8696a0] mt-1">
                {user.phone || '+880 1712 345678'}
              </p>
            </div>

            {/* About */}
            <div className="p-3.5 bg-[#202c33] rounded-2xl border border-[#2a3942]">
              <span className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider block mb-1">
                About
              </span>
              <p className="text-xs text-[#e9edef] leading-relaxed">
                {user.bio || 'Hey there! I am using WhatsApp.'}
              </p>
            </div>

            {/* Encryption badge */}
            <div className="p-3.5 bg-[#202c33] rounded-2xl border border-[#2a3942] flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#00a884] shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-[#e9edef] block">End-to-end encrypted</span>
                <span className="text-[#8696a0] text-[11px]">Messages and calls stay between you and {user.name}.</span>
              </div>
            </div>

            {/* Actions: Start chat, Call, Video */}
            <div className="grid grid-cols-3 gap-2">
              {onStartChat && (
                <button
                  onClick={() => onStartChat(user)}
                  className="py-2.5 rounded-xl bg-[#00a884] hover:bg-[#25d366] text-[#111b21] font-bold text-xs flex flex-col items-center justify-center gap-1 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              )}
              {onStartCall && (
                <>
                  <button
                    onClick={() => onStartCall(user, 'audio')}
                    className="py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] font-semibold text-xs flex flex-col items-center justify-center gap-1 transition"
                  >
                    <Phone className="w-4 h-4" />
                    Audio
                  </button>
                  <button
                    onClick={() => onStartCall(user, 'video')}
                    className="py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] font-semibold text-xs flex flex-col items-center justify-center gap-1 transition"
                  >
                    <Video className="w-4 h-4" />
                    Video
                  </button>
                </>
              )}
            </div>

            {/* Block Button */}
            {onToggleBlock && (
              <button
                onClick={() => onToggleBlock(user.id)}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  isBlocked
                    ? 'bg-[#202c33] text-[#00a884] hover:bg-[#2a3942]'
                    : 'bg-rose-950/40 hover:bg-rose-950/60 text-rose-400 border border-rose-800/40'
                }`}
              >
                <Ban className="w-4 h-4" />
                {isBlocked ? `Unblock ${user.name}` : `Block ${user.name}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
