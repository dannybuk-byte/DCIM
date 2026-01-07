/**
 * Reporting Channels Component
 * Official channels for reporting sanctions violations
 * 
 * Features:
 * - Government agency contacts (OFAC, FinCEN, SEC)
 * - Union contacts for worker support
 * - Red flags checklist
 * - Evidence preparation guidance
 */

import React, { useState } from 'react';
import {
  Phone,
  Mail,
  Globe,
  Building2,
  Users,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { ReportingChannel, RedFlag } from '../types/sanctions';
import { getReportingChannels, getUnionContacts } from '../services/awardCalculator';

// Red flags checklist
const RED_FLAGS: RedFlag[] = [
  {
    id: 'rf001',
    category: 'JURISDICTION',
    question: 'Have you observed connections to Russia, Iran, North Korea, Syria, Cuba, or Crimea?',
    weight: 40,
    examples: [
      'Equipment with Cyrillic labeling',
      'Staff speaking Russian, Farsi, Korean',
      'Traffic logs showing sanctioned country IPs',
      'VPN endpoints in sanctioned jurisdictions',
    ],
  },
  {
    id: 'rf002',
    category: 'ENTITY',
    question: 'Does the tenant name or ownership resemble any known sanctioned entity?',
    weight: 50,
    examples: [
      'Names similar to SDN list entries',
      'Shell company structures obscuring ownership',
      'Frequent name changes',
      'Inconsistent business registration details',
    ],
  },
  {
    id: 'rf003',
    category: 'CRYPTO',
    question: 'Does the operation appear to involve cryptocurrency mining or transactions?',
    weight: 25,
    examples: [
      'High-density GPU installations',
      'Constant high power draw (no diurnal pattern)',
      'Mining equipment (ASICs, specialized cooling)',
      'Blockchain-related traffic patterns',
    ],
  },
  {
    id: 'rf004',
    category: 'DOCUMENTATION',
    question: 'Has the tenant avoided or resisted standard documentation requirements?',
    weight: 20,
    examples: [
      'Refused to provide beneficial ownership info',
      'Paid in cash or crypto',
      'Used intermediary company for contracting',
      'Requested minimal paper trail',
    ],
  },
  {
    id: 'rf005',
    category: 'PAYMENT',
    question: 'Are there unusual payment patterns or sources?',
    weight: 15,
    examples: [
      'Payments from offshore accounts',
      'Multiple payment sources for single tenant',
      'Prepayment of large sums',
      'Payments routed through third countries',
    ],
  },
  {
    id: 'rf006',
    category: 'BEHAVIOR',
    question: 'Have you observed suspicious operational behavior?',
    weight: 15,
    examples: [
      'Unusual access hours',
      'Resistance to facility inspections',
      'Requests to disable monitoring',
      'Rapid equipment turnover',
    ],
  },
];

export const ReportingChannels: React.FC = () => {
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [checkedFlags, setCheckedFlags] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showUnions, setShowUnions] = useState(false);

  const governmentChannels = getReportingChannels();
  const unionContacts = getUnionContacts();

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const toggleFlag = (flagId: string) => {
    const newChecked = new Set(checkedFlags);
    if (newChecked.has(flagId)) {
      newChecked.delete(flagId);
    } else {
      newChecked.add(flagId);
    }
    setCheckedFlags(newChecked);
  };

  const getCategoryColor = (category: RedFlag['category']): string => {
    switch (category) {
      case 'JURISDICTION': return 'bg-red-900/50 text-red-300 border-red-700';
      case 'ENTITY': return 'bg-orange-900/50 text-orange-300 border-orange-700';
      case 'CRYPTO': return 'bg-purple-900/50 text-purple-300 border-purple-700';
      case 'DOCUMENTATION': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'PAYMENT': return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'BEHAVIOR': return 'bg-slate-700 text-slate-300 border-slate-600';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const riskScore = RED_FLAGS.filter((f) => checkedFlags.has(f.id))
    .reduce((sum, f) => sum + f.weight, 0);

  return (
    <div className="space-y-6">
      {/* Red Flags Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-600/20 rounded">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Red Flags Checklist</h3>
            <p className="text-sm text-slate-400">Check any indicators you've observed</p>
          </div>
        </div>

        {/* Risk Score */}
        <div className="mb-4 p-3 bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Accumulated Risk Score</span>
            <span className={`text-2xl font-bold ${
              riskScore >= 75 ? 'text-red-400' :
              riskScore >= 50 ? 'text-orange-400' :
              riskScore >= 25 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {riskScore}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(riskScore, 100)}%`,
                backgroundColor: riskScore >= 75 ? '#dc2626' :
                  riskScore >= 50 ? '#ea580c' :
                  riskScore >= 25 ? '#ca8a04' : '#16a34a',
              }}
            />
          </div>
          {riskScore >= 50 && (
            <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              High risk score - consider filing a report
            </div>
          )}
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          {RED_FLAGS.map((flag) => (
            <div
              key={flag.id}
              className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                checkedFlags.has(flag.id)
                  ? getCategoryColor(flag.category)
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => toggleFlag(flag.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  checkedFlags.has(flag.id)
                    ? 'bg-red-600 border-red-600'
                    : 'border-slate-500'
                }`}>
                  {checkedFlags.has(flag.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor(flag.category)}`}>
                      {flag.category}
                    </span>
                    <span className="text-xs text-slate-500">+{flag.weight} pts</span>
                  </div>
                  <div className="text-sm font-medium">{flag.question}</div>
                  <div className="mt-2 text-xs text-slate-400">
                    Examples: {flag.examples.join(' • ')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Government Reporting Channels */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-violet-600/20 rounded">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Government Reporting Channels</h3>
            <p className="text-sm text-slate-400">Official agencies for sanctions violations</p>
          </div>
        </div>

        <div className="space-y-3">
          {governmentChannels.map((channel, idx) => (
            <div
              key={idx}
              className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedChannel(
                  expandedChannel === channel.name ? null : channel.name
                )}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-violet-400" />
                  <div className="text-left">
                    <div className="font-semibold">{channel.name}</div>
                    <div className="text-xs text-slate-400">{channel.notes}</div>
                  </div>
                </div>
                {expandedChannel === channel.name ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {expandedChannel === channel.name && (
                <div className="px-4 pb-4 space-y-2 border-t border-slate-700">
                  {channel.phone && (
                    <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-400" />
                        <span className="text-sm">{channel.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${channel.phone.replace(/[^0-9]/g, '')}`}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                        >
                          Call
                        </a>
                        <button
                          onClick={() => handleCopy(channel.phone!, channel.name + '-phone')}
                          className="p-1 hover:bg-slate-600 rounded"
                        >
                          {copiedText === channel.name + '-phone' ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {channel.email && (
                    <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">{channel.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${channel.email}`}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                        >
                          Email
                        </a>
                        <button
                          onClick={() => handleCopy(channel.email!, channel.name + '-email')}
                          className="p-1 hover:bg-slate-600 rounded"
                        >
                          {copiedText === channel.name + '-email' ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {channel.url && (
                    <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-violet-400" />
                        <span className="text-sm truncate">{channel.url}</span>
                      </div>
                      <a
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-violet-600 hover:bg-violet-700 rounded text-xs"
                      >
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {channel.address && (
                    <div className="p-2 bg-slate-700/50 rounded">
                      <div className="text-xs text-slate-400 mb-1">Mailing Address:</div>
                      <div className="text-sm text-slate-300">{channel.address}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Union Contacts */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowUnions(!showUnions)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <div className="font-semibold">Union Support</div>
              <div className="text-xs text-slate-400">Labor organizations for worker protection</div>
            </div>
          </div>
          {showUnions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showUnions && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
            {unionContacts.map((union, idx) => (
              <div key={idx} className="p-3 bg-slate-800 border border-slate-700 rounded">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-amber-300">{union.name}</div>
                  <a
                    href={union.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-xs"
                  >
                    Visit <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {union.specialty && (
                  <div className="text-xs text-slate-400">{union.specialty}</div>
                )}
                {union.notes && (
                  <div className="text-xs text-slate-500 mt-1">{union.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Preparation Tips */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-600/20 rounded">
            <FileText className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Evidence Preparation</h3>
            <p className="text-sm text-slate-400">How to document and preserve evidence</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              title: 'Document Everything',
              content: 'Keep detailed notes with dates, times, locations, and witnesses. Use your phone to take timestamped photos.',
            },
            {
              title: 'Preserve Digital Evidence',
              content: 'Screenshot relevant communications, traffic logs, or system records. Note file paths and access times.',
            },
            {
              title: 'Maintain Chain of Custody',
              content: 'Record when you collected evidence, how you stored it, and who had access. This strengthens legal admissibility.',
            },
            {
              title: 'Use Secure Channels',
              content: 'Report through anonymous channels when possible. Consider using a personal device and encrypted communications.',
            },
            {
              title: 'Consult Attorney First',
              content: 'Before filing, consult a whistleblower attorney. They can advise on maximizing protections and potential awards.',
            },
          ].map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0 text-xs text-green-400 font-bold">
                {idx + 1}
              </div>
              <div>
                <div className="font-medium text-white">{tip.title}</div>
                <div className="text-sm text-slate-400">{tip.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

