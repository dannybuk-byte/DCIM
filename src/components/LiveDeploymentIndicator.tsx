/**
 * Live Deployment Status Indicator
 * 
 * Shows real-time deployment status and notifies when updates are available
 * Helps users know when their changes are live!
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Zap, Github } from 'lucide-react';

interface DeploymentStatus {
  currentVersion: string;
  latestVersion: string;
  deploymentStatus: 'checking' | 'deploying' | 'deployed' | 'error';
  lastChecked: number;
  updateAvailable: boolean;
}

export const LiveDeploymentIndicator: React.FC = () => {
  const [status, setStatus] = useState<DeploymentStatus>({
    currentVersion: '',
    latestVersion: '',
    deploymentStatus: 'checking',
    lastChecked: Date.now(),
    updateAvailable: false
  });
  const [showNotification, setShowNotification] = useState(false);

  // Get current app version from meta tag or build time
  const getCurrentVersion = (): string => {
    const meta = document.querySelector('meta[name="app-version"]');
    if (meta) return meta.getAttribute('content') || '';
    
    // Fallback: use build timestamp
    return document.documentElement.dataset.buildTime || String(Date.now());
  };

  // Check GitHub for latest commit
  const checkLatestVersion = async (): Promise<string> => {
    try {
      const response = await fetch(
        'https://api.github.com/repos/dannybuk-byte/DCIM/commits/main',
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );
      const data = await response.json();
      return data.sha.substring(0, 7); // Short SHA
    } catch (error) {
      console.warn('Could not check for updates:', error);
      return '';
    }
  };

  // Check for updates every 30 seconds
  useEffect(() => {
    const checkForUpdates = async () => {
      const current = getCurrentVersion();
      const latest = await checkLatestVersion();
      
      if (!latest) return;

      const updateAvailable = current !== latest && current !== '';
      
      setStatus({
        currentVersion: current || 'unknown',
        latestVersion: latest,
        deploymentStatus: updateAvailable ? 'deployed' : 'checking',
        lastChecked: Date.now(),
        updateAvailable
      });

      // Show notification if update available
      if (updateAvailable && !showNotification) {
        setShowNotification(true);
        // Auto-hide after 10 seconds
        setTimeout(() => setShowNotification(false), 10000);
      }
    };

    // Check immediately
    checkForUpdates();

    // Then every 30 seconds
    const interval = setInterval(checkForUpdates, 30000);

    return () => clearInterval(interval);
  }, [showNotification]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const getStatusColor = () => {
    if (status.updateAvailable) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (status.deploymentStatus === 'deploying') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    if (status.deploymentStatus === 'error') return 'text-red-400 bg-red-500/10 border-red-500/30';
    return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  };

  const getStatusIcon = () => {
    if (status.updateAvailable) return <Zap className="w-4 h-4 animate-pulse" />;
    if (status.deploymentStatus === 'deploying') return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (status.deploymentStatus === 'error') return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (status.updateAvailable) return 'Update Available!';
    if (status.deploymentStatus === 'deploying') return 'Deploying...';
    if (status.deploymentStatus === 'error') return 'Deploy Error';
    return 'Up to date';
  };

  return (
    <>
      {/* Update Notification Banner */}
      {showNotification && status.updateAvailable && (
        <div className="fixed top-4 right-4 z-[9999] animate-slideIn">
          <div className="bg-green-500/20 border-2 border-green-500/50 rounded-lg p-4 shadow-2xl shadow-green-500/20 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <Zap className="w-6 h-6 text-green-400 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-green-300 mb-1">
                  🎉 New Version Available!
                </div>
                <div className="text-sm text-green-200 mb-3">
                  Your changes have been deployed. Refresh to see the latest updates!
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-medium text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    Refresh Now
                  </button>
                  <button
                    onClick={() => setShowNotification(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Status Indicator (always visible) */}
      <div className={`fixed bottom-4 right-4 z-[9998] ${getStatusColor()} border rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm flex items-center gap-2 text-sm`}>
        {getStatusIcon()}
        <div className="flex flex-col">
          <div className="font-semibold">{getStatusText()}</div>
          <div className="text-xs opacity-75">
            v{status.currentVersion.substring(0, 7) || 'dev'}
            {status.updateAvailable && (
              <span className="ml-2">
                → v{status.latestVersion.substring(0, 7)}
              </span>
            )}
          </div>
        </div>
        
        {/* GitHub link */}
        <a
          href="https://github.com/dannybuk-byte/DCIM/commits/main"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
          title="View commits on GitHub"
        >
          <Github className="w-4 h-4" />
        </a>

        {/* Refresh button */}
        {status.updateAvailable && (
          <button
            onClick={handleRefresh}
            className="ml-2 px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3 h-3 inline mr-1" />
            Refresh
          </button>
        )}
      </div>
    </>
  );
};

// Helper component: Build timestamp injector
export const BuildInfo: React.FC = () => {
  useEffect(() => {
    // Inject build time into DOM
    document.documentElement.dataset.buildTime = String(Date.now());
    
    // Try to get actual git commit hash
    fetch('/commit-hash.txt')
      .then(r => r.text())
      .then(hash => {
        const meta = document.createElement('meta');
        meta.name = 'app-version';
        meta.content = hash.trim();
        document.head.appendChild(meta);
      })
      .catch(() => {
        // Fallback to timestamp
        const meta = document.createElement('meta');
        meta.name = 'app-version';
        meta.content = String(Date.now());
        document.head.appendChild(meta);
      });
  }, []);

  return null;
};

