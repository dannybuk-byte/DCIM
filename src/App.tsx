import { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import DCIMCommandCenter from './components/DCIMCommandCenter';
import ChatInterface from './components/ChatInterface';
import ReportModal from './components/ReportModal';
import NetworkTraceModal from './components/NetworkTraceModal';
import SourceManager from './components/SourceManager'; // NotebookLM-inspired
import { DynamicActionButtons } from './components/DynamicActionButtons';
import { NavigationHelper } from './components/NavigationHelper';
import { MissionControlGridTest } from './components/MissionControlGridTest';
import { OmniscientCommandInterface } from './components/OmniscientCommandInterface';
import { LightDashboard } from './components/LightDashboard';
import { UIOptionsShowcase } from './components/UIOptionsShowcase';
import { ResponsiveDemo, ResponsiveProvider } from './components/ResponsiveLayoutSystem';
import { HybridDashboard } from './components/HybridDashboard';
import { CommandCenterLayout } from './components/CommandCenterLayout';
import { DensityOptimizedLayout } from './components/DensityOptimizedLayout';
import { initClickToScrollEverywhere } from './utils/clickToScrollEverywhere';
import { db } from './db/database';
import { Facility } from './types';
import { safeDbOperation } from './utils/dbOperations';
import { trackError } from './utils/errorTracking';
import { ProvenanceModeProvider } from './components/shared/ProvenanceMode';
import { DensityProvider } from './contexts/DensityContext';
import { getSettings, saveSettings, settingsKey } from './utils/settingsPersistence';
import { OfflineIndicator } from './components/OfflineIndicator';
import { EnhancedCapabilitiesBanner } from './components/EnhancedCapabilitiesBanner';
import { Sun, Moon, Palette } from 'lucide-react';

// Theme Context
type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ 
  theme: 'light', 
  setTheme: () => {} 
});
export const useTheme = () => useContext(ThemeContext);

