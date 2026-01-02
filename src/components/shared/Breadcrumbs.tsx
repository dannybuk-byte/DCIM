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

      {/* "You are here" indicator */}
      <div className="ml-2 px-2 py-0.5 bg-cyan-900/30 border border-cyan-700 rounded text-xs text-cyan-400">
        📍 You are here
      </div>
    </div>
  );
}



