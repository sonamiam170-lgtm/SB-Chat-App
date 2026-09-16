import React, { useState, useRef } from 'react';
import { User, UserStatusStory } from '../types';
import { X, Image, Send, Palette } from 'lucide-react';

interface CreateStatusModalProps {
  currentUser: User;
  onClose: () => void;
  onAddStatus: (status: UserStatusStory) => void;
}

const BG_COLORS = [
  '#005c4b', // WhatsApp Dark Green
  '#128c7e', // WhatsApp Teal
  '#7b1fa2', // Purple
  '#d81b60', // Pink
  '#e65100', // Orange
  '#1e88e5', // Blue
  '#2e7d32', // Emerald
  '#37474f', // Blue Grey
];

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  currentUser,
  onClose,
  onAddStatus,
}) => {
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [bgIndex, setBgIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo is too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMediaUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCycleColor = () => {
    setBgIndex((prev) => (prev + 1) % BG_COLORS.length);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !mediaUrl) return;

    const newStatus: UserStatusStory = {
      id: `status_${currentUser.id}_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userUsername: currentUser.username,
      userAvatar: currentUser.avatar,
      caption: caption.trim() || undefined,
      mediaUrl: mediaUrl || undefined,
      backgroundColor: mediaUrl ? undefined : BG_COLORS[bgIndex],
      timestamp: Date.now(),
      isViewed: true,
    };

    onAddStatus(newStatus);
    onClose();
  };

  const currentColor = BG_COLORS[bgIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222e35] rounded-3xl overflow-hidden shadow-2xl flex flex-col text-[#e9edef]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#222e35] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-white text-base">Create WhatsApp Status</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8696a0] hover:text-white hover:bg-[#202c33] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview / Canvas */}
        <div
          className="relative h-72 flex items-center justify-center p-6 text-center transition-colors"
          style={{ backgroundColor: mediaUrl ? '#000' : currentColor }}
        >
          {mediaUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={mediaUrl}
                alt="Upload preview"
                className="max-h-full max-w-full object-contain rounded-xl"
              />
              <button
                type="button"
                onClick={() => setMediaUrl(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full">
              <p className="text-white text-lg font-medium break-words leading-relaxed">
                {caption || 'Type your status update…'}
              </p>
            </div>
          )}

          {/* Action buttons inside canvas */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {!mediaUrl && (
              <button
                type="button"
                onClick={handleCycleColor}
                className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition shadow"
                title="Change background color"
              >
                <Palette className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition shadow"
              title="Add Photo"
            >
              <Image className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="hidden"
            />
          </div>
        </div>

        {/* Caption & Submit */}
        <form onSubmit={handlePublish} className="p-4 bg-[#111b21] space-y-3">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={mediaUrl ? 'Add a photo caption…' : 'Type status text…'}
            maxLength={140}
            className="w-full px-4 py-3 rounded-xl bg-[#202c33] border border-[#2a3942] text-white placeholder-[#8696a0] text-sm focus:outline-none focus:border-[#00a884] transition"
            autoFocus
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#8696a0]">
              Disappears in 24 hours
            </span>
            <button
              type="submit"
              disabled={!caption.trim() && !mediaUrl}
              className={`py-2.5 px-5 rounded-full font-bold text-xs flex items-center gap-2 transition ${
                caption.trim() || mediaUrl
                  ? 'bg-[#00a884] hover:bg-[#25d366] text-[#111b21] shadow-md shadow-[#00a884]/20'
                  : 'bg-[#202c33] text-[#8696a0] cursor-not-allowed'
              }`}
            >
              <span>Post Status</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
