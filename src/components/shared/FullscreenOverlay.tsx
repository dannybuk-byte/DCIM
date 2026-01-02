import { memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface FullscreenOverlayProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const FullscreenOverlay = memo(function FullscreenOverlay({
  isOpen,
  title,
  onClose,
  children
}: FullscreenOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] bg-gray-950"
      style={{ width: '100vw', height: '100vh' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-white">{title ?? 'Fullscreen'}</div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close fullscreen"
        >
          <X className="w-5 h-5 text-gray-300" />
        </button>
      </div>
      <div className="h-[calc(100vh-64px)] overflow-y-auto">
        {children}
      </div>
    </div>,
    document.body
  );
});


