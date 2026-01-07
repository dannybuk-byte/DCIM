/**
 * Query Generator
 * 
 * Role-based and concern-based query generator that produces
 * legally-actionable accountability queries using:
 * - CAP Taxonomy (policy classification)
 * - NLRB Case Law (labor precedents)
 * - NPU Framework (utility regulation)
 * - ILSR Community Networks (alternatives)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, Copy, Check, ChevronRight, Zap, 
  Users, Building, Scale, FileText, Lightbulb,
  Globe, Shield, ExternalLink
} from 'lucide-react';

interface DiscoveredFacility {
  name: string;
  location: string;
  type: 'detected' | 'nearby' | 'cloud';
  asn: string;
}

interface QueryGeneratorProps {
  facilities: DiscoveredFacility[];
  userLocation: {
    city: string;
    state: string;
  };
  selectedCAPTopic: number | null;
}

interface GeneratedQuery {
  category: string;
  icon: React.ReactNode;
  color: string;
  queries: Array<{
    text: string;
    framework: string;
    actionable: boolean;
  }>;
}

const ROLES = [
  { id: 'community', label: 'Community Organizer', icon: <Users className="w-4 h-4" /> },
  { id: 'labor', label: 'Labor Organizer', icon: <Building className="w-4 h-4" /> },
  { id: 'journalist', label: 'Investigative Journalist', icon: <FileText className="w-4 h-4" /> },
  { id: 'researcher', label: 'Academic Researcher', icon: <Lightbulb className="w-4 h-4" /> },
  { id: 'regulator', label: 'Regulatory Official', icon: <Scale className="w-4 h-4" /> }
];

const CONCERNS = [
  { id: 'jobs', label: 'Job Promises' },
  { id: 'water', label: 'Water Usage' },
  { id: 'energy', label: 'Energy Consumption' },
  { id: 'subsidies', label: 'Tax Subsidies' },
  { id: 'environment', label: 'Environmental Impact' },
  { id: 'labor', label: 'Labor Practices' },
  { id: 'community', label: 'Community Benefits' },
  { id: 'transparency', label: 'Transparency' }
];

const CAP_TOPIC_QUERIES: Record<number, string[]> = {
  1: ['What are the ROI metrics for tax subsidies given to this facility?', 'Has the promised economic impact materialized?'],
  5: ['What prevailing wage commitments were made?', 'Has there been any NLRB activity at this facility?'],
  7: ['What are the actual water consumption figures vs. permitted levels?', 'What is the e-waste disposal chain?'],
  8: ['What is the PUE rating and has it been independently verified?', 'What percentage of energy comes from renewables?']
};

export const QueryGenerator: React.FC<QueryGeneratorProps> = ({
  facilities,
  userLocation,
  selectedCAPTopic
}) => {
  const [selectedRole, setSelectedRole] = useState<string>('community');
  const [selectedConcern, setSelectedConcern] = useState<string>('jobs');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const primaryFacility = facilities[0];

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const generatedQueries = useMemo((): GeneratedQuery[] => {
    const facilityName = primaryFacility?.name || 'the data center';
    const state = userLocation.state;

    const roleContext = {
      community: 'community impact',
      labor: 'worker rights and safety',
      journalist: 'accountability and transparency',
      researcher: 'empirical analysis',
      regulator: 'compliance verification'
    };

    const concernQueries = {
      jobs: [
        { 
          text: `What were the specific job creation promises made by ${facilityName} in their subsidy application, and how many permanent full-time positions have been created?`,
          framework: 'CAP 5 (Labor)',
          actionable: true
        },
        {
          text: `Under ${state} subsidy clawback provisions, what enforcement actions are available if ${facilityName} failed to meet job commitments?`,
          framework: 'Good Jobs First',
          actionable: true
        },
        {
          text: `Has ${facilityName} filed any WARN Act notices or conducted mass layoffs within 2 years of receiving subsidies?`,
          framework: 'NLRB/DOL',
          actionable: true
        }
      ],
      water: [
        {
          text: `What is ${facilityName}'s daily water consumption vs. permitted gallonage under ${state} environmental permits?`,
          framework: 'CAP 7 (Environment)',
          actionable: true
        },
        {
          text: `Does ${facilityName}'s water usage exceed agricultural or residential allocations in the same watershed?`,
          framework: 'EPA/State DEQ',
          actionable: true
        }
      ],
      energy: [
        {
          text: `What is ${facilityName}'s total electricity consumption and what percentage of local grid capacity does this represent?`,
          framework: 'CAP 8 (Energy)',
          actionable: true
        },
        {
          text: `Has ${facilityName}'s renewable energy claims been independently verified by a third party?`,
          framework: 'SEC Disclosure',
          actionable: true
        }
      ],
      subsidies: [
        {
          text: `What is the total value of subsidies received by ${facilityName} including tax abatements, infrastructure grants, and job training funds?`,
          framework: 'Good Jobs First Subsidy Tracker',
          actionable: true
        },
        {
          text: `Were ${facilityName}'s subsidies disclosed under GASB 77 by local jurisdictions?`,
          framework: 'Tax Break Tracker',
          actionable: true
        }
      ],
      environment: [
        {
          text: `What environmental impact assessment was completed for ${facilityName} and were alternatives considered?`,
          framework: 'NEPA/SEPA',
          actionable: true
        },
        {
          text: `What is ${facilityName}'s carbon footprint including Scope 3 emissions from construction and supply chain?`,
          framework: 'CAP 7 (Environment)',
          actionable: true
        }
      ],
      labor: [
        {
          text: `Are workers at ${facilityName} represented by a union, and have there been any organizing attempts documented with the NLRB?`,
          framework: 'NLRB Case Database',
          actionable: true
        },
        {
          text: `Were prevailing wage requirements applied to ${facilityName}'s construction, and is there evidence of compliance?`,
          framework: 'Davis-Bacon Act',
          actionable: true
        }
      ],
      community: [
        {
          text: `What community benefit agreement (CBA) was negotiated for ${facilityName} and what enforcement mechanisms exist?`,
          framework: 'Good Jobs First CBA',
          actionable: true
        },
        {
          text: `Has ${facilityName} delivered on promised community investments like schools, parks, or affordable housing?`,
          framework: 'CAP 13 (Social Welfare)',
          actionable: true
        }
      ],
      transparency: [
        {
          text: `What public disclosure requirements apply to ${facilityName}'s operations under ${state} law?`,
          framework: 'FOIA/State Records',
          actionable: true
        },
        {
          text: `Is ${facilityName} subject to NPU-style essential facility regulations requiring non-discriminatory access?`,
          framework: 'NPU Framework',
          actionable: true
        }
      ]
    };

    const baseQueries = concernQueries[selectedConcern as keyof typeof concernQueries] || concernQueries.jobs;

    // Add CAP-specific queries if topic is selected
    let capQueries: Array<{ text: string; framework: string; actionable: boolean }> = [];
    if (selectedCAPTopic && CAP_TOPIC_QUERIES[selectedCAPTopic]) {
      capQueries = CAP_TOPIC_QUERIES[selectedCAPTopic].map(q => ({
        text: q.replace('this facility', facilityName),
        framework: `CAP ${selectedCAPTopic}00`,
        actionable: true
      }));
    }

    return [
      {
        category: 'Primary Queries',
        icon: <Search className="w-4 h-4" />,
        color: '#58a6ff',
        queries: baseQueries
      },
      ...(capQueries.length > 0 ? [{
        category: 'CAP Taxonomy Queries',
        icon: <Globe className="w-4 h-4" />,
        color: '#a371f7',
        queries: capQueries
      }] : []),
      {
        category: 'Legal Framework Queries',
        icon: <Scale className="w-4 h-4" />,
        color: '#3fb950',
        queries: [
          {
            text: `Under the NPU framework, should ${facilityName} be classified as an essential facility requiring common carrier obligations?`,
            framework: 'NPU Legal Theory',
            actionable: true
          },
          {
            text: `What ${state} Public Utilities Commission precedents apply to data center regulation?`,
            framework: 'State PUC',
            actionable: true
          }
        ]
      }
    ];
  }, [primaryFacility, userLocation, selectedConcern, selectedCAPTopic]);

  return (
    <div className="p-6 border-t border-[#30363d]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#d29922] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Query Generator</h3>
            <p className="text-xs text-[#8b949e]">Generate legally-actionable accountability queries</p>
          </div>
        </div>
      </div>

      {/* Role & Concern Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Role Selector */}
        <div>
          <label className="text-xs text-[#8b949e] uppercase tracking-wider mb-2 block">Your Role</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedRole === role.id
                    ? 'bg-[#58a6ff] text-white'
                    : 'bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff]'
                }`}
              >
                {role.icon}
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Concern Selector */}
        <div>
          <label className="text-xs text-[#8b949e] uppercase tracking-wider mb-2 block">Primary Concern</label>
          <div className="flex flex-wrap gap-2">
            {CONCERNS.map(concern => (
              <button
                key={concern.id}
                onClick={() => setSelectedConcern(concern.id)}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedConcern === concern.id
                    ? 'bg-[#3fb950] text-white'
                    : 'bg-[#21262d] border border-[#30363d] hover:border-[#3fb950]'
                }`}
              >
                {concern.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Queries */}
      <div className="space-y-6">
        {generatedQueries.map((category, catIndex) => (
          <div key={catIndex} className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden">
            <div 
              className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]"
              style={{ borderLeftColor: category.color, borderLeftWidth: '3px' }}
            >
              <span style={{ color: category.color }}>{category.icon}</span>
              <span className="font-semibold text-sm">{category.category}</span>
            </div>

            <div className="divide-y divide-[#30363d]">
              {category.queries.map((query, qIndex) => {
                const queryId = `${catIndex}-${qIndex}`;
                return (
                  <div key={qIndex} className="p-4 hover:bg-[#161b22] transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-[#e6edf3] mb-2">{query.text}</p>
                        <div className="flex items-center gap-3">
                          <span 
                            className="text-xs font-mono px-2 py-1 rounded"
                            style={{ 
                              background: `${category.color}20`,
                              color: category.color
                            }}
                          >
                            {query.framework}
                          </span>
                          {query.actionable && (
                            <span className="text-xs text-[#3fb950] flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Legally Actionable
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(query.text, queryId)}
                        className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                          copiedIndex === queryId
                            ? 'bg-[#3fb950] text-white'
                            : 'bg-[#21262d] hover:bg-[#30363d]'
                        }`}
                        title="Copy query"
                      >
                        {copiedIndex === queryId ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Export All Button */}
      <div className="mt-6 flex justify-center">
        <button 
          onClick={() => {
            const allQueries = generatedQueries.flatMap(cat => 
              cat.queries.map(q => `[${q.framework}] ${q.text}`)
            ).join('\n\n');
            navigator.clipboard.writeText(allQueries);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-[#21262d] border border-[#30363d] rounded-xl hover:border-[#58a6ff] transition-all"
        >
          <Copy className="w-4 h-4" />
          Export All Queries to Clipboard
        </button>
      </div>
    </div>
  );
};

export default QueryGenerator;

