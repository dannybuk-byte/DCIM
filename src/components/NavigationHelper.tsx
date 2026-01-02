import { useState, useEffect } from 'react';
import { HelpCircle, X, Keyboard, ChevronRight } from 'lucide-react';
import { db } from '../db/database';

interface NavigationHelperProps {
  shortcuts: Array<{ key: string; description: string; keys: string[] }>;
}

export function NavigationHelper({ shortcuts }: NavigationHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showOnMount, setShowOnMount] = useState(false);

  useEffect(() => {
    // Show helper on first visit (check IndexedDB - Rule 4: NO localStorage)
    let isMounted = true;
    
    async function checkFirstVisit() {
      try {
        // Use IndexedDB to track if user has seen helper
        const setting = await db.settings.get('hasSeenNavigationHelper');
        if (!setting && isMounted) {
          setShowOnMount(true);
          setIsOpen(true);
          // Store in IndexedDB
          await db.settings.put({ key: 'hasSeenNavigationHelper', value: true });
        }
      } catch (error) {
        // If settings table doesn't exist or error, show helper anyway
        console.warn('Could not check navigation helper status:', error);
        if (isMounted) {
          setShowOnMount(true);
          setIsOpen(true);
        }
      }
    }
    
    checkFirstVisit();
    
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isOpen && !showOnMount) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Show keyboard shortcuts"
        title="Keyboard Shortcuts (?)"
      >
        <Keyboard size={20} />
      </button>
    );
  }

  return (
    <>
      {!isOpen && showOnMount && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 animate-pulse"
          aria-label="Show keyboard shortcuts"
        >
          <Keyboard size={20} />
        </button>
      )}
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Keyboard className="text-blue-400" size={24} />
                <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowOnMount(false);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-gray-300 mb-1">{shortcut.description}</div>
                      <div className="flex gap-1 flex-wrap">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-gray-900 text-gray-200 rounded text-xs font-mono border border-gray-600">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <ChevronRight size={12} className="text-gray-500" />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  <HelpCircle className="inline mr-2" size={16} />
                  Tip: Use arrow keys to navigate between tabs. Press numbers 1-9 to jump to specific tabs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

