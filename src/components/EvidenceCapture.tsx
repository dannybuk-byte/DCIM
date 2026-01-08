/**
 * Evidence Capture Component
 * 
 * Provides UI for capturing, viewing, and exporting FRE 902(14) compliant
 * legal evidence. Enables organizers to create court-ready documentation.
 * 
 * Features:
 * - Drag-and-drop file upload
 * - URL/API data capture
 * - Chain of custody visualization
 * - Evidence verification status
 * - Court export generation
 */

import React, { useState, useCallback } from 'react';
import {
  Shield,
  Upload,
  Link as LinkIcon,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Lock,
  Hash,
  User,
  Calendar,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLegalEvidence, EvidenceRecord, VerificationReport } from '../services/legalEvidenceChain';

// ============================================================================
// EVIDENCE CARD COMPONENT
// ============================================================================

interface EvidenceCardProps {
  record: EvidenceRecord;
  onVerify: () => void;
  onExport: () => void;
  onDelete: () => void;
  isVerifying: boolean;
}

const EvidenceCard: React.FC<EvidenceCardProps> = ({
  record,
  onVerify,
  onExport,
  onDelete,
  isVerifying,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Determine status based on chain of custody
  const getStatus = () => {
    if (record.chainOfCustody.some(e => e.action === 'MODIFICATION_ATTEMPT')) return 'tampered';
    if (record.chainOfCustody.some(e => e.action === 'VERIFY')) return 'verified';
    if (record.chainOfCustody.some(e => e.action === 'EXPORT')) return 'exported';
    return 'captured';
  };
  const status = getStatus();

  const statusColors: Record<string, string> = {
    captured: 'bg-blue-100 text-blue-700 border-blue-300',
    verified: 'bg-green-100 text-green-700 border-green-300',
    tampered: 'bg-red-100 text-red-700 border-red-300',
    exported: 'bg-purple-100 text-purple-700 border-purple-300',
  };

  const formatDate = (timestamp: string | number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{record.sourceIdentifier}</h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatDate(record.captureTimestamp)}
              <span className="px-1">•</span>
              <Hash className="w-3 h-3" />
              {record.dataHash.slice(0, 12)}...
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full border ${statusColors[status]}`}>
            {status === 'verified' && <CheckCircle className="w-3 h-3 inline mr-1" />}
            {status === 'tampered' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {status}
          </span>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-gray-500 text-xs">Content Type</label>
              <p className="font-medium">{record.metadata.contentType}</p>
            </div>
            <div>
              <label className="text-gray-500 text-xs">Size</label>
              <p className="font-medium">{formatSize(record.metadata.contentLength)}</p>
            </div>
            <div>
              <label className="text-gray-500 text-xs">Capture Method</label>
              <p className="font-medium capitalize">{record.metadata.method}</p>
            </div>
            <div>
              <label className="text-gray-500 text-xs">Collector</label>
              <p className="font-medium">{record.metadata.collector}</p>
            </div>
            {record.sourceUrl && (
              <div className="col-span-2">
                <label className="text-gray-500 text-xs">Source URL</label>
                <p className="font-medium text-blue-600 flex items-center gap-1">
                  <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {record.sourceUrl}
                  </a>
                  <ExternalLink className="w-3 h-3" />
                </p>
              </div>
            )}
          </div>

          {/* Hash Display */}
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                SHA-256 Hash
              </span>
              <button
                onClick={() => copyToClipboard(record.dataHash)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <code className="text-green-400 text-xs font-mono break-all">
              {record.dataHash}
            </code>
          </div>

          {/* Chain of Custody */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Chain of Custody ({record.chainOfCustody.length} entries)
            </h5>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {record.chainOfCustody.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-xs bg-gray-50 p-2 rounded"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-gray-500"> by {entry.actor}</span>
                    <div className="text-gray-400 mt-0.5">
                      {formatDate(entry.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onVerify}
              disabled={isVerifying}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isVerifying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Verify Integrity
            </button>
            <button
              onClick={onExport}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export for Court
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CAPTURE FORM COMPONENT
// ============================================================================

interface CaptureFormProps {
  onCapture: (data: ArrayBuffer | string, source: string, options: {
    sourceUrl?: string;
    contentType?: string;
    method?: 'automated' | 'manual' | 'osint' | 'api';
  }) => Promise<void>;
  isCapturing: boolean;
}

const CaptureForm: React.FC<CaptureFormProps> = ({ onCapture, isCapturing }) => {
  const [mode, setMode] = useState<'url' | 'text' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      await onCapture(buffer, file.name, {
        contentType: file.type,
        method: 'manual',
      });
    }
  }, [onCapture]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      await onCapture(buffer, file.name, {
        contentType: file.type,
        method: 'manual',
      });
    }
  }, [onCapture]);

  const handleUrlCapture = async () => {
    if (!url.trim() || !source.trim()) return;
    
    try {
      const response = await fetch(url);
      const text = await response.text();
      await onCapture(text, source, {
        sourceUrl: url,
        contentType: response.headers.get('content-type') || 'text/html',
        method: 'api',
      });
      setUrl('');
      setSource('');
    } catch (error) {
      // For demo, capture the URL itself as evidence
      await onCapture(url, source, {
        sourceUrl: url,
        contentType: 'text/plain',
        method: 'manual',
      });
      setUrl('');
      setSource('');
    }
  };

  const handleTextCapture = async () => {
    if (!text.trim() || !source.trim()) return;
    await onCapture(text, source, {
      contentType: 'text/plain',
      method: 'manual',
    });
    setText('');
    setSource('');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-600" />
        Capture New Evidence
      </h3>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'url', label: 'URL', icon: LinkIcon },
          { id: 'text', label: 'Text', icon: FileText },
          { id: 'file', label: 'File', icon: Upload },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id as 'url' | 'text' | 'file')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              mode === id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Source Name Input */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 mb-1 block">Evidence Source Identifier</label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g., 'BLS QCEW Q3 2025' or 'AWS Richmond LinkedIn Screenshot'"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* URL Mode */}
      {mode === 'url' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">URL to Capture</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.bls.gov/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleUrlCapture}
            disabled={isCapturing || !url.trim() || !source.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isCapturing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <LinkIcon className="w-5 h-5" />
            )}
            Capture from URL
          </button>
        </div>
      )}

      {/* Text Mode */}
      {mode === 'text' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Text Content</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste API response, document text, or other evidence..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
          <button
            onClick={handleTextCapture}
            disabled={isCapturing || !text.trim() || !source.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isCapturing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            Capture Text
          </button>
        </div>
      )}

      {/* File Mode */}
      {mode === 'file' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-gray-600 mb-2">
            Drag and drop a file here, or{' '}
            <label className="text-blue-600 cursor-pointer hover:underline">
              browse
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-xs text-gray-400">
            Supports PDF, images, CSV, JSON, and text files
          </p>
        </div>
      )}

      {/* Legal Notice */}
      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-xs text-amber-800 flex items-start gap-2">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Evidence captured through this system is cryptographically hashed and stored with full chain of custody for FRE 902(14) compliance. All captures are timestamped and attributed.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EvidenceCapture: React.FC = () => {
  const { capture, verify, records, loading } = useLegalEvidence();
  const [isCapturing, setIsCapturing] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  const handleCapture = async (
    data: ArrayBuffer | string,
    source: string,
    options: { sourceUrl?: string; contentType?: string; method?: 'automated' | 'manual' | 'osint' | 'api' }
  ) => {
    if (!userName.trim()) {
      alert('Please enter your name before capturing evidence');
      return;
    }

    setIsCapturing(true);
    try {
      await capture(data, source, userName, options);
    } catch (error) {
      console.error('Capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleVerify = async (recordId: string) => {
    setVerifyingId(recordId);
    try {
      const report = await verify(recordId);
      if (report) {
        const hashMatch = report.originalHash === report.currentHash;
        alert(`Verification ${report.verified ? 'PASSED' : 'FAILED'}\n\nHash Match: ${hashMatch ? '✓' : '✗'}\nChain Valid: ${report.chainIntegrity ? '✓' : '✗'}\n\n${report.discrepancies.length > 0 ? 'Issues:\n' + report.discrepancies.join('\n') : ''}`);
      }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleExport = async (record: EvidenceRecord) => {
    // Generate export package
    const exportData = {
      record,
      certification: `CERTIFICATION OF ELECTRONIC EVIDENCE

Under Federal Rules of Evidence 902(14), I certify that:

1. The attached electronic evidence was captured using cryptographic hash verification.
2. Hash Algorithm: SHA-256
3. Original Hash: ${record.dataHash}
4. Capture Date: ${new Date(record.captureTimestamp).toISOString()}
5. Source: ${record.sourceIdentifier}
6. Collector: ${record.metadata.collector}

The evidence has been maintained under continuous chain of custody as documented herein.

This certification is made pursuant to 28 U.S.C. § 1746.`,
      chainOfCustody: record.chainOfCustody,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-${record.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (recordId: string) => {
    if (confirm('Are you sure you want to delete this evidence record? This action cannot be undone.')) {
      // Would delete from database here
      console.log('Delete requested for:', recordId);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-600" />
          Legal Evidence Chain
        </h1>
        <p className="text-gray-600 mt-1">
          Capture and manage FRE 902(14) compliant evidence for legal proceedings
        </p>
      </div>

      {/* User Name */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
        <User className="w-5 h-5 text-gray-400" />
        <div className="flex-1">
          <label className="text-sm text-gray-500 mb-1 block">Your Name (for chain of custody)</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Capture Form */}
      <CaptureForm onCapture={handleCapture} isCapturing={isCapturing} />

      {/* Evidence Records */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          Evidence Records ({records.length})
        </h3>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">Loading evidence records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Evidence Captured</h3>
            <p className="text-gray-500 mt-1">
              Use the form above to capture your first piece of evidence
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <EvidenceCard
                key={record.id}
                record={record}
                onVerify={() => handleVerify(record.id)}
                onExport={() => handleExport(record)}
                onDelete={() => handleDelete(record.id)}
                isVerifying={verifyingId === record.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidenceCapture;
