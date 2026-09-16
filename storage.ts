import { User, Chat, Message, AppSettings, UserStatusStory, CallLogItem, ChannelItem } from '../types';

export const STORAGE_KEYS = {
  CURRENT_USER: 'sb_current_user_v1',
  USERS: 'sb_users_v1',
  CHATS: 'sb_chats_v1',
  MESSAGES: 'sb_messages_v1',
  SETTINGS: 'sb_settings_v1',
  BLOCKED: 'sb_blocked_v1',
  STATUSES: 'sb_statuses_v1',
  CALL_LOGS: 'sb_call_logs_v1',
  CHANNELS: 'sb_channels_v1',
};

export const DEFAULT_USERS: User[] = [];
export const DEFAULT_STATUSES: UserStatusStory[] = [];
export const DEFAULT_CALL_LOGS: CallLogItem[] = [];
export const DEFAULT_CHANNELS: ChannelItem[] = [];
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark', fontSize: 'medium', allowAudioCalls: true, allowVideoCalls: true,
  showLastSeen: true, showReadReceipts: true, enableNotifications: true,
  notificationSound: true, chatWallpaper: 'doodle', disappearingDefault: 'off', twoStepVerification: false,
};

export function getInitialChats(_currentUserId: string): { chats: Chat[]; messagesMap: Record<string, Message[]> } {
  return { chats: [], messagesMap: {} };
}

// Storage helpers
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Storage quota or disabled', err);
  }
}

export function getChatId(userAId: string, userBId: string): string {
  const sorted = [userAId, userBId].sort();
  return `chat_${sorted[0]}_${sorted[1]}`;
}

// Download file utility
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Download failed', err);
    return false;
  }
}

// WhatsApp-style Chat Export as TXT file
export function exportChatAsTxt(chatName: string, messages: Message[]) {
  let content = `WhatsApp Chat with ${chatName}\n`;
  content += `Exported on: ${new Date().toLocaleString()}\n`;
  content += `Messages are end-to-end encrypted.\n`;
  content += `--------------------------------------------------------\n\n`;

  messages.forEach((msg) => {
    const timeStr = new Date(msg.timestamp).toLocaleString();
    let body = msg.text || '';
    if (msg.voiceNote) {
      body = `<Voice message: ${msg.voiceNote.duration} seconds>`;
    } else if (msg.image) {
      body = `<Photo attached>`;
    }
    content += `[${timeStr}] ${msg.senderName}: ${body}\n`;
  });

  const sanitized = chatName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `WhatsApp_Chat_${sanitized}_${Date.now()}.txt`;
  return downloadFile(filename, content, 'text/plain;charset=utf-8');
}

// Full Account Backup as JSON
export function exportAllBackupAsJson(backupData: {
  currentUser: User | null;
  users?: User[];
  chats: Chat[];
  messagesMap?: Record<string, Message[]>;
  messages?: Record<string, Message[]>;
  settings: AppSettings;
  callLogs: CallLogItem[];
  statuses?: UserStatusStory[];
  channels?: ChannelItem[];
}) {
  const jsonStr = JSON.stringify(backupData, null, 2);
  const filename = `WhatsApp_Backup_${backupData.currentUser?.username || 'user'}_${Date.now()}.json`;
  return downloadFile(filename, jsonStr, 'application/json;charset=utf-8');
}
