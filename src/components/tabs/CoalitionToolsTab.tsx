/**
 * Coalition Tools Tab
 * 
 * Phase 2 features for coalition building:
 * - CBA Generator
 * - Whistleblower Portal
 * - P&I Style Compliance Scoring
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Users,
  Scale,
  Building2,
  DollarSign,
  Leaf,
  HardHat,
  Eye,
  Phone,
  Mail,
  Lock,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Copy,
  FileDown,
  Send,
} from 'lucide-react';
import {
  CBA_PROVISIONS,
  CBA_TEMPLATES,
  CBAProvision,
  CBATemplate,
  generateCBADocument,
  generateCBADraft,
  calculateEconomicImpact,
  estimateBenefitValue,
  getProvisionsByCategory,
} from '../../services/cbaGeneratorService';
import {
  REGULATORY_AGENCIES,
  WHISTLEBLOWER_PROTECTIONS,
  REPORT_CATEGORIES,
  ReportCategory,
  getRetaliationWarning,
  getEvidenceGuidelines,
  getUnionsToNotify,
  getSuggestedAgency,
} from '../../services/whistleblowerService';
import {
  ComplianceScore,
  ComplianceClass,
  calculateComplianceScore,
  scoreToClass,
  getClassColor,
  getClassDescription,
  calculatePremiumMultiplier,
  calculateMutualPoolCost,
  getImprovementRecommendations,
  CLASSIFICATION_CRITERIA,
  SAMPLE_MUTUAL_POOL,
} from '../../services/complianceScoringService';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CoalitionToolsTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'cba' | 'whistleblower' | 'scoring'>('cba');
  
  return (
    <div className="min-h-screen bg-slate-50 p-3">
      {/* Mission Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 rounded-xl p-4 shadow-xl border border-purple-500/30 mb-3">
        <div className="flex items-center justify-between">
          {/* Left: Title and Mission */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Users size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Coalition Tools
              </h1>
              <p className="text-purple-200 text-sm">
                Build power through Community Benefits Agreements & accountability
              </p>
            </div>
          </div>
          
          {/* Right: Tool Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">19</div>
              <div className="text-purple-200 text-xs">CBA Provisions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">5</div>
              <div className="text-purple-200 text-xs">Report Channels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">A-F</div>
              <div className="text-purple-200 text-xs">P&I Scoring</div>
            </div>
          </div>
        </div>
        
        {/* Navigation Pills */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-purple-500/30">
          {[
            { id: 'cba', label: '📝 CBA Generator', desc: 'Draft binding agreements' },
            { id: 'whistleblower', label: '🛡️ Whistleblower Portal', desc: 'Safe reporting channels' },
            { id: 'scoring', label: '📊 Compliance Scoring', desc: 'P&I-style grading' },
          ].map(({ id, label, desc }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as typeof activeSection)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeSection === id
                  ? 'bg-white text-purple-900 shadow-lg'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              <div className="font-semibold">{label}</div>
              <div className={`text-xs mt-0.5 ${activeSection === id ? 'text-purple-600' : 'text-purple-300'}`}>{desc}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      {activeSection === 'cba' && <CBAGeneratorSection />}
      {activeSection === 'whistleblower' && <WhistleblowerSection />}
      {activeSection === 'scoring' && <ComplianceScoringSection />}
    </div>
  );
};

// =============================================================================
// CBA GENERATOR SECTION
// =============================================================================

const CBAGeneratorSection: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedProvisions, setSelectedProvisions] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState('');
  const [operator, setOperator] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [projectValue, setProjectValue] = useState(100000000);
  const [showDocument, setShowDocument] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['environmental', 'labor']));
  
  const toggleProvision = useCallback((id: string) => {
    setSelectedProvisions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);
  
  const applyTemplate = useCallback((templateId: string) => {
    const template = CBA_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedProvisions(new Set(template.provisions.map(p => p.id)));
      setSelectedTemplate(templateId);
    }
  }, []);
  
  const economicImpact = useMemo(() => {
    return calculateEconomicImpact(projectValue, Array.from(selectedProvisions));
  }, [projectValue, selectedProvisions]);
  
  const estimatedBenefits = useMemo(() => {
    return estimateBenefitValue(Array.from(selectedProvisions), projectValue);
  }, [selectedProvisions, projectValue]);
  
  const generatedDocument = useMemo(() => {
    if (!showDocument) return '';
    const draft = generateCBADraft(
      projectName || 'Data Center Project',
      operator || 'Developer',
      { city: city || 'City', state: state || 'State', county: 'County' },
      projectValue,
      Array.from(selectedProvisions)
    );
    return generateCBADocument(draft);
  }, [showDocument, projectName, operator, city, state, projectValue, selectedProvisions]);
  
  const categories = ['environmental', 'labor', 'community', 'transparency', 'enforcement'];
  const categoryIcons: Record<string, React.ReactNode> = {
    environmental: <Leaf className="w-4 h-4" />,
    labor: <HardHat className="w-4 h-4" />,
    community: <Users className="w-4 h-4" />,
    transparency: <Eye className="w-4 h-4" />,
    enforcement: <Scale className="w-4 h-4" />,
  };
  const categoryLabels: Record<string, string> = {
    environmental: 'Environmental',
    labor: 'Labor & Workforce',
    community: 'Community Investment',
    transparency: 'Transparency',
    enforcement: 'Enforcement',
  };
  
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Project Info & Templates */}
        <div className="space-y-6">
          {/* Project Details */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              Project Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Meta Los Lunas Data Center"
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white placeholder-gray-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Operator</label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="e.g., Meta Platforms Inc."
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white placeholder-gray-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white placeholder-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white placeholder-gray-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Project Value</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={projectValue}
                    onChange={(e) => setProjectValue(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Templates */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              CBA Templates
            </h3>
            <div className="space-y-2">
              {CBA_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTemplate === template.id
                      ? 'bg-purple-500/20 border-purple-500/50'
                      : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                  }`}
                >
                  <div className="text-white font-medium text-sm">{template.name}</div>
                  <div className="text-gray-400 text-xs mt-1">{template.description}</div>
                  <div className="text-purple-400 text-xs mt-2">
                    {template.provisions.length} provisions • {template.totalEstimatedValue}
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Economic Impact */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Estimated Impact
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Construction Jobs</span>
                <span className="text-white font-medium">{economicImpact.constructionJobs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Operations Jobs</span>
                <span className="text-white font-medium">{economicImpact.operationsJobs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Local Hire Jobs</span>
                <span className="text-green-400 font-medium">{economicImpact.localHireJobs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Wage Impact</span>
                <span className="text-green-400 font-medium">${(economicImpact.wageImpact / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between text-sm border-t border-[#30363d] pt-3">
                <span className="text-gray-400">Total Benefits</span>
                <span className="text-blue-400 font-bold">{estimatedBenefits}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Center: Provisions Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">CBA Provisions</h3>
            <span className="text-sm text-gray-400">
              {selectedProvisions.size} selected
            </span>
          </div>
          
          {categories.map(category => {
            const categoryProvisions = getProvisionsByCategory(category as CBAProvision['category']);
            const selectedInCategory = categoryProvisions.filter(p => selectedProvisions.has(p.id)).length;
            
            return (
              <div key={category} className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full p-3 flex items-center justify-between hover:bg-[#21262d] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {categoryIcons[category]}
                    <span className="text-white font-medium text-sm">{categoryLabels[category]}</span>
                    {selectedInCategory > 0 && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                        {selectedInCategory}
                      </span>
                    )}
                  </div>
                  {expandedCategories.has(category) 
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />
                  }
                </button>
                
                {expandedCategories.has(category) && (
                  <div className="border-t border-[#30363d]">
                    {categoryProvisions.map(provision => (
                      <div
                        key={provision.id}
                        className={`p-3 border-b border-[#30363d] last:border-b-0 cursor-pointer hover:bg-[#21262d]/50 ${
                          selectedProvisions.has(provision.id) ? 'bg-blue-500/10' : ''
                        }`}
                        onClick={() => toggleProvision(provision.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            selectedProvisions.has(provision.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-500'
                          }`}>
                            {selectedProvisions.has(provision.id) && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="text-white text-sm font-medium">{provision.name}</div>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                provision.difficulty === 'standard' ? 'bg-green-500/20 text-green-400' :
                                provision.difficulty === 'negotiable' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {provision.difficulty}
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs mt-1">{provision.description}</div>
                            {provision.estimatedValue && (
                              <div className="text-green-400 text-xs mt-1">💰 {provision.estimatedValue}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Right: Generated Document */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Generated CBA</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDocument(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate
              </button>
              {showDocument && (
                <button
                  onClick={() => {
                    const blob = new Blob([generatedDocument], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `CBA-${projectName || 'draft'}.txt`;
                    a.click();
                  }}
                  className="px-3 py-1.5 bg-[#21262d] text-white text-sm rounded-lg hover:bg-[#30363d] flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
            </div>
          </div>
          
          {showDocument ? (
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 max-h-[600px] overflow-y-auto">
              <pre className="text-gray-300 text-xs whitespace-pre-wrap font-mono">
                {generatedDocument}
              </pre>
            </div>
          ) : (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Select provisions and click "Generate" to create your CBA document
              </p>
            </div>
          )}
          
          {/* Precedent CBAs */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              Reference Agreements
            </h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-blue-400 hover:text-blue-300">
                LAX Modernization CBA (2004) - $500M
              </a>
              <a href="#" className="block text-blue-400 hover:text-blue-300">
                Vantage Wisconsin PLA (2024) - $15B
              </a>
              <a href="#" className="block text-blue-400 hover:text-blue-300">
                Wilmington OH Draft (2024)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// WHISTLEBLOWER SECTION
// =============================================================================

const WhistleblowerSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [showProtections, setShowProtections] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Report Categories */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Report a Violation
          </h3>
          
          <div className="space-y-2">
            {Object.entries(REPORT_CATEGORIES).map(([key, data]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as ReportCategory)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedCategory === key
                    ? 'bg-yellow-500/20 border-yellow-500/50'
                    : 'bg-[#161b22] border-[#30363d] hover:border-[#484f58]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{data.icon}</span>
                  <div>
                    <div className="text-white font-medium">{data.name}</div>
                    <div className="text-gray-400 text-xs mt-1">{data.description}</div>
                    <div className="text-blue-400 text-xs mt-2">Report to: {data.agency}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Center: Report Form / Agency Info */}
        <div className="space-y-4">
          {selectedCategory ? (
            <>
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="text-xl">{REPORT_CATEGORIES[selectedCategory].icon}</span>
                  {REPORT_CATEGORIES[selectedCategory].name}
                </h4>
                
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-2">Common Examples:</div>
                  <ul className="space-y-1">
                    {REPORT_CATEGORIES[selectedCategory].examples.map((example, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-gray-500">•</span>
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Agency Info */}
                {(() => {
                  const agency = getSuggestedAgency(selectedCategory);
                  if (!agency) return null;
                  
                  return (
                    <div className="bg-[#0d1117] rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-blue-400 font-semibold">{agency.name}</div>
                          <div className="text-gray-400 text-xs">{agency.fullName}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <a href={`tel:${agency.phone}`} className="hover:text-blue-400">
                            {agency.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                          <a 
                            href={agency.reportingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            File a Complaint Online
                          </a>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-xs text-gray-400 mb-2">Response Time:</div>
                        <div className="text-sm text-gray-300">{agency.responseTime}</div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-xs text-gray-400 mb-2">Protections Available:</div>
                        <ul className="space-y-1">
                          {agency.protections.map((protection, i) => (
                            <li key={i} className="text-sm text-green-400 flex items-start gap-2">
                              <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {protection}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              {/* Union Notification */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  Notify Your Union
                </h4>
                <p className="text-gray-400 text-xs mb-3">
                  If you're a union member, you may also want to report to your union representative.
                </p>
                <div className="space-y-2">
                  {['CWA', 'IBEW', 'CODE-CWA'].map(union => (
                    <div key={union} className="flex items-center justify-between p-2 bg-[#0d1117] rounded">
                      <span className="text-gray-300 text-sm">{union}</span>
                      <button className="text-blue-400 text-xs hover:text-blue-300">
                        Contact
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-8 text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Select a violation category to see reporting options
              </p>
            </div>
          )}
        </div>
        
        {/* Right: Resources */}
        <div className="space-y-4">
          {/* Retaliation Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Retaliation Protection
            </h4>
            <p className="text-gray-300 text-sm mb-3">
              Federal law protects you from retaliation for reporting violations. 
              Document everything and know your rights.
            </p>
            <button
              onClick={() => setShowProtections(!showProtections)}
              className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1"
            >
              {showProtections ? 'Hide' : 'View'} Full Warning
              {showProtections ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {showProtections && (
              <pre className="mt-3 text-xs text-gray-400 whitespace-pre-wrap bg-[#0d1117] p-3 rounded max-h-48 overflow-y-auto">
                {getRetaliationWarning()}
              </pre>
            )}
          </div>
          
          {/* Evidence Guidelines */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Evidence Guidelines
            </h4>
            <p className="text-gray-400 text-sm mb-3">
              Properly documenting evidence is critical for investigations.
            </p>
            <button
              onClick={() => setShowGuidelines(!showGuidelines)}
              className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1"
            >
              {showGuidelines ? 'Hide' : 'View'} Guidelines
              {showGuidelines ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {showGuidelines && (
              <pre className="mt-3 text-xs text-gray-400 whitespace-pre-wrap bg-[#0d1117] p-3 rounded max-h-48 overflow-y-auto">
                {getEvidenceGuidelines()}
              </pre>
            )}
          </div>
          
          {/* All Agencies */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              All Regulatory Agencies
            </h4>
            <div className="space-y-3">
              {REGULATORY_AGENCIES.map(agency => (
                <div key={agency.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm font-medium">{agency.name}</div>
                    <div className="text-gray-400 text-xs">{agency.jurisdiction}</div>
                  </div>
                  <a
                    href={agency.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPLIANCE SCORING SECTION
// =============================================================================

const ComplianceScoringSection: React.FC = () => {
  const [selectedFacility, setSelectedFacility] = useState<ComplianceScore | null>(null);
  
  // Sample compliance scores
  const sampleScores = useMemo((): ComplianceScore[] => {
    return [
      calculateComplianceScore(1, 'Equinix DC1-DC15', 'Equinix', {
        labor: { score: 85, issues: [], positives: ['PLA in place', 'Strong union relations'] },
        environmental: { score: 90, issues: [], positives: ['100% renewable', 'Tier 4 generators'] },
        safety: { score: 88, issues: [], positives: ['VPP participant'] },
        financial: { score: 82, issues: ['Minor subsidy reporting delays'], positives: [] },
        transparency: { score: 78, issues: ['Limited public disclosure'], positives: [] },
        community: { score: 75, issues: [], positives: ['Local hiring program'] },
      }),
      calculateComplianceScore(2, 'AWS US-East-1', 'Amazon Web Services', {
        labor: { score: 55, issues: ['Heavy contractor use', 'No union recognition'], positives: [] },
        environmental: { score: 80, issues: [], positives: ['Renewable commitments'] },
        safety: { score: 75, issues: ['Minor OSHA citations'], positives: [] },
        financial: { score: 90, issues: [], positives: ['Meets all commitments'] },
        transparency: { score: 45, issues: ['Limited disclosure', 'Non-responsive to inquiries'], positives: [] },
        community: { score: 50, issues: ['Low local hire', 'Minimal community investment'], positives: [] },
      }),
      calculateComplianceScore(3, 'Google Midlothian', 'Google', {
        labor: { score: 60, issues: ['Contractor issues', 'LM-10 activity'], positives: [] },
        environmental: { score: 95, issues: [], positives: ['24/7 CFE', 'Zero carbon'] },
        safety: { score: 85, issues: [], positives: ['Strong safety program'] },
        financial: { score: 70, issues: ['Subsidy shortfall'], positives: [] },
        transparency: { score: 70, issues: [], positives: ['Sustainability reporting'] },
        community: { score: 65, issues: [], positives: ['Community grants'] },
      }),
      calculateComplianceScore(4, 'Meta Henrico', 'Meta', {
        labor: { score: 40, issues: ['Anti-union activity', 'Contractor fragmentation', 'Wage disputes'], positives: [] },
        environmental: { score: 75, issues: ['Older generators'], positives: ['Renewable PPAs'] },
        safety: { score: 65, issues: ['Recent OSHA citations'], positives: [] },
        financial: { score: 55, issues: ['Job shortfall'], positives: [] },
        transparency: { score: 35, issues: ['Minimal disclosure', 'Community complaints'], positives: [] },
        community: { score: 40, issues: ['Community opposition', 'No CBA'], positives: [] },
      }),
    ];
  }, []);
  
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Facility List */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            Compliance Classification
          </h3>
          
          <div className="space-y-2">
            {sampleScores.map(score => (
              <button
                key={score.facilityId}
                onClick={() => setSelectedFacility(score)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedFacility?.facilityId === score.facilityId
                    ? 'bg-[#21262d] border-blue-500/50'
                    : 'bg-[#161b22] border-[#30363d] hover:border-[#484f58]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-white font-medium">{score.facilityName}</div>
                    <div className="text-gray-400 text-xs">{score.operator}</div>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
                    style={{ backgroundColor: `${getClassColor(score.overallClass)}20`, color: getClassColor(score.overallClass) }}
                  >
                    {score.overallClass}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Score: {score.overallScore}/100</span>
                  <span className={`px-2 py-0.5 rounded ${
                    score.insuranceImpact.insurabilityRisk === 'standard' ? 'bg-green-500/20 text-green-400' :
                    score.insuranceImpact.insurabilityRisk === 'elevated' ? 'bg-yellow-500/20 text-yellow-400' :
                    score.insuranceImpact.insurabilityRisk === 'high' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {score.insuranceImpact.insurabilityRisk} risk
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Center: Detailed Breakdown */}
        <div className="space-y-4">
          {selectedFacility ? (
            <>
              {/* Overall Score Card */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{selectedFacility.facilityName}</h3>
                    <p className="text-gray-400 text-sm">{selectedFacility.operator}</p>
                  </div>
                  <div 
                    className="w-16 h-16 rounded-lg flex flex-col items-center justify-center"
                    style={{ backgroundColor: `${getClassColor(selectedFacility.overallClass)}20` }}
                  >
                    <span 
                      className="font-bold text-2xl"
                      style={{ color: getClassColor(selectedFacility.overallClass) }}
                    >
                      {selectedFacility.overallClass}
                    </span>
                    <span className="text-xs text-gray-400">{selectedFacility.overallScore}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  {getClassDescription(selectedFacility.overallClass)}
                </p>
              </div>
              
              {/* Category Breakdown */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <h4 className="text-white font-medium mb-4">Category Breakdown</h4>
                <div className="space-y-3">
                  {Object.entries(selectedFacility.categoryScores).map(([category, data]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 capitalize">{category}</span>
                        <span 
                          className="font-medium"
                          style={{ color: getClassColor(data.class) }}
                        >
                          {data.class} ({data.score})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${data.score}%`,
                            backgroundColor: getClassColor(data.class),
                          }}
                        />
                      </div>
                      {data.issues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {data.issues.map((issue, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                              {issue}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Recommendations */}
              {(() => {
                const recommendations = getImprovementRecommendations(selectedFacility);
                if (recommendations.length === 0) return null;
                
                return (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Improvement Recommendations
                    </h4>
                    <div className="space-y-2">
                      {recommendations.slice(0, 3).map((rec, i) => (
                        <div key={i} className={`p-2 rounded ${
                          rec.priority === 'critical' ? 'bg-red-500/20' :
                          rec.priority === 'high' ? 'bg-orange-500/20' : 'bg-yellow-500/20'
                        }`}>
                          <span className={`text-xs font-semibold ${
                            rec.priority === 'critical' ? 'text-red-400' :
                            rec.priority === 'high' ? 'text-orange-400' : 'text-yellow-400'
                          }`}>
                            {rec.priority.toUpperCase()}
                          </span>
                          <p className="text-gray-300 text-sm mt-1">{rec.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-8 text-center">
              <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Select a facility to view its compliance classification
              </p>
            </div>
          )}
        </div>
        
        {/* Right: Insurance Impact & Mutual Pool */}
        <div className="space-y-4">
          {selectedFacility && (
            <>
              {/* Insurance Impact */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Insurance Impact
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Premium Multiplier</span>
                    <span className={`font-medium ${
                      selectedFacility.insuranceImpact.premiumMultiplier < 1 ? 'text-green-400' :
                      selectedFacility.insuranceImpact.premiumMultiplier > 1.2 ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {selectedFacility.insuranceImpact.premiumMultiplier}x
                      {selectedFacility.insuranceImpact.premiumMultiplier < 1 && ' (discount)'}
                      {selectedFacility.insuranceImpact.premiumMultiplier > 1.2 && ' (surcharge)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Insurability Risk</span>
                    <span className={`font-medium capitalize ${
                      selectedFacility.insuranceImpact.insurabilityRisk === 'standard' ? 'text-green-400' :
                      selectedFacility.insuranceImpact.insurabilityRisk === 'elevated' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {selectedFacility.insuranceImpact.insurabilityRisk}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="text-xs text-gray-400 mb-2">Recommended Coverage:</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedFacility.insuranceImpact.recommendedCoverage.map((coverage, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                        {coverage}
                      </span>
                    ))}
                  </div>
                </div>
                
                {selectedFacility.insuranceImpact.exclusions.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-gray-400 mb-2">Likely Exclusions:</div>
                    <div className="space-y-1">
                      {selectedFacility.insuranceImpact.exclusions.map((exclusion, i) => (
                        <div key={i} className="text-xs text-red-400 flex items-start gap-1">
                          <span>⛔</span>
                          {exclusion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mutual Pool Eligibility */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  Mutual Pool Eligibility
                </h4>
                
                {(() => {
                  const poolCost = calculateMutualPoolCost(selectedFacility.overallClass, 100000000);
                  
                  return poolCost.eligible ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-center">
                        <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
                        <div className="text-green-400 font-medium">Eligible for Mutual Pool</div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Annual Premium</span>
                          <span className="text-white">${(poolCost.annualPremium / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Coverage Limit</span>
                          <span className="text-white">${(poolCost.coverageLimit / 1000000).toFixed(0)}M</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Deductible</span>
                          <span className="text-white">${(poolCost.deductible / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-center">
                      <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <div className="text-red-400 font-medium">Not Eligible</div>
                      <div className="text-gray-400 text-xs mt-1">
                        Requires minimum B class rating
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
          
          {/* Classification System Info */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              Classification System
            </h4>
            <p className="text-gray-400 text-xs mb-3">
              Inspired by maritime P&I clubs and Lloyd's ship classification, 
              this system rates data centers across 6 compliance categories.
            </p>
            <div className="space-y-1">
              {(['A+', 'A', 'B+', 'B', 'C', 'D', 'F'] as ComplianceClass[]).map(cls => (
                <div key={cls} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center font-bold"
                    style={{ backgroundColor: `${getClassColor(cls)}20`, color: getClassColor(cls) }}
                  >
                    {cls}
                  </div>
                  <span className="text-gray-400">{getClassDescription(cls).split(' - ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoalitionToolsTab;

