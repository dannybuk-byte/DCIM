/**
 * ConfirmationDialog - Prevent Accidental Actions
 * 
 * Provides confirmation before destructive actions:
 * 1. Customizable severity levels
 * 2. Type-to-confirm for critical actions
 * 3. Keyboard accessible
 * 4. Auto-focus on safe option
 * 
 * ANTIFRAGILE: Prevents costly mistakes
 */

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  AlertTriangle, Trash2, AlertCircle, HelpCircle,
  X, Check, Loader2, ShieldAlert
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type ConfirmSeverity = 'info' | 'warning' | 'danger' | 'critical';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  message: string | ReactNode;
  severity?: ConfirmSeverity;
  confirmText?: string;
  cancelText?: string;
  confirmDelay?: number; // ms delay before confirm is enabled
  typeToConfirm?: string; // requires typing this text to confirm
  icon?: ReactNode;
  isLoading?: boolean;
}

// ============================================================================
// SEVERITY STYLES
// ============================================================================

const SEVERITY_CONFIG: Record<ConfirmSeverity, {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  confirmBg: string;
  confirmHover: string;
  borderColor: string;
}> = {
  info: {
    icon: <HelpCircle className="w-6 h-6" />,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBg: 'bg-blue-600',
    confirmHover: 'hover:bg-blue-700',
    borderColor: 'border-blue-200',
  },
  warning: {
    icon: <AlertCircle className="w-6 h-6" />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBg: 'bg-amber-600',
    confirmHover: 'hover:bg-amber-700',
    borderColor: 'border-amber-200',
  },
  danger: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBg: 'bg-red-600',
    confirmHover: 'hover:bg-red-700',
    borderColor: 'border-red-200',
  },
  critical: {
    icon: <ShieldAlert className="w-6 h-6" />,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBg: 'bg-red-700',
    confirmHover: 'hover:bg-red-800',
    borderColor: 'border-red-300',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  severity = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmDelay = 0,
  typeToConfirm,
  icon,
  isLoading = false,
}: ConfirmationDialogProps) {
  const [canConfirm, setCanConfirm] = useState(!confirmDelay);
  const [countdown, setCountdown] = useState(Math.ceil(confirmDelay / 1000));
  const [typedText, setTypedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = SEVERITY_CONFIG[severity];

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTypedText('');
      setCanConfirm(!confirmDelay);
      setCountdown(Math.ceil(confirmDelay / 1000));
      setIsSubmitting(false);
      
      // Focus appropriate element
      setTimeout(() => {
        if (typeToConfirm) {
          inputRef.current?.focus();
        } else {
          cancelButtonRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, confirmDelay, typeToConfirm]);

  // Countdown timer for delayed confirm
  useEffect(() => {
    if (!isOpen || !confirmDelay || canConfirm) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanConfirm(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, confirmDelay, canConfirm]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && canConfirm && !typeToConfirm) {
        if (!isSubmitting && !isLoading) {
          handleConfirm();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, canConfirm, typeToConfirm, isSubmitting, isLoading, onCancel]);

  const isTypeConfirmValid = !typeToConfirm || typedText === typeToConfirm;

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || !isTypeConfirmValid || isSubmitting || isLoading) return;

    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  }, [canConfirm, isTypeConfirmValid, isSubmitting, isLoading, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className={`bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border-t-4 ${config.borderColor}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        {/* Header */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`p-3 rounded-full ${config.iconBg} ${config.iconColor} flex-shrink-0`}>
              {icon || config.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 
                id="confirm-title"
                className="text-lg font-semibold text-gray-900"
              >
                {title}
              </h3>
              <div className="mt-2 text-sm text-gray-600">
                {message}
              </div>

              {/* Type to confirm */}
              {typeToConfirm && (
                <div className="mt-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Type <code className="px-1 py-0.5 bg-gray-100 rounded font-mono text-red-600">{typeToConfirm}</code> to confirm:
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={typedText}
                    onChange={e => setTypedText(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors ${
                      typedText && typedText !== typeToConfirm
                        ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : typedText === typeToConfirm
                        ? 'border-green-300 focus:border-green-500 focus:ring-1 focus:ring-green-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                    placeholder={typeToConfirm}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {typedText && typedText !== typeToConfirm && (
                    <p className="mt-1 text-xs text-red-500">Text doesn't match</p>
                  )}
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onCancel}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || !isTypeConfirmValid || isSubmitting || isLoading}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.confirmBg} ${config.confirmHover}`}
          >
            {isSubmitting || isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {!canConfirm && countdown > 0 ? (
              `Wait ${countdown}s`
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SPECIALIZED DIALOGS
// ============================================================================

interface DeleteConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  itemName?: string;
  itemCount?: number;
  isLoading?: boolean;
}

export function DeleteConfirmation({
  isOpen,
  onConfirm,
  onCancel,
  itemName,
  itemCount = 1,
  isLoading,
}: DeleteConfirmationProps) {
  const name = itemName || (itemCount > 1 ? `${itemCount} items` : 'this item');
  
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title="Delete Confirmation"
      message={
        <span>
          Are you sure you want to delete <strong>{name}</strong>? 
          This action cannot be undone.
        </span>
      }
      severity="danger"
      confirmText="Delete"
      icon={<Trash2 className="w-6 h-6" />}
      isLoading={isLoading}
    />
  );
}

interface CriticalActionConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  message: string | ReactNode;
  confirmPhrase: string;
  isLoading?: boolean;
}

export function CriticalActionConfirmation({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmPhrase,
  isLoading,
}: CriticalActionConfirmationProps) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title={title}
      message={message}
      severity="critical"
      confirmText="I understand, proceed"
      typeToConfirm={confirmPhrase}
      confirmDelay={3000}
      isLoading={isLoading}
    />
  );
}

// ============================================================================
// HOOK FOR CONFIRMATION
// ============================================================================

interface UseConfirmationOptions {
  title: string;
  message: string | ReactNode;
  severity?: ConfirmSeverity;
  confirmText?: string;
  typeToConfirm?: string;
  confirmDelay?: number;
}

export function useConfirmation(options: UseConfirmationOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((): Promise<boolean> => {
    setIsOpen(true);
    return new Promise(resolve => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setIsOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setIsOpen(false);
  }, []);

  const Dialog = useCallback(() => (
    <ConfirmationDialog
      isOpen={isOpen}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      isLoading={isLoading}
      {...options}
    />
  ), [isOpen, isLoading, handleConfirm, handleCancel, options]);

  return {
    confirm,
    setLoading: setIsLoading,
    Dialog,
    isOpen,
  };
}

export default ConfirmationDialog;
