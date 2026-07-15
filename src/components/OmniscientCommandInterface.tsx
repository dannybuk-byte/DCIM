import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, 
  AlertCircle,
  TrendingDown,
  Clock,
  MapPin,
  Network,
  Calendar,
  Command,
  Maximize2,
  Grid3x3,
  GitBranch,
  Target,
  Zap,
  X,
  Layers,
  Sparkles,
  HelpCircle,
  Building,
  DollarSign,
  Users,
  BookOpen,
  BookOpenCheck,
  RadioTower,
  ShieldAlert
} from 'lucide-react';
import { db } from '../db/database';
import { seedDatabase } from '../db/seedData';
import { Facility } from '../types';
import { useDbInit } from '../hooks/useDbInit';
import { useRaceSafeQuery } from '../hooks/useRaceSafeQuery';
import { deriveConsoleStatus, statsArePresentable, type ConsoleStatus } from '../runtime/consoleStatus';
import { DbInitStatusBanner } from './DbInitStatusBanner';
import { ErrorBoundary } from './ErrorBoundary'; // Error boundary for resilience
import SecurityOverview from './SecurityOverview'; // NEW: Security Posture Overview
import SecurityInsights from './SecurityInsights'; // Package 1: Security & Verification
import NetworkDiscovery from './NetworkDiscovery'; // Package 2: Network Discovery
import ExpansionTracker from './ExpansionTracker'; // Package 3: Subdomain Expansion Tracking
import GranularDrilldown from './GranularDrilldown'; // Infinite drill-down system
import { DeepDiveView } from './DeepDiveView';
import { AISettingsModal } from './AISettingsModal';
import { NaturalLanguageSearch } from './NaturalLanguageSearch';
import { BGPMonitorPanel } from './BGPMonitorPanel';
import { DisclosureMismatchView } from './DisclosureMismatchView';
import { ReviewerMode } from './ReviewerMode';
import { HelpModal } from './HelpModal';
import AnimatedCard from './AnimatedCard'; // Animated cards with hover effects
import AnimatedProgressBar from './AnimatedProgressBar'; // Progress bars with animations
import ParticleBackground from './ParticleBackground'; // Particle effect backgrounds
import { useAnimatedCounter } from '../utils/animations'; // Animation utilities

type ViewMode =
  | 'omniscient'
  | 'intelligence'
  | 'hud'
  | 'timeline'
  | 'network'
  | 'bgp'
  | 'disclosure_mismatch'
  | 'map'
  | 'kanban'
  | 'deepdive';

/** Top bar mode tabs (Methodology button is inserted after Dashboard in the JSX). */
const TOP_BAR_MODE_DEFS: ReadonlyArray<{
  mode: ViewMode;
  icon: typeof Target;
  label: string;
  tooltip: string;
}> = [
  { mode: 'omniscient', icon: Target, label: 'Dashboard', tooltip: 'See all facilities at a glance' },
  // BGP early so it stays visible (tab row scrolls; was easy to miss between NET and MAP).
  { mode: 'bgp', icon: RadioTower, label: 'BGP', tooltip: 'Live global BGP (RIPE RIS) — routing announcements' },
  {
    mode: 'disclosure_mismatch',
    icon: ShieldAlert,
    label: 'AI Labor',
    tooltip: 'Watchdog: AI workforce claims vs WARN / legal disclosure (signals API)',
  },
  { mode: 'intelligence', icon: Network, label: '📊 Tracker', tooltip: 'Track companies and their infrastructure' },
  { mode: 'deepdive', icon: Layers, label: 'Full Report', tooltip: 'Explore individual facilities in depth' },
  { mode: 'hud', icon: Zap, label: 'Violations', tooltip: 'Focus on critical violations' },
  { mode: 'timeline', icon: Calendar, label: 'TIME', tooltip: 'Project timeline and milestones' },
  { mode: 'network', icon: GitBranch, label: 'NET', tooltip: 'Network connections between facilities' },
  { mode: 'map', icon: MapPin, label: 'MAP', tooltip: 'Geographic map view by state' },
  { mode: 'kanban', icon: Grid3x3, label: 'BOARD', tooltip: 'Kanban board by compliance status' },
];

