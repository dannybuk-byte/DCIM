import React, { useState } from 'react';
import { Target, Loader, ChevronRight, X } from 'lucide-react';
import { Facility } from '../types';
import {
  INVESTIGATION_TEMPLATES,
  getGlobalTemplates,
  getFacilityTemplates,
  executeTemplate,
  generateResultSummary,
  getInvestigationShowingLabel,
  type InvestigationTemplate
} from '../utils/investigationTemplates';

interface InvestigationTemplatesProps {
  facility?: Facility;
  onResults: (results: Facility[], template: InvestigationTemplate) => void;
}

export const InvestigationTemplates: React.FC<InvestigationTemplatesProps> = ({ 
  facility, 
  onResults 
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('tracking');

  const availableTemplates = facility 
    ? INVESTIGATION_TEMPLATES 
    : getGlobalTemplates();

  const templatesByCategory = {
    tracking: availableTemplates.filter(t => t.category === 'tracking'),
    comparison: availableTemplates.filter(t => t.category === 'comparison'),
    analysis: availableTemplates.filter(t => t.category === 'analysis')
  };

  const runTemplate = async (template: InvestigationTemplate) => {
    setLoading(template.id);
    setError(null);
    
    try {
      const results = await executeTemplate(template.id, facility);
      onResults(results, template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run investigation');
      console.error('Template execution error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="investigation-templates bg-[#0d1219] rounded-lg border border-[#00d2d3]/20">
      {/* Header */}
      <div className="p-4 border-b border-[#00d2d3]/20">
        <p className="mb-2 border-l-2 border-[#00d2d3]/40 pl-2 text-[11px] leading-snug text-gray-500">
          Start here: Choose a question below to explore data center compliance.
        </p>
        <div className="flex items-center gap-2">
          <Target size={20} className="text-[#00d2d3]" />
          <h3 className="text-sm font-bold text-white">Quick Investigations</h3>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {facility 
            ? `Pre-built queries for ${facility.name}` 
            : 'Pre-built queries for the entire database'
          }
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-[#ff4757]">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-[#ff4757] hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Templates by Category */}
      <div className="p-4 space-y-3">
        {Object.entries(templatesByCategory).map(([category, templates]) => {
          if (templates.length === 0) return null;
          
          const isExpanded = expandedCategory === category;
          const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
          
          return (
            <div key={category} className="border border-[#00d2d3]/20 rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full p-3 bg-[#0a0e17] hover:bg-[#0a0e17]/80 transition-colors
                           flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight 
                    size={16} 
                    className={`text-[#00d2d3] transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                  <span className="text-sm font-semibold text-white">{categoryLabel}</span>
                  <span className="text-xs text-gray-400">
                    ({templates.length} templates)
                  </span>
                </div>
              </button>

              {/* Category Templates */}
              {isExpanded && (
                <div className="p-2 space-y-2 bg-[#0a0e17]/50">
                  {templates.map(template => {
                    const Icon = template.icon;
                    const isLoading = loading === template.id;
                    
                    return (
                      <button
                        key={template.id}
                        onClick={() => runTemplate(template)}
                        disabled={isLoading}
                        className="w-full p-3 bg-[#00d2d3]/10 hover:bg-[#00d2d3]/20 
                                   border border-[#00d2d3]/30 rounded text-left
                                   transition-all group disabled:opacity-50 
                                   disabled:cursor-not-allowed"
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            {isLoading ? (
                              <Loader size={16} className="text-[#00d2d3] animate-spin" />
                            ) : (
                              <Icon size={16} className="text-[#00d2d3] group-hover:scale-110 transition-transform" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white group-hover:text-[#00d2d3] transition-colors">
                              {template.name}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">
                              {template.description}
                            </div>
                            
                            {/* Loading State */}
                            {isLoading && (
                              <div className="mt-2 flex items-center gap-2 text-[10px] text-[#00d2d3]">
                                <div className="w-full bg-[#00d2d3]/20 rounded-full h-1">
                                  <div className="bg-[#00d2d3] h-1 rounded-full animate-pulse" 
                                       style={{ width: '60%' }} />
                                </div>
                                <span>Running...</span>
                              </div>
                            )}
                          </div>

                          {/* Arrow on Hover */}
                          {!isLoading && (
                            <ChevronRight 
                              size={14} 
                              className="text-[#00d2d3] opacity-0 group-hover:opacity-100 
                                         -translate-x-2 group-hover:translate-x-0 
                                         transition-all flex-shrink-0 mt-0.5"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      {!facility && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-[#00d2d3]/10 border border-[#00d2d3]/20 rounded-lg">
            <p className="text-[10px] text-gray-400">
              💡 <span className="text-white font-semibold">Tip:</span> These templates work 
              without AI. Click any template to run a pre-configured database query and 
              instantly get results.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Results Display Component
 */
interface InvestigationResultsProps {
  results: Facility[];
  template: InvestigationTemplate;
  facility?: Facility;
  onClose: () => void;
  onFacilityClick: (facility: Facility) => void;
}

export const InvestigationResults: React.FC<InvestigationResultsProps> = ({
  results,
  template,
  facility,
  onClose,
  onFacilityClick
}) => {
  const summary = generateResultSummary(template, results, facility);
  const Icon = template.icon;

  return (
    <div className="investigation-results bg-[#0d1219] rounded-lg border border-[#00d2d3] shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-[#00d2d3]/20 bg-[#00d2d3]/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Icon size={20} className="text-[#00d2d3] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white">{template.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{summary}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-2 pb-1">
        <p className="border-l-2 border-[#00d2d3]/40 pl-2 text-[11px] leading-snug text-gray-500">
          Showing: {getInvestigationShowingLabel(template)}
        </p>
      </div>

      {/* Results List */}
      <div className="max-h-96 overflow-y-auto">
        {results.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm text-gray-400">No results found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#00d2d3]/10">
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => onFacilityClick(result)}
                className="w-full p-4 hover:bg-[#00d2d3]/10 transition-colors text-left group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Facility Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">#{index + 1}</span>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        result.complianceStatus === 'Compliant' ? 'bg-[#2ed573]' :
                        result.complianceStatus === 'Non-Compliant' ? 'bg-[#ff4757]' :
                        'bg-[#ffa502]'
                      }`} />
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-[#00d2d3] transition-colors">
                        {result.name}
                      </h4>
                    </div>
                    
                    <div className="text-xs text-gray-400 space-y-0.5">
                      <div>{result.city}, {result.state}</div>
                      {result.operator && (
                        <div className="text-[10px]">{result.operator}</div>
                      )}
                    </div>
                  </div>

                  {/* Right: Key Metrics */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-[#ff4757]">
                      {'$'}{(result.subsidyGap / 1e6).toFixed(1)}M
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">subsidy gap</div>
                    {result.jobsPromised && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {result.jobsCreated || 0}/{result.jobsPromised} jobs
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#00d2d3]/20 bg-[#0a0e17]">
        <p className="text-[10px] text-gray-400 text-center">
          Click any facility to view detailed information
        </p>
      </div>
    </div>
  );
};

