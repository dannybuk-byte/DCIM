/**
 * DCIM Command Center - Main Component
 * Connectography / Development Seed Inspired Design
 * 
 * Enhanced version aligned with handoff document specifications
 * Now supports Mission Control layout for maximum data density
 */

import { useState, useEffect, useMemo, useCallback, startTransition, useTransition, useDeferredValue, useRef } from 'react';
import { db } from '../db/database';
import { seedDatabase } from '../db/seedData';
import { Facility, ComplianceStats } from '../types';
import { calculateStats } from '../utils/stats';
import { safeDbOperation } from '../utils/dbOperations';
import { trackError } from '../utils/errorTracking';
import { formatCurrency } from '../utils/formatting';
import { Search, X, Filter, FileText, Sparkles, Building2, Network, Download, Settings, BarChart3, Home, ChevronRight, Maximize2, BookOpenCheck, List, Layout, HelpCircle, DollarSign, Shield, AlertTriangle, Brain, Eye, Target, TrendingUp, Database, Globe, Activity, Cpu } from 'lucide-react';
import { ViewModeToggle, ViewMode } from './shared/ViewModeToggle';
import { LayerTogglesPanel, LayerState } from './shared/LayerTogglesPanel';
import { ExpandableSection } from './shared/ExpandableSection';
import { NestedTabs } from './shared/NestedTabs';
import { Tooltip } from './shared/Tooltip';
import { useProvenanceMode } from './shared/ProvenanceMode';
import { AutocompleteInput } from './shared/AutocompleteInput';
import { FullscreenOverlay } from './shared/FullscreenOverlay';
import { PhotorealisticGisView } from './shared/PhotorealisticGisView';
import { useTabNavigation, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useKeyboardScroll } from '../hooks/useKeyboardScroll';
import { 
  useOperatorAutocomplete, 
  useStateAutocomplete, 
  useCityAutocomplete, 
} from '../hooks/useAutocompleteOptions';
import { useNLPSearchSuggestions } from '../hooks/useNLPSearchSuggestions';
import { recordSearch } from '../db/searchHistory';
// Import Mission Control Layout
import MissionControlLayout from './MissionControlLayout';
// Import tabs directly - lazy loading causes noticeable lag (Rule 5: Conditional rendering handles performance)
import OverviewTab from './tabs/OverviewTab';
import GeographyTab from './tabs/GeographyTab';
import ProblemsTab from './tabs/ProblemsTab';
import EarlyWarningTab from './tabs/EarlyWarningTab';
import { GeographicIntelTab } from './tabs/GeographicIntelTab';
import { SubsidyTrackingTab } from './tabs/SubsidyTrackingTab';
import { WorkerSafetyTab } from './tabs/WorkerSafetyTab';
import { OSINTToolsTab } from './tabs/OSINTToolsTab';
import ComplianceComparisonTab from './tabs/ComplianceComparisonTab';
import ConnectographyTab from './tabs/ConnectographyTab';
import { FacilityExplorer } from './FacilityExplorer';
import GuidesTab from './tabs/GuidesTab';
import AdvancedPatternAnalysisTab from './tabs/AdvancedPatternAnalysisTab'; // REPLACED: Advanced pattern analysis (replaces DCIMAnalyticsTab)
import { PatternLabTab } from './tabs/patternLab/PatternLabTab'; // Pattern Lab v2 (Web Worker + explainability)
import NetworkSecurityTab from './tabs/NetworkSecurityTab'; // NotebookLM-inspired
import { PredictiveIntelligenceTab } from './tabs/PredictiveIntelligenceTab'; // Predictive Intelligence Hub
// import { GraphDatabasePOC } from './tabs/GraphDatabasePOC'; // POC requires @kuzu/kuzu-wasm (uninstalled)
import { ComplianceFlowTab } from './tabs/ComplianceFlowTab'; // Intent-Based Visualization
import { AssuranceMonitorTab } from './tabs/AssuranceMonitorTab'; // Juniper Marvis-style continuous monitoring
import { EpochAIIntelligenceTab } from './tabs/EpochAIIntelligenceTab'; // Epoch AI data centers intelligence
import { SubsidyAccountabilityPanel } from './panels/SubsidyAccountabilityPanel'; // Good Jobs First integration
import { OrganizerCommandCenter } from './panels/OrganizerCommandCenter'; // Labor organizing command center
import { IntelligenceHubTab } from './tabs/IntelligenceHubTab'; // UNIFIED: All intelligence methods combined
import { NetworkVisualizationTab } from './tabs/NetworkVisualizationTab'; // Network visualization with tree & globe
import { PatternIntelligenceDashboard } from './PatternIntelligenceDashboard'; // NEW: Enhanced Surveillance & Pattern Recognition
import { DeepIntelligence } from './DeepIntelligence'; // NEW: Full API data extraction
import { PredictiveSubsidyDashboard } from './PredictiveSubsidyDashboard'; // NEW: Predictive Subsidy Intelligence
import { RegulatoryToolkit } from './RegulatoryToolkit'; // NEW: Municipal DCIM Intelligence Toolkit
import { FollowYourDataTab } from './tabs/FollowYourDataTab'; // NEW: Infrastructure Discovery with CAP, NPU, ILSR
import { SanctionsMonitorTab } from './tabs/SanctionsMonitorTab'; // NEW: OFAC Sanctions Network Hygiene Enforcement
import { SurveillanceInfrastructureTab } from './tabs/SurveillanceInfrastructureTab'; // NEW: ICE/DHS surveillance tracker
import { SanctuaryCityTab } from './tabs/SanctuaryCityTab'; // NEW: Sanctuary City Infrastructure Accountability
import { SmartSearchNav, NavProvider, QuickAccessNav } from './AntifragileNavigation'; // NEW: Antifragile Navigation System
import EvidencePanel from './EvidencePanel'; // FRE 902(13)-(14) Evidence Integrity
import { NestedFAQ } from './NestedFAQ'; // Comprehensive help documentation
import { WelcomeOnboarding } from './onboarding/WelcomeOnboarding'; // First-time user onboarding
import { MissionHeader, SubsidyGapHero } from './shared/HumanizedStats'; // Humanized stats components
import { indexFacilities } from '../search/SearchEngine'; // FlexSearch initialization
import { detectDashboardAction } from '../utils/dashboardActions';
import { ErrorBoundary } from './ErrorBoundary';
import { CommandPalette } from './shared/CommandPalette';
// SimpleBuildBadge removed to reduce clutter
import { SettingsPanel } from './shared/SettingsPanel';
import { downloadComplianceReport } from '../services/PDFReportGenerator';
import { PWAStatus } from './shared/PWAStatus';
import { HeaderCapabilitiesBar } from './shared/HeaderCapabilitiesBar';
import { DensityToggleInline } from './shared/DensityToggle';
import { TabTransition } from './shared/TabTransition';
import { TableOfContents } from './shared/TableOfContents';
import { NavigationSidebar } from './shared/NavigationSidebar';
import { Breadcrumbs } from './shared/Breadcrumbs';
import { 
  Spinner, 
  ProgressBar, 
  ProgressRing,
  SkeletonCard, 
  SkeletonTable, 
  DataLoadingOverlay,
  LoadingStates,
  StepIndicator,
  LoadingScreen,
} from './shared/ProgressIndicators';

export type CommandCenterTab = 
  | 'Guides'
  | 'Overview'
  | 'Geography'
  | 'Problems'
  | 'Early Warning'
  | 'Geographic Intel' 
  | 'Subsidy Tracking' 
  | 'Worker Safety' 
  | 'Facilities' 
  | 'OSINT Tools' 
  | 'Pattern Analysis' // REPLACED: Comprehensive pattern analysis (was "DCIM Analytics")
  | 'Pattern Lab' // NEW: Web Worker + explainability
  | 'Pattern Intelligence' // NEW: Enhanced Surveillance & Pattern Recognition Engine
  | 'Deep Intelligence' // NEW: Full API data extraction - OpenCorp, SEC, PeeringDB, USASpending
  | 'Predictive Intel' // NEW: Forecasting, Risk Scoring, Monte Carlo
  | 'Predictive Subsidy' // NEW: Good Jobs First-style subsidy risk prediction
  | 'Regulatory Toolkit' // NEW: Municipal DCIM Intelligence Toolkit
  | 'Follow Your Data' // NEW: Infrastructure Discovery with CAP Taxonomy, NPU, ILSR
  | 'Infrastructure' 
  | 'Network Map' // NEW: 20-level tree + 3D globe visualization
  | 'Network Security' // New NotebookLM tab
  | 'Reports'
  | 'Explorer'
  | 'Compare'
  | 'Connectography'
  | 'Intelligence' // UNIFIED: Pattern Analysis + Pattern Lab + Assurance + Predictions + Graph
  | 'Compliance Flow' // Visualization-focused view
  | 'Assurance Monitor' // Continuous monitoring
  | 'Sanctions Monitor' // NEW: OFAC Sanctions Network Hygiene Enforcement
  | 'Subsidy Accountability' // NEW: Good Jobs First subsidy accountability tracking
  | 'Organizer Hub' // NEW: Labor organizing command center
  | 'AI Infrastructure' // NEW: Epoch AI data center intelligence
  | 'Surveillance Infrastructure' // NEW: ICE/DHS surveillance tracker
  | 'Sanctuary City'; // NEW: Sanctuary City Infrastructure Accountability
  // | 'POC';  // Disabled - requires @kuzu/kuzu-wasm

