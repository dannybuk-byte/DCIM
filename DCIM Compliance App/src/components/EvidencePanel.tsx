/**
 * Evidence Panel Component
 * 
 * Displays collected evidence packages with cryptographic verification.
 * Compliant with FRE 902(13)-(14) for federal court submission.
 */

import React, { memo, useState } from 'react';
import { Shield, Download, Trash2, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { useEvidence } from '../hooks/useEvidence';
import { truncateHash } from '../utils/evidenceIntegrity';
import type { EvidencePackage, VerificationResult } from '../utils/evidenceIntegrity';

interface EvidencePanelProps {
  className?: string;
}

const EvidencePanel: React.FC<EvidencePanelProps> = memo(({ className = '' }) => {
  const {
    packages,
    verifyPackage,
    exportPackages,
    clearPackages,
    removePackage,
    packageCount,
  } = useEvidence();

  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [verificationResults, setVerificationResults] = useState<Map<string, VerificationResult>>(new Map());
  const [verifying, setVerifying] = useState<Set<string>>(new Set());

  const toggleExpand = (evidenceId: string) => {
    setExpandedPackages(prev => {
      const next = new Set(prev);
      if (next.has(evidenceId)) {
        next.delete(evidenceId);
      } else {
        next.add(evidenceId);
      }
      return next;
    });
  };

  const handleVerify = async (evidence: EvidencePackage) => {
    setVerifying(prev => new Set(prev).add(evidence.evidenceId));
    
    try {
      const result = await verifyPackage(evidence);
      setVerificationResults(prev => new Map(prev).set(evidence.evidenceId, result));
    } catch (error) {
      console.error('[EvidencePanel] Verification failed:', error);
    } finally {
      setVerifying(prev => {
        const next = new Set(prev);
        next.delete(evidence.evidenceId);
        return next;
      });
    }
  };

  const handleExport = () => {
    exportPackages();
  };

  const handleClear = () => {
    if (confirm(`Clear all ${packageCount} evidence packages? This cannot be undone.`)) {
      clearPackages();
      setVerificationResults(new Map());
      setExpandedPackages(new Set());
    }
  };

  const handleRemove = (evidenceId: string) => {
    removePackage(evidenceId);
    setVerificationResults(prev => {
      const next = new Map(prev);
      next.delete(evidenceId);
      return next;
    });
    setExpandedPackages(prev => {
      const next = new Set(prev);
      next.delete(evidenceId);
      return next;
    });
  };

  return (
    <div className={`bg-slate-800 rounded-lg border border-green-500/30 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Evidence Integrity</h3>
              <p className="text-sm text-slate-400">
                FRE 902(13)-(14) Compliant • SHA-256
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-md">
              <span className="text-green-400 font-mono text-sm">{packageCount} packages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {packageCount > 0 && (
        <div className="p-4 border-b border-slate-700 flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-md text-green-400 text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export All
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-md text-red-400 text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      )}

      {/* Package List */}
      <div className="p-4">
        {packageCount === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No evidence packages collected yet</p>
            <p className="text-xs mt-1">Packages will appear here when facilities are analyzed</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {packages.map(pkg => {
              const isExpanded = expandedPackages.has(pkg.evidenceId);
              const verification = verificationResults.get(pkg.evidenceId);
              const isVerifying = verifying.has(pkg.evidenceId);

              return (
                <div
                  key={pkg.evidenceId}
                  className="bg-slate-900/50 border border-slate-700 rounded-md p-3"
                >
                  {/* Package Header */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => toggleExpand(pkg.evidenceId)}
                      className="flex items-start gap-2 flex-1 text-left hover:bg-slate-800/50 rounded p-1 -m-1 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate">
                          {pkg.facilityName}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-1">
                          {truncateHash(pkg.dataHash, 24)}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {new Date(pkg.collectedAt).toLocaleString()}
                          </span>
                          <span className="text-xs text-green-400">
                            {pkg.collectionMethod}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Verification Status */}
                    <div className="flex items-center gap-1">
                      {verification && (
                        verification.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" title="Verified" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400" title="Verification Failed" />
                        )
                      )}
                      <button
                        onClick={() => handleRemove(pkg.evidenceId)}
                        className="p-1 hover:bg-red-500/10 rounded transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                      {/* Evidence ID */}
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Evidence ID</div>
                        <div className="text-xs font-mono text-green-400 bg-slate-800 rounded px-2 py-1">
                          {pkg.evidenceId}
                        </div>
                      </div>

                      {/* Full Hash */}
                      <div>
                        <div className="text-xs text-slate-400 mb-1">SHA-256 Hash</div>
                        <div className="text-xs font-mono text-green-400 bg-slate-800 rounded px-2 py-1 break-all">
                          {pkg.dataHash}
                        </div>
                      </div>

                      {/* Source URLs */}
                      {pkg.sourceUrls.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Source URLs</div>
                          <div className="space-y-1">
                            {pkg.sourceUrls.map((url, idx) => (
                              <div key={idx} className="text-xs font-mono text-blue-400 bg-slate-800 rounded px-2 py-1 truncate">
                                {url}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Collection Metadata</div>
                        <div className="text-xs text-slate-500 bg-slate-800 rounded px-2 py-1 space-y-0.5">
                          <div>Timezone: {pkg.metadata.timezone}</div>
                          <div>User Agent: {truncateHash(pkg.metadata.userAgent, 40)}</div>
                        </div>
                      </div>

                      {/* Verification Result */}
                      {verification && (
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Verification Result</div>
                          <div className={`text-xs rounded px-2 py-1 ${
                            verification.isValid
                              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}>
                            {verification.isValid ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Integrity verified • No tampering detected</span>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Verification failed</span>
                                </div>
                                <ul className="list-disc list-inside ml-5 space-y-0.5">
                                  {verification.discrepancies.map((disc, idx) => (
                                    <li key={idx}>{disc}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Verify Button */}
                      <button
                        onClick={() => handleVerify(pkg)}
                        disabled={isVerifying}
                        className="w-full px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 disabled:bg-slate-700 border border-green-500/30 rounded-md text-green-400 disabled:text-slate-500 text-xs transition-colors"
                      >
                        {isVerifying ? 'Verifying...' : 'Verify Integrity'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

EvidencePanel.displayName = 'EvidencePanel';

export default EvidencePanel;

