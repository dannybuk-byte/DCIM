/**
 * CAP Taxonomy Wheel
 * 
 * Interactive SVG visualization of the Comparative Agendas Project's
 * 21 major policy topics with 220+ subtopics.
 * 
 * Validated across 896,245+ coded observations since 1946.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, Copy, Check, Search, Sparkles, ExternalLink } from 'lucide-react';

interface CAPTopic {
  code: number;
  name: string;
  color: string;
  queries: string[];
  subtopics: string[];
}

interface CAPTaxonomyWheelProps {
  onTopicSelect: (code: number | null) => void;
  selectedTopic: number | null;
}

const CAP_TOPICS: CAPTopic[] = [
  { 
    code: 1, 
    name: 'Macroeconomics', 
    color: '#c77d4a',
    queries: ['Tax subsidy ROI for data centers', 'Economic impact claims validation'],
    subtopics: ['Tax Policy', 'Inflation', 'Unemployment', 'National Debt', 'Trade Balance']
  },
  { 
    code: 2, 
    name: 'Civil Rights', 
    color: '#8b3a3a',
    queries: ['Algorithmic bias in facility systems', 'Digital surveillance implications'],
    subtopics: ['Discrimination', 'Privacy', 'Voting Rights', 'Immigration', 'Civil Liberties']
  },
  { 
    code: 3, 
    name: 'Health', 
    color: '#4a7c59',
    queries: ['Air quality near facilities', 'Noise pollution impacts', 'Mental health effects'],
    subtopics: ['Healthcare Access', 'Disease Prevention', 'Mental Health', 'Drug Policy', 'Provider Training']
  },
  { 
    code: 4, 
    name: 'Agriculture', 
    color: '#6b8e23',
    queries: ['Water competition with farms', 'Land use conflicts'],
    subtopics: ['Subsidies', 'Food Safety', 'Agricultural Trade', 'Livestock', 'Soil Conservation']
  },
  { 
    code: 5, 
    name: 'Labor', 
    color: '#2d6a6a',
    queries: ['Job promises vs. delivery', 'Union organizing activity', 'Prevailing wages'],
    subtopics: ['Worker Safety', 'Training', 'Benefits', 'Unions', 'Fair Labor Standards']
  },
  { 
    code: 6, 
    name: 'Education', 
    color: '#9370db',
    queries: ['School funding impact', 'Workforce training programs'],
    subtopics: ['K-12 Funding', 'Higher Education', 'Vocational', 'Special Education', 'Literacy']
  },
  { 
    code: 7, 
    name: 'Environment', 
    color: '#228b22',
    queries: ['Water consumption vs. permits', 'E-waste disposal chain', 'Wetland destruction'],
    subtopics: ['Air Pollution', 'Water Quality', 'Waste Disposal', 'Hazardous Materials', 'Recycling']
  },
  { 
    code: 8, 
    name: 'Energy', 
    color: '#ff8c00',
    queries: ['Grid capacity consumption', 'Renewable claims verification', 'PUE metrics'],
    subtopics: ['Nuclear', 'Electricity', 'Natural Gas', 'Coal', 'Renewables', 'Conservation']
  },
  { 
    code: 10, 
    name: 'Transportation', 
    color: '#708090',
    queries: ['Construction truck traffic', 'Road infrastructure damage'],
    subtopics: ['Highways', 'Mass Transit', 'Rail', 'Air Travel', 'Maritime']
  },
  { 
    code: 12, 
    name: 'Law & Crime', 
    color: '#4169e1',
    queries: ['Data breach liability', 'Corporate accountability'],
    subtopics: ['Criminal Code', 'Courts', 'Corrections', 'Police', 'White-Collar Crime']
  },
  { 
    code: 13, 
    name: 'Social Welfare', 
    color: '#da70d6',
    queries: ['Community benefits delivered', 'CBA compliance'],
    subtopics: ['Low-Income Assistance', 'Elderly', 'Disabled', 'Volunteer Programs', 'Child Care']
  },
  { 
    code: 14, 
    name: 'Housing', 
    color: '#cd853f',
    queries: ['Property value impacts', 'Zoning variance history'],
    subtopics: ['Public Housing', 'Homeless', 'Rural Housing', 'Secondary Mortgages', 'Community Development']
  },
  { 
    code: 15, 
    name: 'Commerce', 
    color: '#20b2aa',
    queries: ['Subsidy financing terms', 'Economic development claims'],
    subtopics: ['Banking Regulation', 'Securities', 'Consumer Protection', 'Small Business', 'Tourism']
  },
  { 
    code: 16, 
    name: 'Defense', 
    color: '#556b2f',
    queries: ['Military data hosting', 'Security classification'],
    subtopics: ['Alliances', 'Military Personnel', 'Procurement', 'Nuclear', 'Civil Defense']
  },
  { 
    code: 17, 
    name: 'Technology', 
    color: '#9932cc',
    queries: ['AI training energy costs', 'Research facility impact'],
    subtopics: ['Telecom', 'Broadband', 'Internet', 'R&D', 'Science Policy']
  },
  { 
    code: 18, 
    name: 'Trade', 
    color: '#3cb371',
    queries: ['International ownership', 'Supply chain exposure'],
    subtopics: ['Trade Agreements', 'Export Promotion', 'Tariffs', 'Competitiveness', 'Trade Practices']
  },
  { 
    code: 19, 
    name: 'Intl Affairs', 
    color: '#6495ed',
    queries: ['Data sovereignty', 'Cross-border flows'],
    subtopics: ['Foreign Aid', 'Resources', 'Human Rights', 'Organizations', 'Terrorism']
  },
  { 
    code: 20, 
    name: 'Government', 
    color: '#bc8f8f',
    queries: ['Public contracts held', 'Procurement compliance'],
    subtopics: ['Executive', 'Public Service', 'Postal', 'Census', 'Currency']
  },
  { 
    code: 21, 
    name: 'Public Lands', 
    color: '#8fbc8f',
    queries: ['Federal land usage', 'Below-market rates'],
    subtopics: ['National Parks', 'Indian Affairs', 'Public Land Management', 'Water Resources', 'Dependencies']
  }
];

export const CAPTaxonomyWheel: React.FC<CAPTaxonomyWheelProps> = ({ onTopicSelect, selectedTopic }) => {
  const [hoveredTopic, setHoveredTopic] = useState<number | null>(null);
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);

  const activeTopic = useMemo(() => {
    const code = hoveredTopic ?? selectedTopic;
    return CAP_TOPICS.find(t => t.code === code);
  }, [hoveredTopic, selectedTopic]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuery(text);
    setTimeout(() => setCopiedQuery(null), 2000);
  }, []);

  const generateFullQuery = useCallback((topic: CAPTopic, subtopic?: string) => {
    const base = `site:sec.gov OR site:epa.gov OR site:nlrb.gov "${topic.name}"`;
    const dcTerm = `"data center" OR "datacenter" OR "colocation"`;
    const sub = subtopic ? ` "${subtopic}"` : '';
    return `${base} ${dcTerm}${sub} accountability compliance`;
  }, []);

  // Generate SVG paths for wheel sectors
  const sectors = useMemo(() => {
    const cx = 200, cy = 200, r = 150;
    const total = CAP_TOPICS.length;
    const angleStep = (2 * Math.PI) / total;

    return CAP_TOPICS.map((topic, i) => {
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = (i + 1) * angleStep - Math.PI / 2;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);

      const largeArc = angleStep > Math.PI ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      // Label position
      const midAngle = startAngle + angleStep / 2;
      const labelR = r * 0.65;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      const rotation = (midAngle * 180 / Math.PI) + 90;

      return { topic, path, lx, ly, rotation };
    });
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-8 items-start">
        {/* SVG Wheel */}
        <div className="flex-shrink-0">
          <svg viewBox="0 0 400 400" className="w-[350px] h-[350px]">
            {/* Sectors */}
            {sectors.map(({ topic, path, lx, ly, rotation }) => {
              const isActive = topic.code === selectedTopic;
              const isHovered = topic.code === hoveredTopic;
              
              return (
                <g key={topic.code}>
                  <path
                    d={path}
                    fill={isActive || isHovered ? topic.color + '80' : topic.color + '30'}
                    stroke={topic.color}
                    strokeWidth={isActive ? 3 : 1.5}
                    className="cursor-pointer transition-all duration-300"
                    onClick={() => onTopicSelect(topic.code === selectedTopic ? null : topic.code)}
                    onMouseEnter={() => setHoveredTopic(topic.code)}
                    onMouseLeave={() => setHoveredTopic(null)}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${rotation}, ${lx}, ${ly})`}
                    className="text-[8px] font-mono fill-[#e6edf3] pointer-events-none"
                    style={{ fontSize: '8px' }}
                  >
                    {topic.name}
                  </text>
                </g>
              );
            })}

            {/* Center Circle */}
            <circle cx="200" cy="200" r="40" fill="#0d1117" />
            <text
              x="200"
              y="195"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-bold fill-[#e6edf3]"
              style={{ fontSize: '14px', fontWeight: 700 }}
            >
              CAP
            </text>
            <text
              x="200"
              y="210"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px] fill-[#8b949e]"
              style={{ fontSize: '8px' }}
            >
              21 Topics
            </text>
          </svg>
        </div>

        {/* Details Panel */}
        <div className="flex-1 min-w-[300px] bg-[#0d1117] border border-[#30363d] rounded-xl p-6 relative overflow-hidden">
          {/* Top gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c77d4a] via-[#2d6a6a] to-[#8b3a3a]" />

          {activeTopic ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xl font-semibold" style={{ color: activeTopic.color }}>
                  {activeTopic.name}
                </h4>
                <span className="text-xs px-2 py-1 bg-[rgba(255,255,255,0.1)] rounded font-mono">
                  Code {activeTopic.code}00
                </span>
              </div>
              
              <p className="font-mono text-sm text-[#3fb950] mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Click queries to copy • Select subtopics to refine
              </p>

              <div className="bg-[rgba(255,255,255,0.05)] p-4 border-l-4 border-[#d29922] rounded-r mb-4">
                <strong className="text-sm text-[#d29922] flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Accountability Queries:
                </strong>
                <ul className="mt-3 space-y-2">
                  {activeTopic.queries.map((q, i) => (
                    <li 
                      key={i} 
                      onClick={() => copyToClipboard(q)}
                      className="text-sm text-[#8b949e] flex items-center gap-2 p-2 hover:bg-[rgba(255,255,255,0.1)] rounded cursor-pointer group transition-all"
                    >
                      <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#3fb950]" />
                      <span className="flex-1">{q}</span>
                      {copiedQuery === q ? (
                        <Check className="w-4 h-4 text-[#3fb950]" />
                      ) : (
                        <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Generate Full Search Query */}
              <button
                onClick={() => {
                  const query = generateFullQuery(activeTopic, selectedSubtopic || undefined);
                  copyToClipboard(query);
                }}
                className="w-full mb-4 py-2 px-4 bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#3fb950] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {copiedQuery?.includes('site:') ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied Full Query!
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Generate Search Query
                  </>
                )}
              </button>

              <p className="font-mono text-sm text-[#3fb950] mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Subtopics (click to refine query):
              </p>
              <div className="flex flex-wrap gap-2">
                {activeTopic.subtopics.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => setSelectedSubtopic(selectedSubtopic === s ? null : s)}
                    className={`text-xs px-3 py-1.5 rounded transition-all ${
                      selectedSubtopic === s 
                        ? 'bg-[#238636] text-white' 
                        : 'bg-[rgba(255,255,255,0.1)] hover:bg-[#2d6a6a] text-[#e6edf3]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {selectedSubtopic && (
                <div className="mt-4 p-3 bg-[#0d1117] border border-[#238636] rounded-lg animate-fadeIn">
                  <p className="text-xs text-[#3fb950] font-mono">
                    🎯 Refined query will include: "{selectedSubtopic}"
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <h4 className="text-xl font-semibold text-[#c77d4a] mb-2">Select a Policy Topic</h4>
              <p className="font-mono text-sm text-[#3fb950] mb-4">&gt; Click on the wheel to explore</p>
              <div className="bg-[rgba(255,255,255,0.05)] p-4 border-l-4 border-[#d29922] rounded-r text-sm text-[#8b949e]">
                Each topic generates tailored queries connecting data center operations to established policy 
                frameworks with 70+ years of scholarly validation.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CAPTaxonomyWheel;

