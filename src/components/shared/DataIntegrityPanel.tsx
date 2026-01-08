/**
 * DataIntegrityPanel - Data Health Visualization
 * 
 * Displays data integrity check results with:
 * - Health score gauge
 * - Issue list by severity
 * - Suggestions for fixes
 * 
 * ANTIFRAGILE: Helps users identify and fix data problems
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  RefreshCw, ChevronDown, ChevronUp, AlertTriangle,
  AlertCircle, Info, CheckCircle, Clock, Database,
  Loader2, X
} from 'lucide-react';
import {
  runIntegrityCheck,
  runQuickCheck,
  IntegrityReport,
  IntegrityIssue,
  IssueSeverity,
} from '../../utils/dataIntegrity';

// ============================================================================
// HEALTH SCORE GAUGE
// ============================================================================

interface HealthGaugeProps {
  score: number;
  status: IntegrityReport['status'];
}

function HealthGauge({ score, status }: HealthGaugeProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colors = {
    healthy: { stroke: '#22c55e', bg: 'bg-green-50', text: 'text-green-600' },
    degraded: { stroke: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600' },
    critical: { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-600' },
  };

  const color = colors[status];

  return (
    <div className={`relative inline-flex items-center justify-center ${color.bg} rounded-full p-4`}>
      <svg className="w-28 h-28 transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color.text}`}>{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

// ============================================================================
// ISSUE CARD
// ============================================================================

interface IssueCardProps {
  issue: IntegrityIssue;
}

function IssueCard({ issue }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false);

  const icons: Record<IssueSeverity, React.ReactNode> = {
    critical: <ShieldX className="w-4 h-4 text-red-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    info: <Info className="w-4 h-4 text-blue-500" />,
  };

  const colors: Record<IssueSeverity, string> = {
    critical: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
    info: 'border-blue-200 bg-blue-50',
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${colors[issue.severity]}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-white/50 transition-colors"
      >
        {icons[issue.severity]}
        <span className="flex-1 text-sm font-medium text-gray-800 truncate">
          {issue.message}
        </span>
        {issue.affectedRecords && (
          <span className="text-xs text-gray-500 bg-white/50 px-1.5 py-0.5 rounded">
            {issue.affectedRecords} affected
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-white/50 bg-white/30">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-xs font-medium text-gray-500">Category:</span>
              <span className="capitalize">{issue.category.replace(/-/g, ' ')}</span>
            </div>
            
            {issue.suggestion && (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600">{issue.suggestion}</span>
              </div>
            )}

            {issue.details && Object.keys(issue.details).length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Technical details
                </summary>
                <pre className="mt-1 text-xs bg-white/50 p-2 rounded overflow-auto">
                  {JSON.stringify(issue.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PANEL
// ============================================================================

interface DataIntegrityPanelProps {
  autoRun?: boolean;
  onComplete?: (report: IntegrityReport) => void;
  className?: string;
}

export function DataIntegrityPanel({ 
  autoRun = false, 
  onComplete,
  className = '' 
}: DataIntegrityPanelProps) {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [filter, setFilter] = useState<IssueSeverity | 'all'>('all');

  const runCheck = useCallback(async () => {
    setIsRunning(true);
    try {
      const result = await runIntegrityCheck();
      setReport(result);
      onComplete?.(result);
    } finally {
      setIsRunning(false);
    }
  }, [onComplete]);

  // Auto-run on mount if enabled
  useEffect(() => {
    if (autoRun) {
      runCheck();
    }
  }, [autoRun, runCheck]);

  const filteredIssues = report?.issues.filter(
    issue => filter === 'all' || issue.severity === filter
  ) ?? [];

  const issueCounts = {
    critical: report?.issues.filter(i => i.severity === 'critical').length ?? 0,
    warning: report?.issues.filter(i => i.severity === 'warning').length ?? 0,
    info: report?.issues.filter(i => i.severity === 'info').length ?? 0,
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-800">Data Integrity</h4>
            <p className="text-xs text-gray-500">
              {report ? `Checked ${report.totalRecords.toLocaleString()} records` : 'Validate your data'}
            </p>
          </div>
        </div>

        <button
          onClick={runCheck}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {isRunning ? 'Checking...' : 'Run Check'}
        </button>
      </div>

      {/* Content */}
      {!report && !isRunning ? (
        <div className="p-8 text-center text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Click "Run Check" to validate data integrity</p>
        </div>
      ) : isRunning ? (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500">Analyzing data integrity...</p>
        </div>
      ) : report && (
        <>
          {/* Score and summary */}
          <div className="p-4 flex items-center gap-6 border-b border-gray-100">
            <HealthGauge score={report.score} status={report.status} />
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {report.status === 'healthy' ? (
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                ) : report.status === 'degraded' ? (
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                ) : (
                  <ShieldX className="w-5 h-5 text-red-500" />
                )}
                <span className={`font-medium capitalize ${
                  report.status === 'healthy' ? 'text-green-600' :
                  report.status === 'degraded' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {report.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-semibold text-gray-800">
                    {report.validRecords.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Valid</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-semibold text-gray-800">
                    {report.issues.length}
                  </div>
                  <div className="text-xs text-gray-500">Issues</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-semibold text-gray-800">
                    {report.duration}ms
                  </div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          {report.issues.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100 flex gap-1 overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filter === 'all' 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                All ({report.issues.length})
              </button>
              {issueCounts.critical > 0 && (
                <button
                  onClick={() => setFilter('critical')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === 'critical' 
                      ? 'bg-red-100 text-red-700' 
                      : 'text-red-500 hover:bg-red-50'
                  }`}
                >
                  Critical ({issueCounts.critical})
                </button>
              )}
              {issueCounts.warning > 0 && (
                <button
                  onClick={() => setFilter('warning')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === 'warning' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'text-amber-500 hover:bg-amber-50'
                  }`}
                >
                  Warnings ({issueCounts.warning})
                </button>
              )}
              {issueCounts.info > 0 && (
                <button
                  onClick={() => setFilter('info')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === 'info' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-blue-500 hover:bg-blue-50'
                  }`}
                >
                  Info ({issueCounts.info})
                </button>
              )}
            </div>
          )}

          {/* Issues list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredIssues.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                {report.issues.length === 0 
                  ? 'No issues found! Your data is healthy.'
                  : 'No issues match this filter.'
                }
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredIssues.map(issue => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Checked {new Date(report.timestamp).toLocaleTimeString()}
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {report.totalRecords.toLocaleString()} records
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT BADGE
// ============================================================================

interface IntegrityBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function IntegrityBadge({ onClick, className = '' }: IntegrityBadgeProps) {
  const [status, setStatus] = useState<{ healthy: boolean; score: number } | null>(null);

  useEffect(() => {
    runQuickCheck().then(setStatus);
  }, []);

  if (!status) return null;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors ${
        status.healthy 
          ? 'bg-green-50 text-green-600 hover:bg-green-100'
          : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
      } ${className}`}
      title="Data integrity status"
    >
      {status.healthy ? (
        <ShieldCheck className="w-3.5 h-3.5" />
      ) : (
        <ShieldAlert className="w-3.5 h-3.5" />
      )}
      <span>{status.score}%</span>
    </button>
  );
}

// ============================================================================
// MODAL WRAPPER
// ============================================================================

interface IntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrityModal({ isOpen, onClose }: IntegrityModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4">
        <DataIntegrityPanel autoRun={true} />
        <button
          onClick={onClose}
          className="mt-3 w-full py-2 bg-white hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>
    </div>
  );
}

export default DataIntegrityPanel;
