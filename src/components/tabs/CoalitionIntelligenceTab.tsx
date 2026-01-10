/**
 * Coalition Intelligence Tab
 * 
 * The "Clean Internet" monitoring dashboard for coalition partners:
 * - CDNs (Cloudflare, Akamai, Fastly)
 * - Security vendors (CrowdStrike, Palo Alto)
 * - Advertisers/Publishers
 * - Labor/Community organizers
 * 
 * Features:
 * - AI Company AS Watchlist
 * - Clean Internet Score (crawl-to-refer ratio)
 * - Infrastructure Early Warning
 * - Data Center Origin Classification
 * - STIX 2.1 Export
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Shield,
  Globe,
  AlertTriangle,
  Activity,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  TrendingDown,
  TrendingUp,
  Zap,
  Server,
  FileJson,
  ExternalLink,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Building2,
  Bot,
  Scale,
  DollarSign,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  AI_COMPANY_WATCHLIST,
  getKnownAICompanyScores,
  classifyIP,
  exportToSTIX,
  getAllAICompanyASNs,
  type AICompanyProfile,
  type CleanInternetScore,
  type IPClassificationResult,
} from '../../services/aiInfrastructureIntelligence';
import { AIInfrastructureAlertsPanel } from '../AIInfrastructureAlertsPanel';
import { CloudflarePartnerPitch } from '../CloudflarePartnerPitch';

// =============================================================================
// COMPONENT
// =============================================================================

export const CoalitionIntelligenceTab: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<AICompanyProfile | null>(null);
  const [ipToCheck, setIpToCheck] = useState('');
  const [ipResult, setIpResult] = useState<IPClassificationResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['watchlist', 'scores']));
  const [partnerView, setPartnerView] = useState<'cdn' | 'security' | 'advertiser' | 'community'>('cdn');
  const [showPitchDeck, setShowPitchDeck] = useState(false);

  const cleanInternetScores = useMemo(() => getKnownAICompanyScores(), []);
  const totalASNs = useMemo(() => getAllAICompanyASNs(), []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleIPCheck = useCallback(() => {
    if (ipToCheck) {
      const result = classifyIP(ipToCheck);
      setIpResult(result);
    }
  }, [ipToCheck]);

  const handleExportSTIX = useCallback(() => {
    const bundle = exportToSTIX([], []);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-infrastructure-stix-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-lime-400';
    if (score >= 40) return 'text-yellow-400';
    if (score >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'B': return 'bg-lime-500/20 text-lime-400 border-lime-500/50';
      case 'C': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'D': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'F': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  // Show pitch deck if selected
  if (showPitchDeck) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowPitchDeck(false)}
          className="absolute top-4 right-4 z-50 px-4 py-2 bg-[#30363d] hover:bg-[#484f58] text-white rounded-lg transition-colors"
        >
          ← Back to Dashboard
        </button>
        <CloudflarePartnerPitch />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Coalition Intelligence</h1>
              <p className="text-[#8b949e]">Clean Internet Monitoring • AI Infrastructure Tracking • STIX Export</p>
            </div>
          </div>
          <button
            onClick={() => setShowPitchDeck(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-medium transition-all shadow-lg"
          >
            <ExternalLink className="w-4 h-4" />
            Cloudflare Pitch Deck
          </button>
        </div>
        
        {/* Partner View Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'cdn', label: 'CDN Partners', icon: Globe, color: 'amber' },
            { key: 'security', label: 'Security Vendors', icon: Shield, color: 'green' },
            { key: 'advertiser', label: 'Advertisers', icon: DollarSign, color: 'red' },
            { key: 'community', label: 'Labor/Community', icon: Building2, color: 'purple' },
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setPartnerView(key as typeof partnerView)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                partnerView === key
                  ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/50`
                  : 'bg-[#161b22] text-[#8b949e] hover:text-white border border-[#30363d]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[#8b949e] text-sm">AI Companies Tracked</span>
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">{AI_COMPANY_WATCHLIST.length}</div>
          <div className="text-xs text-[#8b949e] mt-1">Including OpenAI, Anthropic, Meta AI</div>
        </div>
        
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[#8b949e] text-sm">ASNs Monitored</span>
            <Globe className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">{totalASNs.length}</div>
          <div className="text-xs text-[#8b949e] mt-1">Real-time BGP tracking</div>
        </div>
        
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[#8b949e] text-sm">Worst Crawl Ratio</span>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-400 mt-2">60,000:1</div>
          <div className="text-xs text-[#8b949e] mt-1">Anthropic (worst offender)</div>
        </div>
        
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[#8b949e] text-sm">Commercial Value</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-green-400 mt-2">$50-200K</div>
          <div className="text-xs text-[#8b949e] mt-1">Per partner/year</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Clean Internet Scores */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('scores')}
              className="w-full flex items-center justify-between p-4 hover:bg-[#1c2128] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-white">Clean Internet Scores</span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  Crawl-to-Refer Ratio
                </span>
              </div>
              {expandedSections.has('scores') ? (
                <ChevronDown className="w-5 h-5 text-[#8b949e]" />
              ) : (
                <ChevronRight className="w-5 h-5 text-[#8b949e]" />
              )}
            </button>
            
            {expandedSections.has('scores') && (
              <div className="border-t border-[#30363d]">
                <div className="p-4 bg-[#0d1117] border-b border-[#30363d]">
                  <p className="text-sm text-[#8b949e]">
                    <strong className="text-white">Clean Internet Score</strong> measures how much an AI company 
                    takes (crawling) vs. gives back (referral traffic). Lower ratio = better citizen.
                  </p>
                </div>
                
                <div className="divide-y divide-[#30363d]">
                  {cleanInternetScores.map((score) => (
                    <div
                      key={score.company}
                      className="p-4 hover:bg-[#1c2128] transition-colors cursor-pointer"
                      onClick={() => {
                        const company = AI_COMPANY_WATCHLIST.find(c => c.name === score.company);
                        setSelectedCompany(company || null);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1 rounded-lg border font-bold ${getGradeColor(score.grade)}`}>
                            {score.grade}
                          </div>
                          <div>
                            <div className="font-medium text-white">{score.company}</div>
                            <div className="text-xs text-[#8b949e]">
                              {score.crawlToReferRatio.toLocaleString()}:1 ratio
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                            {score.score}
                          </div>
                          <div className="text-xs text-[#8b949e]">/ 100</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="h-2 bg-[#30363d] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              score.score >= 60 ? 'bg-green-500' :
                              score.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${score.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* IP Classification Tool */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white">Data Center Origin Classifier</span>
            </div>
            
            <p className="text-sm text-[#8b949e] mb-4">
              Check if an IP address originates from AI infrastructure or cloud data centers.
              <strong className="text-amber-400"> 48% of fraudulent traffic comes from data centers.</strong>
            </p>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={ipToCheck}
                onChange={(e) => setIpToCheck(e.target.value)}
                placeholder="Enter IP address (e.g., 52.167.1.1)"
                className="flex-1 px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleIPCheck}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Classify
              </button>
            </div>
            
            {ipResult && (
              <div className={`mt-4 p-4 rounded-lg border ${
                ipResult.riskLevel === 'high' ? 'bg-red-500/10 border-red-500/50' :
                ipResult.riskLevel === 'medium' ? 'bg-yellow-500/10 border-yellow-500/50' :
                'bg-green-500/10 border-green-500/50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {ipResult.isDataCenter ? (
                    <AlertTriangle className={`w-5 h-5 ${
                      ipResult.riskLevel === 'high' ? 'text-red-400' : 'text-yellow-400'
                    }`} />
                  ) : (
                    <Shield className="w-5 h-5 text-green-400" />
                  )}
                  <span className={`font-semibold ${
                    ipResult.riskLevel === 'high' ? 'text-red-400' :
                    ipResult.riskLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {ipResult.riskLevel === 'high' ? 'HIGH RISK' :
                     ipResult.riskLevel === 'medium' ? 'MEDIUM RISK' : 'LOW RISK'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-[#8b949e]">IP:</span> <span className="text-white">{ipResult.ip}</span></div>
                  <div><span className="text-[#8b949e]">Data Center:</span> <span className="text-white">{ipResult.isDataCenter ? 'Yes' : 'No'}</span></div>
                  {ipResult.provider && <div><span className="text-[#8b949e]">Provider:</span> <span className="text-white">{ipResult.provider}</span></div>}
                  {ipResult.aiCompany && <div><span className="text-[#8b949e]">AI Company:</span> <span className="text-red-400 font-medium">{ipResult.aiCompany}</span></div>}
                </div>
                
                <div className="mt-3 text-sm text-[#8b949e]">
                  <strong className="text-white">Recommendation:</strong> {ipResult.recommendation}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Company Watchlist */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('watchlist')}
              className="w-full flex items-center justify-between p-4 hover:bg-[#1c2128] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white">AI Company Watchlist</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  {AI_COMPANY_WATCHLIST.length} companies
                </span>
              </div>
              {expandedSections.has('watchlist') ? (
                <ChevronDown className="w-5 h-5 text-[#8b949e]" />
              ) : (
                <ChevronRight className="w-5 h-5 text-[#8b949e]" />
              )}
            </button>
            
            {expandedSections.has('watchlist') && (
              <div className="border-t border-[#30363d] max-h-96 overflow-y-auto">
                {AI_COMPANY_WATCHLIST.map((company) => (
                  <div
                    key={company.name}
                    className={`p-4 border-b border-[#30363d] cursor-pointer transition-colors ${
                      selectedCompany?.name === company.name ? 'bg-[#1c2128]' : 'hover:bg-[#1c2128]'
                    }`}
                    onClick={() => setSelectedCompany(company)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bot className="w-5 h-5 text-purple-400" />
                        <div>
                          <div className="font-medium text-white">{company.name}</div>
                          <div className="text-xs text-[#8b949e]">
                            {company.asns.length} ASN{company.asns.length !== 1 ? 's' : ''} • 
                            {company.crawlerUserAgents.length} crawler{company.crawlerUserAgents.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          company.knownCrawlRatio > 10000 ? 'text-red-400' :
                          company.knownCrawlRatio > 1000 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {company.knownCrawlRatio.toLocaleString()}:1
                        </div>
                        <div className="text-xs text-[#8b949e]">crawl ratio</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Company Details */}
          {selectedCompany && (
            <div className="bg-[#161b22] border border-purple-500/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Bot className="w-6 h-6 text-purple-400" />
                  <h3 className="font-semibold text-white text-lg">{selectedCompany.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="text-[#8b949e] hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[#8b949e] mb-1">ASNs</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedCompany.asns.map(asn => (
                      <span key={asn} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                        AS{asn}
                      </span>
                    ))}
                    {selectedCompany.asns.length === 0 && (
                      <span className="text-[#484f58]">Uses cloud providers</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="text-[#8b949e] mb-1">Domains</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedCompany.domains.map(domain => (
                      <span key={domain} className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="text-[#8b949e] mb-1">Crawler User-Agents</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedCompany.crawlerUserAgents.map(ua => (
                      <span key={ua} className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-mono">
                        {ua}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="text-[#8b949e] mb-1">Crawl-to-Refer Ratio</div>
                  <div className={`text-2xl font-bold ${
                    selectedCompany.knownCrawlRatio > 10000 ? 'text-red-400' :
                    selectedCompany.knownCrawlRatio > 1000 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {selectedCompany.knownCrawlRatio.toLocaleString()}:1
                  </div>
                </div>
              </div>
              
              {selectedCompany.publicStatements.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#30363d]">
                  <div className="text-[#8b949e] text-sm mb-2">Public Statements</div>
                  <ul className="text-sm text-[#c9d1d9] space-y-1">
                    {selectedCompany.publicStatements.map((statement, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#484f58]">•</span>
                        {statement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Export Actions */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <FileJson className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-white">Export Intelligence</span>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleExportSTIX}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg hover:border-green-500/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-green-400" />
                  <div className="text-left">
                    <div className="text-white font-medium group-hover:text-green-400 transition-colors">
                      STIX 2.1 Bundle
                    </div>
                    <div className="text-xs text-[#8b949e]">
                      For security vendor integration (MISP, Splunk, Elastic)
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                  $50-200K/yr
                </span>
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg hover:border-blue-500/50 transition-colors group opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <div className="text-white font-medium">
                      TAXII 2.1 Server
                    </div>
                    <div className="text-xs text-[#8b949e]">
                      Real-time threat feed subscription
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-[#30363d] text-[#8b949e] rounded">
                  Coming Soon
                </span>
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg hover:border-purple-500/50 transition-colors group opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <Scale className="w-5 h-5 text-purple-400" />
                  <div className="text-left">
                    <div className="text-white font-medium">
                      FRE 901/902 Evidence Package
                    </div>
                    <div className="text-xs text-[#8b949e]">
                      Litigation-grade evidence export
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-[#30363d] text-[#8b949e] rounded">
                  Coming Soon
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Alerts Panel */}
      <div className="mt-8">
        <AIInfrastructureAlertsPanel />
      </div>

      {/* Partner-Specific Value Propositions */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        {[
          {
            icon: Globe,
            title: 'CDN Partners',
            hook: '"You see the traffic. We see where it comes from before it reaches you."',
            value: 'Pre-announcement AI expansion intelligence. Bot origin attribution.',
            color: 'amber',
          },
          {
            icon: Shield,
            title: 'Security Vendors',
            hook: '"AI attacks need AI infrastructure. We track where it lives."',
            value: 'Infrastructure-layer threat intelligence unavailable elsewhere.',
            color: 'green',
          },
          {
            icon: DollarSign,
            title: 'Advertisers',
            hook: '"48% of fraudulent traffic comes from data centers. We know which ones."',
            value: '3.6% revenue loss recovered pays for subscription 100x over.',
            color: 'red',
          },
          {
            icon: Building2,
            title: 'Labor/Community',
            hook: '"$64B blocked projects. 20+ moratoriums. ESG pressure is existential risk."',
            value: 'Independent verification for subsidy accountability.',
            color: 'purple',
          },
        ].map(({ icon: Icon, title, hook, value, color }) => (
          <div
            key={title}
            className={`bg-[#161b22] border-l-4 border-${color}-500 rounded-r-xl p-4 hover:bg-[#1c2128] transition-colors`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-5 h-5 text-${color}-400`} />
              <span className="font-semibold text-white">{title}</span>
            </div>
            <p className="text-sm italic text-[#8b949e] mb-3">{hook}</p>
            <p className="text-xs text-[#c9d1d9]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoalitionIntelligenceTab;

