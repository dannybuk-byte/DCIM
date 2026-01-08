/**
 * Triangulation Dashboard Component
 * 
 * Displays evidence triangulation results showing how claims are verified
 * across multiple data sources. Provides confidence scoring and conflict detection.
 * 
 * Features:
 * - Multi-source verification visualization
 * - Confidence scoring breakdown
 * - Conflict detection and resolution
 * - Legal readiness assessment
 * - Export for reports
 */

import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  FileText,
  Target,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Eye,
  Scale,
  Database,
  Globe,
  Network,
} from 'lucide-react';
import { useEvidenceTriangulation, TriangulationResult, SourceType } from '../services/evidenceTriangulation';

// ============================================================================
// SOURCE ICON MAPPING
// ============================================================================

const sourceIcons: Record<SourceType, React.ReactNode> = {
  sec_edgar: <FileText className="w-4 h-4 text-blue-500" />,
  epa_echo: <Globe className="w-4 h-4 text-green-500" />,
  bgp_ripe: <Network className="w-4 h-4 text-purple-500" />,
  ct_logs: <Shield className="w-4 h-4 text-orange-500" />,
  state_records: <Database className="w-4 h-4 text-cyan-500" />,
  news_media: <Target className="w-4 h-4 text-red-500" />,
};

const sourceNames: Record<SourceType, string> = {
  sec_edgar: 'SEC EDGAR',
  epa_echo: 'EPA ECHO',
  bgp_ripe: 'RIPE NCC BGP',
  ct_logs: 'Certificate Transparency',
  state_records: 'State Records',
  news_media: 'News Media',
};

// ============================================================================
// RESULT CARD COMPONENT
// ============================================================================

