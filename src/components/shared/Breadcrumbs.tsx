/**
 * Breadcrumbs Component
 * Shows current location and allows quick navigation
 */

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { CommandCenterTab } from '../DCIMCommandCenter';

interface BreadcrumbsProps {
  currentTab: CommandCenterTab;
  onNavigate: (tab: CommandCenterTab) => void;
}

// Map tabs to their logical hierarchy
const TAB_HIERARCHY: Record<CommandCenterTab, { category: string; label: string }> = {
  'Guides': { category: 'Getting Started', label: 'Guides & Documentation' },
  'Overview': { category: 'Dashboard', label: 'Overview' },
  'Intelligence': { category: 'Analysis', label: 'Intelligence Hub' },
  'Pattern Intelligence': { category: 'Analysis', label: 'Pattern Intelligence Engine' },
  'Deep Intelligence': { category: 'Analysis', label: 'Deep Intelligence Engine' },
  'Predictive Subsidy': { category: 'Analysis', label: 'Predictive Subsidy Intelligence' },
  'Regulatory Toolkit': { category: 'Analysis', label: 'Municipal DCIM Toolkit' },
  'Predictive Intel': { category: 'Analysis', label: 'Predictive Intelligence' },
  'Assurance Monitor': { category: 'Monitoring', label: 'Compliance Assurance' },
  'Problems': { category: 'Monitoring', label: 'Compliance Alerts' },
  'Early Warning': { category: 'Monitoring', label: 'Early Warning System' },
  'Worker Safety': { category: 'Monitoring', label: 'Worker Safety Compliance' },
  'Geography': { category: 'Geographic', label: 'Map View' },
  'Geographic Intel': { category: 'Geographic', label: 'Geographic Intelligence' },
  'Connectography': { category: 'Geographic', label: 'Infrastructure Connectivity' },
  'Subsidy Tracking': { category: 'Compliance', label: 'Subsidy & Funding Tracking' },
  'Compliance Flow': { category: 'Compliance', label: 'Intent-Based Compliance' },
  'Compare': { category: 'Compliance', label: 'Comparison Tools' },
  'Facilities': { category: 'Data', label: 'Facility Database' },
  'Explorer': { category: 'Data', label: 'Data Explorer' },
  'OSINT Tools': { category: 'Tools', label: 'OSINT Research Tools' },
  'Infrastructure': { category: 'Tools', label: 'Infrastructure Analysis' },
  'Network Security': { category: 'Tools', label: 'Network Security Monitor' },
  'Reports': { category: 'Tools', label: 'Report Generator' },
  'Pattern Analysis': { category: 'Analysis', label: 'Pattern Analysis' },
  'Pattern Lab': { category: 'Analysis', label: 'Pattern Laboratory' },
  'AI Infrastructure': { category: 'Analysis', label: 'AI Infrastructure Intelligence' },
  'Network Map': { category: 'Geographic', label: 'Network Map' },
  'Follow Your Data': { category: 'Analysis', label: 'Follow Your Data' },
  'Sanctions Monitor': { category: 'Monitoring', label: 'Sanctions Monitor' },
  'Subsidy Accountability': { category: 'Compliance', label: 'Subsidy Accountability' },
  'Organizer Hub': { category: 'Organizing', label: 'Organizer Command Center' },
  // 'POC' is disabled - requires @kuzu/kuzu-wasm
};

export function Breadcrumbs({ currentTab, onNavigate }: BreadcrumbsProps) {
  const hierarchy = TAB_HIERARCHY[currentTab];

  if (!hierarchy) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Home */}
      <button
        onClick={() => onNavigate('Overview')}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
        title="Go to Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Home</span>
      </button>

      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />

      {/* Category */}
      <span className="text-xs text-gray-500 font-medium">{hierarchy.category}</span>

      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />

      {/* Current Tab */}
      <span className="text-xs text-cyan-400 font-semibold">{hierarchy.label}</span>
    </div>
  );
}



