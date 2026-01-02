import { memo, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import type { DataSource } from '../../types';
import { Tooltip } from './Tooltip';

function formatWhen(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export const SourcesPill = memo(function SourcesPill({
  sources,
  field,
  derivedNote,
  facilityId,
  className = '',
}: {
  sources?: DataSource[];
  field: string;
  derivedNote?: string; // for computed values
  facilityId?: number;
  className?: string;
}) {
  const forField = useMemo(() => {
    const all = Array.isArray(sources) ? sources : [];
    return all.filter((s) => String(s.field || '') === field);
  }, [sources, field]);

  const count = forField.length;

  const content = useMemo(() => {
    if (derivedNote) {
      return `Derived: ${derivedNote}`;
    }
    if (!count) {
      return `No source recorded for "${field}". This value may be seeded/simulated or derived.`;
    }
    const lines = forField.map((s) => {
      const parts = [
        `• ${s.type}${s.verified ? ' (verified)' : ' (unverified)'}`,
        s.fetchedAt ? ` @ ${formatWhen(s.fetchedAt)}` : '',
        s.reference ? ` — ${s.reference}` : '',
      ].join('');
      return parts;
    });
    return `Sources for "${field}":\n${lines.join('\n')}`;
  }, [count, derivedNote, field, forField]);

  return (
    <Tooltip content={content}>
      <button
        type="button"
        onClick={() => {
          if (!facilityId) return;
          window.dispatchEvent(new CustomEvent('dcim:openSourceManager', { detail: { facilityId, field } }));
        }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
          count
            ? 'bg-cyan-900/20 text-cyan-200 border-cyan-700/40 hover:bg-cyan-900/30'
            : derivedNote
              ? 'bg-purple-900/20 text-purple-200 border-purple-700/40 hover:bg-purple-900/30'
              : 'bg-red-900/20 text-red-200 border-red-700/40 hover:bg-red-900/30'
        } ${!facilityId ? 'cursor-help' : 'cursor-pointer'} ${className}`}
        aria-label={`Sources for ${field}`}
        title={facilityId ? 'Open Source Manager for this facility' : undefined}
      >
        <BookOpen className="w-3.5 h-3.5" />
        {derivedNote ? 'Derived' : count ? `Src ${count}` : 'Uncited'}
      </button>
    </Tooltip>
  );
});


