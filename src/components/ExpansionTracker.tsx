/**
 * Expansion Tracker Dashboard
 * 
 * Real-time monitoring of facility infrastructure expansion via
 * Certificate Transparency logs and subdomain discovery.
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Server, Activity, RefreshCw } from 'lucide-react';
import {
  monitorFacilityExpansion,
  generateExpansionInsights,
  type SubdomainDiscovery,
  type ExpansionEvent,
} from '../utils/expansionTracker';
import type { Facility } from '../types';

interface ExpansionTrackerProps {
  facility: Facility;
  className?: string;
}

export const ExpansionTracker: React.FC<ExpansionTrackerProps> = React.memo(({ facility, className = '' }) => {
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [subdomains, setSubdomains] = useState<SubdomainDiscovery[]>([]);
  const [events, setEvents] = useState<ExpansionEvent[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Derive domain from facility (simplified - in production would use actual domain data)
  const domain = facility.name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.com';

  const checkExpansion = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await monitorFacilityExpansion(facility.name, domain);
      
      setSubdomains(result.newSubdomains);
      setEvents(result.expansionEvents);
      setInsights(generateExpansionInsights(facility.name, result.newSubdomains, result.expansionEvents));
      setLastCheck(new Date());
    } catch (err) {
      console.error('[ExpansionTracker] Error:', err);
      setError('Failed to check for expansions. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-check on mount
  useEffect(() => {
    checkExpansion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility.id]);

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold text-white">Infrastructure Expansion Tracker</h3>
        </div>
        <button
          onClick={checkExpansion}
          disabled={loading}
          className="p-1.5 bg-purple-500/10 border border-purple-500/30 rounded hover:bg-purple-500/20 transition-colors disabled:opacity-50"
          title="Refresh expansion data"
        >
          <RefreshCw className={`w-4 h-4 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400">
        Monitors Certificate Transparency logs for new subdomains indicating facility expansions.
      </p>

      {/* Loading State */}
      {loading && !lastCheck && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <p className="text-xs text-slate-400 mt-2">Scanning certificate logs...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && lastCheck && !error && (
        <>
          {/* Insights */}
          {insights.length > 0 && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-md">
              <div className="flex items-start gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white mb-2">Key Findings:</p>
                  <ul className="space-y-1">
                    {insights.map((insight, i) => (
                      <li key={i} className="text-xs text-slate-300">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* New Subdomains */}
          {subdomains.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-purple-400" />
                <p className="text-xs font-semibold text-white">New Subdomains Detected:</p>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {subdomains.slice(0, 10).map((subdomain, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 border border-slate-700 rounded text-xs">
                    <div className="flex-1 truncate">
                      <p className="text-slate-300 font-mono truncate">{subdomain.subdomain}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        {subdomain.pattern} · {subdomain.confidence}% confidence
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-500 ml-2">
                      {Math.floor((Date.now() - subdomain.firstSeen.getTime()) / (24 * 60 * 60 * 1000))}d ago
                    </div>
                  </div>
                ))}
                {subdomains.length > 10 && (
                  <p className="text-xs text-slate-500 text-center py-1">
                    +{subdomains.length - 10} more subdomains
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Expansion Events */}
          {events.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <p className="text-xs font-semibold text-white">Expansion Events:</p>
              </div>
              <div className="space-y-2">
                {events.slice(0, 3).map((event, i) => (
                  <div key={i} className={`p-2 rounded border ${
                    event.significance === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
                    event.significance === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-blue-500/10 border-blue-500/30'
                  }`}>
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-semibold text-white">{event.pattern}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        event.significance === 'high' ? 'bg-orange-500 text-white' :
                        event.significance === 'medium' ? 'bg-yellow-500 text-black' :
                        'bg-blue-500 text-white'
                      }`}>
                        {event.significance.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {event.newSubdomains.length} new subdomain{event.newSubdomains.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {event.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Expansion */}
          {subdomains.length === 0 && events.length === 0 && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-xs text-green-300">
                  No new infrastructure detected - stable configuration
                </p>
              </div>
            </div>
          )}

          {/* Last Check */}
          <div className="pt-2 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>Last checked: {lastCheck.toLocaleTimeString()}</span>
          </div>
        </>
      )}

      {/* Help Text */}
      <div className="pt-2 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          💡 Uses Certificate Transparency logs to track new subdomains. New infrastructure often indicates facility expansions.
        </p>
      </div>
    </div>
  );
});

ExpansionTracker.displayName = 'ExpansionTracker';

export default ExpansionTracker;

