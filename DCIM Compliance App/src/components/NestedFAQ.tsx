/**
 * Nested FAQ System
 * Expandable, searchable, categorized help documentation
 */

import React, { useState, useMemo } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, Search, BookOpen, Zap, Shield, Globe, Network, Database, Activity } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  relatedIds?: string[];
}

interface FAQCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

const FAQ_DATA: FAQItem[] = [
  // Evidence Integrity
  {
    id: 'evidence-what',
    question: 'What is the Evidence Integrity Layer?',
    answer: 'The Evidence Integrity Layer ensures compliance with Federal Rules of Evidence 902(13)-(14) by creating cryptographically-signed evidence packages using SHA-256 hashing. Each piece of evidence is timestamped, hashed, and includes complete metadata for legal admissibility.',
    category: 'evidence',
    tags: ['evidence', 'compliance', 'legal', 'sha-256'],
  },
  {
    id: 'evidence-how',
    question: 'How do I create an evidence package?',
    answer: 'Evidence packages are created automatically when you interact with facility data. You can also manually capture evidence by clicking the "Create Evidence" button in the Evidence Panel (bottom-right corner). Each package includes the data, timestamp, SHA-256 hash, and collection metadata.',
    category: 'evidence',
    tags: ['evidence', 'how-to'],
    relatedIds: ['evidence-export'],
  },
  {
    id: 'evidence-export',
    question: 'How do I export evidence for legal submission?',
    answer: 'Open the Evidence Panel (bottom-right corner), click "Export All" to download a complete JSON file containing all evidence packages with their hashes, timestamps, and chain of custody. This file is formatted for legal submission and complies with FRE 902.',
    category: 'evidence',
    tags: ['evidence', 'export', 'legal'],
    relatedIds: ['evidence-how'],
  },
  
  // AI Agents
  {
    id: 'agents-what',
    question: 'What are the Autonomous AI Agents?',
    answer: 'Five AI agents run continuously to monitor your infrastructure: 1) Anomaly Detection (temperature, utilization, cognitive health), 2) Cooling Optimization (ASHRAE compliance, energy savings), 3) Capacity Forecasting (growth projections, exhaustion dates), 4) Self-Healing Workflow (automatic remediation), 5) Energy Efficiency (PUE monitoring, carbon footprint).',
    category: 'agents',
    tags: ['ai', 'agents', 'automation'],
  },
  {
    id: 'agents-pause',
    question: 'How do I pause or resume an AI agent?',
    answer: 'Each agent has an Active/Paused toggle button in its header. Click the button to pause monitoring. Pausing an agent stops new scans but preserves existing results. Resume by clicking the button again.',
    category: 'agents',
    tags: ['ai', 'agents', 'controls'],
  },
  {
    id: 'agents-value',
    question: 'What is the $42.7M annual value calculation?',
    answer: 'The value combines: Anomaly Detection ($8.5M - prevented downtime), Cooling Optimization ($12.3M - Google\'s 40% energy reduction applied to 11,992 facilities), Capacity Forecasting ($9.2M - optimized capacity planning), Self-Healing ($7.8M - reduced MTTR), Energy Efficiency ($4.9M - PUE optimization to 1.2).',
    category: 'agents',
    tags: ['ai', 'agents', 'roi', 'value'],
  },
  
  // BGP Monitoring
  {
    id: 'bgp-what',
    question: 'What is BGP Real-Time Monitoring?',
    answer: 'BGP (Border Gateway Protocol) monitoring connects to RIPE RIS Live WebSocket to track global routing updates in real-time. It detects anomalies like short AS paths, new prefix announcements, path changes, and potential BGP hijacks.',
    category: 'network',
    tags: ['bgp', 'network', 'monitoring', 'security'],
  },
  {
    id: 'bgp-asn',
    question: 'How do I monitor a specific ASN?',
    answer: 'In the BGP Monitor Panel (Intelligence Hub tab), enter an AS number in the "Monitor AS Number" field and click "Add ASN". Example: 15169 for Google, 16509 for Amazon. The system will then alert you to any routing changes affecting that AS.',
    category: 'network',
    tags: ['bgp', 'asn', 'how-to'],
    relatedIds: ['bgp-what'],
  },
  {
    id: 'bgp-anomalies',
    question: 'What BGP anomalies are detected?',
    answer: 'Four anomaly types: 1) Short Path (< 2 hops, potential misconfiguration), 2) New Prefix (new route announcements), 3) Path Change (routing shifts for monitored prefixes), 4) Potential Hijack (origin AS changes - CRITICAL severity).',
    category: 'network',
    tags: ['bgp', 'anomalies', 'security'],
  },
  
  // Infrastructure Tree
  {
    id: 'tree-what',
    question: 'What is the 20-Level Infrastructure Tree?',
    answer: 'A hierarchical view of your entire infrastructure: Provider → Region → Country → State → Metro → Campus → Building → Floor → Zone → Room → Row → Rack → RU → Server → Chassis → Blade → CPU → Core → Thread → Process. Navigate from global overview to individual processes.',
    category: 'visualization',
    tags: ['tree', 'hierarchy', 'navigation'],
  },
  {
    id: 'tree-navigate',
    question: 'How do I navigate the Infrastructure Tree?',
    answer: 'Click the chevron (▶/▼) to expand/collapse nodes. Click a node label to select it and view details. Use keyboard: Enter to expand, Arrow keys to navigate. Each node shows facility count and average compliance score.',
    category: 'visualization',
    tags: ['tree', 'navigation', 'how-to'],
    relatedIds: ['tree-what'],
  },
  {
    id: 'tree-performance',
    question: 'How does the tree handle 11,992 facilities?',
    answer: 'The tree uses lazy loading - child nodes are generated only when you expand a parent. This means the full 20-level hierarchy is never loaded into memory at once, ensuring smooth 60fps performance even with thousands of facilities.',
    category: 'visualization',
    tags: ['tree', 'performance', 'optimization'],
  },
  
  // 3D Globe
  {
    id: 'globe-what',
    question: 'What is the 3D Globe Visualization?',
    answer: 'An interactive 3D globe showing global facility distribution. Facilities are color-coded by compliance (green ≥80%, yellow 60-79%, red <60%). Includes submarine cable overlays and network connections between facilities.',
    category: 'visualization',
    tags: ['globe', '3d', 'visualization', 'map'],
  },
  {
    id: 'globe-controls',
    question: 'How do I control the 3D Globe?',
    answer: 'Use zoom buttons (+/-) to zoom in/out. Click "Pause/Rotate" to stop/start auto-rotation. Click "Reset View" to return to default. Toggle "Show Submarine Cables" and "Show Network Connections" to customize the view.',
    category: 'visualization',
    tags: ['globe', 'controls', 'how-to'],
    relatedIds: ['globe-what'],
  },
  {
    id: 'globe-tech',
    question: 'What technology powers the globe?',
    answer: 'The globe uses Canvas 2D API (no external dependencies). It projects 3D lat/lng coordinates to 2D screen space with perspective rendering, rotation matrices, and proper Z-ordering for visibility culling.',
    category: 'visualization',
    tags: ['globe', 'technical', 'canvas'],
  },
  
  // Search
  {
    id: 'search-how',
    question: 'How does FlexSearch work?',
    answer: 'FlexSearch indexes all 11,992 facilities for instant search. It searches across facility names, providers, cities, states, operators, and compliance status. Results appear as you type with intelligent ranking and autocomplete suggestions.',
    category: 'search',
    tags: ['search', 'flexsearch', 'performance'],
  },
  {
    id: 'search-speed',
    question: 'How fast is the search?',
    answer: 'FlexSearch can handle 7 million operations per second. Searching 11,992 facilities completes in < 10ms. The search is debounced (300ms) to prevent excessive re-indexing while typing.',
    category: 'search',
    tags: ['search', 'performance', 'speed'],
    relatedIds: ['search-how'],
  },
  
  // OSINT
  {
    id: 'osint-what',
    question: 'What OSINT data sources are integrated?',
    answer: 'Five sources: 1) SEC EDGAR (company filings), 2) EPA ECHO (environmental compliance), 3) PeeringDB (IXP/facility data), 4) crt.sh (certificate transparency), 5) USASpending (federal contracts). All data is cached in IndexedDB with automatic refresh.',
    category: 'osint',
    tags: ['osint', 'data', 'integration'],
  },
  {
    id: 'osint-limits',
    question: 'What are the API rate limits?',
    answer: 'SEC EDGAR: 10 requests/second, EPA ECHO: Fair use, PeeringDB: No auth required, crt.sh: No limit, USASpending: Standard rate limiting. The app uses token bucket rate limiting and caches responses (1-24 hours TTL depending on source).',
    category: 'osint',
    tags: ['osint', 'limits', 'api'],
    relatedIds: ['osint-what'],
  },
  
  // General
  {
    id: 'app-offline',
    question: 'Can I use the app offline?',
    answer: 'Yes! The app is a Progressive Web App (PWA) that caches all facilities in IndexedDB. Once loaded, you can browse, search, and analyze facilities without an internet connection. OSINT and BGP features require connectivity.',
    category: 'general',
    tags: ['offline', 'pwa', 'indexeddb'],
  },
  {
    id: 'app-data',
    question: 'Where is my data stored?',
    answer: 'All data is stored locally in your browser using IndexedDB (Dexie.js). No data is sent to external servers. Evidence packages, OSINT cache, and search history are stored client-side. Clear browser data to reset.',
    category: 'general',
    tags: ['data', 'privacy', 'storage'],
  },
  {
    id: 'app-performance',
    question: 'How does the app handle 11,992 facilities?',
    answer: 'Performance optimizations: React.memo for all components, useMemo/useCallback for expensive operations, virtual scrolling for large lists, lazy loading for tree nodes, debounced search, Web Workers for heavy computations, and IndexedDB for efficient data access.',
    category: 'general',
    tags: ['performance', 'optimization', 'react'],
  },
];