interface ResultCardProps {
  result: TriangulationResult;
  onExport: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, onExport }) => {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor = result.overallConfidence >= 0.8 ? 'text-green-600' :
                          result.overallConfidence >= 0.6 ? 'text-yellow-600' : 'text-red-600';

  const getConfidenceGrade = (confidence: number) => {
    if (confidence >= 0.9) return 'A';
    if (confidence >= 0.8) return 'B';
    if (confidence >= 0.7) return 'C';
    if (confidence >= 0.6) return 'D';
    return 'F';
  };

  const isLegalReady = result.legalReadiness === 'ready';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            result.verified ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {result.verified ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{result.claim.subject}</h4>
            <p className="text-sm text-gray-500">
              {result.sources.length} sources • {result.conflicts.length} conflicts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`text-2xl font-bold ${confidenceColor}`}>
              {(result.overallConfidence * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">
              Grade: {getConfidenceGrade(result.overallConfidence)}
            </div>
          </div>
          {isLegalReady && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
              <Scale className="w-3 h-3" />
              Legal Ready
            </span>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Source Results */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
              <Database className="w-4 h-4" />
              Source Verification ({result.sources.length})
            </h5>
            <div className="grid grid-cols-2 gap-3">
              {result.sources.map((source: { source: SourceType; found: boolean; confidence: number; data: unknown }, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    source.found
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {sourceIcons[source.source] || <Database className="w-4 h-4 text-gray-500" />}
                    <span className="font-medium text-sm">{sourceNames[source.source] || source.source}</span>
                    {source.found ? (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400 ml-auto" />
                    )}
                  </div>
                  {source.found && (
                    <div className="text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span className="font-medium">{(source.confidence * 100).toFixed(0)}%</span>
                      </div>
                      {source.data != null && (
                        <div className="flex justify-between mt-1">
                          <span>Value:</span>
                          <span className="font-medium">{JSON.stringify(source.data).slice(0, 50)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!source.found && (
                    <div className="text-xs text-gray-500">No data found</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Conflicts */}
          {result.conflicts.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-red-700 mb-3 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Detected Conflicts ({result.conflicts.length})
              </h5>
              <div className="space-y-2">
                {result.conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      conflict.severity === 'high'
                        ? 'bg-red-50 border-red-200'
                        : conflict.severity === 'medium'
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm capitalize">
                        {conflict.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        conflict.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : conflict.severity === 'medium'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {conflict.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{conflict.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      Sources: {conflict.sources.map(s => sourceNames[s]).join(' vs ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legal Readiness */}
          <div className={`p-4 rounded-lg ${
            isLegalReady ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Scale className={`w-5 h-5 ${isLegalReady ? 'text-green-600' : 'text-yellow-600'}`} />
              <span className="font-medium">Legal Readiness Assessment</span>
            </div>
            <p className="text-sm text-gray-600">
              {isLegalReady
                ? 'This claim meets FRE 902(14) requirements with sufficient corroborating evidence from multiple independent sources.'
                : 'Additional verification recommended before legal use. Consider gathering more corroborating evidence.'}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className={`w-3 h-3 ${result.overallConfidence >= 0.7 ? 'text-green-500' : 'text-gray-400'}`} />
                Confidence ≥70%
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className={`w-3 h-3 ${result.sources.filter((s: { found: boolean }) => s.found).length >= 2 ? 'text-green-500' : 'text-gray-400'}`} />
                2+ Sources
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className={`w-3 h-3 ${result.conflicts.filter((c: { severity: string }) => c.severity === 'high' || c.severity === 'critical').length === 0 ? 'text-green-500' : 'text-gray-400'}`} />
                No High Conflicts
              </div>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={onExport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Triangulation Report
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CLAIM FORM COMPONENT
// ============================================================================

interface ClaimFormProps {
  onTriangulate: (subject: string, claimType: string, claimValue: string, sources: SourceType[]) => Promise<void>;
  isLoading: boolean;
}

const ClaimForm: React.FC<ClaimFormProps> = ({ onTriangulate, isLoading }) => {
  const [subject, setSubject] = useState('');
  const [claimType, setClaimType] = useState('job_count');
  const [claimValue, setClaimValue] = useState('');
  const [selectedSources, setSelectedSources] = useState<SourceType[]>(['sec_edgar', 'epa_echo', 'state_records']);

  const allSources: SourceType[] = ['sec_edgar', 'epa_echo', 'bgp_ripe', 'ct_logs', 'state_records', 'news_media'];

  const toggleSource = (source: SourceType) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleSubmit = () => {
    if (!subject.trim() || !claimValue.trim() || selectedSources.length === 0) return;
    onTriangulate(subject, claimType, claimValue, selectedSources);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-blue-600" />
        Verify a Claim
      </h3>

      <div className="space-y-4">
        {/* Subject */}
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Claim Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., 'AWS Richmond Data Center' or 'Meta Prineville'"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Claim Type */}
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Claim Type</label>
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="job_count">Job Count</option>
            <option value="power_capacity">Power Capacity (MW)</option>
            <option value="subsidy_amount">Subsidy Amount ($)</option>
            <option value="ownership">Ownership Structure</option>
            <option value="environmental">Environmental Compliance</option>
          </select>
        </div>

        {/* Claimed Value */}
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Claimed Value</label>
          <input
            type="text"
            value={claimValue}
            onChange={(e) => setClaimValue(e.target.value)}
            placeholder="e.g., '500' for jobs or '$45M' for subsidy"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Source Selection */}
        <div>
          <label className="text-sm text-gray-600 mb-2 block">Sources to Query</label>
          <div className="flex flex-wrap gap-2">
            {allSources.map((source) => (
              <button
                key={source}
                onClick={() => toggleSource(source)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  selectedSources.includes(source)
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {sourceIcons[source]}
                {sourceNames[source]}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !subject.trim() || !claimValue.trim() || selectedSources.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Target className="w-5 h-5" />
          )}
          Triangulate Claim
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TriangulationDashboard: React.FC = () => {
  const { triangulate, results, loading } = useEvidenceTriangulation();
  const [isTriangulating, setIsTriangulating] = useState(false);

  const handleTriangulate = async (
    subject: string,
    claimType: string,
    claimValue: string,
    sources: SourceType[]
  ) => {
    setIsTriangulating(true);
    try {
      await triangulate(
        {
          subject,
          predicate: claimType,
          object: claimValue,
        },
        sources
      );
    } catch (error) {
      console.error('Triangulation failed:', error);
    } finally {
      setIsTriangulating(false);
    }
  };

  const handleExport = (result: TriangulationResult) => {
    const exportData = {
      ...result,
      exportedAt: new Date().toISOString(),
      methodology: 'Multi-source cross-verification with weighted confidence scoring',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triangulation-${result.claim.subject.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const statsData = useMemo(() => {
    const verified = results.filter(r => r.verified).length;
    const legalReady = results.filter(r => r.legalReadiness === 'ready').length;
    const avgConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.overallConfidence, 0) / results.length
      : 0;
    const totalConflicts = results.reduce((sum, r) => sum + r.conflicts.length, 0);

    return { verified, legalReady, avgConfidence, totalConflicts, total: results.length };
  }, [results]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-7 h-7 text-blue-600" />
          Evidence Triangulation
        </h1>
        <p className="text-gray-600 mt-1">
          Cross-reference claims across multiple authoritative sources to establish confidence
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{statsData.total}</div>
          <div className="text-sm text-gray-500">Total Claims</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{statsData.verified}</div>
          <div className="text-sm text-gray-500">Verified</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{statsData.legalReady}</div>
          <div className="text-sm text-gray-500">Legal Ready</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-cyan-600">{(statsData.avgConfidence * 100).toFixed(0)}%</div>
          <div className="text-sm text-gray-500">Avg Confidence</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{statsData.totalConflicts}</div>
          <div className="text-sm text-gray-500">Conflicts</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Claim Form */}
        <div>
          <ClaimForm onTriangulate={handleTriangulate} isLoading={isTriangulating} />

          {/* How It Works */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">How Triangulation Works</h4>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">1</span>
                Submit a claim to verify
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">2</span>
                System queries selected data sources
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">3</span>
                Results are weighted by source authority
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">4</span>
                Conflicts between sources are flagged
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">5</span>
                Legal readiness is assessed
              </li>
            </ol>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Triangulation Results ({results.length})
          </h3>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-500 mt-2">Loading results...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Claims Verified Yet</h3>
              <p className="text-gray-500 mt-1">
                Use the form to submit your first claim for triangulation
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <ResultCard
                  key={`${result.claim.subject}-${index}`}
                  result={result}
                  onExport={() => handleExport(result)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TriangulationDashboard;
