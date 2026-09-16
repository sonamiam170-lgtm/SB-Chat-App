import React, { useState, useEffect } from 'react';
import { UserStatusStory } from '../types';
import { X, ChevronLeft, ChevronRight, Send, Eye } from 'lucide-react';

interface StatusViewerModalProps {
  statuses: UserStatusStory[];
  initialIndex: number;
  onClose: () => void;
  onReply: (story: UserStatusStory, replyText: string) => void;
  currentUserId: string;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  statuses,
  initialIndex,
  onClose,
  onReply,
  currentUserId,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');

  const currentStory = statuses[currentIndex];

  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Go to next or close if end
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex((i) => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2; // ~5 seconds per story
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, statuses.length, onClose]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory) return;
    onReply(currentStory, replyText.trim());
    setReplyText('');
    onClose();
  };

  if (!currentStory) return null;

  const isMine = currentStory.userId === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none">
      {/* Background click to close */}
      <div className="relative w-full max-w-md h-full sm:h-[88vh] sm:max-h-[820px] bg-[#111b21] sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-slate-800">
        {/* Progress Bars at top */}
        <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-4 flex gap-1.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {statuses.map((story, idx) => (
            <div
              key={story.id}
              className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top User Info Bar */}
        <div className="absolute top-6 left-0 right-0 z-30 px-4 py-2 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <img
              src={
                currentStory.userAvatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${currentStory.userUsername}`
              }
              alt={currentStory.userName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00a884]"
            />
            <div>
              <div className="font-bold text-sm leading-tight text-white">
                {currentStory.userName}
              </div>
              <div className="text-[11px] text-white/70">
                {new Date(currentStory.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Content Area */}
        <div
          className="relative flex-1 flex items-center justify-center overflow-hidden cursor-pointer"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {currentStory.mediaUrl ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <img
                src={currentStory.mediaUrl}
                alt="Story Media"
                className="w-full h-full object-cover select-none"
              />
              {currentStory.caption && (
                <div className="absolute bottom-6 left-4 right-4 p-4 rounded-2xl bg-black/60 backdrop-blur-md text-white text-center text-sm font-medium border border-white/10">
                  {currentStory.caption}
                </div>
              )}
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center p-8 text-center"
              style={{
                backgroundColor: currentStory.backgroundColor || '#005c4b',
              }}
            >
              <p className="text-white text-xl sm:text-2xl font-semibold leading-relaxed max-w-xs drop-shadow-md">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Left / Right click hit zones */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/60 transition"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/60 transition"
            title="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Reply Bar */}
        <div className="p-3 bg-[#111b21] border-t border-slate-800 z-30">
          {isMine ? (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-[#8696a0]">
              <Eye className="w-4 h-4 text-[#00a884]" />
              <span>Viewed by 14 contacts</span>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to status…"
                className="flex-1 px-4 py-2.5 rounded-full bg-[#202c33] border border-[#2a3942] text-white text-xs placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className={`p-2.5 rounded-full transition ${
                  replyText.trim()
                    ? 'bg-[#00a884] text-[#111b21] hover:bg-[#25d366]'
                    : 'bg-[#202c33] text-[#8696a0] cursor-not-allowed'
                }`}
                title="Send Reply"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