const CATEGORIES: FAQCategory[] = [
  {
    id: 'evidence',
    name: 'Evidence Integrity',
    icon: Shield,
    description: 'FRE 902 compliance and cryptographic evidence',
  },
  {
    id: 'agents',
    name: 'AI Agents',
    icon: Zap,
    description: 'Autonomous monitoring and optimization',
  },
  {
    id: 'network',
    name: 'BGP Monitoring',
    icon: Network,
    description: 'Real-time routing and anomaly detection',
  },
  {
    id: 'visualization',
    name: 'Visualizations',
    icon: Globe,
    description: '3D globe and 20-level infrastructure tree',
  },
  {
    id: 'search',
    name: 'Search',
    icon: Search,
    description: 'High-performance FlexSearch integration',
  },
  {
    id: 'osint',
    name: 'OSINT Tools',
    icon: Database,
    description: 'Government and public data sources',
  },
  {
    id: 'general',
    name: 'General',
    icon: BookOpen,
    description: 'App features, performance, and privacy',
  },
];

interface NestedFAQProps {
  onClose?: () => void;
}

export const NestedFAQ: React.FC<NestedFAQProps> = React.memo(({ onClose }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['evidence', 'agents']));
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter FAQs by search and category
  const filteredFAQs = useMemo(() => {
    let filtered = FAQ_DATA;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  // Group by category
  const faqsByCategory = useMemo(() => {
    return CATEGORIES.map(category => ({
      ...category,
      faqs: filteredFAQs.filter(faq => faq.category === category.id),
    })).filter(cat => cat.faqs.length > 0);
  }, [filteredFAQs]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(CATEGORIES.map(c => c.id)));
    setExpandedQuestions(new Set(FAQ_DATA.map(f => f.id)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedQuestions(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900 to-blue-900 p-6 border-b border-cyan-500/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-cyan-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Help & Documentation</h2>
                <p className="text-cyan-200 text-sm">Comprehensive guide to all features</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-3xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics..."
              className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-cyan-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={expandAll}
              className="px-3 py-1 text-sm bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
            >
              Collapse All
            </button>
            <div className="ml-auto text-sm text-cyan-300">
              {filteredFAQs.length} topics found
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-slate-800/50 p-4 border-b border-slate-700 overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map(category => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {faqsByCategory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No help topics found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {faqsByCategory.map(category => {
                const Icon = category.icon;
                const isExpanded = expandedCategories.has(category.id);

                return (
                  <div key={category.id} className="bg-slate-800/50 rounded-lg border border-slate-700">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-cyan-400" />
                      )}
                      <Icon className="w-6 h-6 text-cyan-400" />
                      <div className="flex-1 text-left">
                        <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                        <p className="text-sm text-slate-400">{category.description}</p>
                      </div>
                      <span className="text-sm text-slate-400">{category.faqs.length} topics</span>
                    </button>

                    {/* Questions */}
                    {isExpanded && (
                      <div className="border-t border-slate-700">
                        {category.faqs.map(faq => {
                          const isQuestionExpanded = expandedQuestions.has(faq.id);

                          return (
                            <div key={faq.id} className="border-b border-slate-700 last:border-b-0">
                              <button
                                onClick={() => toggleQuestion(faq.id)}
                                className="w-full p-4 pl-12 flex items-start gap-3 hover:bg-slate-700/50 transition-colors text-left"
                              >
                                {isQuestionExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium text-white mb-1">{faq.question}</h4>
                                  {!isQuestionExpanded && (
                                    <div className="flex flex-wrap gap-1">
                                      {faq.tags.slice(0, 3).map(tag => (
                                        <span
                                          key={tag}
                                          className="text-xs px-2 py-0.5 bg-slate-600 text-slate-300 rounded"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </button>

                              {isQuestionExpanded && (
                                <div className="px-4 pb-4 pl-12 ml-7">
                                  <p className="text-slate-300 mb-3">{faq.answer}</p>
                                  
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {faq.tags.map(tag => (
                                      <span
                                        key={tag}
                                        className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>

                                  {faq.relatedIds && faq.relatedIds.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-700">
                                      <div className="text-sm text-slate-400 mb-2">Related topics:</div>
                                      <div className="space-y-1">
                                        {faq.relatedIds.map(relatedId => {
                                          const related = FAQ_DATA.find(f => f.id === relatedId);
                                          if (!related) return null;
                                          return (
                                            <button
                                              key={relatedId}
                                              onClick={() => {
                                                toggleQuestion(relatedId);
                                                const relatedCategory = CATEGORIES.find(c => c.id === related.category);
                                                if (relatedCategory) {
                                                  setExpandedCategories(prev => new Set(prev).add(relatedCategory.id));
                                                }
                                              }}
                                              className="block text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                                            >
                                              → {related.question}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

NestedFAQ.displayName = 'NestedFAQ';

