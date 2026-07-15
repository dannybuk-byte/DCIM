import React from 'react';
import { DbInitState } from '../runtime/dbInitState';

interface DbInitStatusBannerProps {
  state: DbInitState;
  onRetry?: () => void;
  onReload?: () => void;
}

/**
 * Visible DB init chrome. Blocked is distinct from loading / unavailable / migration-failed.
 */
export const DbInitStatusBanner: React.FC<DbInitStatusBannerProps> = ({
  state,
  onRetry,
  onReload,
}) => {
  if (state.kind === 'ready') {
    return null;
  }

  if (state.kind === 'opening' || state.kind === 'upgrading') {
    return (
      <div
        className="mb-3 rounded border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-200"
        data-db-init={state.kind}
        role="status"
      >
        {state.kind === 'opening'
          ? 'Opening local database…'
          : 'Upgrading local database schema…'}
      </div>
    );
  }

  if (state.kind === 'blocked') {
    return (
      <div
        className="mb-3 rounded border border-amber-600/60 bg-amber-950/50 px-3 py-2 text-sm text-amber-100"
        data-db-init="blocked"
        role="alert"
      >
        <div className="font-semibold">Database upgrade blocked</div>
        <p className="mt-1 text-xs text-amber-100/90">
          {state.diagnostic ??
            'Another tab is holding an older database connection. Close other tabs, then reload. This will not delete your data.'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className="rounded border border-amber-500/50 px-2 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
            >
              Reload this tab
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded border border-amber-500/50 px-2 py-1 text-xs text-amber-100 hover:bg-amber-500/20"
            >
              Retry open
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state.kind === 'migration-failed') {
    return (
      <div
        className="mb-3 rounded border border-red-700/60 bg-red-950/40 px-3 py-2 text-sm text-red-100"
        data-db-init="migration-failed"
        role="alert"
      >
        <div className="font-semibold">Schema migration failed</div>
        <p className="mt-1 text-xs">
          {state.diagnostic ?? 'Migration failed'}. Prior local data was not deleted.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded border border-red-500/50 px-2 py-1 text-xs hover:bg-red-500/20"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // unavailable
  return (
    <div
      className="mb-3 rounded border border-orange-700/60 bg-orange-950/40 px-3 py-2 text-sm text-orange-100"
      data-db-init="unavailable"
      role="alert"
    >
      <div className="font-semibold">Local database unavailable</div>
      <p className="mt-1 text-xs">{state.diagnostic ?? 'Required local storage cannot be used.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded border border-orange-500/50 px-2 py-1 text-xs hover:bg-orange-500/20"
        >
          Retry
        </button>
      )}
    </div>
  );
};
