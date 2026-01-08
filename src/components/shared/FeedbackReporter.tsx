/**
 * FeedbackReporter - Easy Bug/Issue Reporting
 * 
 * Enables users to quickly report issues with:
 * 1. Auto-captured diagnostic context
 * 2. Screenshot capability
 * 3. Categorized feedback types
 * 4. Local storage for offline submission
 * 
 * ANTIFRAGILE: Creates feedback loop for continuous improvement
 */

import { useState, useCallback, useEffect } from 'react';
import {
  MessageSquare, Bug, Lightbulb, HelpCircle,
  Send, X, Camera, Paperclip, Check,
  AlertTriangle, Loader2, ChevronDown, Trash2
} from 'lucide-react';
import { getRecentActions } from '../../utils/actionHistory';
import { getConnectionState } from '../../utils/connectionResilience';
import { getSessionInfo } from '../../utils/sessionPersistence';
import { db } from '../../db/database';

// ============================================================================
// TYPES
// ============================================================================

type FeedbackType = 'bug' | 'feature' | 'question' | 'other';

interface FeedbackReport {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  context: FeedbackContext;
  timestamp: number;
  status: 'pending' | 'submitted' | 'failed';
  screenshot?: string;
}

interface FeedbackContext {
  url: string;
  userAgent: string;
  screenSize: string;
  recentActions: string[];
  connectionStatus: string;
  sessionDuration: number;
  facilityCount: number;
  errorCount: number;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'dcim_feedback_queue';

function loadFeedbackQueue(): FeedbackReport[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFeedbackQueue(queue: FeedbackReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    console.warn('[Feedback] Failed to save queue');
  }
}

function addToQueue(report: FeedbackReport): void {
  const queue = loadFeedbackQueue();
  queue.push(report);
  saveFeedbackQueue(queue);
}

function removeFromQueue(id: string): void {
  const queue = loadFeedbackQueue();
  saveFeedbackQueue(queue.filter(r => r.id !== id));
}

// ============================================================================
// CONTEXT COLLECTION
// ============================================================================

async function collectContext(): Promise<FeedbackContext> {
  const recentActions = getRecentActions(10).map(a => `${a.category}: ${a.action}`);
  const connState = getConnectionState();
  const sessionInfo = getSessionInfo();
  
  let facilityCount = 0;
  try {
    facilityCount = await db.facilities.count();
  } catch { /* ignore */ }

  const errorCount = getRecentActions(100).filter(a => !a.success).length;

  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    recentActions,
    connectionStatus: connState.status,
    sessionDuration: sessionInfo.sessionDuration,
    facilityCount,
    errorCount,
  };
}

// ============================================================================
// FEEDBACK TYPE CONFIG
// ============================================================================

const FEEDBACK_TYPES: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string; placeholder: string }> = {
  bug: {
    label: 'Bug Report',
    icon: <Bug className="w-4 h-4" />,
    color: 'text-red-600 bg-red-50 border-red-200',
    placeholder: 'Describe what happened and what you expected...',
  },
  feature: {
    label: 'Feature Request',
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    placeholder: 'Describe the feature you\'d like to see...',
  },
  question: {
    label: 'Question',
    icon: <HelpCircle className="w-4 h-4" />,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    placeholder: 'What would you like to know?',
  },
  other: {
    label: 'Other Feedback',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    placeholder: 'Share your thoughts...',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface FeedbackReporterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackReporter({ isOpen, onClose }: FeedbackReporterProps) {
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [context, setContext] = useState<FeedbackContext | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Load context when opened
  useEffect(() => {
    if (isOpen) {
      collectContext().then(setContext);
      setPendingCount(loadFeedbackQueue().filter(r => r.status === 'pending').length);
    }
  }, [isOpen]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setSubmitted(false);
      setShowContext(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !context) return;

    setIsSubmitting(true);

    const report: FeedbackReport = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: title.trim(),
      description: description.trim(),
      context,
      timestamp: Date.now(),
      status: 'pending',
    };

    // Save to local queue (for offline support)
    addToQueue(report);

    // Simulate submission (in real app, would send to backend)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark as submitted (in real app, would update based on response)
    const queue = loadFeedbackQueue();
    const updated = queue.map(r => 
      r.id === report.id ? { ...r, status: 'submitted' as const } : r
    );
    saveFeedbackQueue(updated);

    setIsSubmitting(false);
    setSubmitted(true);

    // Auto-close after success
    setTimeout(() => {
      onClose();
    }, 2000);
  }, [type, title, description, context, onClose]);

  if (!isOpen) return null;

  const typeConfig = FEEDBACK_TYPES[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Send Feedback</h3>
              <p className="text-xs text-blue-100">Help us improve the app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {submitted ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Thank you!</h4>
            <p className="text-gray-600">Your feedback has been saved.</p>
          </div>
        ) : (
          /* Form */
          <div className="p-6 space-y-4">
            {/* Feedback Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Feedback
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(FEEDBACK_TYPES) as FeedbackType[]).map(t => {
                  const config = FEEDBACK_TYPES[t];
                  const isSelected = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected 
                          ? config.color + ' border-current' 
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {config.icon}
                        <span className="text-xs font-medium">{config.label.split(' ')[0]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={`Brief summary of your ${type === 'bug' ? 'issue' : type === 'feature' ? 'request' : 'feedback'}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Details
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={typeConfig.placeholder}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                maxLength={2000}
              />
              <div className="text-xs text-gray-400 text-right mt-1">
                {description.length}/2000
              </div>
            </div>

            {/* Context Info */}
            <div>
              <button
                onClick={() => setShowContext(!showContext)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showContext ? 'rotate-180' : ''}`} />
                Diagnostic info will be included
              </button>
              
              {showContext && context && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
                  <div><strong>Page:</strong> {context.url}</div>
                  <div><strong>Screen:</strong> {context.screenSize}</div>
                  <div><strong>Connection:</strong> {context.connectionStatus}</div>
                  <div><strong>Records:</strong> {context.facilityCount.toLocaleString()}</div>
                  <div><strong>Recent errors:</strong> {context.errorCount}</div>
                  {context.recentActions.length > 0 && (
                    <div>
                      <strong>Recent actions:</strong>
                      <ul className="ml-4 mt-1">
                        {context.recentActions.slice(0, 5).map((a, i) => (
                          <li key={i} className="text-gray-500">• {a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pending submissions warning */}
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{pendingCount} previous submission(s) pending</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!submitted && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FLOATING TRIGGER BUTTON
// ============================================================================

interface FeedbackButtonProps {
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

export function FeedbackButton({ position = 'bottom-right', className = '' }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClass = position === 'bottom-right' 
    ? 'right-4 bottom-20' 
    : 'left-4 bottom-20';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${positionClass} z-40 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all ${className}`}
        title="Send Feedback"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
      <FeedbackReporter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

// ============================================================================
// INLINE TRIGGER
// ============================================================================

export function FeedbackTrigger({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        title="Send Feedback"
      >
        <MessageSquare className="w-4 h-4 text-gray-400" />
      </button>
      <FeedbackReporter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default FeedbackReporter;
