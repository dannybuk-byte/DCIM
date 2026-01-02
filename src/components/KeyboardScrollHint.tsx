import { Keyboard } from 'lucide-react';

/**
 * Floating keyboard scroll hint that appears when users focus on scrollable content
 * Automatically fades after a few seconds
 */
export function KeyboardScrollHint() {
  return (
    <div className="fixed bottom-20 right-6 z-30 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <Keyboard className="w-5 h-5" />
      <div className="text-sm">
        <div className="font-semibold">Keyboard Scrolling Active</div>
        <div className="text-xs opacity-90">
          Use <kbd className="px-1 py-0.5 bg-white/20 rounded">↑</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded">↓</kbd> arrows, 
          <kbd className="px-1 py-0.5 bg-white/20 rounded mx-1">Space</kbd>, or 
          <kbd className="px-1 py-0.5 bg-white/20 rounded mx-1">PgUp/PgDn</kbd>
        </div>
      </div>
    </div>
  );
}

