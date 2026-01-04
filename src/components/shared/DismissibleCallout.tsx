import { memo, useEffect, useState } from 'react';
import { X, Info } from 'lucide-react';
import { db } from '../../db/database';

export const DismissibleCallout = memo(function DismissibleCallout({
  id,
  title,
  body,
  actions,
  variant = 'info',
  className = '',
}: {
  id: string; // persisted key
  title: string;
  body: string;
  actions?: Array<{ label: string; onClick: () => void }>;
  variant?: 'info' | 'warning' | 'success';
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get(`callout:${id}`);
        const dismissed = Boolean(row?.value);
        if (!cancelled) setVisible(!dismissed);
      } catch {
        if (!cancelled) setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const dismiss = async () => {
    setVisible(false);
    try {
      await db.settings.put({ key: `callout:${id}`, value: true });
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  const palette =
    variant === 'warning'
      ? { border: 'border-amber-700/50', bg: 'bg-amber-900/20', title: 'text-amber-200', icon: 'text-amber-300' }
      : variant === 'success'
        ? { border: 'border-green-700/50', bg: 'bg-green-900/20', title: 'text-green-200', icon: 'text-green-300' }
        : { border: 'border-cyan-700/50', bg: 'bg-cyan-900/20', title: 'text-cyan-200', icon: 'text-cyan-300' };

  return (
    <div className={`rounded-lg border ${palette.border} ${palette.bg} p-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-sm font-semibold ${palette.title} flex items-center gap-2`}>
            <Info className={`w-4 h-4 ${palette.icon}`} />
            <span className="truncate">{title}</span>
          </div>
          <div className="text-xs text-gray-300 mt-1">{body}</div>
          {actions && actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {actions.map((a, idx) => (
                <button
                  key={`${id}-a-${idx}`}
                  type="button"
                  onClick={a.onClick}
                  className="px-2 py-1 rounded text-[11px] border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            dismiss().catch(() => {});
          }}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Dismiss tip"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-gray-300" />
        </button>
      </div>
    </div>
  );
});



