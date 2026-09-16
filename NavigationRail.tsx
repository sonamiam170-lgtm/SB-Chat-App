import React from 'react';
import { User } from '../types';
import {
  MessageSquare,
  CircleDashed,
  Radio,
  Users,
  Phone,
  Star,
  Settings,
  Archive,
} from 'lucide-react';

export type ActiveNavTab =
  | 'chats'
  | 'status'
  | 'channels'
  | 'communities'
  | 'calls'
  | 'starred'
  | 'settings';

interface NavigationRailProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  currentUser: User;
  unreadChatsCount: number;
  hasUnreadStatus: boolean;
  starredCount: number;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  unreadChatsCount,
  hasUnreadStatus,
  starredCount,
  onOpenSettings,
  onOpenProfile,
}) => {
  return (
    <nav className="w-[60px] lg:w-[64px] h-full bg-[#202c33] border-r border-[#2a3942] flex flex-col items-center justify-between py-3 select-none shrink-0 z-30">
      {/* Top Navigation Icons */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Chats Tab */}
        <button
          onClick={() => onSelectTab('chats')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTab === 'chats'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942]'
          }`}
          title="Chats"
          aria-label="Chats"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadChatsCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#25d366] text-[#111b21] text-[10px] font-bold flex items-center justify-center">
              {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
            </span>
          )}
        </button>

        {/* Status / Stories Tab */}
        <button
          onClick={() => onSelectTab('status')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTab === 'status'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942]'
          }`}
          title="Status"
          aria-label="Status"
        >
          <CircleDashed className="w-5 h-5" />
          {hasUnreadStatus && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#00a884] ring-2 ring-[#202c33]"></span>
          )}
        </button>

        {/* Channels Tab */}
        <button
          onClick={() => onSelectTab('channels')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTab === 'channels'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942]'
          }`}
          title="Channels"
          aria-label="Channels"
        >
          <Radio className="w-5 h-5" />
        </button>

        {/* Communities Tab */}
        <button
          onClick={() => onSelectTab('communities')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTab === 'communities'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942]'
          }`}
          title="Communities"
          aria-label="Communities"
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Calls Tab */}
        <button
          onClick={() => onSelectTab('calls')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTab === 'calls'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942]'
          }`}
          title="Calls"
          aria-label="Calls"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Actions: Starred, Settings, Profile */}
      <div className="flex flex-col items-center gap-2 w-full pt-2 border-t border-[#2a3942]/60">
        {/* Starred Messages */}
        <button
          onClick={() => onSelectTab('starred')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTab === 'starred'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942]'
          }`}
          title="Starred Messages"
          aria-label="Starred Messages"
        >
          <Star className="w-5 h-5" />
          {starredCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#f59e0b]"></span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            onSelectTab('settings');
            onOpenSettings();
          }}
          className={`p-2.5 rounded-xl transition ${
            activeTab === 'settings'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:text-[#e9edef] hover:bg-[#2a3942]'
          }`}
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Profile Avatar */}
        <div className="pt-1">
          <button
            onClick={onOpenProfile}
            className="relative group p-0.5 rounded-full transition hover:ring-2 hover:ring-[#00a884]"
            title={`Profile: ${currentUser.name}`}
            aria-label="Your Profile"
          >
            <img
              src={
                currentUser.avatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`
              }
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00a884] ring-2 ring-[#202c33]"></span>
          </button>
        </div>
      </div>
    </nav>
  );
};