export const OmniscientCommandInterface: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('omniscient');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Smart Panels state
  const [topBarExpanded, setTopBarExpanded] = useState(false);
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  /** True while user is scrolling / wheeling — reduces heavy CSS + particle rAF load */
  const [isScrollActive, setIsScrollActive] = useState(false);
  const [reviewerModeOpen, setReviewerModeOpen] = useState(false);
  const [reviewerFacility, setReviewerFacility] = useState<Facility | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout>();
  const scrollQuietTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // R-F7: honest default console. Init lifecycle drives whether statistics may
  // be shown as LIVE. The facilities read runs ONLY after the database reports
  // ready; init failure/pending is surfaced explicitly (loading/error/
  // unavailable) and never rendered as zero-as-current.
  const { state: dbInit, retry: retryDbInit } = useDbInit();
  const dbReady = dbInit.kind === 'ready';

  const { surface: facilitiesSurface, refresh: refreshFacilities } = useRaceSafeQuery<
    string,
    Facility[]
  >({
    key: 'omniscient-facilities',
    keyOf: () => 'omniscient-facilities',
    isEmpty: (rows) => rows.length === 0,
    enabled: dbReady,
    query: async () => {
      // seedDatabase is a strict no-op outside explicit demo mode (R-F1).
      await seedDatabase();
      return db.facilities.toArray();
    },
  });

  // Prop consumers still receive an array; Empty vs Error/Unavailable lives on
  // the surface kind. NEVER treat a failure as a successful empty settle.
  const facilities = facilitiesSurface.data ?? [];

  // R-F7 console status (pure derivation): init state takes precedence, then
  // the facilities read. 'ready' is the ONLY kind allowed to present numeric
  // statistics as current/LIVE.
  const consoleStatus: ConsoleStatus = deriveConsoleStatus(dbInit.kind, facilitiesSurface.kind);

  const statsLive = statsArePresentable(consoleStatus);
  const statusDiagnostic =
    dbInit.diagnostic ?? facilitiesSurface.error?.message ?? facilitiesSurface.diagnostic;
  // Count/currency renderers: real figures ONLY when live, else a neutral dash
  // (never a zero that could read as a measured "current" value).
  const showCount = (n: number): string => (statsLive ? n.toLocaleString() : '—');
  const showMoneyB = (n: number): string => (statsLive ? `$${(n / 1e9).toFixed(2)}B` : '—');

  const LIVE_STATUS_META: Record<
    typeof consoleStatus,
    { label: string; dotClass: string; textClass: string }
  > = {
    ready: { label: 'LIVE', dotClass: 'bg-[#00d2d3] animate-pulse', textClass: 'text-[#00d2d3]' },
    loading: { label: 'LOADING', dotClass: 'bg-slate-400 animate-pulse', textClass: 'text-slate-300' },
    empty: { label: 'NO DATA', dotClass: 'bg-slate-500', textClass: 'text-slate-300' },
    error: { label: 'ERROR', dotClass: 'bg-red-500', textClass: 'text-red-400' },
    unavailable: { label: 'UNAVAILABLE', dotClass: 'bg-orange-500', textClass: 'text-orange-400' },
  };
  const liveStatus = LIVE_STATUS_META[consoleStatus];

  // Deep-link: example.com/#bgp opens live RIPE RIS BGP monitor (after deploy with current bundle).
  useEffect(() => {
    const applyHash = (): void => {
      const h = window.location.hash.toLowerCase();
      if (h === '#bgp') {
        setViewMode('bgp');
      }
      if (h === '#signals' || h === '#disclosure-mismatch') {
        setViewMode('disclosure_mismatch');
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      // F key to toggle fullscreen
      if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen(prev => !prev);
      }
      // ? key to open help
      if (e.key === '?' && !showHelp && !showAISettings) {
        setShowHelp(true);
      }
      // Number keys for view switching
      if (e.key === '1') setViewMode('omniscient');
      if (e.key === '2') setViewMode('deepdive');
      if (e.key === '3') setViewMode('hud');
      if (e.key === '4') setViewMode('map');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showHelp, showAISettings]);

  // Smart Panels: Mouse position tracking
  useEffect(() => {
    if (isFullscreen) return; // Disable smart panels in fullscreen

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Top bar expands when mouse near top
      setTopBarExpanded(clientY < 60);

      // Left panel shows when mouse near left edge
      setLeftPanelVisible(clientX < 50);

      // Right panel shows when mouse near right edge
      setRightPanelVisible(clientX > windowWidth - 50);

      // Reset idle timer
      setIsIdle(false);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 10000); // 10 seconds idle
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [isFullscreen]);

  useEffect(() => {
    const markScroll = () => {
      setIsScrollActive(true);
      if (scrollQuietTimerRef.current !== undefined) {
        clearTimeout(scrollQuietTimerRef.current);
      }
      scrollQuietTimerRef.current = setTimeout(() => {
        setIsScrollActive(false);
      }, 220);
    };

    const rootEl = document.getElementById('root');
    rootEl?.addEventListener('scroll', markScroll, { passive: true });
    window.addEventListener('scroll', markScroll, { passive: true });
    document.addEventListener('wheel', markScroll, { capture: true, passive: true });
    document.addEventListener('touchmove', markScroll, { capture: true, passive: true });

    return () => {
      rootEl?.removeEventListener('scroll', markScroll);
      window.removeEventListener('scroll', markScroll);
      document.removeEventListener('wheel', markScroll, { capture: true });
      document.removeEventListener('touchmove', markScroll, { capture: true });
      if (scrollQuietTimerRef.current !== undefined) {
        clearTimeout(scrollQuietTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dcim-is-scrolling', isScrollActive);
    return () => {
      document.documentElement.classList.remove('dcim-is-scrolling');
    };
  }, [isScrollActive]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = facilities.length;
    const compliant = facilities.filter(f => f.complianceStatus === 'Compliant').length;
    const nonCompliant = facilities.filter(f => f.complianceStatus === 'Non-Compliant').length;
    const atRisk = facilities.filter(f => f.complianceStatus === 'At Risk').length;
    const totalGap = facilities.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
    
    return { total, compliant, nonCompliant, atRisk, totalGap };
  }, [facilities]);

  // Get recent alerts
  const recentAlerts = useMemo(() => {
    return facilities
      .filter(f => f.complianceStatus === 'Non-Compliant' || f.complianceStatus === 'At Risk')
      .slice(0, 10);
  }, [facilities]);

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-black text-white"
      data-console-status={consoleStatus}
    >
      {/* BACKGROUND: Animated Grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0 omni-bg-grid-animated"
          style={{
            backgroundImage:
              'linear-gradient(#00d2d3 1px, transparent 1px), linear-gradient(90deg, #00d2d3 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* TOP: Compact Bar (Smart Panel) */}
      {!isFullscreen && (
        <div 
          className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 ${
            topBarExpanded ? 'h-32' : 'h-12'
          } ${isIdle ? 'opacity-20' : 'opacity-100'}`}
          style={{
            background: topBarExpanded 
              ? 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 100%)'
              : 'linear-gradient(180deg, rgba(0,0,0,0.90) 0%, transparent 100%)'
          }}
        >
          {/* Compact Bar (Always Visible) — center tabs use horizontal scroll so nothing clips under overflow-hidden */}
          <div className="flex h-12 items-center gap-2 border-b border-[#00d2d3]/20 px-4 sm:px-6">
            <div className="flex shrink-0 items-center gap-3">
              {/* Branding */}
              <div className="text-xs font-bold tracking-wider text-[#00d2d3] sm:text-sm">
                DATA CENTER ACCOUNTABILITY
              </div>

              {/* R-F7: status indicator — reflects DbInit/read state, not always "LIVE" */}
              <div
                className={`flex items-center gap-1.5 text-[10px] ${liveStatus.textClass}`}
                data-console-live-status={consoleStatus}
                title={statusDiagnostic ?? undefined}
              >
                <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${liveStatus.dotClass}`} />
                {liveStatus.label}
              </div>
              <div
                className="shrink-0 rounded border border-emerald-500/70 bg-emerald-950/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300"
                title="Temporary build marker — remove after deploy verification"
              >
                Build: Reviewer Mode Enabled
              </div>
            </div>

            {/* Mode tabs + Methodology: single row + overflow-x-auto (wrapping was clipped by h-12 + parent overflow-hidden) */}
            <div className="flex min-w-0 flex-1 justify-center">
              <div className="inline-flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:thin]">
                {TOP_BAR_MODE_DEFS.slice(0, 1).map(({ mode, icon: Icon, label, tooltip }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    title={tooltip}
                    className={`shrink-0 px-2.5 py-1 rounded-sm text-[10px] font-bold transition-all ${
                      viewMode === mode 
                        ? 'bg-[#00d2d3] text-black shadow-[0_0_15px_#00d2d3]' 
                        : 'bg-white/10 text-[#00d2d3] hover:bg-white/20'
                    }`}
                  >
                    <Icon size={12} className="mr-1 inline align-text-bottom" />
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#methodology';
                  }}
                  title="Methodology, data sources, and limitations"
                  className="shrink-0 px-2.5 py-1 rounded-sm text-[10px] font-bold transition-all bg-amber-500/25 text-amber-100 border border-amber-500/60 hover:bg-amber-500/35"
                >
                  <BookOpen size={12} className="mr-1 inline align-text-bottom" />
                  Methodology
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewerFacility(selectedFacility);
                    setReviewerModeOpen(true);
                  }}
                  title="Reviewer Mode — facility brief (temporary nav hook)"
                  className="shrink-0 px-2.5 py-1 rounded-sm text-[10px] font-bold transition-all bg-violet-600/30 text-violet-100 border border-violet-500/70 hover:bg-violet-600/45"
                >
                  <BookOpenCheck size={12} className="mr-1 inline align-text-bottom" />
                  REVIEWER MODE
                </button>
                {TOP_BAR_MODE_DEFS.slice(1).map(({ mode, icon: Icon, label, tooltip }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    title={tooltip}
                    className={`shrink-0 px-2.5 py-1 rounded-sm text-[10px] font-bold transition-all ${
                      viewMode === mode 
                        ? 'bg-[#00d2d3] text-black shadow-[0_0_15px_#00d2d3]' 
                        : 'bg-white/10 text-[#00d2d3] hover:bg-white/20'
                    }`}
                  >
                    <Icon size={12} className="mr-1 inline align-text-bottom" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mini Stats (Always Visible) */}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-[10px] sm:gap-4">
              <div className="text-center" title="Total data center facilities tracked">
                <div className="text-[#00d2d3] font-bold">{showCount(stats.total)}</div>
                <div className="text-gray-500">TRACKED</div>
              </div>
              <div className="text-center" title="Facilities meeting job creation promises">
                <div className="text-[#2ed573] font-bold">{showCount(stats.compliant)}</div>
                <div className="text-gray-500">✓</div>
              </div>
              <div className="text-center" title="Facilities failing to meet job promises">
                <div className="text-[#ff4757] font-bold">{showCount(stats.nonCompliant)}</div>
                <div className="text-gray-500">✗</div>
              </div>
              
              {/* Alert Badge */}
              <button
                onClick={() => setShowAlertPopup(!showAlertPopup)}
                className="relative flex items-center gap-1 px-2 py-1 bg-[#ff4757]/20 border border-[#ff4757] rounded hover:bg-[#ff4757]/30 transition-colors"
              >
                <AlertCircle size={14} className="text-[#ff4757]" />
                <span className="text-[#ff4757] font-bold">{statsLive ? stats.nonCompliant : '—'}</span>
              </button>

              {/* AI Settings Button */}
              <button
                onClick={() => setShowAISettings(true)}
                className="flex items-center gap-1.5 px-2 py-1 bg-[#00d2d3]/20 border border-[#00d2d3]/50 rounded hover:bg-[#00d2d3]/30 transition-colors"
                title="AI Settings - Enable natural language search, summaries, and more"
              >
                <Sparkles size={14} className="text-[#00d2d3]" />
                <span className="text-[10px] text-[#00d2d3] font-semibold">AI</span>
              </button>

              {/* Help Button - SUPER Prominent with Animation */}
              <button
                onClick={() => setShowHelp(true)}
                className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#ffa502] via-[#ff4757] to-[#ffa502] border-2 border-[#ffa502] rounded-xl hover:shadow-2xl hover:shadow-[#ffa502]/70 transition-all transform hover:scale-110 animate-pulse-glow relative overflow-hidden"
                title="Help & Navigation Guide (Press ?)"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-fast" />
                <HelpCircle size={24} className="text-white group-hover:rotate-12 transition-transform relative z-10" />
                <span className="text-base text-white font-black tracking-wide relative z-10">HELP</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#ffa502]/50 to-[#ff4757]/50 blur-xl group-hover:blur-2xl transition-all" />
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Fullscreen (F)"
              >
                <Maximize2 size={16} className="text-[#00d2d3]" />
              </button>
            </div>
          </div>

          {/* Expanded Controls (On Hover) */}
          {topBarExpanded && (
            <div className="h-20 px-6 py-3 border-b border-[#00d2d3]/20 animate-slideDown">
              <div className="flex items-center justify-between h-full">
                {/* Mode Buttons */}
                <div className="flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:thin]">
                  {TOP_BAR_MODE_DEFS.slice(0, 1).map(({ mode, icon: Icon, label, tooltip }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      title={tooltip}
                      className={`shrink-0 px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${
                        viewMode === mode 
                          ? 'bg-[#00d2d3] text-black shadow-[0_0_20px_#00d2d3]' 
                          : 'bg-white/10 text-[#00d2d3] hover:bg-white/20'
                      }`}
                    >
                      <Icon size={14} className="mr-1 inline" />
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = '#methodology';
                    }}
                    title="Methodology, data sources, and limitations"
                    className="shrink-0 px-3 py-1.5 rounded-sm text-xs font-bold transition-all bg-amber-500/25 text-amber-100 border border-amber-500/60 hover:bg-amber-500/35"
                  >
                    <BookOpen size={14} className="mr-1 inline align-text-bottom" />
                    Methodology
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewerFacility(selectedFacility);
                      setReviewerModeOpen(true);
                    }}
                    title="Reviewer Mode — facility brief (temporary nav hook)"
                    className="shrink-0 px-3 py-1.5 rounded-sm text-xs font-bold transition-all bg-violet-600/30 text-violet-100 border border-violet-500/70 hover:bg-violet-600/45"
                  >
                    <BookOpenCheck size={14} className="mr-1 inline align-text-bottom" />
                    REVIEWER MODE
                  </button>
                  {TOP_BAR_MODE_DEFS.slice(1).map(({ mode, icon: Icon, label, tooltip }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      title={tooltip}
                      className={`shrink-0 px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${
                        viewMode === mode 
                          ? 'bg-[#00d2d3] text-black shadow-[0_0_20px_#00d2d3]' 
                          : 'bg-white/10 text-[#00d2d3] hover:bg-white/20'
                      }`}
                    >
                      <Icon size={14} className="mr-1 inline" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Detailed Stats */}
                <div className="flex items-center gap-6 text-xs">
                  <div className="text-center">
                    <div className="text-[#00d2d3] font-bold text-lg">{showCount(stats.total)}</div>
                    <div className="text-gray-500 text-[10px]">TRACKED</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#2ed573] font-bold text-lg">{showCount(stats.compliant)}</div>
                    <div className="text-gray-500 text-[10px]">COMPLIANT</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#ffa502] font-bold text-lg">{showCount(stats.atRisk)}</div>
                    <div className="text-gray-500 text-[10px]">AT RISK</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#ff4757] font-bold text-lg">{showCount(stats.nonCompliant)}</div>
                    <div className="text-gray-500 text-[10px]">CRITICAL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#00d2d3] font-bold text-lg">{showMoneyB(stats.totalGap)}</div>
                    <div className="text-gray-500 text-[10px]">TOTAL GAP</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* R-F7: honest status chrome — until the DB is ready (and a facilities
          read has settled), statistics are withheld and the state is named
          explicitly. A DB failure never renders as LIVE zeros. */}
      {consoleStatus !== 'ready' && (
        <div
          className="pointer-events-none absolute left-1/2 top-16 z-40 w-[min(92%,42rem)] -translate-x-1/2"
          data-testid="console-status-banner"
          role="status"
        >
          <div className="pointer-events-auto">
            {consoleStatus === 'empty' ? (
              <div
                className="rounded border border-slate-600 bg-slate-900/90 px-3 py-2 text-sm text-slate-200"
                data-console-empty="true"
              >
                <div className="font-semibold">No facility data loaded</div>
                <p className="mt-1 text-xs text-slate-300/90">
                  The local database is ready but contains no facilities. Statistics are withheld
                  until data is imported — no figures are shown as current.
                </p>
              </div>
            ) : (
              <DbInitStatusBanner
                state={
                  dbInit.kind === 'ready'
                    ? {
                        // DB opened fine, but the facilities read failed — surface as
                        // unavailable with the read diagnostic (never a silent zero).
                        ...dbInit,
                        kind: 'unavailable',
                        diagnostic:
                          statusDiagnostic ?? 'Facility data could not be loaded from the local database.',
                      }
                    : dbInit
                }
                onRetry={() => {
                  retryDbInit();
                  if (dbReady) refreshFacilities();
                }}
                onReload={() => window.location.reload()}
              />
            )}
          </div>
        </div>
      )}

      {/* LEFT: Timeline Panel (Slide-in) */}
      {!isFullscreen && (
        <div 
          className={`absolute left-0 top-12 bottom-0 w-64 bg-black/95 border-r border-[#00d2d3]/20 z-40 transition-transform duration-300 ${
            leftPanelVisible ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#00d2d3] mb-4 pb-3 border-b border-[#00d2d3]/20">
              <Clock size={16} />
              TIMELINE
            </div>
            <div className="flex-1 overflow-y-auto space-y-6">
              {[2024, 2025, 2026].map(year => (
                <div key={year} className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full bg-[#00d2d3]" />
                    <div className="text-lg font-bold text-[#00d2d3]">{year}</div>
                  </div>
                  <div className="ml-6 border-l border-[#00d2d3]/20 pl-4 space-y-2">
                    {facilities.slice(0, 3).map(f => (
                      <div key={f.id} className="text-xs">
                        <div className="text-white font-semibold truncate">{f.name}</div>
                        <div className="text-gray-400 text-[10px]">{f.state}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-center text-gray-500 mt-4 pt-3 border-t border-[#00d2d3]/20">
              Hover edge to show/hide
            </div>
          </div>
        </div>
      )}

      {/* RIGHT: Alerts Panel (Slide-in) */}
      {!isFullscreen && (
        <div 
          className={`absolute right-0 top-12 bottom-0 w-80 bg-black/95 border-l border-[#00d2d3]/20 z-40 transition-transform duration-300 ${
            rightPanelVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-[#00d2d3]/20">
              <div className="flex items-center gap-2 text-sm font-bold text-[#00d2d3]">
                <Activity size={16} />
                LIVE ALERTS
                <span className="ml-auto text-xs text-gray-400">{recentAlerts.length} critical</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {recentAlerts.map((facility, i) => (
                <div
                  key={facility.id}
                  className="p-3 bg-white/5 border border-[#ff4757]/30 rounded hover:bg-white/10 transition-all cursor-pointer"
                  style={{
                    animation: `slideInRight 0.3s ease-out ${i * 0.05}s backwards`
                  }}
                  onClick={() => setSelectedFacility(facility)}
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-[#ff4757] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{facility.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{facility.city}, {facility.state}</div>
                      <div className="text-[10px] text-[#ff4757] mt-1 flex items-center gap-1">
                        <TrendingDown size={10} />
                        ${(facility.subsidyGap / 1e6).toFixed(1)}M gap
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {facility.complianceStatus === 'Non-Compliant' ? 'CRITICAL' : 'WARN'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-center text-gray-500 p-3 border-t border-[#00d2d3]/20">
              Hover right edge to show/hide
            </div>
          </div>
        </div>
      )}

      {/* CENTER: Main Visualization Area */}
      <div
        className={`omni-main-stage absolute min-h-0 overflow-y-auto transition-all duration-300 ${
          isFullscreen 
            ? 'inset-0' 
            : topBarExpanded
            ? 'top-32 left-0 right-0 bottom-0'
            : 'top-12 left-0 right-0 bottom-0'
        }`}
      >
        {/* Edge Hover Hints (First Time) */}
        {!isFullscreen && !topBarExpanded && !leftPanelVisible && !rightPanelVisible && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Top hint */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#00d2d3]/20 border border-[#00d2d3]/50 rounded-b px-3 py-1 text-xs text-[#00d2d3] animate-pulse">
              ↑ Hover top for controls
            </div>
            {/* Left hint */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#00d2d3]/20 border border-[#00d2d3]/50 rounded-r px-2 py-3 text-xs text-[#00d2d3] animate-pulse writing-mode-vertical">
              ← Timeline
            </div>
            {/* Right hint */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#00d2d3]/20 border border-[#00d2d3]/50 rounded-l px-2 py-3 text-xs text-[#00d2d3] animate-pulse writing-mode-vertical">
              Alerts →
            </div>
          </div>
        )}
        {/* Fullscreen Toggle Button */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="absolute top-4 right-4 z-50 p-2 bg-black/80 border border-[#00d2d3] rounded hover:bg-[#00d2d3]/20 transition-all group"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          <Maximize2 
            size={20} 
            className={`text-[#00d2d3] transition-transform ${isFullscreen ? 'rotate-180' : ''}`}
          />
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-black border border-[#00d2d3] px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen View'}
          </span>
        </button>

        {/* Fullscreen Mode Indicator */}
        {isFullscreen && (
          <div className="absolute top-4 left-4 z-50 bg-black/80 border border-[#00d2d3] rounded px-3 py-1.5 text-xs text-[#00d2d3] font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00d2d3] animate-pulse" />
            FULLSCREEN MODE
            <span className="text-gray-400 ml-2">Press Esc or F to exit</span>
          </div>
        )}

        {/* View Mode Label in Fullscreen */}
        {isFullscreen && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 border border-[#00d2d3]/50 rounded px-4 py-1.5 text-sm text-white font-bold">
            {viewMode.toUpperCase()} VIEW
          </div>
        )}

        {viewMode === 'omniscient' && (
          <OmniscientView
            facilities={facilities}
            onSelect={setSelectedFacility}
            isFullscreen={isFullscreen}
            suspendHeavyMotion={isScrollActive}
            onNavigateToMode={setViewMode}
          />
        )}
        {viewMode === 'intelligence' && (
          <div className={`${isFullscreen ? 'p-4' : 'p-6'} space-y-6`}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#00d2d3] mb-2">📊 Company Tracker</h2>
              <p className="text-sm text-gray-400">
                Track companies and verify their infrastructure expansions. All data from public records and government databases.
              </p>
            </div>
            
            {/* Security Overview */}
            <SecurityOverview facilities={facilities} />
            
            {/* Facility Grid with Intelligence Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.slice(0, 12).map((facility) => (
                <div
                  key={facility.id}
                  onClick={() => setSelectedFacility(facility)}
                  className="bg-white/5 border border-[#00d2d3]/20 rounded-lg p-4 hover:bg-white/10 hover:border-[#00d2d3] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white truncate">{facility.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{facility.city}, {facility.state}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      facility.complianceStatus === 'Compliant' ? 'bg-[#2ed573]' :
                      facility.complianceStatus === 'Non-Compliant' ? 'bg-[#ff4757]' :
                      'bg-[#ffa502]'
                    }`} />
                  </div>
                  
                  {/* Quick Intelligence Preview */}
                  <div className="space-y-2">
                    <SecurityInsights facility={facility} className="opacity-75 hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-[#00d2d3]/10">
                    <button className="text-xs text-[#00d2d3] hover:text-white font-semibold">
                      View Full Intelligence →
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {facilities.length > 12 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">
                  Showing 12 of {facilities.length} facilities. Click any card to see full intelligence.
                </p>
              </div>
            )}
          </div>
        )}
        {viewMode === 'deepdive' && <DeepDiveView facilities={facilities} isFullscreen={isFullscreen} />}
        {viewMode === 'hud' && <HUDView facilities={facilities} onSelect={setSelectedFacility} isFullscreen={isFullscreen} />}
        {viewMode === 'timeline' && <TimelineView facilities={facilities} onSelect={setSelectedFacility} isFullscreen={isFullscreen} />}
        {viewMode === 'network' && <NetworkView facilities={facilities} onSelect={setSelectedFacility} isFullscreen={isFullscreen} />}
        {viewMode === 'bgp' && (
          <div
            className={`min-h-0 h-full flex flex-col overflow-hidden bg-[#0a0f14] ${
              isFullscreen ? 'p-4' : 'p-4 md:p-6'
            }`}
          >
            <div className="shrink-0 border-b border-gray-800 pb-3 mb-3">
              <p className="text-xs text-gray-300 leading-relaxed">
                Live BGP via RIPE RIS Live (<code className="text-[10px] text-cyan-300/90">wss://ris-live.ripe.net/v1/ws/</code>
                ). Global routing updates stream here; first announcements typically appear within seconds after connect.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <BGPMonitorPanel autoConnect />
            </div>
          </div>
        )}
        {viewMode === 'disclosure_mismatch' && (
          <DisclosureMismatchView isFullscreen={isFullscreen} />
        )}
        {viewMode === 'map' && <MapView facilities={facilities} onSelect={setSelectedFacility} isFullscreen={isFullscreen} />}
        {viewMode === 'kanban' && <KanbanView facilities={facilities} onSelect={setSelectedFacility} isFullscreen={isFullscreen} />}
      </div>

      {/* Alert Popup (Quick View) */}
      {showAlertPopup && !isFullscreen && (
        <div className="absolute top-14 right-6 w-80 bg-black border border-[#ff4757] rounded-lg shadow-2xl z-[60] animate-slideDown">
          <div className="p-3 border-b border-[#ff4757]/30 flex items-center justify-between">
            <div className="text-sm font-bold text-[#ff4757]">Critical Alerts</div>
            <button onClick={() => setShowAlertPopup(false)} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-3 space-y-2">
            {recentAlerts.slice(0, 5).map(facility => (
              <div
                key={facility.id}
                onClick={() => {
                  setSelectedFacility(facility);
                  setShowAlertPopup(false);
                }}
                className="p-2 bg-white/5 border border-[#ff4757]/20 rounded hover:bg-white/10 cursor-pointer"
              >
                <div className="text-xs font-bold text-white truncate">{facility.name}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{facility.city}, {facility.state}</div>
                <div className="text-[10px] text-[#ff4757] mt-1">${(facility.subsidyGap / 1e6).toFixed(1)}M gap</div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-[#ff4757]/30 text-center">
            <button
              onClick={() => {
                setShowAlertPopup(false);
                setRightPanelVisible(true);
              }}
              className="text-xs text-[#00d2d3] hover:text-white"
            >
              View All Alerts →
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY: Selected Facility Detail */}
      {selectedFacility && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center overflow-y-auto p-4" onClick={() => setSelectedFacility(null)}>
          <div className="bg-black border-2 border-[#00d2d3] rounded-lg p-8 max-w-5xl w-full shadow-[0_0_50px_#00d2d3] my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#00d2d3]">{selectedFacility.name}</h2>
                <p className="text-sm text-gray-400 mt-1">{selectedFacility.city}, {selectedFacility.state}</p>
              </div>
              <button onClick={() => setSelectedFacility(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            
            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 p-4 rounded border border-[#00d2d3]/20">
                <div className="text-xs text-gray-400 mb-1">Operator</div>
                <div className="text-lg font-bold">{selectedFacility.operator}</div>
              </div>
              <div className="bg-white/5 p-4 rounded border border-[#00d2d3]/20">
                <div className="text-xs text-gray-400 mb-1">Status</div>
                <div className={`text-lg font-bold ${
                  selectedFacility.complianceStatus === 'Compliant' ? 'text-[#2ed573]' :
                  selectedFacility.complianceStatus === 'Non-Compliant' ? 'text-[#ff4757]' :
                  'text-[#ffa502]'
                }`}>{selectedFacility.complianceStatus}</div>
              </div>
              <div className="bg-white/5 p-4 rounded border border-[#00d2d3]/20">
                <div className="text-xs text-gray-400 mb-1">Subsidy Gap</div>
                <div className="text-lg font-bold text-[#ff4757]">
                  ${(selectedFacility.subsidyGap / 1e6).toFixed(2)}M
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded border border-[#00d2d3]/20">
                <div className="text-xs text-gray-400 mb-1">Type</div>
                <div className="text-lg font-bold">{selectedFacility.type}</div>
              </div>
            </div>

            {/* NEW: Intelligence Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <SecurityInsights facility={selectedFacility} />
                <NetworkDiscovery facility={selectedFacility} />
              </div>
              
              {/* Right Column */}
              <div className="space-y-4">
                <ExpansionTracker facility={selectedFacility} />
                <GranularDrilldown facility={selectedFacility} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Settings Modal */}
      <AISettingsModal 
        isOpen={showAISettings} 
        onClose={() => setShowAISettings(false)} 
      />

      <ReviewerMode
        open={reviewerModeOpen}
        onClose={() => setReviewerModeOpen(false)}
        facility={reviewerFacility}
        facilities={facilities}
        onSelectFacility={setReviewerFacility}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

// OMNISCIENT VIEW: Everything at once
const OmniscientView: React.FC<{
  facilities: Facility[];
  onSelect: (f: Facility) => void;
  isFullscreen?: boolean;
  suspendHeavyMotion?: boolean;
  onNavigateToMode?: (mode: ViewMode) => void;
}> = ({
  facilities,
  onSelect,
  isFullscreen = false,
  suspendHeavyMotion = false,
  onNavigateToMode,
}) => {
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>(facilities);
  const [showSearch, setShowSearch] = useState(true);
  
  const limit = isFullscreen ? 500 : 100; // 5x more in fullscreen
  const columns = isFullscreen ? 6 : 4; // More columns
  
  // Use filtered facilities if available, otherwise use all
  const displayFacilities = filteredFacilities.length > 0 ? filteredFacilities : facilities;
  
  // Calculate aggregate stats
  const stats = useMemo(() => {
    const total = displayFacilities.length;
    const compliant = displayFacilities.filter(f => f.complianceStatus === 'Compliant').length;
    const nonCompliant = displayFacilities.filter(f => f.complianceStatus === 'Non-Compliant').length;
    const totalGap = displayFacilities.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
    const totalJobs = displayFacilities.reduce((sum, f) => sum + (f.jobsPromised || 0), 0);
    const createdJobs = displayFacilities.reduce((sum, f) => sum + (f.jobsCreated || 0), 0);
    
    return { total, compliant, nonCompliant, totalGap, totalJobs, createdJobs };
  }, [displayFacilities]);
  
  return (
    <div className={`min-h-0 h-full ${isFullscreen ? 'p-4' : 'p-8'} overflow-x-hidden overflow-y-visible`}>
      {/* Natural Language Search */}
      {!isFullscreen && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={20} className="text-[#ffa502]" />
              Natural Language Search
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {onNavigateToMode ? (
                <button
                  type="button"
                  onClick={() => onNavigateToMode('bgp')}
                  title="Live BGP (RIPE RIS) — global routing updates"
                  className="shrink-0 rounded border border-[#00d2d3]/50 bg-[#00d2d3]/10 px-2.5 py-1 text-[10px] font-bold text-[#00d2d3] hover:bg-[#00d2d3]/20"
                >
                  BGP
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (!showSearch) setFilteredFacilities(facilities);
                }}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {showSearch ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          
          {showSearch && (
            <NaturalLanguageSearch
              onResults={setFilteredFacilities}
              onFacilityClick={onSelect}
            />
          )}
        </div>
      )}
      
      {/* Security Posture Overview - NEW */}
      {!isFullscreen && (
        <div className="mb-6">
          <SecurityOverview facilities={displayFacilities} />
        </div>
      )}
      
      {/* Animated Stats Cards */}
      {!isFullscreen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <AnimatedCard
            title="Total Facilities"
            value={stats.total}
            subtitle="Data centers tracked"
            icon={<Building size={24} />}
            color="cyan"
            animated={true}
            glow={true}
          />
          <AnimatedCard
            title="Compliant"
            value={stats.compliant}
            subtitle="Meeting promises"
            icon={<Sparkles size={24} />}
            color="green"
            trend="up"
            trendValue={`${((stats.compliant / stats.total) * 100).toFixed(1)}%`}
            animated={true}
            glow={true}
          />
          <AnimatedCard
            title="Violations"
            value={stats.nonCompliant}
            subtitle="Breaking promises"
            icon={<AlertCircle size={24} />}
            color="red"
            trend="down"
            trendValue={`${((stats.nonCompliant / stats.total) * 100).toFixed(1)}%`}
            animated={true}
            pulse={stats.nonCompliant > 0}
            glow={true}
          />
          <AnimatedCard
            title="Subsidy Gap"
            value={`$${(stats.totalGap / 1e9).toFixed(2)}B`}
            subtitle="Money not recovered"
            icon={<DollarSign size={24} />}
            color="yellow"
            animated={false}
            glow={true}
          />
          <AnimatedCard
            title="Jobs Progress"
            value={`${((stats.createdJobs / stats.totalJobs) * 100).toFixed(1)}%`}
            subtitle={`${stats.createdJobs.toLocaleString()} / ${stats.totalJobs.toLocaleString()}`}
            icon={<Users size={24} />}
            color={stats.createdJobs / stats.totalJobs >= 0.8 ? 'green' : 'red'}
            animated={false}
            glow={true}
          />
        </div>
      )}
      
      {/* Facility Grid */}
      <div className={`grid gap-${isFullscreen ? '2' : '4'}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {displayFacilities.slice(0, limit).map((facility, index) => (
          <div
            key={facility.id}
            onClick={() => onSelect(facility)}
            className={`
              omni-facility-card relative overflow-hidden
              bg-gradient-to-br from-white/5 to-white/10 
              border border-[#00d2d3]/20 rounded-lg ${isFullscreen ? 'p-2' : 'p-4'} 
              hover:from-white/10 hover:to-white/15 
              hover:border-[#00d2d3]/60
              hover:scale-105 hover:-translate-y-1
              hover:shadow-2xl hover:shadow-[#00d2d3]/20
              transition-all duration-300 ease-out
              cursor-pointer group
              animate-slide-up
            `}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {/* Particle background on hover */}
            <div className="omni-facility-overlay absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <ParticleBackground particleCount={10} opacity={0.2} paused={suspendHeavyMotion} />
            </div>

            {/* Shimmer effect on hover */}
            <div
              className="omni-facility-overlay omni-card-shimmer absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(0,210,211,0.1), transparent)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />

            {/* Content */}
            <div className="relative z-10">
              {/* Status indicator with pulse */}
              <div className={`
                w-2 h-2 rounded-full mb-${isFullscreen ? '1' : '2'} 
                ${
                  facility.complianceStatus === 'Compliant' ? 'bg-[#2ed573] shadow-[0_0_10px_#2ed573]' :
                  facility.complianceStatus === 'Non-Compliant' ? 'bg-[#ff4757] shadow-[0_0_10px_#ff4757]' :
                  'bg-[#ffa502] shadow-[0_0_10px_#ffa502]'
                } 
                group-hover:animate-pulse
              `} />
              
              {/* Facility name with gradient */}
              <div className={`
                ${isFullscreen ? 'text-xs' : 'text-sm'} 
                font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00d2d3]
                truncate mb-1
                group-hover:from-[#00d2d3] group-hover:to-white
                transition-all duration-300
              `}>
                {facility.name}
              </div>
              
              {/* Location */}
              <div className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-1 truncate`}>
                📍 {facility.city}, {facility.state}
              </div>
              
              {/* Operator */}
              {isFullscreen && facility.operator && (
                <div className="text-[9px] text-gray-500 truncate mt-0.5">
                  🏢 {facility.operator}
                </div>
              )}
              
              {/* Subsidy gap with animated counter */}
              <div className={`
                ${isFullscreen ? 'text-[10px]' : 'text-xs'} 
                text-[#ff4757] font-bold mt-${isFullscreen ? '1' : '2'}
                group-hover:scale-110 transition-transform duration-300
              `}>
                💰 ${(facility.subsidyGap / 1e6).toFixed(1)}M gap
              </div>
              
              {/* Jobs progress bar */}
              {isFullscreen && (facility.jobsPromised || 0) > 0 && (
                <div className="mt-1">
                  <AnimatedProgressBar
                    value={((facility.jobsCreated || 0) / (facility.jobsPromised || 1)) * 100}
                    height="sm"
                    color={facility.complianceStatus === 'Compliant' ? 'green' : 'red'}
                    showPercentage={false}
                    animated={true}
                    glow={true}
                  />
                  <div className="text-[9px] text-gray-400 mt-0.5">
                    {facility.jobsCreated || 0}/{facility.jobsPromised} jobs
                  </div>
                </div>
              )}
            </div>

            {/* Bottom glow on hover */}
            <div className={`
              absolute bottom-0 left-0 right-0 h-0.5
              bg-gradient-to-r from-transparent via-[#00d2d3] to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-300
            `} />
          </div>
        ))}
      </div>
      {isFullscreen && displayFacilities.length > limit && (
        <div className="text-center text-xs text-gray-400 mt-4">
          Showing first {limit} of {displayFacilities.length} facilities
        </div>
      )}
    </div>
  );
};

// HUD VIEW: Radial cockpit style
const HUDView: React.FC<{ facilities: Facility[]; onSelect: (f: Facility) => void; isFullscreen?: boolean }> = ({ facilities, onSelect, isFullscreen = false }) => {
  const critical = facilities.filter(f => f.complianceStatus === 'Non-Compliant');
  const count = isFullscreen ? 24 : 12; // Double in fullscreen
  const radius = isFullscreen ? 250 : 150; // Larger orbit
  
  return (
    <div className="h-full flex items-center justify-center relative">
      <div className="relative" style={{ width: radius * 2 + 200, height: radius * 2 + 200 }}>
        {/* Central crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-[#00d2d3] rounded-full animate-ping" />
          <div className="absolute w-2 h-2 bg-[#00d2d3] rounded-full" />
          {isFullscreen && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center">
              <div className="text-2xl font-bold text-[#ff4757]">{critical.length}</div>
              <div className="text-xs text-gray-400">CRITICAL TARGETS</div>
            </div>
          )}
        </div>
        
        {/* Radial facility indicators */}
        {critical.slice(0, count).map((facility, i) => {
          const angle = (i / count) * 2 * Math.PI;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const size = isFullscreen ? 24 : 20;
          
          return (
            <div
              key={facility.id}
              onClick={() => onSelect(facility)}
              className="absolute cursor-pointer group"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
              }}
            >
              <div className={`${isFullscreen ? 'w-24 h-24' : 'w-20 h-20'} bg-[#ff4757]/20 border border-[#ff4757] rounded-full flex items-center justify-center group-hover:bg-[#ff4757]/40 transition-all relative`}>
                <div className={`${isFullscreen ? 'text-[10px]' : 'text-[10px]'} text-center p-2`}>
                  <div className="font-bold text-[#ff4757]">{facility.state}</div>
                  <div className="text-white text-[8px] truncate">{facility.name.split(' ').slice(0, 2).join(' ')}</div>
                  {isFullscreen && (
                    <div className="text-[#ff4757] text-[8px] mt-1">${(facility.subsidyGap / 1e6).toFixed(0)}M</div>
                  )}
                </div>
                {/* Pulsing ring */}
                <div className="absolute inset-0 rounded-full border-2 border-[#ff4757] animate-ping opacity-30" />
              </div>
            </div>
          );
        })}

        {/* Connecting lines */}
        {isFullscreen && (
          <svg className="absolute inset-0 pointer-events-none">
            {critical.slice(0, count).map((_, i) => {
              if (i === 0) return null;
              const angle1 = ((i - 1) / count) * 2 * Math.PI;
              const angle2 = (i / count) * 2 * Math.PI;
              const x1 = Math.cos(angle1) * radius + radius + 100;
              const y1 = Math.sin(angle1) * radius + radius + 100;
              const x2 = Math.cos(angle2) * radius + radius + 100;
              const y2 = Math.sin(angle2) * radius + radius + 100;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#ff4757"
                  strokeWidth="0.5"
                  opacity="0.2"
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

// TIMELINE VIEW: River flow
const TimelineView: React.FC<{ facilities: Facility[]; onSelect: (f: Facility) => void; isFullscreen?: boolean }> = ({ facilities, onSelect, isFullscreen = false }) => {
  const years = ['2024', '2025', '2026'];
  const facilitiesPerYear = isFullscreen ? 30 : 10;
  
  return (
    <div className={`min-h-0 h-full overflow-x-hidden overflow-y-visible ${isFullscreen ? 'p-4' : 'p-8'}`}>
      <div className="space-y-6">
        {years.map(year => (
          <div key={year} className="relative">
            <div className={`${isFullscreen ? 'text-xl' : 'text-2xl'} font-bold text-[#00d2d3] mb-3 flex items-center gap-4`}>
              {year}
              <span className="text-xs text-gray-400 font-normal">
                {facilities.slice(0, facilitiesPerYear).length} facilities
              </span>
            </div>
            <div className={`grid ${isFullscreen ? 'grid-cols-6 gap-2' : 'flex gap-2'} overflow-x-auto pb-4`}>
              {facilities.slice(0, facilitiesPerYear).map(facility => (
                <div
                  key={facility.id}
                  onClick={() => onSelect(facility)}
                  className={`${isFullscreen ? '' : 'flex-shrink-0 w-48'} bg-white/5 border border-[#00d2d3]/20 rounded ${isFullscreen ? 'p-2' : 'p-3'} hover:bg-white/10 cursor-pointer`}
                >
                  <div className={`w-2 h-2 rounded-full mb-1 ${
                    facility.complianceStatus === 'Compliant' ? 'bg-[#2ed573]' :
                    facility.complianceStatus === 'Non-Compliant' ? 'bg-[#ff4757]' :
                    'bg-[#ffa502]'
                  }`} />
                  <div className={`${isFullscreen ? 'text-xs' : 'text-sm'} font-bold truncate text-white`}>{facility.name}</div>
                  <div className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-1 truncate`}>
                    {facility.city}, {facility.state}
                  </div>
                  {isFullscreen && (
                    <div className="text-[9px] text-[#ff4757] mt-1">${(facility.subsidyGap / 1e6).toFixed(1)}M</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// NETWORK VIEW: Force graph (operator-based clustering)
const NetworkView: React.FC<{ facilities: Facility[]; onSelect: (f: Facility) => void; isFullscreen?: boolean }> = ({ facilities, onSelect, isFullscreen = false }) => {
  // Group facilities by operator
  const operatorClusters = useMemo(() => {
    const clusters = new Map<string, Facility[]>();
    facilities.forEach(f => {
      const operator = f.operator || 'Unknown';
      if (!clusters.has(operator)) {
        clusters.set(operator, []);
      }
      clusters.get(operator)!.push(f);
    });
    return Array.from(clusters.entries())
      .map(([operator, facs]) => ({ operator, facilities: facs, count: facs.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, isFullscreen ? 40 : 20); // Double operators in fullscreen
  }, [facilities, isFullscreen]);

  return (
    <div className={`min-h-0 h-full overflow-x-hidden overflow-y-visible ${isFullscreen ? 'p-4' : 'p-8'}`}>
      <div className="flex flex-wrap gap-6 items-center justify-center">
        {operatorClusters.map(({ operator, facilities: clusterFacs, count }, i) => {
          const radius = Math.min(Math.sqrt(count) * (isFullscreen ? 12 : 15) + 20, isFullscreen ? 100 : 120);
          const critical = clusterFacs.filter(f => f.complianceStatus === 'Non-Compliant').length;
          const orbitalDots = isFullscreen ? Math.min(12, Math.floor(count / 5)) : Math.min(8, Math.floor(count / 10));
          
          return (
            <div key={operator} className="relative" style={{
              animation: `fadeIn 0.5s ease-out ${i * 0.05}s backwards`
            }}>
              {/* Cluster circle */}
              <div
                className="rounded-full border-2 flex items-center justify-center cursor-pointer group relative"
                style={{
                  width: radius * 2,
                  height: radius * 2,
                  borderColor: critical > 0 ? '#ff4757' : '#00d2d3',
                  background: critical > 0 
                    ? 'radial-gradient(circle, rgba(255,71,87,0.15) 0%, rgba(255,71,87,0.05) 50%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(0,210,211,0.15) 0%, rgba(0,210,211,0.05) 50%, transparent 100%)',
                  boxShadow: critical > 0 
                    ? '0 0 30px rgba(255,71,87,0.3)'
                    : '0 0 30px rgba(0,210,211,0.2)'
                }}
              >
                {/* Central label */}
                <div className="text-center p-2">
                  <div className={`${isFullscreen ? 'text-xs' : 'text-sm'} font-bold text-white truncate`} style={{ maxWidth: radius * 1.5 }}>
                    {operator}
                  </div>
                  <div className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-[#00d2d3] mt-1`}>{count} fac</div>
                  {critical > 0 && (
                    <div className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-[#ff4757] mt-0.5`}>{critical} crit</div>
                  )}
                  {isFullscreen && (
                    <div className="text-[9px] text-gray-400 mt-0.5">
                      ${(clusterFacs.reduce((sum, f) => sum + (f.subsidyGap || 0), 0) / 1e6).toFixed(0)}M
                    </div>
                  )}
                </div>

                {/* Hover popup with facilities */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-[#00d2d3] rounded p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64">
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {clusterFacs.slice(0, 10).map(f => (
                      <div key={f.id} className="text-xs text-white truncate">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          f.complianceStatus === 'Compliant' ? 'bg-[#2ed573]' :
                          f.complianceStatus === 'Non-Compliant' ? 'bg-[#ff4757]' :
                          'bg-[#ffa502]'
                        }`} />
                        {f.name}
                      </div>
                    ))}
                    {clusterFacs.length > 10 && (
                      <div className="text-xs text-gray-400 mt-1">
                        +{clusterFacs.length - 10} more...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Orbital dots for top facilities */}
              {clusterFacs.slice(0, orbitalDots).map((fac, j) => {
                const angle = (j / orbitalDots) * 2 * Math.PI;
                const orbitRadius = radius + (isFullscreen ? 15 : 20);
                const x = Math.cos(angle) * orbitRadius;
                const y = Math.sin(angle) * orbitRadius;
                const dotSize = isFullscreen ? 3 : 4;
                
                return (
                  <div
                    key={fac.id}
                    onClick={() => onSelect(fac)}
                    className="absolute rounded-full cursor-pointer hover:scale-150 transition-transform"
                    style={{
                      width: dotSize * 2,
                      height: dotSize * 2,
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      background: fac.complianceStatus === 'Compliant' ? '#2ed573' :
                                  fac.complianceStatus === 'Non-Compliant' ? '#ff4757' :
                                  '#ffa502',
                      boxShadow: `0 0 8px ${
                        fac.complianceStatus === 'Compliant' ? '#2ed573' :
                        fac.complianceStatus === 'Non-Compliant' ? '#ff4757' :
                        '#ffa502'
                      }`
                    }}
                    title={fac.name}
                  />
                );
              })}

              {/* Connection lines to nearby clusters */}
              {i > 0 && i < 10 && (
                <div
                  className="absolute h-px bg-gradient-to-r from-[#00d2d3]/20 to-transparent"
                  style={{
                    width: '100px',
                    left: '-100px',
                    top: '50%',
                    transformOrigin: 'right center',
                    transform: `rotate(${(i * 30) % 360}deg)`
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

// MAP VIEW: Geographic distribution
const MapView: React.FC<{ facilities: Facility[]; onSelect: (f: Facility) => void; isFullscreen?: boolean }> = ({ facilities, onSelect, isFullscreen = false }) => {
  // Group facilities by state
  const stateData = useMemo(() => {
    const states = new Map<string, { facilities: Facility[]; compliant: number; critical: number }>();
    facilities.forEach(f => {
      const state = f.state || 'Unknown';
      if (!states.has(state)) {
        states.set(state, { facilities: [], compliant: 0, critical: 0 });
      }
      const data = states.get(state)!;
      data.facilities.push(f);
      if (f.complianceStatus === 'Compliant') data.compliant++;
      if (f.complianceStatus === 'Non-Compliant') data.critical++;
    });
    return Array.from(states.entries())
      .map(([state, data]) => ({
        state,
        count: data.facilities.length,
        compliant: data.compliant,
        critical: data.critical,
        facilities: data.facilities
      }))
      .sort((a, b) => b.count - a.count);
  }, [facilities]);

  // US state positions (approximate for visualization)
  const statePositions: Record<string, { x: number; y: number }> = {
    'CA': { x: 10, y: 60 }, 'TX': { x: 45, y: 75 }, 'FL': { x: 80, y: 80 },
    'NY': { x: 85, y: 30 }, 'PA': { x: 82, y: 35 }, 'IL': { x: 60, y: 40 },
    'OH': { x: 72, y: 38 }, 'GA': { x: 75, y: 70 }, 'NC': { x: 78, y: 65 },
    'MI': { x: 70, y: 32 }, 'NJ': { x: 87, y: 35 }, 'VA': { x: 80, y: 60 },
    'WA': { x: 15, y: 20 }, 'AZ': { x: 25, y: 70 }, 'MA': { x: 90, y: 28 },
    'TN': { x: 68, y: 65 }, 'IN': { x: 68, y: 42 }, 'MO': { x: 58, y: 50 },
    'MD': { x: 82, y: 55 }, 'WI': { x: 62, y: 30 }, 'CO': { x: 35, y: 50 },
    'MN': { x: 55, y: 25 }, 'SC': { x: 77, y: 72 }, 'AL': { x: 70, y: 73 },
    'LA': { x: 58, y: 78 }, 'KY': { x: 70, y: 55 }, 'OR': { x: 12, y: 30 },
    'OK': { x: 50, y: 65 }, 'CT': { x: 88, y: 32 }, 'IA': { x: 56, y: 38 },
    'MS': { x: 63, y: 75 }, 'AR': { x: 58, y: 68 }, 'KS': { x: 48, y: 52 },
    'UT': { x: 28, y: 45 }, 'NV': { x: 18, y: 50 }, 'NM': { x: 35, y: 68 },
    'WV': { x: 76, y: 52 }, 'NE': { x: 48, y: 42 }, 'ID': { x: 22, y: 32 },
    'HI': { x: 5, y: 90 }, 'ME': { x: 92, y: 18 }, 'NH': { x: 90, y: 25 },
    'RI': { x: 90, y: 30 }, 'MT': { x: 30, y: 25 }, 'DE': { x: 84, y: 52 },
    'SD': { x: 48, y: 32 }, 'ND': { x: 48, y: 25 }, 'AK': { x: 5, y: 10 },
    'VT': { x: 88, y: 23 }, 'DC': { x: 82, y: 57 }, 'WY': { x: 35, y: 38 }
  };

  return (
    <div className={`min-h-0 h-full overflow-x-hidden overflow-y-visible ${isFullscreen ? 'p-4' : 'p-8'}`}>
      {/* Pseudo US Map */}
      <div className={`relative w-full ${isFullscreen ? 'h-[800px]' : 'h-[600px]'} bg-[#0a0e17] rounded-lg border border-[#00d2d3]/20`}>
        {/* Grid lines for reference */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#00d2d3 0.5px, transparent 0.5px), linear-gradient(90deg, #00d2d3 0.5px, transparent 0.5px)',
          backgroundSize: '50px 50px',
          opacity: 0.1
        }} />

        {/* State markers */}
        {stateData.map(({ state, count, compliant, critical, facilities: stateFacs }) => {
          const pos = statePositions[state] || { x: 50, y: 50 };
          const size = Math.min(Math.sqrt(count) * (isFullscreen ? 10 : 8) + (isFullscreen ? 25 : 20), isFullscreen ? 100 : 80);
          const criticalRatio = count > 0 ? critical / count : 0;
          
          return (
            <div
              key={state}
              className="absolute group cursor-pointer"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Pulse ring for critical states */}
              {critical > 0 && (
                <div
                  className="absolute inset-0 rounded-full border-2 border-[#ff4757] animate-ping opacity-50"
                  style={{
                    width: size + 20,
                    height: size + 20,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              )}

              {/* State circle */}
              <div
                className="rounded-full border-2 flex items-center justify-center transition-all group-hover:scale-110"
                style={{
                  width: size,
                  height: size,
                  borderColor: criticalRatio > 0.5 ? '#ff4757' : criticalRatio > 0 ? '#ffa502' : '#2ed573',
                  background: criticalRatio > 0.5 
                    ? 'rgba(255,71,87,0.2)'
                    : criticalRatio > 0
                    ? 'rgba(255,165,2,0.2)'
                    : 'rgba(46,213,115,0.2)',
                  boxShadow: `0 0 20px ${
                    criticalRatio > 0.5 ? 'rgba(255,71,87,0.5)' :
                    criticalRatio > 0 ? 'rgba(255,165,2,0.5)' :
                    'rgba(46,213,115,0.5)'
                  }`
                }}
              >
                <div className="text-center">
                  <div className={`${isFullscreen ? 'text-xs' : 'text-xs'} font-bold text-white`}>{state}</div>
                  <div className={`${isFullscreen ? 'text-[10px]' : 'text-[10px]'} text-[#00d2d3]`}>{count}</div>
                  {isFullscreen && (
                    <div className="text-[8px] text-[#ff4757]">{critical}</div>
                  )}
                </div>
              </div>

              {/* Tooltip */}
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-[#00d2d3] rounded p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-56">
                <div className="text-sm font-bold text-white mb-2">{state}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total:</span>
                    <span className="text-white">{count} facilities</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Compliant:</span>
                    <span className="text-[#2ed573]">{compliant}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Critical:</span>
                    <span className="text-[#ff4757]">{critical}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[#00d2d3]/20">
                  <div className="text-[10px] text-gray-400 mb-1">Top facilities:</div>
                  {stateFacs.slice(0, 3).map(f => (
                    <div key={f.id} className="text-[10px] text-white truncate">
                      • {f.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-black/80 border border-[#00d2d3]/20 rounded p-3">
          <div className="text-xs font-bold text-[#00d2d3] mb-2">Legend</div>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#2ed573]" />
              <span className="text-gray-400">Mostly Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ffa502]" />
              <span className="text-gray-400">Mixed Status</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff4757]" />
              <span className="text-gray-400">Mostly Critical</span>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 mt-2">
            Size = facility count
          </div>
        </div>

        {/* Title */}
        <div className="absolute top-4 left-4 text-sm font-bold text-[#00d2d3]">
          United States - Facility Distribution
        </div>
      </div>

      {/* State List Below */}
      <div className={`mt-6 grid ${isFullscreen ? 'grid-cols-6' : 'grid-cols-4'} gap-${isFullscreen ? '2' : '3'}`}>
        {stateData.slice(0, isFullscreen ? 50 : 20).map(({ state, count, compliant, critical, facilities: stateFacs }) => (
          <div
            key={state}
            className={`bg-white/5 border border-[#00d2d3]/20 rounded ${isFullscreen ? 'p-2' : 'p-3'} hover:bg-white/10 cursor-pointer`}
            onClick={() => stateFacs[0] && onSelect(stateFacs[0])}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`${isFullscreen ? 'text-xs' : 'text-sm'} font-bold text-white`}>{state}</span>
              <span className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-[#00d2d3]`}>{count}</span>
            </div>
            <div className="flex gap-1">
              <div 
                className="h-1 bg-[#2ed573] rounded"
                style={{ width: `${count > 0 ? (compliant / count) * 100 : 0}%` }}
              />
              <div 
                className="h-1 bg-[#ff4757] rounded"
                style={{ width: `${count > 0 ? (critical / count) * 100 : 0}%` }}
              />
            </div>
            {isFullscreen && (
              <div className="text-[9px] text-gray-400 mt-1">
                {compliant}✓ {critical}✗
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// KANBAN VIEW: Card columns
const KanbanView: React.FC<{ facilities: Facility[]; onSelect: (f: Facility) => void; isFullscreen?: boolean }> = ({ facilities, onSelect, isFullscreen = false }) => {
  const columns = {
    'Compliant': facilities.filter(f => f.complianceStatus === 'Compliant'),
    'At Risk': facilities.filter(f => f.complianceStatus === 'At Risk'),
    'Non-Compliant': facilities.filter(f => f.complianceStatus === 'Non-Compliant'),
    'Unknown': facilities.filter(f => f.complianceStatus === 'Unknown')
  };

  const limit = isFullscreen ? 100 : 50;

  return (
    <div className={`min-h-0 h-full ${isFullscreen ? 'p-4' : 'p-8'} overflow-x-hidden overflow-y-visible`}>
      <div className={`flex gap-${isFullscreen ? '2' : '4'} h-full`}>
        {Object.entries(columns).map(([status, items]) => (
          <div key={status} className="flex-1 min-w-[200px]">
            <div className={`bg-white/5 rounded-t ${isFullscreen ? 'p-2' : 'p-3'} border-b-2 border-[#00d2d3]`}>
              <div className={`font-bold ${isFullscreen ? 'text-xs' : 'text-sm'} text-[#00d2d3]`}>{status}</div>
              <div className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-gray-400`}>{items.length} facilities</div>
              {isFullscreen && (
                <div className="text-[9px] text-[#ff4757] mt-0.5">
                  ${(items.reduce((sum, f) => sum + (f.subsidyGap || 0), 0) / 1e9).toFixed(2)}B gap
                </div>
              )}
            </div>
            <div className={`bg-white/5 ${isFullscreen ? 'p-1' : 'p-2'} space-y-${isFullscreen ? '1' : '2'} overflow-y-auto`} style={{ maxHeight: 'calc(100% - 80px)' }}>
              {items.slice(0, limit).map(facility => (
                <div
                  key={facility.id}
                  onClick={() => onSelect(facility)}
                  className={`bg-black border border-[#00d2d3]/20 rounded ${isFullscreen ? 'p-2' : 'p-3'} hover:border-[#00d2d3] cursor-pointer`}
                >
                  <div className={`${isFullscreen ? 'text-xs' : 'text-sm'} font-bold truncate text-white`}>{facility.name}</div>
                  <div className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-1 truncate`}>
                    {facility.city}, {facility.state}
                  </div>
                  {isFullscreen && facility.operator && (
                    <div className="text-[9px] text-gray-500 truncate mt-0.5">{facility.operator}</div>
                  )}
                  <div className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-[#ff4757] mt-${isFullscreen ? '1' : '2'}`}>
                    ${(facility.subsidyGap / 1e6).toFixed(1)}M
                  </div>
                  {isFullscreen && (facility.jobsPromised || 0) > 0 && (
                    <div className="text-[9px] text-gray-400 mt-0.5">
                      {facility.jobsCreated || 0}/{facility.jobsPromised} jobs
                    </div>
                  )}
                </div>
              ))}
              {items.length > limit && (
                <div className="text-center text-[10px] text-gray-500 py-2">
                  +{items.length - limit} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

