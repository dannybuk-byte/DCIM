/**
 * Compliance Assurance Monitor Tab
 * 
 * Military command-center style continuous monitoring
 * Inspired by:
 * - Juniper Apstra Intent-Based Networking
 * - HPE Marvis AIOps dashboard
 * - Military network operations centers
 */

import React, { useState, useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingDown, TrendingUp, Zap, Search, Shield } from 'lucide-react';
import type { Facility } from '../../types';
import { useComplianceAssurance } from '../../hooks/useComplianceAssurance';
import type { DriftAlert } from '../../analyzers/assurance/complianceAssuranceEngine';
import { liveFamilyChromeLabel } from '../../runtime/modeChrome';

interface AssuranceMonitorTabProps {
  facilities: Facility[];
}

export function AssuranceMonitorTab({ facilities }: AssuranceMonitorTabProps) {
  const assurance = useComplianceAssurance(facilities);
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState<Facility[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<DriftAlert | null>(null);
  
  // Handle natural language query
  const handleQuery = async () => {
    if (!query.trim()) return;
    const results = await assurance.queryIntent(query);
    setQueryResults(results);
  };
  
  // Filter alerts by severity
  const criticalAlerts = useMemo(
    () => assurance.alerts.filter(a => a.severity === 'critical'),
    [assurance.alerts]
  );
  
  const warningAlerts = useMemo(
    () => assurance.alerts.filter(a => a.severity === 'warning'),
    [assurance.alerts]
  );
  
  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-auto">
      {/* Header: Mission Control Style */}
      <div className="bg-gradient-to-r from-blue-950 to-indigo-950 border border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Compliance Assurance Monitor</h2>
              {assurance.isMonitoring && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-700 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-green-300 font-medium" data-mode-chrome="live-family">
                    {liveFamilyChromeLabel()}
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-blue-300 mt-1">
              Intent-based continuous validation • Auto-refresh: 5min
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={assurance.runAssurance}
              disabled={assurance.loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {assurance.loading ? 'Running...' : 'Run Assurance'}
            </button>
            
            {assurance.lastUpdate && (
              <div className="text-right">
                <div className="text-xs text-blue-400">Last Update</div>
                <div className="text-sm text-blue-200 font-mono">
                  {assurance.lastUpdate.toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Status Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {/* Violations */}
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="text-2xl font-bold text-red-300">
              {assurance.totalViolations}
            </div>
          </div>
          <div className="text-sm text-red-400">Intent Violations</div>
          <div className="text-xs text-red-500 mt-1">Immediate action required</div>
        </div>
        
        {/* Drifting */}
        <div className="bg-yellow-950/50 border border-yellow-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-5 h-5 text-yellow-400" />
            <div className="text-2xl font-bold text-yellow-300">
              {assurance.totalDrifting}
            </div>
          </div>
          <div className="text-sm text-yellow-400">Drifting from Intent</div>
          <div className="text-xs text-yellow-500 mt-1">Requires monitoring</div>
        </div>
        
        {/* Critical Alerts */}
        <div className="bg-orange-950/50 border border-orange-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-orange-400" />
            <div className="text-2xl font-bold text-orange-300">
              {assurance.criticalAlerts}
            </div>
          </div>
          <div className="text-sm text-orange-400">Critical Alerts</div>
          <div className="text-xs text-orange-500 mt-1">High urgency</div>
        </div>
        
        {/* Compliant */}
        <div className="bg-green-950/50 border border-green-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div className="text-2xl font-bold text-green-300">
              {facilities.length - assurance.totalViolations - assurance.totalDrifting}
            </div>
          </div>
          <div className="text-sm text-green-400">Intent Met</div>
          <div className="text-xs text-green-500 mt-1">No action needed</div>
        </div>
      </div>
      
      {/* Natural Language Query (Military Command Style) */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Search className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Natural Language Query</h3>
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            placeholder="e.g., 'Show me all Michigan facilities that failed job promises'"
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleQuery}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            Query
          </button>
        </div>
        
        {/* Query Suggestions */}
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            'Show facilities that failed job promises',
            'Find operators who received >$100M but hired <50 people',
            'Show overdue audits',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-300 rounded-full transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
        
        {/* Query Results */}
        {queryResults.length > 0 && (
          <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-sm text-slate-400 mb-2">
              Found {queryResults.length} facilities
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {queryResults.slice(0, 10).map((facility) => (
                <div
                  key={facility.id}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm hover:bg-slate-850 transition-colors"
                >
                  <div className="flex justify-between">
                    <span className="text-white">{facility.name}</span>
                    <span className="text-red-400">${(facility.subsidyGap / 1000000).toFixed(1)}M gap</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Drift Alerts Feed */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {/* Critical Alerts */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Critical Alerts</h3>
              <span className="px-2 py-0.5 bg-red-900/50 text-red-300 text-xs font-medium rounded-full">
                {criticalAlerts.length}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {criticalAlerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <div>No critical alerts</div>
              </div>
            ) : (
              criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="p-3 bg-red-950/30 border border-red-800 rounded-lg cursor-pointer hover:bg-red-950/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-medium text-red-300">{alert.operator}</div>
                    <div className="text-xs text-red-500">
                      {alert.detectedAt.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-sm text-red-400">{alert.message}</div>
                  {alert.trendDirection === 'degrading' && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                      <TrendingDown className="w-3 h-3" />
                      Degrading trend
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Warnings */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Warnings</h3>
              <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 text-xs font-medium rounded-full">
                {warningAlerts.length}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {warningAlerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <div>No warnings</div>
              </div>
            ) : (
              warningAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="p-3 bg-yellow-950/30 border border-yellow-800 rounded-lg cursor-pointer hover:bg-yellow-950/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-medium text-yellow-300">{alert.operator}</div>
                    <div className="text-xs text-yellow-500">
                      {alert.detectedAt.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-sm text-yellow-400">{alert.message}</div>
                  {alert.trendDirection === 'improving' && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-green-500">
                      <TrendingUp className="w-3 h-3" />
                      Improving trend
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {selectedAlert.operator}
                </h3>
                <div className="text-sm text-slate-400">
                  {selectedAlert.type.replace(/_/g, ' ')}
                </div>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-400 mb-1">Message</div>
                <div className="text-white">{selectedAlert.message}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Severity</div>
                  <div
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      selectedAlert.severity === 'critical'
                        ? 'bg-red-900/50 text-red-300'
                        : 'bg-yellow-900/50 text-yellow-300'
                    }`}
                  >
                    {selectedAlert.severity.toUpperCase()}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">Trend</div>
                  <div className="flex items-center gap-2">
                    {selectedAlert.trendDirection === 'degrading' && (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-red-300">Degrading</span>
                      </>
                    )}
                    {selectedAlert.trendDirection === 'improving' && (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-green-300">Improving</span>
                      </>
                    )}
                    {selectedAlert.trendDirection === 'stable' && (
                      <span className="text-slate-300">Stable</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-slate-400 mb-2">Suggested Actions</div>
                <ul className="space-y-2">
                  {selectedAlert.suggestedActions.map((action, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-slate-300"
                    >
                      <span className="text-cyan-400 mt-0.5">→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

