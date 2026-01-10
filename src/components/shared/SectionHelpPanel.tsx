/**
 * SectionHelpPanel - Contextual FAQs, Guides, How-Tos, and Citations
 * 
 * Provides section-specific help content and data integrity references
 * in a tabbed interface. Can be used standalone or integrated into
 * the floating NLP assistant.
 * 
 * The Citations tab ensures rigorous data integrity by exposing:
 * - Primary sources (government, regulatory)
 * - Secondary sources (industry, academic)
 * - Tertiary sources (investigative, crowd-sourced)
 * - Methodology documentation
 * - Known limitations
 */

import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  BookOpen,
  ListChecks,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Link,
  X,
  Bookmark,
  FileText,
  Shield,
  Database,
  RefreshCw,
  Info,
  Scale,
  Globe,
  Building,
  Users,
  BadgeCheck,
} from 'lucide-react';
import { SectionContext } from '../../ai/sectionPrompts';
import { 
  getSectionHelp, 
  searchFAQs, 
  FAQ, 
  Guide, 
  HowTo,
  SectionHelpContent 
} from '../../content/sectionHelp';
import {
  getSectionCitations,
  getCitationById,
  Citation,
  DataMethodology,
  SectionCitations,
  SourceCategory,
} from '../../content/sectionCitations';

interface SectionHelpPanelProps {
  context: SectionContext;
  compact?: boolean;
  onClose?: () => void;
  className?: string;
}

type HelpTab = 'overview' | 'faqs' | 'guides' | 'howtos' | 'sources';

/**
 * Difficulty badge component
 */
