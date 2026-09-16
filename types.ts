export interface User {
  id: string;
  name: string;
  username: string; // e.g. @sara or sara
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt: number;
  isLocked?: boolean;
  blockedUserIds?: string[];
}

export type MessageStatus = 'sent' | 'delivered' | 'seen';

export interface VoiceNote {
  duration: number; // in seconds, e.g. 12
  waveformData: number[]; // e.g. [20, 50, 80, 40, 60]
}

export interface MessageReplyInfo {
  id: string;
  text: string;
  senderName: string;
  hasImage?: boolean;
  hasVoice?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  text: string;
  image?: string; // base64 or url
  voiceNote?: VoiceNote;
  timestamp: number;
  status: MessageStatus;
  reactions?: Record<string, string[]>; // emoji -> [usernames]
  isStarred?: boolean;
  replyTo?: MessageReplyInfo;
  isDeleted?: boolean;
}

export interface Chat {
  id: string;
  participants: string[]; // user IDs
  lastMessage?: Message;
  updatedAt: number;
  unreadCount?: number;
  isTyping?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  disappearingTimer?: 'off' | '24h' | '7d' | '90d';
  customWallpaper?: 'default' | 'dark' | 'doodle' | 'emerald' | 'warm';
}

export interface UserStatusStory {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userUsername: string;
  mediaUrl?: string;
  caption?: string;
  backgroundColor?: string;
  timestamp: number;
  isViewed?: boolean;
}

export interface ChannelItem {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified: boolean;
  followers: string;
  description: string;
  lastPostTime: string;
  lastPostText: string;
  isFollowed?: boolean;
}

export interface CallLogItem {
  id: string;
  contactId: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: number;
  durationSeconds?: number;
}

export type CallDirection = 'outgoing' | 'incoming' | 'connected';
export type CallType = 'audio' | 'video';

export interface CallSession {
  callId?: string;
  callerId?: string;
  calleeId?: string;
  isActive: boolean;
  type: CallType;
  direction: CallDirection;
  contact: User;
  startTime?: number;
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  fontSize: 'small' | 'medium' | 'large';
  allowAudioCalls: boolean;
  allowVideoCalls: boolean;
  showLastSeen: boolean;
  showReadReceipts: boolean;
  enableNotifications: boolean;
  notificationSound: boolean;
  chatWallpaper: 'default' | 'dark' | 'doodle' | 'emerald' | 'warm';
  disappearingDefault: 'off' | '24h' | '7d' | '90d';
  twoStepVerification: boolean;
  notifications?: boolean;
  messageSounds?: boolean;
  callSounds?: boolean;
  privacyLastSeen?: 'everyone' | 'contacts' | 'nobody';
  privacyReadReceipts?: boolean;
  disappearingTimer?: 'off' | '24h' | '7d' | '90d';
  securityNotifications?: boolean;
  enterIsSend?: boolean;
}