function App() {
  type AppShell = 'light' | 'omniscient' | 'commandCenter' | 'missionControlTest' | 'uiShowcase' | 'responsiveDemo' | 'hybrid' | 'command-center-v2' | 'density-optimized';
  const [appShell, setAppShell] = useState<AppShell>('density-optimized'); // Default to density-optimized for max viewability
  const [shellMenuOpen, setShellMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [networkTraceOpen, setNetworkTraceOpen] = useState(false);
  const [sourceManagerOpen, setSourceManagerOpen] = useState(false); // NotebookLM Source Manager
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sourceManagerFacilityId, setSourceManagerFacilityId] = useState<number | null>(null);
  
  // Theme State - Default to LIGHT (demo-ready)
  const [theme, setTheme] = useState<Theme>('light');
  
  // Load persisted theme
  useEffect(() => {
    const saved = localStorage.getItem('dcim:theme') as Theme;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, []);
  
  // Save theme and apply to document
  useEffect(() => {
    localStorage.setItem('dcim:theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const preselectedFacility = useMemo(() => {
    if (!sourceManagerFacilityId) return undefined;
    return facilities.find((f) => f.id === sourceManagerFacilityId);
  }, [facilities, sourceManagerFacilityId]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadFacilities() {
      try {
        const facilities = await safeDbOperation(
          () => db.facilities.toArray(),
          () => [] // Fallback: empty array
        );
        if (isMounted && !abortController.signal.aborted) {
          setFacilities(facilities);
        }
      } catch (error) {
        console.error('Error loading facilities:', error);
        trackError(error instanceof Error ? error : new Error(String(error)), {
          context: 'App.loadFacilities'
        });
        // Graceful degradation: set empty array
        if (isMounted) {
          setFacilities([]);
        }
      }
    }

    loadFacilities();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Persisted UI shell selection (so features aren't "lost" across shells)
  useEffect(() => {
    let cancelled = false;
    async function loadShell() {
      try {
        const saved = await getSettings<AppShell>(settingsKey('appShell'));
        if (cancelled) return;
        if (saved === 'light' || saved === 'omniscient' || saved === 'commandCenter' || saved === 'missionControlTest') {
          setAppShell(saved);
        }
      } catch {
        // ignore
      }
    }
    loadShell();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveSettings(settingsKey('appShell'), appShell).catch(() => {});
  }, [appShell]);

  // Initialize smooth scrolling and click-to-scroll
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    async function init() {
      try {
        const display = await getSettings<{ enhancedScrolling?: boolean }>(settingsKey('display'));
        const enabled = display?.enhancedScrolling === true;
        if (cancelled) return;
        if (enabled) {
          cleanup = initClickToScrollEverywhere();
        }
      } catch {
        // Default: do nothing (native scrolling)
      }
    }

    init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  const handleDashboardAction = (action: any) => {
    if (action.type === 'generateReport') {
      setReportOpen(true);
    }
    if (action.type === 'networkTrace') {
      setNetworkTraceOpen(true);
    }
    if (action.type === 'openSourceManager') {
      if (typeof action.facilityId === 'number') {
        setSourceManagerFacilityId(action.facilityId);
      } else {
        setSourceManagerFacilityId(null);
      }
      setSourceManagerOpen(true);
    }
  };

  // Global event bridge so any component can open Source Manager for a facility
  useEffect(() => {
    const handler = (e: any) => {
      const facilityId = Number(e?.detail?.facilityId);
      if (Number.isFinite(facilityId) && facilityId > 0) {
        setSourceManagerFacilityId(facilityId);
      } else {
        setSourceManagerFacilityId(null);
      }
      setSourceManagerOpen(true);
    };
    window.addEventListener('dcim:openSourceManager', handler as any);
    return () => window.removeEventListener('dcim:openSourceManager', handler as any);
  }, []);

  const navigationShortcuts = [
    { key: '⌘K / Ctrl+K', description: 'Open global search', keys: ['⌘', 'K'] },
    { key: 'Arrow Keys', description: 'Navigate between tabs', keys: ['←', '→'] },
    { key: '1-9', description: 'Jump to tab by number', keys: ['1', '-', '9'] },
    { key: '⌘R / Ctrl+R', description: 'Generate report', keys: ['⌘', 'R'] },
    { key: '⌘S / Ctrl+S', description: 'Open Source Manager', keys: ['⌘', 'S'] },
    { key: '/', description: 'Focus search bar', keys: ['/'] },
    { key: 'Esc', description: 'Close modals', keys: ['Esc'] },
    { key: '⌘P / Ctrl+P', description: 'Print report (in report modal)', keys: ['⌘', 'P'] },
    { key: 'Click + ↑ / ↓', description: 'Click any section, then scroll with arrows', keys: ['Click', '↑', '↓'] },
    { key: 'Click + PgUp/PgDn', description: 'Click any section, then page scroll', keys: ['Click', 'PgUp'] },
    { key: 'Click + Home/End', description: 'Click any section, then jump to top/bottom', keys: ['Click', 'Home'] },
  ];

  const shellLabel = useMemo(() => {
    if (appShell === 'light') return '✨ Light Dashboard';
    if (appShell === 'omniscient') return 'Omniscient';
    if (appShell === 'commandCenter') return 'Command Center';
    if (appShell === 'uiShowcase') return '🎨 UI Options';
    if (appShell === 'responsiveDemo') return '📱 Responsive Demo';
    if (appShell === 'hybrid') return '🎯 Hybrid Dashboard';
    if (appShell === 'command-center-v2') return '🚀 Command Center v2';
    if (appShell === 'density-optimized') return '📊 High Density';
    return 'Mission Control (Test)';
  }, [appShell]);

  const setShellAndCloseMenu = useCallback((next: AppShell) => {
    setAppShell(next);
    setShellMenuOpen(false);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
    <DensityProvider>
      <ProvenanceModeProvider>
      <div className={`relative ${theme === 'light' ? 'bg-gradient-to-br from-neutral-50 via-primary-50/30 to-neutral-50' : ''}`}>
        {/* ENHANCED CAPABILITIES BANNER - Always visible at top */}
        {theme === 'dark' && <EnhancedCapabilitiesBanner />}
        
        {/* Theme Toggle - Floating */}
        <div className="fixed top-4 right-4 z-[9999]">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={`
              p-3 rounded-xl shadow-lg transition-all duration-300 group
              ${theme === 'light' 
                ? 'bg-white border border-neutral-200 hover:shadow-xl hover:border-primary-300' 
                : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
              }
            `}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-neutral-600 group-hover:text-primary-600 transition-colors" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
            )}
          </button>
        </div>
        
        {/* Always-available interface switcher (some features live in different shells) */}
        <div className="fixed bottom-4 right-4 z-[9999]">
          <div className={`
            backdrop-blur rounded-xl shadow-2xl overflow-hidden
            ${theme === 'light' 
              ? 'bg-white/90 border border-neutral-200' 
              : 'bg-gray-950/90 border border-gray-800'
            }
          `}>
            <button
              type="button"
              onClick={() => setShellMenuOpen((v) => !v)}
              className={`
                px-4 py-3 text-sm flex items-center gap-3 w-full transition-colors
                ${theme === 'light'
                  ? 'text-neutral-700 hover:bg-neutral-50'
                  : 'text-gray-200 hover:text-white hover:bg-gray-900'
                }
              `}
              aria-haspopup="menu"
              aria-expanded={shellMenuOpen}
              title="Switch between interface shells"
            >
              <Palette className="w-4 h-4" />
              <span className={theme === 'light' ? 'text-neutral-500' : 'text-gray-400'}>Interface:</span>
              <span className="font-semibold">{shellLabel}</span>
              <span className={`ml-auto ${theme === 'light' ? 'text-neutral-400' : 'text-gray-500'}`}>
                {shellMenuOpen ? '▲' : '▼'}
              </span>
            </button>
            {shellMenuOpen && (
              <div role="menu" className={`border-t ${theme === 'light' ? 'border-neutral-200' : 'border-gray-800'}`}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('light')}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light'
                      ? `hover:bg-primary-50 ${appShell === 'light' ? 'text-primary-600 bg-primary-50 font-semibold' : 'text-neutral-700'}`
                      : `hover:bg-gray-900 ${appShell === 'light' ? 'text-cyan-300' : 'text-gray-200'}`
                  }`}
                >
                  ✨ Light Dashboard (Professional, Demo-Ready)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('omniscient')}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light'
                      ? `hover:bg-primary-50 ${appShell === 'omniscient' ? 'text-primary-600 bg-primary-50' : 'text-neutral-700'}`
                      : `hover:bg-gray-900 ${appShell === 'omniscient' ? 'text-cyan-300' : 'text-gray-200'}`
                  }`}
                >
                  Omniscient (Dashboard / Tracker / Full Report)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('commandCenter')}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light'
                      ? `hover:bg-primary-50 ${appShell === 'commandCenter' ? 'text-primary-600 bg-primary-50' : 'text-neutral-700'}`
                      : `hover:bg-gray-900 ${appShell === 'commandCenter' ? 'text-cyan-300' : 'text-gray-200'}`
                  }`}
                >
                  Command Center (Tabs: OSINT, Connectography, Predictive Intel…)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('missionControlTest')}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light'
                      ? `hover:bg-primary-50 ${appShell === 'missionControlTest' ? 'text-primary-600 bg-primary-50' : 'text-neutral-700'}`
                      : `hover:bg-gray-900 ${appShell === 'missionControlTest' ? 'text-cyan-300' : 'text-gray-200'}`
                  }`}
                >
                  Mission Control Grid (Test)
                </button>
                <div className={`border-t ${theme === 'light' ? 'border-neutral-200' : 'border-gray-800'} my-1`} />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('uiShowcase')}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light'
                      ? `hover:bg-purple-50 ${appShell === 'uiShowcase' ? 'text-purple-600 bg-purple-50 font-semibold' : 'text-purple-700'}`
                      : `hover:bg-purple-900/30 ${appShell === 'uiShowcase' ? 'text-purple-300' : 'text-purple-400'}`
                  }`}
                >
                  🎨 UI/UX Options Showcase
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('responsiveDemo')}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light'
                      ? `hover:bg-emerald-50 ${appShell === 'responsiveDemo' ? 'text-emerald-600 bg-emerald-50 font-semibold' : 'text-emerald-700'}`
                      : `hover:bg-emerald-900/30 ${appShell === 'responsiveDemo' ? 'text-emerald-300' : 'text-emerald-400'}`
                  }`}
                >
                  📱 Responsive Demo (Mobile/Tablet/Desktop)
                </button>
                <div className={`border-t ${theme === 'light' ? 'border-neutral-200' : 'border-gray-800'} my-1`} />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('hybrid')}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light'
                      ? `hover:bg-indigo-50 ${appShell === 'hybrid' ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-indigo-700'}`
                      : `hover:bg-indigo-900/30 ${appShell === 'hybrid' ? 'text-indigo-300' : 'text-indigo-400'}`
                  }`}
                >
                  🎯 Hybrid Dashboard (Cards + Tree + Map)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('command-center-v2')}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light'
                      ? `hover:bg-cyan-50 ${appShell === 'command-center-v2' ? 'text-cyan-600 bg-cyan-50 font-bold' : 'text-cyan-700'}`
                      : `hover:bg-cyan-900/30 ${appShell === 'command-center-v2' ? 'text-cyan-300' : 'text-cyan-400'}`
                  }`}
                >
                  🚀 Command Center v2 (Clean Sidebar Navigation)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('density-optimized')}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light'
                      ? `hover:bg-amber-50 ${appShell === 'density-optimized' ? 'text-amber-600 bg-amber-50 font-bold' : 'text-amber-700'}`
                      : `hover:bg-amber-900/30 ${appShell === 'density-optimized' ? 'text-amber-300' : 'text-amber-400'}`
                  }`}
                >
                  📊 High Density (Max Viewability, No Scroll)
                </button>
              </div>
            )}
          </div>
        </div>

        {appShell === 'density-optimized' ? (
          <DensityOptimizedLayout />
        ) : appShell === 'command-center-v2' ? (
          <CommandCenterLayout />
        ) : appShell === 'hybrid' ? (
          <HybridDashboard />
        ) : appShell === 'light' ? (
          <LightDashboard />
        ) : appShell === 'uiShowcase' ? (
          <UIOptionsShowcase />
        ) : appShell === 'responsiveDemo' ? (
          <ResponsiveProvider>
            <ResponsiveDemo />
          </ResponsiveProvider>
        ) : appShell === 'missionControlTest' ? (
          <MissionControlGridTest />
        ) : appShell === 'omniscient' ? (
          <OmniscientCommandInterface />
        ) : (
          <>
            <DCIMCommandCenter 
              onActionRequested={handleDashboardAction}
              onOpenChat={() => setChatOpen(true)}
            />
            <ChatInterface isOpen={chatOpen} onClose={() => setChatOpen(false)} />
            <ReportModal
              isOpen={reportOpen}
              onClose={() => setReportOpen(false)}
              facilities={facilities}
            />
            <NetworkTraceModal
              isOpen={networkTraceOpen}
              onClose={() => setNetworkTraceOpen(false)}
            />
            {sourceManagerOpen && (
              <SourceManager
                onClose={() => setSourceManagerOpen(false)}
                preselectedFacility={preselectedFacility}
              />
            )}
            
            <DynamicActionButtons
              facilities={facilities}
              onGenerateReport={() => setReportOpen(true)}
              onOpenChat={() => setChatOpen(true)}
              isReportOpen={reportOpen}
              isChatOpen={chatOpen}
            />

            <NavigationHelper shortcuts={navigationShortcuts} />
            
            {/* Global offline indicator */}
            <OfflineIndicator />
          </>
        )}
      </div>
      </ProvenanceModeProvider>
    </DensityProvider>
    </ThemeContext.Provider>
  );
}

export default App;