const DifficultyBadge: React.FC<{ difficulty: HowTo['difficulty'] }> = ({ difficulty }) => {
  const colors = {
    beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
    intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${colors[difficulty]}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
};

/**
 * FAQ Item component
 */
const FAQItem: React.FC<{ faq: FAQ; defaultExpanded?: boolean }> = ({ faq, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-2 p-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
        )}
        <span className="text-sm text-white font-medium">{faq.question}</span>
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 pl-8">
          <p className="text-xs text-slate-300 leading-relaxed">{faq.answer}</p>
          {faq.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {faq.tags.map((tag, i) => (
                <span 
                  key={i} 
                  className="px-1.5 py-0.5 text-[10px] bg-slate-700/50 text-slate-400 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Guide Item component
 */
const GuideItem: React.FC<{ guide: Guide }> = ({ guide }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-2 p-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        <BookOpen size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium">{guide.title}</div>
          <div className="text-xs text-slate-400 mt-0.5">{guide.description}</div>
        </div>
        {isExpanded ? (
          <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Steps */}
          <div className="pl-6 space-y-2">
            {guide.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs text-slate-300">{step}</span>
              </div>
            ))}
          </div>
          
          {/* Tips */}
          {guide.tips && guide.tips.length > 0 && (
            <div className="pl-6 pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-1.5 text-xs text-green-400 mb-1.5">
                <Lightbulb size={12} />
                <span className="font-medium">Tips</span>
              </div>
              <ul className="space-y-1">
                {guide.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-slate-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-green-400">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Warnings */}
          {guide.warnings && guide.warnings.length > 0 && (
            <div className="pl-6 pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-1.5">
                <AlertTriangle size={12} />
                <span className="font-medium">Important</span>
              </div>
              <ul className="space-y-1">
                {guide.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-slate-400 pl-4 relative before:content-['⚠'] before:absolute before:left-0 before:text-amber-400">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * How-To Item component
 */
const HowToItem: React.FC<{ howTo: HowTo }> = ({ howTo }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  const toggleStep = (index: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };
  
  const progress = (completedSteps.size / howTo.steps.length) * 100;
  
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-2 p-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        <ListChecks size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium">{howTo.title}</span>
            <DifficultyBadge difficulty={howTo.difficulty} />
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{howTo.goal}</div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Clock size={10} />
              {howTo.timeEstimate}
            </span>
            <span className="text-[10px] text-slate-500">
              {howTo.steps.length} steps
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Progress bar */}
          <div className="pl-6">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Progress</span>
              <span>{completedSteps.size}/{howTo.steps.length} steps</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          {/* Prerequisites */}
          {howTo.prerequisites && howTo.prerequisites.length > 0 && (
            <div className="pl-6 p-2 bg-slate-800/50 rounded">
              <div className="text-[10px] text-slate-400 font-medium mb-1">Prerequisites:</div>
              <ul className="space-y-0.5">
                {howTo.prerequisites.map((prereq, i) => (
                  <li key={i} className="text-[10px] text-slate-500 pl-3 relative before:content-['→'] before:absolute before:left-0">
                    {prereq}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Steps */}
          <div className="pl-6 space-y-2">
            {howTo.steps.map((step, i) => (
              <div 
                key={i} 
                className={`flex items-start gap-2 p-2 rounded transition-colors ${
                  completedSteps.has(i) ? 'bg-green-500/10' : 'bg-slate-800/30'
                }`}
              >
                <button
                  onClick={() => toggleStep(i)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${
                    completedSteps.has(i) 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-slate-600 text-slate-500 hover:border-cyan-500'
                  }`}
                >
                  {completedSteps.has(i) ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <span className="text-[10px] font-bold">{i + 1}</span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium ${completedSteps.has(i) ? 'text-green-400 line-through' : 'text-white'}`}>
                    {step.action}
                  </div>
                  {step.detail && (
                    <div className="text-[10px] text-slate-400 mt-0.5">{step.detail}</div>
                  )}
                  {step.tip && (
                    <div className="flex items-start gap-1 mt-1 text-[10px] text-green-400">
                      <Lightbulb size={10} className="mt-0.5 flex-shrink-0" />
                      <span>{step.tip}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Outcome */}
          <div className="pl-6 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded">
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium mb-1">
              <CheckCircle2 size={12} />
              <span>Expected Outcome</span>
            </div>
            <p className="text-xs text-slate-300">{howTo.outcome}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Source Category Badge component
 */
const CategoryBadge: React.FC<{ category: SourceCategory }> = ({ category }) => {
  const config = {
    primary: { 
      label: 'Primary', 
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: <Shield size={10} />,
      description: 'Government/regulatory'
    },
    secondary: { 
      label: 'Secondary', 
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: <Building size={10} />,
      description: 'Industry/academic'
    },
    tertiary: { 
      label: 'Tertiary', 
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: <Users size={10} />,
      description: 'Investigative/crowd-sourced'
    },
  };
  
  const { label, color, icon } = config[category];
  
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${color}`}>
      {icon}
      {label}
    </span>
  );
};

/**
 * Reliability Badge component
 */
const ReliabilityBadge: React.FC<{ reliability: Citation['reliability'] }> = ({ reliability }) => {
  const config = {
    authoritative: { label: '✓ Authoritative', color: 'text-green-400' },
    verified: { label: '✓ Verified', color: 'text-blue-400' },
    'peer-reviewed': { label: '✓ Peer-Reviewed', color: 'text-purple-400' },
    investigative: { label: '◐ Investigative', color: 'text-amber-400' },
    'crowd-sourced': { label: '◯ Crowd-Sourced', color: 'text-slate-400' },
  };
  
  const { label, color } = config[reliability];
  
  return (
    <span className={`text-[10px] ${color}`}>{label}</span>
  );
};

/**
 * Data Frequency Badge component
 */
const FrequencyBadge: React.FC<{ frequency: Citation['dataFrequency'] }> = ({ frequency }) => {
  const colors: Record<string, string> = {
    'real-time': 'bg-green-500/10 text-green-400',
    daily: 'bg-cyan-500/10 text-cyan-400',
    weekly: 'bg-blue-500/10 text-blue-400',
    monthly: 'bg-purple-500/10 text-purple-400',
    quarterly: 'bg-amber-500/10 text-amber-400',
    annual: 'bg-slate-500/10 text-slate-400',
    static: 'bg-slate-700/50 text-slate-500',
    'as-filed': 'bg-slate-500/10 text-slate-400',
    'as-decided': 'bg-slate-500/10 text-slate-400',
  };
  
  return (
    <span className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded ${colors[frequency] || colors.static}`}>
      <RefreshCw size={8} />
      {frequency.charAt(0).toUpperCase() + frequency.slice(1).replace('-', ' ')}
    </span>
  );
};

/**
 * Format URL for display (truncate long URLs)
 */
const formatDisplayUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 20 
      ? parsed.pathname.slice(0, 20) + '...' 
      : parsed.pathname;
    return `${parsed.hostname}${path !== '/' ? path : ''}`;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url;
  }
};

/**
 * Citation Item component - Enhanced with prominent hyperlinks
 */
const CitationItem: React.FC<{ citation: Citation }> = ({ citation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Stop propagation for link clicks so they don't trigger expand/collapse
  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-2 p-3 text-left hover:bg-slate-800/50 transition-colors cursor-pointer"
      >
        <Database size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Title as clickable link */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="text-sm text-cyan-400 font-medium hover:text-cyan-300 hover:underline transition-colors flex items-center gap-1"
              title={`Open ${citation.title} in new tab`}
            >
              {citation.title}
              <ExternalLink size={10} className="opacity-60" />
            </a>
            <CategoryBadge category={citation.category} />
          </div>
          
          {/* Publisher with link */}
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="text-[10px] text-slate-400 hover:text-slate-300 hover:underline mt-0.5 inline-flex items-center gap-1"
          >
            {citation.publisher}
          </a>
          
          {/* Quick access URL - always visible */}
          <div className="flex items-center gap-1 mt-1">
            <Link size={8} className="text-slate-500" />
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="text-[9px] text-slate-500 hover:text-cyan-400 hover:underline font-mono truncate max-w-[200px]"
              title={citation.url}
            >
              {formatDisplayUrl(citation.url)}
            </a>
          </div>
          
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <ReliabilityBadge reliability={citation.reliability} />
            <FrequencyBadge frequency={citation.dataFrequency} />
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
        )}
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 pl-8 space-y-3">
          <p className="text-xs text-slate-300">{citation.description}</p>
          
          {/* Full URL with copy functionality */}
          <div className="p-2 bg-slate-800/50 rounded border border-slate-700/50">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] text-slate-500 font-medium">Source URL</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(citation.url);
                }}
                className="text-[9px] text-slate-500 hover:text-cyan-400 transition-colors"
                title="Copy URL to clipboard"
              >
                Copy
              </button>
            </div>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline font-mono break-all flex items-center gap-1"
            >
              <Globe size={10} className="flex-shrink-0" />
              {citation.url}
              <ExternalLink size={8} className="flex-shrink-0 opacity-60" />
            </a>
          </div>
          
          {/* Data Types */}
          <div className="flex flex-wrap gap-1">
            {citation.dataTypes.map((type, i) => (
              <span 
                key={i} 
                className="px-1.5 py-0.5 text-[10px] bg-slate-700/50 text-slate-400 rounded"
              >
                {type}
              </span>
            ))}
          </div>
          
          {/* Notes */}
          {citation.notes && (
            <div className="flex items-start gap-1.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
              <Info size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <span className="text-[10px] text-amber-300">{citation.notes}</span>
            </div>
          )}
          
          {/* Last Verified & Access Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">
                Last verified: {citation.lastVerified}
              </span>
              <span className="text-[10px] text-slate-600">•</span>
              <span className="text-[10px] text-slate-500">
                ID: {citation.id}
              </span>
            </div>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-medium rounded transition-colors shadow-sm"
            >
              <Globe size={12} />
              Access Source
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Source Link component - displays a source reference with clickable link
 */
const SourceLink: React.FC<{ sourceId: string }> = ({ sourceId }) => {
  const citation = getCitationById(sourceId);
  
  if (!citation) {
    // Source not found - display as plain text
    return (
      <span className="px-1.5 py-0.5 text-[10px] bg-slate-700/50 text-slate-400 rounded">
        {sourceId}
      </span>
    );
  }
  
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 rounded transition-colors border border-cyan-500/20"
      title={`${citation.title} - ${citation.publisher}\n${citation.url}`}
    >
      <Link size={8} />
      {citation.title.length > 25 ? citation.title.slice(0, 25) + '...' : citation.title}
      <ExternalLink size={8} className="opacity-60" />
    </a>
  );
};

/**
 * Methodology Item component - Enhanced with clickable source links
 */
const MethodologyItem: React.FC<{ methodology: DataMethodology }> = ({ methodology }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Resolve source citations for display
  const resolvedSources = methodology.sources.map(sourceId => ({
    id: sourceId,
    citation: getCitationById(sourceId),
  }));
  
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-2 p-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        <Scale size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-white font-medium">{methodology.dataPoint}</span>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {methodology.sources.length} source(s) • Updated {methodology.lastUpdated}
          </div>
          {/* Quick source links - visible when collapsed */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {resolvedSources.slice(0, 3).map(({ id, citation }) => (
              citation ? (
                <a
                  key={id}
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[9px] text-cyan-500 hover:text-cyan-400 hover:underline flex items-center gap-0.5"
                  title={citation.title}
                >
                  <Link size={8} />
                  {citation.publisher.split(' ').slice(0, 2).join(' ')}
                </a>
              ) : (
                <span key={id} className="text-[9px] text-slate-500">{id}</span>
              )
            ))}
            {resolvedSources.length > 3 && (
              <span className="text-[9px] text-slate-500">+{resolvedSources.length - 3} more</span>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 pl-8 space-y-3">
          {/* Calculation */}
          <div>
            <div className="text-[10px] text-slate-400 font-medium mb-1">Calculation Method:</div>
            <p className="text-xs text-slate-300 p-2 bg-slate-800/50 rounded font-mono">
              {methodology.calculation}
            </p>
          </div>
          
          {/* Sources with full links */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mb-2">
              <Database size={10} />
              Data Sources ({methodology.sources.length}):
            </div>
            <div className="space-y-2">
              {resolvedSources.map(({ id, citation }) => (
                <div key={id} className="p-2 bg-slate-800/30 rounded border border-slate-700/50">
                  {citation ? (
                    <div className="space-y-1">
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-medium flex items-center gap-1"
                      >
                        <Link size={10} />
                        {citation.title}
                        <ExternalLink size={8} className="opacity-60" />
                      </a>
                      <div className="text-[10px] text-slate-400">
                        {citation.publisher} • {citation.reliability}
                      </div>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-slate-500 hover:text-cyan-400 font-mono break-all flex items-center gap-1"
                      >
                        <Globe size={8} className="flex-shrink-0" />
                        {citation.url}
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Source ID: {id} (not found in citations)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Limitations */}
          {methodology.limitations.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium mb-1">
                <AlertTriangle size={10} />
                Known Limitations:
              </div>
              <ul className="space-y-1">
                {methodology.limitations.map((limitation, i) => (
                  <li 
                    key={i} 
                    className="text-[10px] text-slate-400 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-amber-400"
                  >
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Sources Tab Content component
 */
const SourcesTabContent: React.FC<{ citations: SectionCitations; searchQuery: string }> = ({ 
  citations, 
  searchQuery 
}) => {
  const [activeSourceTab, setActiveSourceTab] = useState<'all' | 'primary' | 'secondary' | 'tertiary' | 'methodology' | 'integrity'>('all');
  
  const allCitations = useMemo(() => [
    ...citations.primarySources,
    ...citations.secondarySources,
    ...citations.tertiarySources,
  ], [citations]);
  
  const filteredCitations = useMemo(() => {
    let filtered = allCitations;
    
    if (activeSourceTab === 'primary') {
      filtered = citations.primarySources;
    } else if (activeSourceTab === 'secondary') {
      filtered = citations.secondarySources;
    } else if (activeSourceTab === 'tertiary') {
      filtered = citations.tertiarySources;
    }
    
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(lower) ||
        c.publisher.toLowerCase().includes(lower) ||
        c.description.toLowerCase().includes(lower) ||
        c.dataTypes.some(dt => dt.toLowerCase().includes(lower))
      );
    }
    
    return filtered;
  }, [allCitations, citations, activeSourceTab, searchQuery]);
  
  const sourceTabs = [
    { id: 'all' as const, label: 'All Sources', count: allCitations.length },
    { id: 'primary' as const, label: 'Primary', count: citations.primarySources.length },
    { id: 'secondary' as const, label: 'Secondary', count: citations.secondarySources.length },
    { id: 'tertiary' as const, label: 'Tertiary', count: citations.tertiarySources.length },
    { id: 'methodology' as const, label: 'Methodology', count: citations.methodology.length },
    { id: 'integrity' as const, label: 'Integrity', count: null },
  ];
  
  return (
    <div className="space-y-3">
      {/* Overview */}
      <div className="p-2 bg-slate-800/50 rounded-lg">
        <p className="text-xs text-slate-300">{citations.overview}</p>
      </div>
      
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1">
        {sourceTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSourceTab(tab.id)}
            className={`px-2 py-1 text-[10px] rounded transition-colors ${
              activeSourceTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-1 opacity-60">({tab.count})</span>
            )}
          </button>
        ))}
      </div>
      
      {/* Citations List */}
      {(activeSourceTab === 'all' || activeSourceTab === 'primary' || activeSourceTab === 'secondary' || activeSourceTab === 'tertiary') && (
        <div className="space-y-2">
          {filteredCitations.length > 0 ? (
            filteredCitations.map((citation, i) => (
              <CitationItem key={i} citation={citation} />
            ))
          ) : (
            <div className="text-center py-4 text-slate-500 text-xs">
              No sources match your search
            </div>
          )}
        </div>
      )}
      
      {/* Methodology */}
      {activeSourceTab === 'methodology' && (
        <div className="space-y-2">
          {citations.methodology.length > 0 ? (
            citations.methodology.map((method, i) => (
              <MethodologyItem key={i} methodology={method} />
            ))
          ) : (
            <div className="text-center py-4 text-slate-500 text-xs">
              No methodology documentation available
            </div>
          )}
        </div>
      )}
      
      {/* Data Integrity */}
      {activeSourceTab === 'integrity' && (
        <div className="space-y-4">
          {/* Data Integrity Notes */}
          {citations.dataIntegrityNotes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <BadgeCheck size={14} />
                <span>Data Integrity Measures</span>
              </div>
              <div className="space-y-1">
                {citations.dataIntegrityNotes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
                    <CheckCircle2 size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-slate-300">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Verification Steps */}
          {citations.verificationSteps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <Shield size={14} />
                <span>Verification Procedures</span>
              </div>
              <div className="space-y-1">
                {citations.verificationSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Known Limitations */}
          {citations.knownLimitations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <AlertTriangle size={14} />
                <span>Known Limitations</span>
              </div>
              <div className="space-y-1">
                {citations.knownLimitations.map((limitation, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                    <Info size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-slate-300">{limitation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Key Terms component
 */
const KeyTerms: React.FC<{ terms: { term: string; definition: string }[] }> = ({ terms }) => {
  if (terms.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Bookmark size={12} />
        <span>Key Terms</span>
      </div>
      <div className="grid gap-2">
        {terms.map((item, i) => (
          <div key={i} className="p-2 bg-slate-800/50 rounded">
            <span className="text-xs text-cyan-400 font-medium">{item.term}:</span>
            <span className="text-xs text-slate-300 ml-1">{item.definition}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Resources component
 */
const Resources: React.FC<{ resources: SectionHelpContent['resources'] }> = ({ resources }) => {
  if (resources.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Link size={12} />
        <span>External Resources & References</span>
      </div>
      <div className="space-y-2">
        {resources.map((resource, i) => (
          <a
            key={i}
            href={resource.url}
            target={resource.type === 'external' ? '_blank' : undefined}
            rel={resource.type === 'external' ? 'noopener noreferrer' : undefined}
            className="block p-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-cyan-500/30 rounded-lg transition-all group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {resource.type === 'external' ? (
                  <Globe size={14} className="text-cyan-400 flex-shrink-0" />
                ) : (
                  <FileText size={14} className="text-purple-400 flex-shrink-0" />
                )}
                <span className="text-xs text-cyan-400 group-hover:text-cyan-300 font-medium group-hover:underline">
                  {resource.title}
                </span>
              </div>
              <ExternalLink size={12} className="text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
            </div>
            {/* Show URL */}
            <div className="flex items-center gap-1 mt-1 ml-6">
              <span className="text-[9px] text-slate-500 font-mono truncate">
                {resource.url}
              </span>
            </div>
            {/* Type badge */}
            <div className="mt-1.5 ml-6">
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                resource.type === 'external' 
                  ? 'bg-cyan-500/10 text-cyan-400' 
                  : 'bg-purple-500/10 text-purple-400'
              }`}>
                {resource.type === 'external' ? '↗ External Link' : '→ Internal Guide'}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

/**
 * Main SectionHelpPanel component
 */
export const SectionHelpPanel: React.FC<SectionHelpPanelProps> = ({
  context,
  compact = false,
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<HelpTab>('faqs');
  const [searchQuery, setSearchQuery] = useState('');
  
  const helpContent = useMemo(() => getSectionHelp(context), [context]);
  const citationsContent = useMemo(() => getSectionCitations(context), [context]);
  
  const totalSources = useMemo(() => 
    citationsContent.primarySources.length + 
    citationsContent.secondarySources.length + 
    citationsContent.tertiarySources.length,
    [citationsContent]
  );
  
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return helpContent.faqs;
    return searchFAQs(searchQuery, context);
  }, [searchQuery, context, helpContent.faqs]);
  
  const tabs: { id: HelpTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'faqs', label: 'FAQs', icon: <HelpCircle size={12} />, count: helpContent.faqs.length },
    { id: 'guides', label: 'Guides', icon: <BookOpen size={12} />, count: helpContent.guides.length },
    { id: 'howtos', label: 'How-Tos', icon: <ListChecks size={12} />, count: helpContent.howTos.length },
    { id: 'sources', label: 'Sources', icon: <FileText size={12} />, count: totalSources },
    { id: 'overview', label: 'Overview', icon: <Bookmark size={12} /> },
  ];
  
  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-cyan-400" />
            <span className="text-sm font-medium text-white">
              Help & Guides
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <X size={14} className="text-slate-400" />
            </button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-800/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1 py-0.5 rounded text-[8px] ${
                activeTab === tab.id ? 'bg-cyan-500/20' : 'bg-slate-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className={`overflow-y-auto ${compact ? 'max-h-64' : 'max-h-96'} p-3 space-y-3`}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              {helpContent.overview}
            </p>
            <KeyTerms terms={helpContent.keyTerms} />
            <Resources resources={helpContent.resources} />
          </div>
        )}
        
        {/* FAQs Tab */}
        {activeTab === 'faqs' && (
          <div className="space-y-2">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((faq, i) => (
                <FAQItem key={i} faq={faq} />
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No FAQs match your search
              </div>
            )}
          </div>
        )}
        
        {/* Guides Tab */}
        {activeTab === 'guides' && (
          <div className="space-y-2">
            {helpContent.guides.length > 0 ? (
              helpContent.guides.map((guide, i) => (
                <GuideItem key={i} guide={guide} />
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No guides available for this section yet
              </div>
            )}
          </div>
        )}
        
        {/* How-Tos Tab */}
        {activeTab === 'howtos' && (
          <div className="space-y-2">
            {helpContent.howTos.length > 0 ? (
              helpContent.howTos.map((howTo, i) => (
                <HowToItem key={i} howTo={howTo} />
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No how-tos available for this section yet
              </div>
            )}
          </div>
        )}
        
        {/* Sources Tab */}
        {activeTab === 'sources' && (
          <SourcesTabContent citations={citationsContent} searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
};

export default SectionHelpPanel;

