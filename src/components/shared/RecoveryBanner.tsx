/**
 * RecoveryBanner - Crash Recovery UI
 * 
 * Shows when the app detects a previous session that didn't close properly.
 * Offers to restore the previous state or dismiss.
 * 
 * ANTIFRAGILE: Non-intrusive, dismissable, helps users recover from crashes
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X, Clock, Database } from 'lucide-react';
import { checkForRecovery, clearBackup, loadBackup, RecoveryInfo, AutoBackupState } from '../../utils/autoBackup';

interface RecoveryBannerProps {
  onRecover?: (state: AutoBackupState['state']) => void;
  onDismiss?: () => void;
}

export function RecoveryBanner({ onRecover, onDismiss }: RecoveryBannerProps) {
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for recovery data on mount
    const info = checkForRecovery();
    if (info.hasRecoveryData) {
      setRecoveryInfo(info);
      setIsVisible(true);
    }
  }, []);

  const handleRecover = () => {
    const backup = loadBackup();
    if (backup?.state && onRecover) {
      onRecover(backup.state);
    }
    clearBackup();
    setIsVisible(false);
    onDismiss?.();
  };

  const handleDismiss = () => {
    clearBackup();
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || !recoveryInfo) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className={`mx-auto max-w-4xl mt-4 mx-4 rounded-lg shadow-lg border ${
        recoveryInfo.crashDetected 
          ? 'bg-amber-50 border-amber-200' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`p-2 rounded-full ${
              recoveryInfo.crashDetected 
                ? 'bg-amber-100' 
                : 'bg-blue-100'
            }`}>
              {recoveryInfo.crashDetected ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <RefreshCw className="w-5 h-5 text-blue-600" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${
                recoveryInfo.crashDetected 
                  ? 'text-amber-800' 
                  : 'text-blue-800'
              }`}>
                {recoveryInfo.crashDetected 
                  ? 'Previous Session Recovery Available' 
                  : 'Restore Previous Session?'
                }
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {recoveryInfo.crashDetected 
                  ? 'It looks like your previous session ended unexpectedly. Would you like to restore your previous state?'
                  : 'You have a previous session that can be restored.'
                }
              </p>
              
              {/* Session Info */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {recoveryInfo.sessionAge}
                </span>
                {recoveryInfo.state?.activeTab && (
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Tab: {recoveryInfo.state.activeTab}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRecover}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  recoveryInfo.crashDetected
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Restore
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AUTO-SAVE INDICATOR (Optional - shows when auto-save happens)
// ============================================================================

interface AutoSaveIndicatorProps {
  lastSaved: Date | null;
  className?: string;
}

export function AutoSaveIndicator({ lastSaved, className = '' }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSaved) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  if (!showSaved) return null;

  return (
    <div className={`flex items-center gap-1 text-xs text-green-600 animate-fade-in ${className}`}>
      <RefreshCw className="w-3 h-3" />
      <span>Auto-saved</span>
    </div>
  );
}

export default RecoveryBanner;
