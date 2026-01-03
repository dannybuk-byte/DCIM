/**
 * Cloudflare Deployment Pulse
 * 
 * Shows a visual pulse when checking for updates
 * Helps users see the system is actively monitoring for changes
 */

import React from 'react';

export const DeploymentPulse: React.FC = () => {
  return (
    <div className="fixed top-2 right-2 z-[9999] flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-full px-3 py-1.5 shadow-lg">
      {/* Pulsing dot */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-3 h-3 bg-cyan-500 rounded-full animate-ping opacity-75" />
        <div className="relative w-2 h-2 bg-cyan-400 rounded-full" />
      </div>
      
      {/* Status text */}
      <div className="flex flex-col">
        <span className="text-[10px] text-cyan-300 font-semibold leading-none">
          Live Monitoring
        </span>
        <span className="text-[8px] text-gray-400 leading-none mt-0.5">
          Cloudflare Auto-Deploy
        </span>
      </div>

      {/* Cloudflare logo/indicator */}
      <svg
        className="w-4 h-4 text-orange-400"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M19.5 9.4c.1-.4.2-.8.2-1.2 0-2.5-2-4.5-4.5-4.5-1.8 0-3.4 1.1-4.1 2.7-.4-.1-.8-.2-1.2-.2-2.5 0-4.5 2-4.5 4.5 0 .4.1.8.2 1.2C3.5 12.5 2 14.5 2 17c0 2.8 2.2 5 5 5h12c2.8 0 5-2.2 5-5 0-2.5-1.5-4.5-3.5-5.1z" />
      </svg>
    </div>
  );
};

