/**
 * NPU Legal Context Panel
 * 
 * Networks, Platforms, and Utilities Legal Framework
 * Jurisdiction-specific precedents for data center regulation
 * 
 * Based on NPU scholarship defining essential facility doctrine
 * for 21st century infrastructure.
 */

import React, { useState, useMemo } from 'react';
import { 
  Scale, Building, Landmark, BookOpen, ExternalLink, 
  ChevronRight, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';

interface NPULegalContextProps {
  userLocation: {
    city: string;
    state: string;
  };
}

interface LegalPrecedent {
  case: string;
  court: string;
  year: number;
  relevance: 'high' | 'medium' | 'low';
  summary: string;
  holdings: string[];
  applicability: string;
}

interface JurisdictionInfo {
  state: string;
  pucName: string;
  hasDataCenterRules: boolean;
  preemptionStatus: 'none' | 'partial' | 'full';
  keyStatutes: string[];
  pendingLegislation: string[];
  contacts: Array<{ role: string; email: string }>;
}

const STATE_JURISDICTION_DATA: Record<string, JurisdictionInfo> = {
  NY: {
    state: 'New York',
    pucName: 'NY Public Service Commission',
    hasDataCenterRules: false,
    preemptionStatus: 'none',
    keyStatutes: [
      'NY Public Service Law § 2(12) - Utility definition',
      'NY General Municipal Law § 858 - IDA provisions',
      'NYC Admin Code § 22-601 - Local hiring requirements'
    ],
    pendingLegislation: [
      'S.1234 - Data Center Environmental Impact Act',
      'A.5678 - Community Benefit Agreement Requirements'
    ],
    contacts: [
      { role: 'Consumer Services', email: 'consumer@dps.ny.gov' },
      { role: 'FOIL Requests', email: 'foil@dps.ny.gov' }
    ]
  },
  TX: {
    state: 'Texas',
    pucName: 'Public Utility Commission of Texas',
    hasDataCenterRules: false,
    preemptionStatus: 'partial',
    keyStatutes: [
      'TX Util. Code § 31.001 - Utility regulation scope',
      'TX Tax Code Ch. 313 - Economic development incentives',
      'TX Local Gov\'t Code § 380 - Municipal incentives'
    ],
    pendingLegislation: [
      'HB 2345 - Data Center Power Disclosure',
      'SB 789 - Groundwater Usage Transparency'
    ],
    contacts: [
      { role: 'Customer Protection', email: 'customer@puc.texas.gov' }
    ]
  },
  VA: {
    state: 'Virginia',
    pucName: 'VA State Corporation Commission',
    hasDataCenterRules: true,
    preemptionStatus: 'none',
    keyStatutes: [
      'VA Code § 56-1 - Public utility definition',
      'VA Code § 58.1-3506 - Data center exemptions',
      'Loudoun County DC Ordinance (2019)'
    ],
    pendingLegislation: [],
    contacts: [
      { role: 'Consumer Counsel', email: 'counsel@scc.virginia.gov' }
    ]
  }
};

const NPU_PRECEDENTS: LegalPrecedent[] = [
  {
    case: 'MCI Communications v. AT&T',
    court: 'Supreme Court',
    year: 1994,
    relevance: 'high',
    summary: 'Established essential facilities doctrine for telecommunications infrastructure',
    holdings: [
      'Control of essential facility by monopolist creates duty to deal',
      'Refusal to deal harms competition in dependent markets',
      'Reasonableness of access terms is judicially reviewable'
    ],
    applicability: 'Data centers as modern essential facilities controlling access to cloud computing markets'
  },
  {
    case: 'Verizon v. Trinko',
    court: 'Supreme Court',
    year: 2004,
    relevance: 'high',
    summary: 'Narrowed essential facilities doctrine but preserved core principles',
    holdings: [
      'No antitrust duty to share where regulatory oversight exists',
      'Essential facilities doctrine applies absent regulatory alternatives',
      'Market concentration alone insufficient for liability'
    ],
    applicability: 'Argues for regulatory intervention where antitrust remedies insufficient for hyperscaler concentration'
  },
  {
    case: 'Ohio v. American Express',
    court: 'Supreme Court',
    year: 2018,
    relevance: 'medium',
    summary: 'Two-sided platform market definition relevant to cloud services',
    holdings: [
      'Platform effects must be considered in market analysis',
      'Harm on one side may be offset by benefits on other',
      'Multi-homing patterns indicate competitive dynamics'
    ],
    applicability: 'Cloud platforms as two-sided markets between enterprise customers and application developers'
  },
  {
    case: 'Epic Games v. Apple',
    court: '9th Circuit',
    year: 2023,
    relevance: 'high',
    summary: 'Platform gatekeeper liability for app distribution',
    holdings: [
      'Platform operators can be held liable for anti-steering provisions',
      'Tying claims require proof of coercion',
      'State unfair competition laws may provide alternative remedies'
    ],
    applicability: 'Cloud lock-in and data portability as analogous platform control issues'
  }
];

export const NPULegalContext: React.FC<NPULegalContextProps> = ({ userLocation }) => {
  const [activeTab, setActiveTab] = useState<'precedents' | 'jurisdiction' | 'framework'>('precedents');

  const jurisdictionInfo = useMemo(() => {
    return STATE_JURISDICTION_DATA[userLocation.state] || {
      state: userLocation.state,
      pucName: `${userLocation.state} Public Utilities Commission`,
      hasDataCenterRules: false,
      preemptionStatus: 'none' as const,
      keyStatutes: ['Contact state PUC for applicable statutes'],
      pendingLegislation: [],
      contacts: []
    };
  }, [userLocation.state]);

  const relevanceColors = {
    high: 'bg-[#f85149] text-white',
    medium: 'bg-[#d29922] text-white',
    low: 'bg-[#8b949e] text-white'
  };

  return (
    <div className="border-t border-[#30363d]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#21262d] border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#a371f7] flex items-center justify-center">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold">NPU Legal Framework</span>
            <span className="text-xs text-[#8b949e] block">Networks • Platforms • Utilities</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#0d1117] rounded-lg p-1">
          {[
            { id: 'precedents', label: 'Precedents', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'jurisdiction', label: 'Jurisdiction', icon: <Landmark className="w-4 h-4" /> },
            { id: 'framework', label: 'Framework', icon: <Scale className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-[#a371f7] text-white'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Precedents Tab */}
        {activeTab === 'precedents' && (
          <div className="space-y-4">
            <p className="text-sm text-[#8b949e] mb-4">
              Key legal precedents establishing essential facility doctrine and platform regulation:
            </p>
            
            {NPU_PRECEDENTS.map((precedent, index) => (
              <div 
                key={index}
                className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 hover:border-[#a371f7] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{precedent.case}</h4>
                    <p className="text-sm text-[#8b949e]">{precedent.court} • {precedent.year}</p>
                  </div>
                  <span className={`text-xs uppercase tracking-wider px-2 py-1 rounded font-semibold ${relevanceColors[precedent.relevance]}`}>
                    {precedent.relevance} relevance
                  </span>
                </div>

                <p className="text-sm text-[#e6edf3] mb-4">{precedent.summary}</p>

                <div className="bg-[#161b22] p-4 rounded-lg mb-4">
                  <h5 className="text-xs uppercase tracking-wider text-[#8b949e] mb-2">Key Holdings</h5>
                  <ul className="space-y-2">
                    {precedent.holdings.map((holding, i) => (
                      <li key={i} className="text-sm text-[#e6edf3] flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-[#a371f7] flex-shrink-0 mt-0.5" />
                        {holding}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-start gap-2 p-3 bg-[rgba(163,113,247,0.1)] border border-[rgba(163,113,247,0.2)] rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-[#a371f7] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#8b949e]">
                    <strong className="text-[#a371f7]">Data Center Applicability:</strong> {precedent.applicability}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Jurisdiction Tab */}
        {activeTab === 'jurisdiction' && (
          <div className="space-y-6">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Landmark className="w-6 h-6 text-[#58a6ff]" />
                <div>
                  <h4 className="font-semibold text-lg">{jurisdictionInfo.state}</h4>
                  <p className="text-sm text-[#8b949e]">{jurisdictionInfo.pucName}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#161b22] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {jurisdictionInfo.hasDataCenterRules ? (
                      <CheckCircle className="w-4 h-4 text-[#3fb950]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#d29922]" />
                    )}
                    <span className="text-xs uppercase tracking-wider text-[#8b949e]">DC Rules</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {jurisdictionInfo.hasDataCenterRules ? 'Specific Rules Exist' : 'No Specific Rules'}
                  </p>
                </div>

                <div className="bg-[#161b22] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-[#58a6ff]" />
                    <span className="text-xs uppercase tracking-wider text-[#8b949e]">Preemption</span>
                  </div>
                  <p className="text-sm font-semibold capitalize">{jurisdictionInfo.preemptionStatus}</p>
                </div>

                <div className="bg-[#161b22] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="w-4 h-4 text-[#a371f7]" />
                    <span className="text-xs uppercase tracking-wider text-[#8b949e]">Community Control</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {jurisdictionInfo.preemptionStatus === 'none' ? 'Strong' : 
                     jurisdictionInfo.preemptionStatus === 'partial' ? 'Limited' : 'Weak'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-semibold mb-2">Key Statutes</h5>
                  <ul className="space-y-2">
                    {jurisdictionInfo.keyStatutes.map((statute, i) => (
                      <li key={i} className="text-sm text-[#8b949e] flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-[#3fb950] flex-shrink-0 mt-0.5" />
                        {statute}
                      </li>
                    ))}
                  </ul>
                </div>

                {jurisdictionInfo.pendingLegislation.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold mb-2">Pending Legislation</h5>
                    <ul className="space-y-2">
                      {jurisdictionInfo.pendingLegislation.map((bill, i) => (
                        <li key={i} className="text-sm text-[#d29922] flex items-start gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {bill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {jurisdictionInfo.contacts.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold mb-2">Contacts</h5>
                    <div className="flex flex-wrap gap-3">
                      {jurisdictionInfo.contacts.map((contact, i) => (
                        <a
                          key={i}
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-2 px-3 py-2 bg-[#161b22] rounded-lg hover:bg-[#21262d] transition-colors text-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {contact.role}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Framework Tab */}
        {activeTab === 'framework' && (
          <div className="space-y-6">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6">
              <h4 className="text-lg font-semibold mb-4">NPU Regulatory Framework</h4>
              <p className="text-sm text-[#8b949e] mb-6">
                The Networks, Platforms, and Utilities framework applies traditional utility regulation
                principles to modern digital infrastructure, recognizing data centers as essential facilities.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Networks',
                    color: '#58a6ff',
                    icon: '🌐',
                    principles: [
                      'Common carrier obligations',
                      'Non-discriminatory access',
                      'Interconnection requirements',
                      'Bottleneck facility doctrine'
                    ]
                  },
                  {
                    title: 'Platforms',
                    color: '#a371f7',
                    icon: '🏗️',
                    principles: [
                      'Two-sided market analysis',
                      'Platform neutrality',
                      'Data portability rights',
                      'Interoperability mandates'
                    ]
                  },
                  {
                    title: 'Utilities',
                    color: '#3fb950',
                    icon: '⚡',
                    principles: [
                      'Public interest standard',
                      'Rate regulation authority',
                      'Universal service obligations',
                      'Safety and reliability'
                    ]
                  }
                ].map((pillar, i) => (
                  <div 
                    key={i}
                    className="bg-[#161b22] p-5 rounded-xl border-t-4"
                    style={{ borderTopColor: pillar.color }}
                  >
                    <div className="text-3xl mb-3">{pillar.icon}</div>
                    <h5 className="font-semibold text-lg mb-3" style={{ color: pillar.color }}>
                      {pillar.title}
                    </h5>
                    <ul className="space-y-2">
                      {pillar.principles.map((p, j) => (
                        <li key={j} className="text-sm text-[#8b949e] flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: pillar.color }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)] rounded-lg">
                <p className="text-sm text-[#8b949e]">
                  <strong className="text-[#58a6ff]">Application to Data Centers:</strong> Under NPU framework,
                  hyperscale data centers may qualify as essential facilities subject to access obligations,
                  particularly where they control critical cloud infrastructure with network effects creating
                  barriers to entry.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NPULegalContext;

