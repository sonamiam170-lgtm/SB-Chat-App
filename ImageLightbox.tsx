import React from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `SB_Messenger_Photo_${Date.now()}.png`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div
        className="absolute top-4 right-4 flex items-center gap-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setScale((s) => Math.min(s + 0.25, 2.5))}
          className="p-2.5 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s - 0.25, 0.75))}
          className="p-2.5 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleDownload}
          className="p-2.5 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition"
          title="Download image"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-slate-800/80 text-white hover:bg-rose-600 transition ml-2"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image display */}
      <div
        className="max-w-4xl max-h-[85vh] flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Expanded media"
          style={{ transform: `scale(${scale})` }}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
          onClick={() => setScale((s) => (s > 1 ? 1 : 1.5))}
        />
      </div>
    </div>
  );
};
