import React from 'react';
import { AppSettings, User } from '../types';
import { SettingsPanel } from './SettingsPanel';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenEditProfile: () => void;
  onClose: () => void;
  blockedUsers: User[];
  onUnblockUser: (userId: string) => void;
  currentUser: User;
  onDownloadFullBackup: () => void;
  onClearAllChats?: () => void;
  onShowToast: (msg: string) => void;
  onLogout?: () => void;
  onSaveProfile?: (updated: Partial<User>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  blockedUsers,
  onUnblockUser,
  currentUser,
  onDownloadFullBackup,
  onClearAllChats,
  onShowToast,
  onLogout = () => {},
  onSaveProfile = () => {},
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#111b21] border border-[#222e35] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[88vh] max-h-[680px]"
        onClick={(e) => e.stopPropagation()}
      >
        <SettingsPanel
          currentUser={currentUser}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onSaveProfile={onSaveProfile}
          blockedUsers={blockedUsers}
          onUnblockUser={onUnblockUser}
          onBack={onClose}
          onLogout={onLogout}
          onDownloadFullBackup={onDownloadFullBackup}
          onClearAllChats={onClearAllChats}
          onShowToast={onShowToast}
        />
      </div>
    </div>
  );
};
