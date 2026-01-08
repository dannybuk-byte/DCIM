/**
 * ResilienceScorePanel - Comprehensive Resilience Visualization
 * 
 * Shows:
 * - Overall resilience score (0-100)
 * - Grade (A+ to F)
 * - Category breakdowns
 * - Individual check details
 * - Recommendations for improvement
 * 
 * ANTIFRAGILE: The score itself helps identify weak points
 */

import { useState } from 'react';
import {
  Shield, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp,
  X, AlertTriangle, TrendingUp, Award, Target, Zap
} from 'lucide-react';
import { useResilienceScore, ResilienceReport, CategoryScore, ScoreGrade } from '../../utils/resilienceScore';

// ============================================================================
// COMPACT BADGE
// ============================================================================

interface ResilienceBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function ResilienceBadge({ onClick, className = '' }: ResilienceBadgeProps) {
  const { report, loading, refresh } = useResilienceScore();

  if (loading || !report) {
    return (
      <button 
        className={`flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg animate-pulse ${className}`}
        disabled
      >
        <Shield className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-400">...</span>
      </button>
    );
  }

  const gradeColors: Record<ScoreGrade, string> = {
    'A+': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'A': 'bg-green-50 text-green-700 border-green-200',
    'B': 'bg-blue-50 text-blue-700 border-blue-200',
    'C': 'bg-amber-50 text-amber-700 border-amber-200',
    'D': 'bg-orange-50 text-orange-700 border-orange-200',
    'F': 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all hover:shadow-sm ${gradeColors[report.grade]} ${className}`}
      title={`Resilience Score: ${report.percentage}% (${report.grade})`}
    >
      <Shield className="w-3.5 h-3.5" />
      <span className="text-xs font-bold">{report.grade}</span>
      <span className="text-xs opacity-70">{report.percentage}%</span>
    </button>
  );
}

// ============================================================================
// FULL PANEL
// ============================================================================

interface ResilienceScorePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResilienceScorePanel({ isOpen, onClose }: ResilienceScorePanelProps) {
  const { report, loading, refresh } = useResilienceScore();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const getGradeConfig = (grade: ScoreGrade) => {
    const configs = {
      'A+': { color: 'text-emerald-600', bg: 'bg-emerald-100', message: 'MAXIMUM RESILIENCE!' },
      'A': { color: 'text-green-600', bg: 'bg-green-100', message: 'Excellent Resilience' },
      'B': { color: 'text-blue-600', bg: 'bg-blue-100', message: 'Good Resilience' },
      'C': { color: 'text-amber-600', bg: 'bg-amber-100', message: 'Adequate Resilience' },
      'D': { color: 'text-orange-600', bg: 'bg-orange-100', message: 'Needs Improvement' },
      'F': { color: 'text-red-600', bg: 'bg-red-100', message: 'Critical - Improve Now' },
    };
    return configs[grade];
  };

  const getCategoryIcon = (name: string) => {
    switch (name) {
      case 'Data Protection': return <Shield className="w-4 h-4" />;
      case 'Error Handling': return <AlertTriangle className="w-4 h-4" />;
      case 'Performance': return <Zap className="w-4 h-4" />;
      case 'Recovery Capability': return <RefreshCw className="w-4 h-4" />;
      case 'Monitoring Coverage': return <Target className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-600';
    if (pct >= 75) return 'text-green-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Resilience Score</h3>
              <p className="text-xs text-emerald-100">Comprehensive system health assessment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Recalculate Score"
            >
              <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && !report ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Main Score */}
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getGradeConfig(report.grade).bg}`}>
                  <div>
                    <div className={`text-5xl font-black ${getGradeConfig(report.grade).color}`}>
                      {report.grade}
                    </div>
                    <div className={`text-lg font-bold ${getGradeConfig(report.grade).color}`}>
                      {report.percentage}%
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-lg font-semibold text-gray-800">
                  {getGradeConfig(report.grade).message}
                </div>
                <div className="text-sm text-gray-500">
                  {report.totalScore} / {report.maxScore} points
                </div>
              </div>

              {/* Score Bar */}
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    report.percentage >= 85 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                    report.percentage >= 70 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
                    report.percentage >= 50 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                    'bg-gradient-to-r from-red-400 to-orange-500'
                  }`}
                  style={{ width: `${report.percentage}%` }}
                />
              </div>

              {/* Category Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Category Breakdown
                </h4>

                {report.categories.map((category) => (
                  <div 
                    key={category.name}
                    className="border rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedCategory(
                        expandedCategory === category.name ? null : category.name
                      )}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          category.percentage >= 80 ? 'bg-green-100 text-green-600' :
                          category.percentage >= 60 ? 'bg-blue-100 text-blue-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {getCategoryIcon(category.name)}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-800">{category.name}</div>
                          <div className="text-xs text-gray-500">
                            {category.score}/{category.maxScore} points
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-lg font-bold ${getPercentageColor(category.percentage)}`}>
                          {category.percentage}%
                        </div>
                        {expandedCategory === category.name ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {expandedCategory === category.name && (
                      <div className="px-4 pb-4 space-y-2 border-t bg-gray-50">
                        <div className="pt-3" />
                        {category.details.map((check, i) => (
                          <div 
                            key={i}
                            className="flex items-center justify-between p-2 bg-white rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              {check.passed ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <div>
                                <div className="text-sm font-medium">{check.name}</div>
                                <div className="text-xs text-gray-500">{check.description}</div>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-600">
                              {check.points}/{check.maxPoints}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {report.recommendations.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-500">
            Last calculated: {report ? new Date(report.timestamp).toLocaleTimeString() : 'Never'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResilienceScorePanel;
