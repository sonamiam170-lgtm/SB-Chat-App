import React, { useState, useRef, useEffect } from 'react';
import { User, Message, Chat, VoiceNote, MessageReplyInfo } from '../types';
import { sounds } from '../utils/audio';
import { exportChatAsTxt, downloadFile } from '../utils/storage';
import {
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  ArrowLeft,
  CheckCheck,
  Check,
  X,
  BadgeCheck,
  Trash2,
  Ban,
  Download,
  Mic,
  Play,
  Pause,
  Lock,
  Image as ImageIcon,
  FileText,
  Camera,
  Star,
  CornerUpLeft,
  Copy,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  Info,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface ChatAreaProps {
  currentUser: User;
  activeChat: Chat | null;
  contact: User | null;
  messages: Message[];
  isMobileChatOpen: boolean;
  wallpaper?: 'default' | 'dark' | 'doodle' | 'emerald' | 'warm';
  onBack: () => void;
  onSendMessage: (
    text: string,
    image?: string,
    voiceNote?: VoiceNote,
    replyTo?: MessageReplyInfo
  ) => void;
  onStartCall: (contact: User, type: 'audio' | 'video') => void;
  onOpenPublicProfile: (user: User) => void;
  onClearChat: (chatId: string) => void;
  onBlockUser: (userId: string) => void;
  onOpenImage: (url: string) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onToggleStarMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onUpdateChatDisappearing?: (timer: 'off' | '24h' | '7d' | '90d') => void;
  onShowToast: (msg: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
}

const EMOJI_LIST = [
  '👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏',
  '🎉', '✨', '😎', '💯', '☕️', '🙌', '🤩', '💡',
  '🌟', '👀', '🥺', '🚀', '⚡️', '🥳', '👋', '🌹'
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentUser,
  activeChat,
  contact,
  messages,
  isMobileChatOpen,
  wallpaper = 'doodle',
  onBack,
  onSendMessage,
  onStartCall,
  onOpenPublicProfile,
  onClearChat,
  onBlockUser,
  onOpenImage,
  onReactMessage,
  onToggleStarMessage,
  onDeleteMessage,
  onUpdateChatDisappearing,
  onShowToast,
  onTypingChange,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMsgMenuId, setActiveMsgMenuId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // In-Chat Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Right Side Drawer (Contact info & Media)
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'info' | 'media' | 'starred' | 'encryption'>('info');

  // Voice note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordIntervalRef = useRef<number | null>(null);

  // Playing voice note state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const voiceTimerRef = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat?.isTyping]);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordSeconds(0);
      sounds.playRecordStart();
      recordIntervalRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
    }
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, [isRecording]);

  // Handle voice note playback
  const handleTogglePlayVoice = (msgId: string, duration: number) => {
    if (playingVoiceId === msgId) {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      setPlayingVoiceId(null);
      setPlayProgress(0);
    } else {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      setPlayingVoiceId(msgId);
      setPlayProgress(0);
      sounds.playVoiceSample(440);

      const speedMultiplier = playbackSpeed;
      const totalMs = (duration * 1000) / speedMultiplier;
      const intervalMs = 100;
      let elapsed = 0;

      voiceTimerRef.current = window.setInterval(() => {
        elapsed += intervalMs;
        const progress = Math.min((elapsed / totalMs) * 100, 100);
        setPlayProgress(progress);

        if (Math.floor(elapsed / 1000) % 2 === 0 && elapsed % 1000 === 0) {
          sounds.playVoiceSample(380 + (progress % 40) * 10);
        }

        if (elapsed >= totalMs) {
          if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
          setPlayingVoiceId(null);
          setPlayProgress(0);
        }
      }, intervalMs);
    }
  };

  const handleTogglePlaybackSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaybackSpeed((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  // Finish and send voice recording
  const handleSendVoiceNote = () => {
    const finalDuration = Math.max(recordSeconds, 1);
    sounds.playRecordStop();
    setIsRecording(false);

    const waveform = Array.from({ length: 18 }, () =>
      Math.floor(Math.random() * 70 + 30)
    );

    const replyInfo: MessageReplyInfo | undefined = replyingTo
      ? {
          id: replyingTo.id,
          text: replyingTo.text || (replyingTo.image ? '[Photo]' : '[Voice Note]'),
          senderName: replyingTo.senderName,
          hasImage: !!replyingTo.image,
          hasVoice: !!replyingTo.voiceNote,
        }
      : undefined;

    onSendMessage('', undefined, { duration: finalDuration, waveformData: waveform }, replyInfo);
    setReplyingTo(null);
  };

  // Cancel voice recording
  const handleCancelVoiceRecording = () => {
    sounds.playRecordStop();
    setIsRecording(false);
    setRecordSeconds(0);
  };

  // Handle photo attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo is too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
        setShowAttachMenu(false);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Submit text or image message
  const handleSend = () => {
    if (!inputText.trim() && !selectedImage) return;

    const replyInfo: MessageReplyInfo | undefined = replyingTo
      ? {
          id: replyingTo.id,
          text: replyingTo.text || (replyingTo.image ? '[Photo]' : '[Voice Note]'),
          senderName: replyingTo.senderName,
          hasImage: !!replyingTo.image,
          hasVoice: !!replyingTo.voiceNote,
        }
      : undefined;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    onTypingChange?.(false);

    onSendMessage(inputText.trim(), selectedImage || undefined, undefined, replyInfo);
    setInputText('');
    setSelectedImage(null);
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    setReplyingTo(null);

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Reset typing state on chat change or unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onTypingChange?.(false);
    };
  }, [activeChat?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (onTypingChange) {
      onTypingChange(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTypingChange(false);
      }, 2500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMsgTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Export current chat
  const handleExportThisChat = () => {
    if (!contact) return;
    exportChatAsTxt(contact.name, messages);
    onShowToast(`Chat with ${contact.name} exported as .txt`);
    setShowMoreMenu(false);
  };

  // Download image file helper
  const handleDownloadImage = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `WhatsApp_Image_${Date.now()}.jpg`;
      a.click();
      onShowToast('Image download started');
    } catch {
      onShowToast('Failed to download image');
    }
  };

  // In-chat search matching messages
  const matchedMessageIds = chatSearchQuery.trim()
    ? messages
        .filter((m) => m.text && m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
        .map((m) => m.id)
    : [];

  const handleNextSearchMatch = () => {
    if (matchedMessageIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchedMessageIds.length);
  };

  const handlePrevSearchMatch = () => {
    if (matchedMessageIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchedMessageIds.length) % matchedMessageIds.length);
  };

  // Photos in this chat for media drawer
  const chatPhotos = messages.filter((m) => !!m.image);
  const starredInChat = messages.filter((m) => !!m.isStarred);

  // Empty state when no chat is selected
  if (!activeChat || !contact) {
    return (
      <main className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#111b21] text-[#8696a0] p-8 text-center select-none border-b-6 border-[#00a884]">
        <div className="w-20 h-20 rounded-full bg-[#202c33] flex items-center justify-center text-3xl mb-5 shadow-inner">
          🔒
        </div>
        <h2 className="text-xl font-bold text-[#e9edef] mb-2">WhatsApp Web</h2>
        <p className="text-sm text-[#8696a0] max-w-md leading-relaxed">
          Send and receive messages without keeping your phone online. Use WhatsApp on up to 4 linked devices and 1 phone simultaneously.
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs text-[#8696a0]">
          <Lock className="w-3.5 h-3.5 text-[#00a884]" />
          <span>End-to-end encrypted</span>
        </div>
      </main>
    );
  }

  // Choose background wallpaper style
  const wallpaperClass =
    wallpaper === 'dark'
      ? 'bg-[#0b141a]'
      : wallpaper === 'emerald'
      ? 'bg-[#001f1a]'
      : wallpaper === 'warm'
      ? 'bg-[#1a1412]'
      : 'bg-[#0b141a]';

  return (
    <main
      className={`flex-1 flex flex-row h-full text-[#e9edef] overflow-hidden relative ${
        isMobileChatOpen ? 'flex' : 'hidden md:flex'
      }`}
    >
      {/* MAIN CHAT PANE */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* TOP HEADER */}
        <header className="h-[60px] px-4 bg-[#202c33] border-b border-[#222e35] flex items-center justify-between z-20 shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Back Button */}
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-[#aebac1] hover:text-[#e9edef] rounded-full hover:bg-[#374248] transition"
              aria-label="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Contact Avatar */}
            <div
              onClick={() => setIsRightDrawerOpen(true)}
              className="relative cursor-pointer shrink-0"
              title="View Contact Info"
            >
              <img
                src={
                  contact.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`
                }
                alt={contact.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-black/30 hover:opacity-90 transition"
              />
              {contact.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00a884] ring-2 ring-[#202c33]"></span>
              )}
            </div>

            {/* Contact Info */}
            <div
              onClick={() => setIsRightDrawerOpen(true)}
              className="min-w-0 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-semibold text-[#e9edef] truncate">
                  {contact.name}
                </h2>
                {contact.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-[#00a884] shrink-0" />
                )}
                {activeChat.disappearingTimer && activeChat.disappearingTimer !== 'off' && (
                  <span
                    className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[#374248] text-[#53bdeb]"
                    title={`Disappearing messages: ${activeChat.disappearingTimer}`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {activeChat.disappearingTimer}
                  </span>
                )}
              </div>
              <div className="text-xs text-[#8696a0] flex items-center gap-1.5 truncate">
                {activeChat.isTyping ? (
                  <span className="text-[#00a884] font-medium italic">
                    typing…
                  </span>
                ) : contact.isOnline ? (
                  <span className="text-[#00a884] font-medium">online</span>
                ) : (
                  <span>last seen {contact.lastSeen || 'recently'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Icons on Right */}
          <div className="flex items-center gap-1">
            {/* Audio Call */}
            <button
              onClick={() => onStartCall(contact, 'audio')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374248] rounded-full transition"
              title="Voice call"
            >
              <Phone className="w-5 h-5" />
            </button>

            {/* Video Call */}
            <button
              onClick={() => onStartCall(contact, 'video')}
              className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374248] rounded-full transition"
              title="Video call"
            >
              <Video className="w-5 h-5" />
            </button>

            {/* In-Chat Search Button */}
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (!isSearchOpen) setChatSearchQuery('');
              }}
              className={`p-2 rounded-full transition ${
                isSearchOpen
                  ? 'bg-[#374248] text-[#00a884]'
                  : 'text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374248]'
              }`}
              title="Search in chat"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* More Menu (3 dots) */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374248] rounded-full transition"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 top-11 w-56 py-1.5 bg-[#233138] border border-[#2a3942] rounded-2xl shadow-2xl z-50 text-xs text-[#d1d7db] animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setIsRightDrawerOpen(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-[#182229] text-left flex items-center gap-2.5 transition"
                    >
                      <Info className="w-4 h-4 text-[#53bdeb]" />
                      Contact info
                    </button>
                    <button
                      onClick={() => {
                        setIsSearchOpen(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-[#182229] text-left flex items-center gap-2.5 transition"
                    >
                      <Search className="w-4 h-4 text-[#aebac1]" />
                      Search in chat
                    </button>
                    <button
                      onClick={handleExportThisChat}
                      className="w-full px-4 py-2.5 hover:bg-[#182229] text-left flex items-center gap-2.5 text-[#00a884] font-medium transition"
                    >
                      <Download className="w-4 h-4" />
                      Export / Download chat (.txt)
                    </button>
                    <button
                      onClick={() => {
                        setIsRightDrawerOpen(true);
                        setDrawerTab('starred');
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-[#182229] text-left flex items-center gap-2.5 transition"
                    >
                      <Star className="w-4 h-4 text-[#f59e0b]" />
                      Starred in this chat
                    </button>
                    <div className="h-px bg-[#2a3942] my-1" />
                    <button
                      onClick={() => {
                        onClearChat(activeChat.id);
                        setShowMoreMenu(false);
                        onShowToast('Chat messages cleared');
                      }}
                      className="w-full px-4 py-2.5 hover:bg-rose-950/30 text-rose-300 text-left flex items-center gap-2.5 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear chat
                    </button>
                    <button
                      onClick={() => {
                        onBlockUser(contact.id);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-rose-950/30 text-rose-400 text-left flex items-center gap-2.5 transition"
                    >
                      <Ban className="w-4 h-4" />
                      Block contact
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* IN-CHAT SEARCH BAR BANNER */}
        {isSearchOpen && (
          <div className="px-4 py-2 bg-[#202c33] border-b border-[#2a3942] flex items-center justify-between gap-3 z-10 animate-in slide-in-from-top-2 duration-100">
            <div className="flex-1 flex items-center bg-[#111b21] rounded-xl px-3 py-1.5">
              <Search className="w-4 h-4 text-[#8696a0] mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search messages..."
                value={chatSearchQuery}
                onChange={(e) => {
                  setChatSearchQuery(e.target.value);
                  setCurrentMatchIndex(0);
                }}
                className="w-full bg-transparent text-xs text-[#e9edef] placeholder-[#8696a0] outline-none"
                autoFocus
              />
              {chatSearchQuery && (
                <span className="text-[11px] text-[#8696a0] ml-2 shrink-0">
                  {matchedMessageIds.length > 0
                    ? `${currentMatchIndex + 1} of ${matchedMessageIds.length}`
                    : 'No matches'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevSearchMatch}
                disabled={matchedMessageIds.length === 0}
                className="p-1.5 text-[#aebac1] hover:text-[#e9edef] disabled:opacity-40 rounded-lg hover:bg-[#374248]"
                title="Previous"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextSearchMatch}
                disabled={matchedMessageIds.length === 0}
                className="p-1.5 text-[#aebac1] hover:text-[#e9edef] disabled:opacity-40 rounded-lg hover:bg-[#374248]"
                title="Next"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setChatSearchQuery('');
                }}
                className="p-1.5 text-[#8696a0] hover:text-white rounded-lg hover:bg-[#374248]"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* MESSAGES SCROLL AREA WITH WALLPAPER */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-3 relative ${wallpaperClass}`}
          style={{
            backgroundImage:
              wallpaper === 'doodle'
                ? `radial-gradient(#202c33 1px, transparent 1px)`
                : undefined,
            backgroundSize: '24px 24px',
          }}
        >
          {/* Encryption Notice */}
          <div className="flex justify-center my-2">
            <div className="max-w-md px-3.5 py-1.5 rounded-xl bg-[#182229]/90 border border-[#222e35] text-[11px] text-[#ffd279] text-center flex items-center justify-center gap-1.5 shadow-sm">
              <Lock className="w-3.5 h-3.5 shrink-0 text-[#ffd279]" />
              <span>
                Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
              </span>
            </div>
          </div>

          {/* Date separator pill */}
          <div className="flex justify-center my-3">
            <span className="px-3 py-1 rounded-lg bg-[#182229] border border-[#222e35] text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider shadow-sm">
              Today
            </span>
          </div>

          {/* Messages */}
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isHighlighted =
              chatSearchQuery.trim() &&
              matchedMessageIds[currentMatchIndex] === msg.id;

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setActiveMsgMenuId(msg.id)}
                onMouseLeave={() => setActiveMsgMenuId(null)}
                className={`group flex flex-col ${
                  isMe ? 'items-end' : 'items-start'
                } relative`}
              >
                {/* Message Bubble Container */}
                <div className="relative max-w-[85%] sm:max-w-[70%]">
                  {/* Quoted Reply Quote Bar if present */}
                  <div
                    className={`rounded-2xl px-3 py-2 shadow-md relative transition-all ${
                      isHighlighted ? 'ring-2 ring-[#00a884]' : ''
                    } ${
                      isMe
                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs'
                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-xs'
                    }`}
                  >
                    {/* Reply to Preview inside bubble */}
                    {msg.replyTo && (
                      <div className="mb-2 p-2 rounded-lg bg-black/20 border-l-4 border-[#00a884] text-xs space-y-0.5">
                        <div className="font-semibold text-[#00a884]">
                          {msg.replyTo.senderName}
                        </div>
                        <div className="text-[#aebac1] truncate">
                          {msg.replyTo.text}
                        </div>
                      </div>
                    )}

                    {/* PHOTO ATTACHMENT */}
                    {msg.image && (
                      <div className="mb-2 relative rounded-xl overflow-hidden group/img">
                        <img
                          src={msg.image}
                          alt="Photo"
                          className="w-full max-h-72 object-cover rounded-xl cursor-pointer hover:opacity-95 transition"
                          onClick={() => onOpenImage(msg.image!)}
                        />
                        {/* Download button on image */}
                        <button
                          onClick={(e) => handleDownloadImage(msg.image!, e)}
                          className="absolute bottom-2 right-2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition opacity-0 group-hover/img:opacity-100"
                          title="Download photo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* VOICE NOTE PLAYER */}
                    {msg.voiceNote && (
                      <div className="flex items-center gap-3 py-1 pr-1 min-w-[220px] sm:min-w-[260px]">
                        <button
                          onClick={() =>
                            handleTogglePlayVoice(msg.id, msg.voiceNote!.duration)
                          }
                          className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#25d366] text-[#111b21] flex items-center justify-center shrink-0 transition"
                        >
                          {playingVoiceId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Animated Waveform */}
                          <div className="flex items-center gap-1 h-6">
                            {msg.voiceNote.waveformData.map((h, i) => {
                              const barProgress = (i / msg.voiceNote!.waveformData.length) * 100;
                              const isPlayed = playingVoiceId === msg.id && playProgress >= barProgress;

                              return (
                                <div
                                  key={i}
                                  className="w-1 rounded-full transition-all duration-100"
                                  style={{
                                    height: `${Math.max(h * 0.28, 4)}px`,
                                    backgroundColor: isPlayed ? '#00a884' : '#8696a0',
                                  }}
                                />
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-[#8696a0]">
                            <span>
                              {playingVoiceId === msg.id
                                ? formatSeconds(
                                    Math.floor(
                                      (playProgress / 100) * msg.voiceNote.duration
                                    )
                                  )
                                : formatSeconds(msg.voiceNote.duration)}
                            </span>
                            {/* Speed Control Pill */}
                            <button
                              onClick={handleTogglePlaybackSpeed}
                              className="px-1.5 py-0.5 rounded-full bg-black/20 hover:bg-black/40 text-[#00a884] font-bold text-[10px] transition"
                            >
                              {playbackSpeed}x
                            </button>
                          </div>
                        </div>

                        {/* Mic icon */}
                        <div className="shrink-0 text-[#00a884]">
                          <Mic className="w-4 h-4" />
                        </div>
                      </div>
                    )}

                    {/* TEXT MESSAGE */}
                    {msg.text && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-2">
                        {msg.text}
                      </p>
                    )}

                    {/* METADATA: TIME, TICKS, STARRED */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-[#8696a0] select-none">
                      {msg.isStarred && (
                        <Star className="w-3 h-3 text-[#f59e0b] fill-current" />
                      )}
                      <span>{formatMsgTime(msg.timestamp)}</span>
                      {isMe && (
                        <span>
                          {msg.status === 'seen' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* HOVER QUICK ACTIONS BAR */}
                  <div
                    className={`absolute -top-3.5 ${
                      isMe ? 'left-2' : 'right-2'
                    } hidden group-hover:flex items-center gap-0.5 px-2 py-1 rounded-full bg-[#202c33] border border-[#2a3942] shadow-xl text-[#aebac1] z-30 transition`}
                  >
                    {/* Quick Reactions */}
                    {['👍', '❤️', '😂', '😮'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onReactMessage(msg.id, emoji)}
                        className="hover:scale-125 transition px-1 text-xs"
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="w-px h-3 bg-[#2a3942] mx-0.5" />

                    {/* Reply */}
                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="p-1 hover:text-white rounded"
                      title="Reply"
                    >
                      <CornerUpLeft className="w-3 h-3" />
                    </button>

                    {/* Star / Unstar */}
                    <button
                      onClick={() => {
                        onToggleStarMessage(msg.id);
                        onShowToast(msg.isStarred ? 'Unstarred' : 'Starred');
                      }}
                      className={`p-1 rounded ${
                        msg.isStarred ? 'text-[#f59e0b]' : 'hover:text-[#f59e0b]'
                      }`}
                      title={msg.isStarred ? 'Unstar' : 'Star'}
                    >
                      <Star
                        className={`w-3 h-3 ${msg.isStarred ? 'fill-current' : ''}`}
                      />
                    </button>

                    {/* Copy Text */}
                    {msg.text && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          onShowToast('Copied to clipboard');
                        }}
                        className="p-1 hover:text-white rounded"
                        title="Copy text"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}

                    {/* Delete Message */}
                    <button
                      onClick={() => {
                        onDeleteMessage(msg.id);
                        onShowToast('Message deleted');
                      }}
                      className="p-1 hover:text-rose-400 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* REACTIONS PILL UNDER BUBBLE */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {Object.entries(msg.reactions).map(([emoji, users]) => (
                        <div
                          key={emoji}
                          onClick={() => onReactMessage(msg.id, emoji)}
                          className="px-2 py-0.5 rounded-full bg-[#202c33] border border-[#2a3942] text-xs flex items-center gap-1 cursor-pointer hover:bg-[#374248] transition"
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] text-[#8696a0]">
                            {(users as string[])?.length || 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT COMPOSER AREA */}
        <div className="bg-[#202c33] border-t border-[#222e35] p-3 z-20 shrink-0">
          {/* Quoted reply banner above input */}
          {replyingTo && (
            <div className="mb-2 p-2.5 rounded-xl bg-[#111b21] border-l-4 border-[#00a884] flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-100">
              <div className="min-w-0 mr-2">
                <div className="font-bold text-[#00a884]">
                  Replying to {replyingTo.senderName}
                </div>
                <div className="text-[#aebac1] truncate">
                  {replyingTo.text || (replyingTo.image ? '[Photo]' : '[Voice Note]')}
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 text-[#8696a0] hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Selected photo preview before send */}
          {selectedImage && (
            <div className="mb-2 p-2 rounded-2xl bg-[#111b21] border border-[#222e35] flex items-center gap-3">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div className="flex-1 text-xs text-[#aebac1]">
                Photo attached. Add a caption or press Send.
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 text-[#8696a0] hover:text-rose-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* RECORDING MODE BANNER */}
          {isRecording ? (
            <div className="flex items-center justify-between bg-[#111b21] rounded-2xl px-4 py-2.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="text-sm font-semibold text-rose-400">
                  Recording audio...
                </span>
                <span className="text-sm font-mono text-[#e9edef]">
                  {formatSeconds(recordSeconds)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelVoiceRecording}
                  className="p-2 text-[#8696a0] hover:text-rose-400 rounded-full hover:bg-[#202c33] transition"
                  title="Cancel"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendVoiceNote}
                  className="px-4 py-1.5 rounded-full bg-[#00a884] hover:bg-[#25d366] text-[#111b21] font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          ) : (
            /* STANDARD TEXT/AUDIO COMPOSER */
            <div className="flex items-end gap-2">
              {/* Emoji Picker Button */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248] rounded-full transition"
                  title="Emoji"
                >
                  <Smile className="w-6 h-6" />
                </button>

                {showEmojiPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowEmojiPicker(false)}
                    />
                    <div className="absolute bottom-12 left-0 w-72 p-3 bg-[#202c33] border border-[#2a3942] rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="text-xs font-bold text-[#8696a0] mb-2 uppercase tracking-wider">
                        Reactions & Emojis
                      </div>
                      <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setInputText((prev) => prev + emoji);
                              setShowEmojiPicker(false);
                              textareaRef.current?.focus();
                            }}
                            className="text-xl p-1.5 hover:bg-[#2a3942] rounded-lg transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Attach Paperclip Button */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248] rounded-full transition"
                  title="Attach"
                >
                  <Paperclip className="w-6 h-6" />
                </button>

                {showAttachMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowAttachMenu(false)}
                    />
                    <div className="absolute bottom-12 left-0 w-48 py-2 bg-[#202c33] border border-[#2a3942] rounded-2xl shadow-2xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                      <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a3942] cursor-pointer text-xs text-[#e9edef] transition">
                        <ImageIcon className="w-4 h-4 text-[#53bdeb]" />
                        Photos & Videos
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                      <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a3942] cursor-pointer text-xs text-[#e9edef] transition">
                        <Camera className="w-4 h-4 text-[#ec5382]" />
                        Camera photo
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                      <button
                        onClick={() => {
                          handleExportThisChat();
                          setShowAttachMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a3942] text-left text-xs text-[#00a884] transition"
                      >
                        <FileText className="w-4 h-4" />
                        Export Chat (.txt)
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Text Area */}
              <div className="flex-1 bg-[#2a3942] rounded-2xl px-4 py-2 focus-within:ring-1 focus-within:ring-[#00a884] transition">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Type a message"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] outline-none resize-none max-h-32"
                />
              </div>

              {/* Send or Voice Record Button */}
              {inputText.trim() || selectedImage ? (
                <button
                  onClick={handleSend}
                  className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#25d366] text-[#111b21] transition shadow-md"
                  title="Send"
                >
                  <Send className="w-5 h-5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => setIsRecording(true)}
                  className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#25d366] text-[#111b21] transition shadow-md"
                  title="Hold or tap to record voice"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SLIDE-OVER CONTACT DETAILS DRAWER */}
      {isRightDrawerOpen && (
        <aside className="w-full sm:w-[360px] h-full bg-[#111b21] border-l border-[#222e35] flex flex-col z-30 shrink-0 overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="h-[60px] px-4 bg-[#202c33] border-b border-[#222e35] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsRightDrawerOpen(false)}
                className="p-1.5 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#374248]"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-[#e9edef]">Contact Info</h3>
            </div>

            {/* Quick Export in Drawer */}
            <button
              onClick={handleExportThisChat}
              className="p-2 text-[#00a884] hover:bg-[#374248] rounded-full transition"
              title="Export chat as .txt"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Navigation Tabs */}
          <div className="flex border-b border-[#222e35] bg-[#111b21]">
            <button
              onClick={() => setDrawerTab('info')}
              className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition ${
                drawerTab === 'info'
                  ? 'border-[#00a884] text-[#00a884]'
                  : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setDrawerTab('media')}
              className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition ${
                drawerTab === 'media'
                  ? 'border-[#00a884] text-[#00a884]'
                  : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              Media ({chatPhotos.length})
            </button>
            <button
              onClick={() => setDrawerTab('starred')}
              className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition ${
                drawerTab === 'starred'
                  ? 'border-[#00a884] text-[#00a884]'
                  : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              Starred ({starredInChat.length})
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {drawerTab === 'info' && (
              <>
                {/* Big Avatar & Name */}
                <div className="flex flex-col items-center text-center p-4 bg-[#202c33] rounded-3xl border border-[#2a3942]">
                  <img
                    src={
                      contact.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`
                    }
                    alt={contact.name}
                    className="w-24 h-24 rounded-full object-cover mb-3 ring-4 ring-[#111b21]"
                  />
                  <h3 className="text-lg font-bold text-[#e9edef] flex items-center gap-1.5">
                    {contact.name}
                    {contact.isVerified && (
                      <BadgeCheck className="w-4 h-4 text-[#00a884]" />
                    )}
                  </h3>
                  <p className="text-xs text-[#00a884] font-medium">@{contact.username}</p>
                  <p className="text-xs text-[#8696a0] mt-1">
                    {contact.phone || '+880 1712 345678'}
                  </p>
                </div>

                {/* About / Bio */}
                <div className="p-3.5 bg-[#202c33] rounded-2xl border border-[#2a3942]">
                  <span className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider block mb-1">
                    About
                  </span>
                  <p className="text-xs text-[#e9edef] leading-relaxed">
                    {contact.bio || 'Hey there! I am using WhatsApp.'}
                  </p>
                </div>

                {/* Disappearing Messages Settings */}
                <div className="p-3.5 bg-[#202c33] rounded-2xl border border-[#2a3942] space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00a884]" />
                    <span className="text-xs font-semibold text-[#e9edef]">
                      Disappearing Messages
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8696a0]">
                    Make messages in this chat disappear after a set time.
                  </p>
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {(['off', '24h', '7d', '90d'] as const).map((timer) => (
                      <button
                        key={timer}
                        onClick={() => {
                          if (onUpdateChatDisappearing) {
                            onUpdateChatDisappearing(timer);
                            onShowToast(`Disappearing messages set to: ${timer}`);
                          }
                        }}
                        className={`py-1 rounded-lg text-xs font-semibold capitalize transition ${
                          activeChat.disappearingTimer === timer
                            ? 'bg-[#00a884] text-[#111b21]'
                            : 'bg-[#111b21] text-[#8696a0] hover:text-[#e9edef]'
                        }`}
                      >
                        {timer}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Encryption Safety Info */}
                <div className="p-3.5 bg-[#202c33] rounded-2xl border border-[#2a3942] space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#00a884]" />
                    <span className="text-xs font-semibold text-[#e9edef]">
                      Encryption
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8696a0]">
                    Messages and calls are end-to-end encrypted. Tap to verify safety number.
                  </p>
                  <div className="p-2 bg-[#111b21] rounded-xl font-mono text-[10px] text-[#8696a0] text-center tracking-widest">
                    42819 50183 91028 47102 38190 64821
                  </div>
                </div>

                {/* Actions: Export, Clear, Block */}
                <div className="space-y-1.5 pt-2">
                  <button
                    onClick={handleExportThisChat}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#00a884]/15 hover:bg-[#00a884]/25 text-[#00a884] font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    Export Chat (.txt file)
                  </button>
                  <button
                    onClick={() => {
                      onClearChat(activeChat.id);
                      onShowToast('Chat cleared');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#202c33] hover:bg-rose-950/40 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear messages
                  </button>
                  <button
                    onClick={() => {
                      onBlockUser(contact.id);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#202c33] hover:bg-rose-950/40 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Ban className="w-4 h-4" />
                    Block {contact.name}
                  </button>
                </div>
              </>
            )}

            {drawerTab === 'media' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#8696a0]">
                  <span>{chatPhotos.length} photos shared</span>
                </div>
                {chatPhotos.length === 0 ? (
                  <div className="p-8 text-center text-[#8696a0] text-xs">
                    No photos shared in this chat yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {chatPhotos.map((m) => (
                      <div
                        key={m.id}
                        className="relative group/media rounded-xl overflow-hidden aspect-square border border-[#2a3942]"
                      >
                        <img
                          src={m.image}
                          alt="media"
                          onClick={() => onOpenImage(m.image!)}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-200"
                        />
                        <button
                          onClick={(e) => handleDownloadImage(m.image!, e)}
                          className="absolute bottom-1.5 right-1.5 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition"
                          title="Download photo"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'starred' && (
              <div className="space-y-2">
                {starredInChat.length === 0 ? (
                  <div className="p-8 text-center text-[#8696a0] text-xs">
                    No starred messages in this conversation.
                  </div>
                ) : (
                  starredInChat.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[#202c33] border border-[#2a3942] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#8696a0]">
                        <span className="font-semibold text-[#e9edef]">
                          {m.senderName}
                        </span>
                        <span>{formatMsgTime(m.timestamp)}</span>
                      </div>
                      <p className="text-[#d1d7db]">{m.text || '[Media]'}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      )}
    </main>
  );
};
