/**
 * Simple Build Version Badge
 * Shows current deployment version - NO COMPLEX DEPENDENCIES
 */

import React, { useEffect, useState } from 'react';

export const SimpleBuildBadge: React.FC = () => {
  const [buildTime] = useState(new Date().toLocaleTimeString());
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    // Pulse for first 5 seconds to grab attention
    const timer = setTimeout(() => setShowPulse(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9998] bg-gradient-to-r from-cyan-900/90 to-blue-900/90 backdrop-blur-sm border border-cyan-500/50 rounded-lg px-4 py-3 shadow-2xl shadow-cyan-500/20 min-w-[200px]">
      <div className="flex items-center gap-3">
        {/* Pulsing indicator */}
        <div className="relative flex items-center justify-center">
          {showPulse && (
            <div className="absolute w-3 h-3 bg-green-500 rounded-full animate-ping" />
          )}
          <div className="relative w-2 h-2 bg-green-400 rounded-full" />
        </div>
        
        <div className="flex-1">
          <div className="text-cyan-300 font-bold text-sm">
            🚀 Live Dashboard
          </div>
          <div className="text-cyan-400/70 text-xs">
            Loaded: {buildTime}
          </div>
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com/dannybuk-byte/DCIM"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-white/10 rounded transition-colors"
          title="View on GitHub"
        >
          <svg className="w-5 h-5 text-cyan-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </div>

      {/* Feature indicators */}
      <div className="mt-2 pt-2 border-t border-cyan-500/20 flex items-center gap-2 text-xs text-cyan-400/60">
        <span title="Pre-commit hooks active">✅ Safe</span>
        <span title="Auto-deploy active">🚀 Live</span>
        <span title="Health monitoring">🏥 OK</span>
      </div>
    </div>
  );
};