interface DCIMCommandCenterProps {
  onActionRequested?: (action: any) => void;
  onOpenChat?: () => void;
  // Props for future expansion
}

// Facilities Tab with Expandability
function FacilitiesTabWithExpandability({ facilities }: { facilities: Facility[] }) {

  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold mb-4">Facilities</div>
      <NestedTabs
        tabs={[
          {
            id: 'list',
            label: 'List View',
            icon: <Building2 className="w-4 h-4" />,
            badge: facilities.length,
            content: (
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="max-h-[700px] overflow-y-auto scroll-smooth" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', scrollPadding: '0' }}>
                  {facilities.map((facility) => (
                    <ExpandableSection
                      key={facility.id}
                      title={
                        <div className="flex items-center justify-between w-full pr-4">
                          <span>{facility.name}</span>
                          <span className="text-sm text-gray-400">{facility.state}</span>
                        </div>
                      }
                      badge={facility.issues.length}
                      icon={<Building2 className="w-4 h-4" />}
                    >
                      <div className="p-4">
                        <NestedTabs
                          tabs={[
                            {
                              id: 'overview',
                              label: 'Overview',
                              content: (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="text-xs text-gray-400 mb-1">Type</div>
                                    <div>{facility.type}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-400 mb-1">Operator</div>
                                    <div>{facility.operator}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-400 mb-1">Location</div>
                                    <div>{facility.city}, {facility.state}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-400 mb-1">Status</div>
                                    <span
                                      className={`px-2 py-1 rounded text-xs ${
                                        facility.complianceStatus === 'Compliant' ? 'bg-green-900 text-green-300' :
                                        facility.complianceStatus === 'Non-Compliant' ? 'bg-red-900 text-red-300' :
                                        facility.complianceStatus === 'At Risk' ? 'bg-yellow-900 text-yellow-300' :
                                        'bg-gray-700 text-gray-300'
                                      }`}
                                    >
                                      {facility.complianceStatus}
                                    </span>
                                  </div>
                                </div>
                              ),
                            },
                            {
                              id: 'compliance',
                              label: 'Compliance',
                              content: (
                                <div className="space-y-3">
                                  <div className="p-3 bg-gray-800 rounded">
                                    <div className="text-xs text-gray-400 mb-1">Subsidy Gap</div>
                                    <div className="text-lg font-semibold text-amber-400">{formatCurrency(facility.subsidyGap)}</div>
                                  </div>
                                  <div className="p-3 bg-gray-800 rounded">
                                    <div className="text-xs text-gray-400 mb-1">Last Audit</div>
                                    <div>{new Date(facility.lastAuditDate).toLocaleDateString()}</div>
                                  </div>
                                  {facility.issues.length > 0 && (
                                    <div>
                                      <div className="text-xs text-gray-400 mb-2">Issues</div>
                                      <div className="space-y-1">
                                        {facility.issues.map((issue, i) => (
                                          <div key={i} className="p-2 bg-red-900/20 border border-red-900/50 rounded text-sm">
                                            {issue}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ),
                            },
                          ]}
                        />
                      </div>
                    </ExpandableSection>
                  ))}
                </div>
              </div>
            ),
          },
          {
            id: 'byType',
            label: 'By Type',
            icon: <Building2 className="w-4 h-4" />,
            content: (
              <div className="space-y-3">
                {Object.entries(
                  facilities.reduce((acc, f) => {
                    acc[f.type] = (acc[f.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <ExpandableSection
                      key={type}
                      title={type}
                      badge={count}
                    >
                      <div className="p-4 space-y-2 max-h-96 overflow-y-auto scroll-smooth" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', scrollPadding: '0' }}>
                        {facilities.filter((f) => f.type === type).length > 0 ? (
                          facilities
                            .filter((f) => f.type === type)
                            .map((f) => (
                              <div key={f.id} className="p-2 bg-gray-800 rounded text-sm">
                                {f.name} - {f.state}
                              </div>
                            ))
                        ) : (
                          <div className="p-3 bg-gray-800 rounded text-sm text-gray-400">No facilities of this type</div>
                        )}
                      </div>
                    </ExpandableSection>
                  ))}
              </div>
            ),
          },
          {
            id: 'byOperator',
            label: 'By Operator',
            icon: <Building2 className="w-4 h-4" />,
            content: (
              <div className="space-y-3 max-h-[700px] overflow-y-auto scroll-smooth" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', scrollPadding: '0' }}>
                {Object.entries(
                  facilities.reduce((acc, f) => {
                    acc[f.operator] = (acc[f.operator] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([operator, count]) => (
                    <ExpandableSection
                      key={operator}
                      title={operator}
                      badge={count}
                    >
                      <div className="p-4 space-y-2 max-h-96 overflow-y-auto scroll-smooth" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', scrollPadding: '0' }}>
                        {facilities.filter((f) => f.operator === operator).length > 0 ? (
                          facilities
                            .filter((f) => f.operator === operator)
                            .map((f) => (
                              <div key={f.id} className="p-2 bg-gray-800 rounded text-sm">
                                {f.name} - {f.state}
                              </div>
                            ))
                        ) : (
                          <div className="p-3 bg-gray-800 rounded text-sm text-gray-400">No facilities for this operator</div>
                        )}
                      </div>
                    </ExpandableSection>
                  ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// Infrastructure Tab with Expandability
function InfrastructureTabWithExpandability({ facilities }: { facilities: Facility[] }) {
  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold mb-4">Infrastructure</div>
      <NestedTabs
        tabs={[
          {
            id: 'topology',
            label: 'Network Topology',
            icon: <Network className="w-4 h-4" />,
            content: (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="text-lg font-semibold mb-4">Network Topology</div>
                <ExpandableSection
                  title="Network Visualization"
                  icon={<Network className="w-5 h-5" />}
                >
                  <div className="h-96 bg-gray-800 rounded flex items-center justify-center text-gray-400">
                    Network visualization placeholder
                  </div>
                </ExpandableSection>
              </div>
            ),
          },
          {
            id: 'connections',
            label: 'Connections',
            icon: <Network className="w-4 h-4" />,
            content: (
              <div className="space-y-3">
                <div className="text-sm text-gray-400 mb-4">
                  {facilities.length} facilities in network
                </div>
                {facilities.length > 0 ? (
                  facilities.slice(0, 20).map((facility) => (
                  <ExpandableSection
                    key={facility.id}
                    title={facility.name}
                    icon={<Building2 className="w-4 h-4" />}
                  >
                    <div className="p-4 space-y-2">
                      <div className="text-sm">
                        <div className="text-xs text-gray-400 mb-1">Location</div>
                        <div>{facility.city}, {facility.state}</div>
                      </div>
                      <div className="text-sm">
                        <div className="text-xs text-gray-400 mb-1">Type</div>
                        <div>{facility.type}</div>
                      </div>
                    </div>
                  </ExpandableSection>
                  ))
                ) : (
                  <div className="p-4 bg-gray-800 rounded text-sm text-gray-400">No facilities in network</div>
                )}
              </div>
            ),
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: <Settings className="w-4 h-4" />,
            content: (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="space-y-4">
                  <ExpandableSection
                    title="Display Options"
                    icon={<Settings className="w-5 h-5" />}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Show Labels</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Show Connections</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                    </div>
                  </ExpandableSection>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// Reports Tab with Expandability
function ReportsTabWithExpandability({ }: { facilities: Facility[]; stats: ComplianceStats | null }) {
  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold mb-4">Reports</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['State Report', 'Operator Report', 'Facility Report', 'Evidence Package'].map((report) => (
          <ExpandableSection
            key={report}
            title={
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-amber-400" />
                <div>
                  <div className="font-semibold">{report}</div>
                  <div className="text-xs text-gray-400">Click to configure and generate</div>
                </div>
              </div>
            }
            icon={<FileText className="w-5 h-5" />}
          >
            <div className="p-4 space-y-4">
              <NestedTabs
                tabs={[
                  {
                    id: 'configure',
                    label: 'Configure',
                    icon: <Settings className="w-4 h-4" />,
                    content: (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Report Type</label>
                          <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
                            <option>Full Report</option>
                            <option>Summary Only</option>
                            <option>Detailed Analysis</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Format</label>
                          <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
                            <option>PDF</option>
                            <option>Excel</option>
                            <option>CSV</option>
                          </select>
                        </div>
                        <button className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded text-sm flex items-center justify-center gap-2">
                          <Download className="w-4 h-4" />
                          Generate Report
                        </button>
                      </div>
                    ),
                  },
                  {
                    id: 'preview',
                    label: 'Preview',
                    icon: <FileText className="w-4 h-4" />,
                    content: (
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-800 rounded">
                          <div className="text-sm font-semibold mb-2">Report Preview</div>
                          <div className="text-xs text-gray-400">
                            This report will include:
                          </div>
                          <ul className="text-xs text-gray-300 mt-2 space-y-1 list-disc list-inside">
                            <li>Facility statistics</li>
                            <li>Compliance status breakdown</li>
                            <li>Subsidy gap analysis</li>
                            <li>Recommendations</li>
                          </ul>
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'history',
                    label: 'History',
                    icon: <BarChart3 className="w-4 h-4" />,
                    content: (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-400 mb-2">Recent Reports</div>
                        <div className="p-3 bg-gray-800 rounded text-sm">
                          No reports generated yet
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </ExpandableSection>
        ))}
      </div>
    </div>
  );
}

export default function DCIMCommandCenter({ onActionRequested: _onActionRequested, onOpenChat }: DCIMCommandCenterProps) {
  // Core State
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false); // Show skeleton after loading screen
  const [activeTab, setActiveTab] = useState<CommandCenterTab>('Overview');
  const [isPending, startTabTransition] = useTransition();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Navigation sidebar state
  const [showFAQ, setShowFAQ] = useState(false); // Help & Documentation modal
  const { enabled: provenanceMode, setEnabled: setProvenanceMode} = useProvenanceMode();
  const [isFullscreenTab, setIsFullscreenTab] = useState(false);
  const [connectographyOpen, setConnectographyOpen] = useState(false);
  const [connectographyMode, setConnectographyMode] = useState<ViewMode>('2D');
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  
  // NEW: Mission Control Layout toggle
  const [useMissionControl, setUseMissionControl] = useState(false);
  
  // Debug log
  console.log('🎯 Mission Control Mode:', useMissionControl);
  
  // Tab change handler with simple transition
  const handleTabChange = useCallback((tab: CommandCenterTab) => {
    startTabTransition(() => {
      setActiveTab(tab);
      
      // Reset scroll position smoothly on tab change
      requestAnimationFrame(() => {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.scrollTop = 0;
        }
      });
    });
  }, []);
  
  // Defer heavy computations to prevent blocking UI
  const deferredFacilities = useDeferredValue(filteredFacilities);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('2D');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Debounce search query (150ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(globalSearchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  // Global Connectography hotkey (G) — available everywhere in the Command Center
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if ((t as any).isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setConnectographyOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Layer States
  const [layers, setLayers] = useState<LayerState>({
    facilities: true,
    connections: true,
    cables: false,
    ixp: false,
    heatmap: false,
  });

  // Filters
  const [filters, setFilters] = useState({
    state: '',
    operator: '',
    complianceStatus: '' as Facility['complianceStatus'] | '',
    minGap: 0,
    country: '',
    city: '',
  });
  
  // Memoized filtered facilities calculation
  const filteredFacilitiesMemo = useMemo(() => {
    let filtered = [...facilities];
    
    if (filters.state) {
      filtered = filtered.filter(f => f.state === filters.state);
    }
    if (filters.operator) {
      filtered = filtered.filter(f => f.operator === filters.operator);
    }
    if (filters.complianceStatus) {
      filtered = filtered.filter(f => f.complianceStatus === filters.complianceStatus);
    }
    if (filters.minGap > 0) {
      filtered = filtered.filter(f => f.subsidyGap >= filters.minGap);
    }
    if (filters.country) {
      filtered = filtered.filter(f => f.country === filters.country);
    }
    if (filters.city) {
      filtered = filtered.filter(f => f.city.toLowerCase().includes(filters.city.toLowerCase()));
    }
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.city.toLowerCase().includes(query) ||
        f.state.toLowerCase().includes(query) ||
        f.operator.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [facilities, filters, debouncedSearchQuery]);
  
  // Update filtered facilities when memoized value changes (with transition to prevent jank)
  useEffect(() => {
    startTransition(() => {
    setFilteredFacilities(filteredFacilitiesMemo);
    setStats(calculateStats(filteredFacilitiesMemo));
    });
  }, [filteredFacilitiesMemo]);

  // Initialize data with error handling and health checks
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function init() {
      const startTime = Date.now(); // Track loading start time
      try {
        // Check database health
        const { checkDBHealth } = await import('../utils/dbHealth');
        const health = await checkDBHealth();
        
        if (!health.healthy) {
          console.warn('Database health issues:', health.issues);
        }

        await seedDatabase();
        
        if (abortController.signal.aborted || !isMounted) return;

        const allFacilities = await safeDbOperation(
          () => db.facilities.toArray(),
          () => [] // Fallback: empty array
        );
        
        if (abortController.signal.aborted || !isMounted) return;

        const calculatedStats = calculateStats(allFacilities);

        setFacilities(allFacilities);
        setFilteredFacilities(allFacilities);
        setStats(calculatedStats);
        
        // Initialize FlexSearch index for fast searching
        if (allFacilities.length > 0) {
          console.log('[DCIMCommandCenter] Initializing FlexSearch with', allFacilities.length, 'facilities');
          indexFacilities(allFacilities);
        }
      } catch (error) {
        console.error('Error initializing command center:', error);
        // Graceful degradation
        try {
          const facilities = await safeDbOperation(
            () => db.facilities.toArray(),
            () => [] // Fallback: empty array
          );
          if (isMounted) {
            setFacilities(facilities);
            setFilteredFacilities(facilities);
            // Add null safety for stats calculation
            const calculatedStats = facilities.length > 0 
              ? calculateStats(facilities) 
              : { 
                  totalFacilities: 0, compliant: 0, nonCompliant: 0, atRisk: 0, unknown: 0, 
                  totalSubsidyGap: 0, totalIssues: 0, avgDaysSinceAudit: 0, overdueAudits: 0,
                  medianSubsidyGap: 0, maxSubsidyGap: 0 
                };
            setStats(calculatedStats);
          }
        } catch (fallbackError) {
          console.error('Fallback initialization failed:', fallbackError);
          trackError(fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)), {
            context: 'DCIMCommandCenter.fallbackInit'
          });
        }
      } finally {
        if (isMounted) {
          // Guarantee minimum loading time of 2.5 seconds for smooth animation
          const minLoadingTime = 2500; // Match LoadingScreen animation duration
          const elapsed = Date.now() - startTime;
          const remainingTime = Math.max(0, minLoadingTime - elapsed);
          
          setTimeout(() => {
        if (isMounted) {
          setLoading(false);
              // Show skeleton loaders briefly during React mounting
              setShowSkeleton(true);
              setTimeout(() => {
                if (isMounted) {
                  setShowSkeleton(false);
                  
                  // Show Table of Contents on first load
                  const hasSeenTOC = localStorage.getItem('dcim:hasSeenTOC');
                  if (!hasSeenTOC) {
                    setTimeout(() => {
                      setShowTableOfContents(true);
                      localStorage.setItem('dcim:hasSeenTOC', 'true');
                    }, 500); // Small delay for smooth transition
                  }
        }
              }, 400); // Brief skeleton display
            }
          }, remainingTime);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);


  // Keyboard shortcuts with cleanup (Rule 4)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // Cmd/Ctrl + K for Smart Search Navigation
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSmartSearch(true);
        return;
      }
      
      // Cmd/Ctrl + Shift + / for Table of Contents
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setShowTableOfContents(true);
        return;
      }
      
      // Cmd/Ctrl + , for settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
        return;
      }
      
      // Cmd/Ctrl + E for export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (stats && !isExporting) {
          setIsExporting(true);
          try {
            await downloadComplianceReport(filteredFacilities, stats);
          } finally {
            setIsExporting(false);
          }
        }
        return;
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowGlobalSearch(false);
        setShowSettings(false);
        return;
      }
      
      // Number keys 1-4 for quick tab navigation
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const numKey = parseInt(e.key);
        if (numKey >= 1 && numKey <= 4) {
          const quickTabs: CommandCenterTab[] = ['Overview', 'Pattern Lab', 'Network Security', 'Connectography'];
          if (quickTabs[numKey - 1]) {
            startTransition(() => {
              handleTabChange(quickTabs[numKey - 1]);
            });
          }
          return;
        }
        
        // F for fullscreen
        if (e.key === 'f' || e.key === 'F') {
          setIsFullscreenTab(prev => !prev);
          return;
        }
        
        // G for connectography
        if (e.key === 'g' || e.key === 'G') {
          setConnectographyOpen(prev => !prev);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [stats, filteredFacilities, isExporting]);
  
  // Memoized handlers
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Switch to Geographic Intel tab when view mode changes so user can see the change
    if (activeTab !== 'Geographic Intel') {
      startTransition(() => {
        handleTabChange('Geographic Intel');
      });
    }
  };
  
  const handleLayersChange = useCallback((newLayers: LayerState) => {
    setLayers(newLayers);
  }, []);
  
  const handleClearFilters = useCallback(() => {
    setFilters({ state: '', operator: '', complianceStatus: '', minGap: 0, country: '', city: '' });
  }, []);

  // Handle AI search (from Dashboard)
  const handleAiSearch = useCallback(async (query: string) => {
    setAiSearchQuery(query);
    setIsAiProcessing(true);
    recordSearch(query, 'ai');
    
    // Detect dashboard action
    const action = detectDashboardAction(query);
    
    if (action) {
      if (action.type === 'switchTab' && action.tab) {
        // Map old tab names to new ones
        const tabMap: Record<string, CommandCenterTab> = {
          'Overview': 'Overview',
          'Geography': 'Geography',
          'Problems': 'Problems',
          'Early Warning': 'Early Warning',
          'Explorer': 'Explorer',
        };
        const mappedTab = tabMap[action.tab] || action.tab as CommandCenterTab;
        handleTabChange(mappedTab);
      }
      if (action.type === 'filter' && action.filters) {
        setFilters(prev => {
          const newFilters = { 
            ...prev, 
            // Only override fields that are explicitly provided
            ...(action.filters!.state !== undefined && action.filters!.state !== '' && { state: action.filters!.state }),
            ...(action.filters!.city !== undefined && action.filters!.city !== '' && { city: action.filters!.city }),
            ...(action.filters!.country !== undefined && action.filters!.country !== '' && { country: action.filters!.country }),
            ...(action.filters!.operator !== undefined && action.filters!.operator !== '' && { operator: action.filters!.operator }),
            ...(action.filters!.complianceStatus !== undefined && action.filters!.complianceStatus && { complianceStatus: action.filters!.complianceStatus }),
            ...(action.filters!.minGap !== undefined && { minGap: action.filters!.minGap }),
          };
          return newFilters;
        });
        if (action.tab) {
          const tabMap: Record<string, CommandCenterTab> = {
            'Overview': 'Overview',
            'Geography': 'Geography',
            'Problems': 'Problems',
            'Early Warning': 'Early Warning',
            'Explorer': 'Explorer',
          };
          const mappedTab = tabMap[action.tab] || action.tab as CommandCenterTab;
          handleTabChange(mappedTab);
        }
      }
      if (action.type === 'generateReport') {
        _onActionRequested?.({ type: 'generateReport' });
      }
    }
    
    setIsAiProcessing(false);
  }, [_onActionRequested]);

  const tabs: CommandCenterTab[] = [
    'Guides',
    'Overview',
    'Geography',
    'Problems',
    'Early Warning',
    'Geographic Intel',
    'Subsidy Tracking', 
    'Worker Safety',
    'Facilities',
    'OSINT Tools',
    'Intelligence',  // UNIFIED: All intelligence methods in one place
    'Pattern Intelligence', // NEW: Enhanced Surveillance & Pattern Recognition
    'Deep Intelligence', // NEW: Full API data extraction - OpenCorp, SEC, PeeringDB
    'Predictive Intel', // Deep dive forecasting (kept separate for detail)
    'Predictive Subsidy', // NEW: Good Jobs First-style subsidy risk prediction
    'Subsidy Accountability', // NEW: Good Jobs First accountability tracking
    'Organizer Hub', // NEW: Labor organizing command center
    'Surveillance Infrastructure', // NEW: ICE/DHS surveillance tracker
    'Sanctuary City', // NEW: Sanctuary City Infrastructure Accountability
    'Regulatory Toolkit', // NEW: Municipal DCIM scrapers and APIs
    'Follow Your Data', // NEW: Infrastructure Discovery with CAP, NPU, ILSR
    'Infrastructure',
    'Network Security',
    'Reports',
    'Compare',
    'Connectography',
    'Explorer',
    'Compliance Flow',  // Visualization-focused
    'Assurance Monitor',  // Continuous monitoring
    'Sanctions Monitor',  // NEW: OFAC Network Hygiene Enforcement
    // Legacy tabs (will be deprecated):
    // 'Pattern Analysis', // → Merged into Intelligence
    // 'Pattern Lab', // → Merged into Intelligence (scenarios)
  ];

  // NAV_TABS: Rich metadata for antifragile navigation system
  const NAV_TABS = useMemo(() => [
    { id: 'Guides', label: 'Guides', shortLabel: 'Guide', icon: <BookOpenCheck className="w-4 h-4" />, group: 'Getting Started', keywords: ['help', 'tutorial', 'start', 'learn'], description: 'Getting started guides' },
    { id: 'Overview', label: 'Dashboard Overview', shortLabel: 'Overview', icon: <Home className="w-4 h-4" />, group: 'Getting Started', keywords: ['dashboard', 'summary', 'home', 'stats'], description: 'Main dashboard with key metrics' },
    { id: 'Geography', label: 'Geographic View', shortLabel: 'Geo', icon: <Globe className="w-4 h-4" />, group: 'Getting Started', keywords: ['map', 'location', 'region', 'state'], description: 'Geographic facility distribution' },
    { id: 'Problems', label: 'Problems & Alerts', shortLabel: 'Problems', icon: <AlertTriangle className="w-4 h-4" />, group: 'Getting Started', keywords: ['alert', 'issue', 'risk', 'warning', 'critical'], description: 'Facilities requiring attention' },
    { id: 'Early Warning', label: 'Early Warning', shortLabel: 'Warning', icon: <AlertTriangle className="w-4 h-4" />, group: 'Getting Started', keywords: ['predict', 'forecast', 'early', 'risk'], description: 'Early warning indicators' },
    { id: 'Geographic Intel', label: 'Geographic Intel', shortLabel: 'Geo Intel', icon: <Globe className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['geo', 'region', 'county', 'demographics'], description: 'Regional intelligence analysis' },
    { id: 'Subsidy Tracking', label: 'Subsidy Tracking', shortLabel: 'Subsidies', icon: <DollarSign className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['subsidy', 'tax', 'incentive', 'money'], description: 'Track subsidy compliance' },
    { id: 'Worker Safety', label: 'Worker Safety', shortLabel: 'Safety', icon: <Shield className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['osha', 'safety', 'worker', 'violation'], description: 'Worker safety tracking' },
    { id: 'Facilities', label: 'Facilities', shortLabel: 'Fac', icon: <Building2 className="w-4 h-4" />, group: 'Operations', keywords: ['facility', 'building', 'data center', 'site'], description: 'All facilities list' },
    { id: 'OSINT Tools', label: 'OSINT Tools', shortLabel: 'OSINT', icon: <Search className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['osint', 'search', 'investigation', 'research'], description: 'Open source intelligence tools' },
    { id: 'Intelligence', label: 'Intelligence Hub', shortLabel: 'Intel Hub', icon: <Brain className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['ai', 'intel', 'analysis', 'insights', 'agents'], description: 'AI-powered intelligence center' },
    { id: 'Pattern Intelligence', label: 'Pattern Engine', shortLabel: 'Patterns', icon: <Eye className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['pattern', 'ml', 'anomaly', 'detection'], description: 'ML-powered pattern detection' },
    { id: 'Deep Intelligence', label: 'Deep Intel', shortLabel: 'Deep', icon: <Database className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['deep', 'api', 'sec', 'peeringdb', 'opencorporates'], description: 'Full API data extraction' },
    { id: 'Predictive Intel', label: 'Predictions', shortLabel: 'Predict', icon: <TrendingUp className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['forecast', 'predict', 'future', 'monte carlo'], description: 'Predictive analytics' },
    { id: 'Predictive Subsidy', label: 'Subsidy Intel', shortLabel: 'Sub Intel', icon: <Target className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['subsidy', 'good jobs first', 'tax break', 'clawback', 'risk'], description: 'Predictive subsidy risk analysis' },
    { id: 'Subsidy Accountability', label: '💰 Subsidy Accountability', shortLabel: 'Accountability', icon: <DollarSign className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['subsidy', 'accountability', 'jobs promised', 'jobs actual', 'good jobs first', 'transparency', 'state', 'gap'], description: 'Good Jobs First subsidy accountability - verify promises vs reality' },
    { id: 'Organizer Hub', label: '✊ Organizer Hub', shortLabel: 'Organize', icon: <Target className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['organize', 'union', 'labor', 'foia', 'incident', 'contractor', 'cba', 'legislative', 'coalition', 'ibew', 'corridor', 'campaign'], description: 'Labor organizing command center - FOIA, incidents, contractors, CBAs, legislation, union density, coalition coordination' },
    { id: 'Surveillance Infrastructure', label: '🔴 Surveillance Tracker', shortLabel: 'Surveillance', icon: <Eye className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['ice', 'surveillance', 'dhs', 'cbp', 'palantir', 'clearview', 'facial recognition', 'skip tracing', 'deportation', 'immigrant', 'contract', 'federal'], description: 'Track ICE/DHS surveillance infrastructure, contracts, and companies targeting immigrant communities' },
    { id: 'Sanctuary City', label: '🏛️ Sanctuary City', shortLabel: 'Sanctuary', icon: <Shield className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['sanctuary', 'nyc', 'mayor', 'mamdani', 'carrier hotel', 'reit', 'equinix', 'digital realty', 'franchise', 'nycida', 'enforcement', 'ice', 'data flow', 'executive order', 'regulatory', '111 8th avenue', '60 hudson', 'charter 363'], description: 'NYC ICE Data Infrastructure: REIT Exposure and Mayoral Regulatory Authority' },
    { id: 'Regulatory Toolkit', label: 'Regulatory APIs', shortLabel: 'Reg APIs', icon: <Database className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['municipal', 'regulatory', 'scraper', 'api', 'bls', 'sec', 'epa'], description: 'Municipal DCIM scrapers & APIs' },
    { id: 'Follow Your Data', label: 'Follow Your Data', shortLabel: 'Follow', icon: <Globe className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['follow', 'data', 'infrastructure', 'cap', 'npu', 'ilsr', 'community', 'geolocation', 'discovery'], description: 'Infrastructure discovery with CAP taxonomy, NPU framework, ILSR alternatives' },
    { id: 'Infrastructure', label: 'Infrastructure', shortLabel: 'Infra', icon: <Network className="w-4 h-4" />, group: 'Operations', keywords: ['infra', 'network', 'power', 'cooling'], description: 'Infrastructure details' },
    { id: 'Network Security', label: 'Network Security', shortLabel: 'Security', icon: <Shield className="w-4 h-4" />, group: 'Operations', keywords: ['security', 'bgp', 'rpki', 'network'], description: 'Network security analysis' },
    { id: 'Reports', label: 'Reports', shortLabel: 'Report', icon: <FileText className="w-4 h-4" />, group: 'Operations', keywords: ['report', 'export', 'pdf', 'csv'], description: 'Generate compliance reports' },
    { id: 'Compare', label: 'Compare', shortLabel: 'Compare', icon: <BarChart3 className="w-4 h-4" />, group: 'Visualization', keywords: ['compare', 'benchmark', 'versus'], description: 'Compare facilities' },
    { id: 'Connectography', label: 'Connectography', shortLabel: 'Connect', icon: <Globe className="w-4 h-4" />, group: 'Visualization', keywords: ['connect', 'flow', 'global', 'network'], description: 'Global connection mapping' },
    { id: 'Explorer', label: 'Explorer', shortLabel: 'Explore', icon: <Search className="w-4 h-4" />, group: 'Operations', keywords: ['explore', 'browse', 'search', 'filter'], description: 'Facility explorer' },
    { id: 'Compliance Flow', label: 'Compliance Flow', shortLabel: 'Flow', icon: <Network className="w-4 h-4" />, group: 'Visualization', keywords: ['flow', 'process', 'compliance', 'workflow'], description: 'Compliance workflow view' },
    { id: 'Assurance Monitor', label: 'Assurance Monitor', shortLabel: 'Monitor', icon: <Activity className="w-4 h-4" />, group: 'Operations', keywords: ['monitor', 'continuous', 'live', 'realtime'], description: 'Continuous assurance monitoring' },
    { id: 'Sanctions Monitor', label: 'OFAC Sanctions Monitor', shortLabel: 'Sanctions', icon: <Shield className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['ofac', 'sanctions', 'sdn', 'treasury', 'compliance', 'whistleblower', 'russia', 'iran'], description: 'Network hygiene enforcement - OFAC/FinCEN sanctions monitoring' },
    { id: 'AI Infrastructure', label: 'AI Infrastructure', shortLabel: 'AI Infra', icon: <Cpu className="w-4 h-4" />, group: 'Analysis & Intelligence', keywords: ['epoch', 'ai', 'frontier', 'data center', 'power', 'gigawatt', 'openai', 'meta', 'google', 'xai', 'anthropic', 'satellite'], description: 'Epoch AI frontier data center intelligence' },
  ], []);

  // State for smart search modal
  const [showSmartSearch, setShowSmartSearch] = useState(false);

  const tabNavigationRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Enable keyboard scrolling on main content area
  useKeyboardScroll(mainContentRef, {
    step: 60,
    pageStep: 'viewport',
    smooth: true,
    enableHomeEnd: true,
  });
  
  // Get autocomplete options
  const operatorOptions = useOperatorAutocomplete(facilities);
  const stateOptions = useStateAutocomplete(facilities);
  const cityOptions = useCityAutocomplete(facilities);
  const aiSearchSuggestions = useNLPSearchSuggestions({ context: 'ai', facilities });
  const globalSearchOptions = useNLPSearchSuggestions({ context: 'global', facilities });

  // --------------------------------------------------------------------------
  // Loading Animation State - Smooth progress with easing
  // --------------------------------------------------------------------------
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!loading) return;

    // Smooth progress animation with requestAnimationFrame
    const startTime = Date.now();
    const duration = 2000; // 2 seconds total
    
    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const percentage = eased * 100;
      
      setLoadingProgress(percentage);
      
      // Update steps smoothly based on progress
      if (percentage < 30) {
        setLoadingStep(0);
      } else if (percentage < 65) {
        setLoadingStep(1);
      } else {
        setLoadingStep(2);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };
    
    const rafId = requestAnimationFrame(animateProgress);
    return () => cancelAnimationFrame(rafId);
  }, [loading]);

  // Keyboard navigation for tabs - direct update for smooth transitions
  useTabNavigation(tabs, activeTab, (tab) => {
    handleTabChange(tab as CommandCenterTab);
  }, true);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => setShowGlobalSearch(true),
      description: 'Open global search'
    },
    {
      key: 'Escape',
      action: () => {
        setIsFullscreenTab(false);
        setShowGlobalSearch(false);
        if (showGlobalSearch) {
          setShowGlobalSearch(false);
        }
      },
      description: 'Close modals/search'
    },
    {
      key: 'r',
      ctrl: true,
      action: () => _onActionRequested?.({ type: 'generateReport' }),
      description: 'Generate report'
    },
    {
      key: 's',
      ctrl: true,
      action: () => _onActionRequested?.({ type: 'openSourceManager' }),
      description: 'Open Source Manager'
    },
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Ask AI"]') as HTMLInputElement;
        searchInput?.focus();
      },
      description: 'Focus search'
    },
    {
      key: 'f',
      action: () => setIsFullscreenTab(v => !v),
      description: 'Toggle fullscreen for active tab'
    }
  ], true);

  if (loading) {
    return <LoadingScreen facilities={facilities} />;
  }

  const tabPanel = (
    <div 
      ref={mainContentRef}
      key={activeTab}
      id="main-content"
      className="flex-1 bg-gray-950 p-1.5 scroll-smooth main-scroll"
      role="tabpanel"
      aria-labelledby={`tab-${activeTab.toLowerCase().replace(/\s+/g, '-')}`}
      tabIndex={0}
      style={{ 
        scrollBehavior: 'smooth', 
        WebkitOverflowScrolling: 'touch', 
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'contain',
        scrollPadding: '0',
        height: '100%',
        maxHeight: '100%',
        outline: 'none',
        position: 'relative'
      }}
      onDoubleClick={() => setIsFullscreenTab(true)}
      onWheel={(e) => {
        // Ensure wheel events work on the main content
        e.stopPropagation();
      }}
    >
      {/* Simple conditional rendering with transitions handled by React */}
      {activeTab === 'Guides' && (
        <ErrorBoundary>
          <GuidesTab />
        </ErrorBoundary>
      )}

      {activeTab === 'Overview' && stats && (
        <ErrorBoundary>
          <OverviewTab facilities={deferredFacilities} stats={stats} />
        </ErrorBoundary>
      )}

      {activeTab === 'Geography' && (
        <ErrorBoundary>
          <GeographyTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Problems' && (
        <ErrorBoundary>
          <ProblemsTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Early Warning' && (
        <ErrorBoundary>
          <EarlyWarningTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Explorer' && (
        <ErrorBoundary>
          <div className="h-full">
            <FacilityExplorer facilities={filteredFacilities} />
          </div>
        </ErrorBoundary>
      )}

      {/* Command Center Tabs */}
      {activeTab === 'Geographic Intel' && (
        <ErrorBoundary>
          <GeographicIntelTab facilities={deferredFacilities} viewMode={viewMode} />
        </ErrorBoundary>
      )}

      {activeTab === 'Subsidy Tracking' && stats && (
        <ErrorBoundary>
          <SubsidyTrackingTab facilities={deferredFacilities} stats={stats} />
        </ErrorBoundary>
      )}

      {activeTab === 'Worker Safety' && (
        <ErrorBoundary>
          <WorkerSafetyTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Facilities' && (
        <ErrorBoundary>
          <FacilitiesTabWithExpandability facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'OSINT Tools' && (
        <ErrorBoundary>
          <OSINTToolsTab />
        </ErrorBoundary>
      )}

      {activeTab === 'Pattern Analysis' && (
        <ErrorBoundary>
          <PatternLabTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {/* NEW: Pattern Lab (dedicated tab with Web Worker + explainability) */}
      {activeTab === 'Pattern Lab' && (
        <ErrorBoundary>
          <PatternLabTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {/* NEW: Predictive Intelligence Hub */}
      {activeTab === 'Predictive Intel' && (
        <ErrorBoundary>
          <PredictiveIntelligenceTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Network Security' && (
        <ErrorBoundary>
          <NetworkSecurityTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Infrastructure' && (
        <ErrorBoundary>
          <InfrastructureTabWithExpandability facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Reports' && (
        <ErrorBoundary>
          <ReportsTabWithExpandability facilities={deferredFacilities} stats={stats} />
        </ErrorBoundary>
      )}

      {activeTab === 'Compare' && (
        <ErrorBoundary>
          <ComplianceComparisonTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Connectography' && (
        <ErrorBoundary>
          <ConnectographyTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Intelligence' && (
        <ErrorBoundary>
          <IntelligenceHubTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {/* NEW: Pattern Intelligence - Enhanced Surveillance & Pattern Recognition */}
      {activeTab === 'Pattern Intelligence' && (
        <ErrorBoundary>
          <div className="p-6 overflow-y-auto h-full bg-slate-50">
            <PatternIntelligenceDashboard />
          </div>
        </ErrorBoundary>
      )}

      {/* NEW: Deep Intelligence - Full API Data Extraction */}
      {activeTab === 'Deep Intelligence' && (
        <ErrorBoundary>
          <div className="p-6 overflow-y-auto h-full bg-slate-50">
            <DeepIntelligence />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'Predictive Subsidy' && (
        <ErrorBoundary>
          <div className="p-6 overflow-y-auto h-full bg-slate-50">
            <PredictiveSubsidyDashboard />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'Subsidy Accountability' && (
        <ErrorBoundary>
          <div className="h-full overflow-hidden">
            <SubsidyAccountabilityPanel />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'Organizer Hub' && (
        <ErrorBoundary>
          <div className="h-full overflow-hidden">
            <OrganizerCommandCenter />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'Surveillance Infrastructure' && (
        <ErrorBoundary>
          <div className="h-full overflow-auto">
            <SurveillanceInfrastructureTab />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'Sanctuary City' && (
        <ErrorBoundary>
          <div className="h-full overflow-hidden">
            <SanctuaryCityTab />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'Regulatory Toolkit' && (
        <ErrorBoundary>
          <div className="p-6 overflow-y-auto h-full bg-slate-50">
            <RegulatoryToolkit />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'Follow Your Data' && (
        <ErrorBoundary>
          <FollowYourDataTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Network Map' && (
        <ErrorBoundary>
          <NetworkVisualizationTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Compliance Flow' && (
        <ErrorBoundary>
          <ComplianceFlowTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {activeTab === 'Assurance Monitor' && (
        <ErrorBoundary>
          <AssuranceMonitorTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {/* NEW: OFAC Sanctions Monitor - Network Hygiene Enforcement */}
      {activeTab === 'Sanctions Monitor' && (
        <ErrorBoundary>
          <SanctionsMonitorTab facilities={deferredFacilities} />
        </ErrorBoundary>
      )}

      {/* NEW: AI Infrastructure Intelligence - Epoch AI */}
      {activeTab === 'AI Infrastructure' && (
        <ErrorBoundary>
          <EpochAIIntelligenceTab />
        </ErrorBoundary>
      )}

      {/* POC tab disabled - requires @kuzu/kuzu-wasm
      {activeTab === 'POC' && (
        <ErrorBoundary>
          <GraphDatabasePOC />
        </ErrorBoundary>
      )}
      */}
    </div>
  );

  return (
    <>

      {/* MISSION CONTROL LAYOUT - NEW */}
      {useMissionControl ? (
        <MissionControlLayout
          facilities={filteredFacilities}
          stats={stats || {
            totalFacilities: 0,
            compliant: 0,
            nonCompliant: 0,
            atRisk: 0,
            unknown: 0,
            totalSubsidyGap: 0,
            totalIssues: 0,
            avgDaysSinceAudit: 0,
            overdueAudits: 0,
            medianSubsidyGap: 0,
            maxSubsidyGap: 0,
          }}
          onRefresh={() => window.location.reload()}
        />
      ) : (
        /* ORIGINAL TAB-BASED LAYOUT - Now with Antifragile Navigation */
    <NavProvider tabs={NAV_TABS} activeTab={activeTab} onTabChange={(tab) => handleTabChange(tab as CommandCenterTab)}>
    <div className="h-screen bg-gray-950 text-white flex" style={{ overflow: 'hidden', position: 'relative', height: '100vh' }}>
      {/* Smart Search Modal (⌘K) */}
      <SmartSearchNav isOpen={showSmartSearch} onClose={() => setShowSmartSearch(false)} />
      
      {/* Navigation Sidebar */}
      <NavigationSidebar
        activeTab={activeTab}
        onTabChange={(tab) => handleTabChange(tab)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        alertCounts={{
          problems: stats?.nonCompliant ?? 0,
          earlyWarning: stats?.atRisk ?? 0,
          intelligence: 0, // TODO: Calculate actual count
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
      {/* Skip Links for Accessibility */}
      <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:z-[100] focus-within:top-4 focus-within:left-4">
        <a
          href="#main-content"
          className="bg-blue-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Skip to main content
        </a>
        <a
          href="#tab-navigation"
          className="bg-blue-600 text-white px-4 py-2 rounded-md ml-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Skip to tabs
        </a>
      </div>

      {/* Mission Banner */}
      <div className="bg-gradient-to-r from-red-900 via-orange-900 to-amber-900 px-4 py-1.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold">⚡ Big Tech Accountability</span>
            <span className="text-orange-300 text-xs">Labor organizer intelligence • "Docks to Data Centers"</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-red-400 font-bold">${((stats?.subsidyGap ?? 0) / 1e9).toFixed(2)}B Gap</span>
            <span className="text-yellow-400">{(stats?.nonCompliant ?? 0).toLocaleString()} Violations</span>
          </div>
        </div>
      </div>
      
      {/* Top Bar - Ultra-compact Header with Live Metrics */}
      <header className="bg-gray-900 border-b border-gray-800 z-50 relative" style={{ position: 'relative', zIndex: 50 }}>
        {/* Breadcrumbs */}
        <div className="px-1.5 py-0.5 border-b border-gray-800/50 bg-gray-900/50">
          <Breadcrumbs currentTab={activeTab} onNavigate={(tab) => handleTabChange(tab)} />
        </div>

        {/* Single-row compact header */}
        <div className="px-1.5 py-0.5 flex items-center gap-1.5">
          {/* Logo & Title - Compact */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-base font-bold text-amber-500">DCIM</h1>
            <div className="h-4 w-px bg-gray-700" />
            {/* Layout Mode Indicator */}
            <span className="text-[9px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
              {useMissionControl ? '🎯 MISSION CONTROL' : '📑 TAB MODE'}
            </span>
          </div>
          
          {/* Live Metrics Strip - Dense inline stats */}
          <div className="flex items-center gap-1 text-[10px] flex-shrink-0">
            <span className="px-1.5 py-0.5 bg-gray-800 rounded flex items-center gap-1">
              <Building2 className="w-3 h-3 text-cyan-400" />
              <span className="text-white font-bold">{(stats?.totalFacilities ?? 0).toLocaleString()}</span>
            </span>
            <span className="px-1.5 py-0.5 bg-green-900/50 rounded text-green-400 font-medium">
              ✓{(stats?.compliant ?? 0).toLocaleString()}
            </span>
            <span className="px-1.5 py-0.5 bg-red-900/50 rounded text-red-400 font-medium">
              ✗{(stats?.nonCompliant ?? 0).toLocaleString()}
            </span>
            <span className="px-1.5 py-0.5 bg-yellow-900/50 rounded text-yellow-400 font-medium">
              ⚠{(stats?.atRisk ?? 0).toLocaleString()}
            </span>
            <span className="px-1.5 py-0.5 bg-red-900/30 rounded text-red-300 font-bold">
              ${((stats?.totalSubsidyGap ?? 0) / 1_000_000_000).toFixed(2)}B
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">{filteredFacilities?.length ?? 0} filtered</span>
            <span className="text-gray-500">|</span>
            {/* Density Toggle - Safe, uses context only */}
            <ErrorBoundary fallback={<span className="text-gray-500 text-[10px]">Density</span>}>
              <DensityToggleInline className="flex-shrink-0" />
            </ErrorBoundary>
            <span className="text-gray-500">|</span>
            {/* Enhanced Capabilities Status Bar - Wrapped for safety */}
            <ErrorBoundary fallback={<span className="text-cyan-400 text-[10px] px-1.5 py-0.5 bg-cyan-900/30 rounded">AI</span>}>
              <HeaderCapabilitiesBar onOpenSettings={() => setShowSettings(true)} />
            </ErrorBoundary>
            </div>

          {/* AI Search - Compact */}
          <div className="flex-1 min-w-[150px] max-w-[300px]">
              <AutocompleteInput
                value={aiSearchQuery}
                onChange={setAiSearchQuery}
                options={aiSearchSuggestions}
                placeholder="Ask AI..."
                disabled={isAiProcessing}
              icon={<Search className="w-3 h-3" />}
                loading={isAiProcessing}
                minChars={2}
                maxSuggestions={6}
                id="ai-search-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && aiSearchQuery.trim()) {
                    handleAiSearch(aiSearchQuery.trim());
                  }
                }}
              />
            </div>

          {/* Action Buttons - Icon-only with tooltips */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Layout Toggle - NEW */}
            <Tooltip content={useMissionControl ? "Switch to Tab Layout" : "Switch to Mission Control"}>
              <button
                onClick={() => setUseMissionControl(!useMissionControl)}
                className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                  useMissionControl 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                <Layout className="w-4 h-4" />
                <span className="text-[10px] font-bold">
                  {useMissionControl ? 'MISSION CTRL' : 'SWITCH LAYOUT'}
                </span>
              </button>
            </Tooltip>
            
            <Tooltip content="Export Report (⌘E)">
                <button
                onClick={async () => {
                  if (!stats || isExporting) return;
                  setIsExporting(true);
                  try {
                    await downloadComplianceReport(filteredFacilities, stats, undefined, {
                      title: 'DCIM Compliance Report',
                      maxFacilities: 100,
                    });
                  } catch (error) {
                    console.error('Export failed:', error);
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting || !stats}
                className={`p-1.5 rounded text-white ${isExporting ? 'bg-amber-800 cursor-wait' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                </button>
              </Tooltip>
            <Tooltip content="AI Assistant">
              <button onClick={() => onOpenChat?.()} className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white">
                <Sparkles className="w-4 h-4" />
                </button>
              </Tooltip>
            <div className="h-4 w-px bg-gray-700" />
            <Tooltip content="Fullscreen (F)">
              <button onClick={() => setIsFullscreenTab(true)} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
                <Maximize2 className="w-4 h-4 text-cyan-400" />
                </button>
              </Tooltip>
            <Tooltip content="Table of Contents (⌘⇧?)">
              <button 
                onClick={() => setShowTableOfContents(true)} 
                className="p-1.5 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded border border-cyan-500 transition-all duration-300 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <List className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold text-white">Nav</span>
                </button>
              </Tooltip>
            <Tooltip content="Connectography (G)">
              <button onClick={() => setConnectographyOpen(true)} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
                <Network className="w-4 h-4 text-cyan-400" />
                </button>
              </Tooltip>
            <Tooltip content="Sources (⌘S)">
              <button onClick={() => _onActionRequested?.({ type: 'openSourceManager' })} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
                <FileText className="w-4 h-4 text-cyan-400" />
                </button>
              </Tooltip>
            <Tooltip content="Provenance Mode">
              <button onClick={() => setProvenanceMode(!provenanceMode)} className={`p-1.5 rounded border ${provenanceMode ? 'bg-cyan-600 border-cyan-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}>
                <BookOpenCheck className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Settings (⌘,)">
              <button onClick={() => setShowSettings(true)} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            </Tooltip>
            <Tooltip content="Search (⌘K)">
              <button onClick={() => setShowGlobalSearch(true)} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 flex items-center gap-1 relative">
                <Search className="w-4 h-4" />
                <kbd className="text-[9px] px-1 bg-gray-700 rounded">⌘K</kbd>
                {/* Badge showing indexed count */}
                <div className="absolute -top-1 -right-1 px-1 py-0.5 bg-cyan-500 text-white text-[8px] font-bold rounded-full min-w-[16px] text-center">
                  {facilities.length > 999 ? `${Math.floor(facilities.length / 1000)}k` : facilities.length}
                </div>
              </button>
            </Tooltip>
            <div className="h-4 w-px bg-gray-700" />
            <div className="relative">
              <PWAStatus compact />
            </div>
              <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
          </div>
        </div>
        
        {/* Active Filters - Ultra-compact inline */}
        {(filters.state || filters.operator || filters.complianceStatus || filters.minGap > 0 || filters.country || filters.city) && (
          <div className="px-3 py-1 flex items-center gap-1 bg-gray-950/50 border-t border-gray-800/50 text-[10px]">
            <span className="text-gray-500">Filters:</span>
            {filters.state && (
              <span className="bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                {filters.state}
                <button onClick={() => setFilters({...filters, state: ''})} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                </span>
            )}
            {filters.operator && (
              <span className="bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                {filters.operator}
                <button onClick={() => setFilters({...filters, operator: ''})} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                </span>
            )}
            {filters.complianceStatus && (
              <span className="bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                {filters.complianceStatus}
                <button onClick={() => setFilters({...filters, complianceStatus: '' as any})} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                </span>
            )}
            {filters.minGap > 0 && (
              <span className="bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                ≥{formatCurrency(filters.minGap)}
                <button onClick={() => setFilters({...filters, minGap: 0})} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                </span>
            )}
            {filters.country && (
              <span className="bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                {filters.country}
                <button onClick={() => setFilters({...filters, country: ''})} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                </span>
            )}
            {filters.city && (
              <span className="bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                {filters.city}
                <button onClick={() => setFilters({...filters, city: ''})} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                </span>
            )}
            <button onClick={handleClearFilters} className="text-gray-500 hover:text-red-400 px-1">×Clear</button>
          </div>
        )}
        
        {/* Breadcrumbs - Ultra-compact */}
        <nav className="px-3 py-1 flex items-center gap-1 text-[10px] text-gray-500 border-t border-gray-800/50" aria-label="Breadcrumb">
          <button onClick={() => handleTabChange('Overview')} className="flex items-center gap-0.5 hover:text-white" aria-label="Go to home">
            <Home className="w-3 h-3" />
              <span>Home</span>
            </button>
          <ChevronRight className="w-2.5 h-2.5" />
          <button onClick={() => handleTabChange('Overview')} className="hover:text-white">DCIM Command Center</button>
          <ChevronRight className="w-2.5 h-2.5" />
          <span className="px-1.5 py-0.5 text-amber-400 font-semibold text-[10px] bg-amber-900/20 border border-amber-800/50 rounded flex items-center">{activeTab}</span>
          </nav>
      </header>

      {/* Global Search Command Palette - FlexSearch powered */}
      <CommandPalette
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        facilities={facilities}
        onSelectFacility={(facility) => {
          recordSearch(facility.name, 'global');
          setFilters({ ...filters, state: facility.state, operator: facility.operator });
        }}
        onFilterByOperator={(operator) => {
          setFilters({ ...filters, operator });
        }}
        onFilterByState={(state) => {
          setFilters({ ...filters, state });
        }}
        onNavigateToTab={(tab) => {
          startTransition(() => {
            handleTabChange(tab as CommandCenterTab);
          });
        }}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Tab Navigation - Ultra-compact single row */}
      <nav 
        id="tab-navigation"
        ref={tabNavigationRef}
        className={`bg-gray-950 border-b border-gray-800 relative z-50 w-full overflow-x-auto ${isPending ? 'opacity-70' : 'opacity-100'} transition-opacity duration-150`}
        role="tablist"
        aria-label="Main navigation tabs"
              style={{ 
                display: 'flex',
          padding: '2px 8px',
          gap: '2px',
          scrollbarWidth: 'none'
              } as React.CSSProperties}
      >
        {tabs && tabs.length > 0 ? tabs.map((tab, index) => {
          const isActive = activeTab === tab;
          const tabNumber = index + 1;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.toLowerCase().replace(/\s+/g, '-')}`}
              id={`tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleTabChange(tab)}
              className={`px-2 py-1 text-[11px] font-medium transition-all whitespace-nowrap rounded relative group flex items-center ${
                isActive
                  ? 'text-amber-400 bg-amber-900/30 border border-amber-700/50'
                  : 'text-gray-500 hover:text-white hover:bg-gray-800/50 border border-transparent'
              }`}
              title={`${tab} (${tabNumber <= 9 ? tabNumber : '→'})`}
            >
                {tab}
              {tabNumber <= 9 && <sup className="text-[8px] ml-0.5 opacity-40">{tabNumber}</sup>}
            </button>
          );
        }) : (
          <div className="px-4 py-2 text-gray-400 text-xs">No tabs</div>
        )}
      </nav>

      <div className="flex-1 flex" style={{ minHeight: 0, height: '100%' }}>
        {/* Sidebar - Ultra-compact */}
        <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col text-[11px]" style={{ height: '100%', overflowY: 'auto' }}>
          {/* Layer Controls */}
          <LayerTogglesPanel layers={layers} onChange={handleLayersChange} />

          {/* Filters - Compact */}
          <div className="p-1 border-b border-gray-800 flex-1 overflow-y-auto">
            <div className="flex items-center gap-1 mb-2">
              <Filter className="w-3 h-3 text-gray-400" />
              <h2 className="text-[11px] font-semibold">Filters</h2>
            </div>
            <div className="space-y-1.5">
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">State</label>
                <AutocompleteInput
                  value={filters.state}
                  onChange={(value) => setFilters({ ...filters, state: value })}
                  options={stateOptions}
                  placeholder="Filter by state"
                  className="text-[11px]"
                  minChars={1}
                  maxSuggestions={10}
                  id="filter-state"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Operator</label>
                <AutocompleteInput
                  value={filters.operator}
                  onChange={(value) => setFilters({ ...filters, operator: value })}
                  options={operatorOptions}
                  placeholder="Filter by operator"
                  className="text-[11px]"
                  minChars={1}
                  maxSuggestions={10}
                  id="filter-operator"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">City</label>
                <AutocompleteInput
                  value={filters.city}
                  onChange={(value) => setFilters({ ...filters, city: value })}
                  options={cityOptions}
                  placeholder="City"
                  className="text-[11px]"
                  minChars={2}
                  maxSuggestions={10}
                  id="filter-city"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Min Gap ($)</label>
                <input
                  type="number"
                  value={filters.minGap || ''}
                  onChange={(e) => setFilters({ ...filters, minGap: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  placeholder="0"
                />
              </div>
              <button onClick={handleClearFilters} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-[10px] font-medium hover:bg-gray-700">
                Clear
              </button>
            </div>
          </div>

          {/* Ultra-Dense Quick Stats */}
          {stats && (
            <div className="p-1.5 border-t border-gray-800 bg-gray-950 space-y-1">
              {/* Compliance - 2x2 grid, extra tight */}
              <div className="grid grid-cols-4 gap-0.5 text-center">
                <div className="bg-green-500/10 rounded px-1 py-0.5">
                  <div className="text-[8px] text-green-400/60">✓</div>
                  <div className="text-[10px] font-bold text-green-400">{stats.compliant.toLocaleString()}</div>
                </div>
                <div className="bg-red-500/10 rounded px-1 py-0.5">
                  <div className="text-[8px] text-red-400/60">✗</div>
                  <div className="text-[10px] font-bold text-red-400">{stats.nonCompliant.toLocaleString()}</div>
                </div>
                <div className="bg-yellow-500/10 rounded px-1 py-0.5">
                  <div className="text-[8px] text-yellow-400/60">⚠</div>
                  <div className="text-[10px] font-bold text-yellow-400">{stats.atRisk.toLocaleString()}</div>
                </div>
                <div className="bg-gray-500/10 rounded px-1 py-0.5">
                  <div className="text-[8px] text-gray-400/60">?</div>
                  <div className="text-[10px] font-bold text-gray-400">{stats.unknown.toLocaleString()}</div>
                </div>
              </div>

              {/* Gap + Bar */}
              <div className="bg-amber-500/10 rounded p-1">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-amber-400/70">Gap</span>
                  <span className="font-bold text-amber-400">{formatCurrency(stats.totalSubsidyGap)}</span>
                </div>
                <div className="h-0.5 bg-gray-800 rounded mt-0.5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${Math.min(100, (stats.totalSubsidyGap / 5000000000) * 100)}%` }} />
                </div>
              </div>

              {/* Issues + Audits inline */}
              <div className="flex gap-1 text-[9px]">
                <div className="flex-1 bg-red-500/10 rounded px-1 py-0.5 flex justify-between">
                  <span className="text-red-400/70">Issues</span>
                  <span className="font-bold text-red-400">{stats.totalIssues.toLocaleString()}</span>
                </div>
                <div className="flex-1 bg-purple-500/10 rounded px-1 py-0.5 flex justify-between">
                  <span className="text-purple-400/70">Overdue</span>
                  <span className="font-bold text-purple-400">{stats.overdueAudits.toLocaleString()}</span>
                </div>
              </div>

              {/* Filtered bar */}
              <div className="bg-cyan-500/10 rounded p-1">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-cyan-400/70">Showing</span>
                  <span className="text-cyan-400">{filteredFacilities.length}/{stats.totalFacilities.toLocaleString()}</span>
                </div>
                <div className="h-0.5 bg-gray-800 rounded mt-0.5 overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${(filteredFacilities.length / stats.totalFacilities) * 100}%` }} />
                </div>
              </div>

              {/* Extra metrics row */}
              <div className="grid grid-cols-3 gap-0.5 text-[8px] text-center">
                <div className="bg-blue-500/10 rounded px-1 py-0.5">
                  <div className="text-blue-400/70">Avg Days</div>
                  <div className="font-bold text-blue-400">{Math.round(stats.avgDaysSinceAudit)}</div>
                </div>
                <div className="bg-emerald-500/10 rounded px-1 py-0.5">
                  <div className="text-emerald-400/70">Median Gap</div>
                  <div className="font-bold text-emerald-400">${(stats.medianSubsidyGap / 1000000).toFixed(1)}M</div>
                </div>
                <div className="bg-rose-500/10 rounded px-1 py-0.5">
                  <div className="text-rose-400/70">Max Gap</div>
                  <div className="font-bold text-rose-400">${(stats.maxSubsidyGap / 1000000).toFixed(1)}M</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col" style={{ minHeight: 0 }}>

          {/* Tab Content with Error Boundaries (Rule 5: Conditional rendering, NOT visibility toggling) */}
          {!isFullscreenTab && tabPanel}
          <FullscreenOverlay
            isOpen={isFullscreenTab}
            title={`${activeTab} (Fullscreen)`}
            onClose={() => setIsFullscreenTab(false)}
          >
            {tabPanel}
          </FullscreenOverlay>

          <FullscreenOverlay
            isOpen={connectographyOpen}
            title="Connectography"
            onClose={() => setConnectographyOpen(false)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-sm text-gray-400">
                  Global Connectography view of the currently filtered facility set ({filteredFacilities.length.toLocaleString()}).
                </div>
                <ViewModeToggle value={connectographyMode} onChange={setConnectographyMode} />
              </div>
              <ErrorBoundary>
                <div className="w-full h-[calc(100vh-160px)] border border-gray-800 rounded-lg overflow-hidden">
                  <PhotorealisticGisView mode={connectographyMode} facilities={filteredFacilities} width={1400} height={820} />
                </div>
              </ErrorBoundary>
            </div>
          </FullscreenOverlay>
        </main>
      </div> {/* End main content area */}

      </div> {/* End flex container with sidebar */}

      {/* Table of Contents Modal */}
      <TableOfContents
        isOpen={showTableOfContents}
        onClose={() => setShowTableOfContents(false)}
        onNavigate={(tab) => handleTabChange(tab as CommandCenterTab)}
        currentTab={activeTab}
      />

      {/* Help & Documentation Modal */}
      {showFAQ && <NestedFAQ onClose={() => setShowFAQ(false)} />}

      {/* Evidence Integrity Panel (Floating) */}
      <div className="fixed bottom-4 right-4 w-96 max-h-[600px] z-40 shadow-2xl">
        <EvidencePanel />
      </div>
      
      {/* Floating Help Button */}
      <button
        onClick={() => setShowFAQ(true)}
        className="fixed bottom-4 left-4 p-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all hover:scale-110 z-40"
        title="Help & Documentation"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Quick Access Bar (Floating Favorites) - Antifragile Navigation */}
      <ErrorBoundary fallback={null}>
        <QuickAccessNav />
      </ErrorBoundary>

    </div>
    </NavProvider>
      )}
    </>
  );
}

