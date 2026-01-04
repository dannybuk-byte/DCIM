import { useState, useEffect, useMemo, useCallback } from 'react';
import DCIMCommandCenter from './components/DCIMCommandCenter';
import ChatInterface from './components/ChatInterface';
import ReportModal from './components/ReportModal';
import NetworkTraceModal from './components/NetworkTraceModal';
import SourceManager from './components/SourceManager'; // NotebookLM-inspired
import { DynamicActionButtons } from './components/DynamicActionButtons';
import { NavigationHelper } from './components/NavigationHelper';
import { MissionControlGridTest } from './components/MissionControlGridTest';
import { OmniscientCommandInterface } from './components/OmniscientCommandInterface';
import { initClickToScrollEverywhere } from './utils/clickToScrollEverywhere';
import { db } from './db/database';
import { Facility } from './types';
import { safeDbOperation } from './utils/dbOperations';
import { trackError } from './utils/errorTracking';
import { ProvenanceModeProvider } from './components/shared/ProvenanceMode';
import { DensityProvider } from './contexts/DensityContext';
import { getSettings, saveSettings, settingsKey } from './utils/settingsPersistence';
import { OfflineIndicator } from './hooks/useOfflineStatus';
import { EnhancedCapabilitiesBanner } from './components/EnhancedCapabilitiesBanner';

function App() {
  type AppShell = 'omniscient' | 'commandCenter' | 'missionControlTest';
  const [appShell, setAppShell] = useState<AppShell>('omniscient');
  const [shellMenuOpen, setShellMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [networkTraceOpen, setNetworkTraceOpen] = useState(false);
  const [sourceManagerOpen, setSourceManagerOpen] = useState(false); // NotebookLM Source Manager
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sourceManagerFacilityId, setSourceManagerFacilityId] = useState<number | null>(null);

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
        if (saved === 'omniscient' || saved === 'commandCenter' || saved === 'missionControlTest') {
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
    if (appShell === 'omniscient') return 'Omniscient';
    if (appShell === 'commandCenter') return 'Command Center';
    return 'Mission Control (Test)';
  }, [appShell]);

  const setShellAndCloseMenu = useCallback((next: AppShell) => {
    setAppShell(next);
    setShellMenuOpen(false);
  }, []);

  return (
    <DensityProvider>
      <ProvenanceModeProvider>
      <div className="relative">
        {/* ENHANCED CAPABILITIES BANNER - Always visible at top */}
        <EnhancedCapabilitiesBanner />
        {/* Always-available interface switcher (some features live in different shells) */}
        <div className="fixed bottom-4 right-4 z-[9999]">
          <div className="bg-gray-950/90 backdrop-blur border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShellMenuOpen((v) => !v)}
              className="px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-gray-900 flex items-center gap-2 w-full"
              aria-haspopup="menu"
              aria-expanded={shellMenuOpen}
              title="Switch between interface shells"
            >
              <span className="text-gray-400">Interface:</span>
              <span className="font-semibold">{shellLabel}</span>
              <span className="ml-auto text-gray-500">{shellMenuOpen ? '▲' : '▼'}</span>
            </button>
            {shellMenuOpen && (
              <div role="menu" className="border-t border-gray-800">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('omniscient')}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-900 ${
                    appShell === 'omniscient' ? 'text-cyan-300' : 'text-gray-200'
                  }`}
                >
                  Omniscient (Dashboard / Tracker / Full Report)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('commandCenter')}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-900 ${
                    appShell === 'commandCenter' ? 'text-cyan-300' : 'text-gray-200'
                  }`}
                >
                  Command Center (Tabs: OSINT, Connectography, Predictive Intel…)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setShellAndCloseMenu('missionControlTest')}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-900 ${
                    appShell === 'missionControlTest' ? 'text-cyan-300' : 'text-gray-200'
                  }`}
                >
                  Mission Control Grid (Test)
                </button>
              </div>
            )}
          </div>
        </div>

        {appShell === 'missionControlTest' ? (
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
  );
}

export default App;