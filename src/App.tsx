import { useState, useEffect, useMemo, useCallback } from 'react';
import DCIMCommandCenter from './components/DCIMCommandCenter';
import ChatInterface from './components/ChatInterface';
import ReportModal from './components/ReportModal';
import NetworkTraceModal from './components/NetworkTraceModal';
import SourceManager from './components/SourceManager'; // NotebookLM-inspired
import { DynamicActionButtons } from './components/DynamicActionButtons';
import { NavigationHelper } from './components/NavigationHelper';
import { MissionControlGrid } from './components/MissionControlGrid';
import { MissionControlGridTest } from './components/MissionControlGridTest';
import { OmniscientCommandInterface } from './components/OmniscientCommandInterface';
import { initClickToScrollEverywhere } from './utils/clickToScrollEverywhere';
import { db } from './db/database';
import { Facility } from './types';
import { safeDbOperation } from './utils/dbOperations';
import { trackError } from './utils/errorTracking';
import { ProvenanceModeProvider } from './components/shared/ProvenanceMode';
import { Methodology } from './pages/Methodology';
import { useRaceSafeQuery } from './hooks/useRaceSafeQuery';
import { isDemoMode } from './db/demoMode';

function App() {
  // The demo banner asserts seeded sample data is loaded — only ever true in demo mode.
  const [demoBannerVisible, setDemoBannerVisible] = useState(isDemoMode());
  const [useNewArchitecture, setUseNewArchitecture] = useState(true); // Toggle between old and new
  const [useTestVersion, setUseTestVersion] = useState(false); // Test version for debugging
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [networkTraceOpen, setNetworkTraceOpen] = useState(false);
  const [sourceManagerOpen, setSourceManagerOpen] = useState(false); // NotebookLM Source Manager
  const [sourceManagerFacilityId, setSourceManagerFacilityId] = useState<number | null>(null);

  const { surface: facilitiesSurface } = useRaceSafeQuery<'boot', Facility[]>({
    key: 'boot',
    keyOf: () => 'facilities-boot',
    isEmpty: (rows) => rows.length === 0,
    query: async () => {
      // No synthetic empty fallback — failure must surface as error, not Empty.
      try {
        return await safeDbOperation(() => db.facilities.toArray());
      } catch (error) {
        trackError(error instanceof Error ? error : new Error(String(error)), {
          context: 'App.loadFacilities',
        });
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
  });

  // Prop consumers still receive an array; Empty vs Error is on facilitiesSurface.kind
  // (never use a synthetic [] fallback as a successful empty settle).
  const facilities = facilitiesSurface.data ?? [];

  const [routeHash, setRouteHash] = useState(
    () => (typeof window !== 'undefined' ? window.location.hash : ''),
  );

  useEffect(() => {
    const syncHash = () => setRouteHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const showMethodology = routeHash === '#methodology';

  const handleExitMethodology = useCallback(() => {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    setRouteHash('');
  }, []);

  const preselectedFacility = useMemo(() => {
    if (!sourceManagerFacilityId) return undefined;
    return facilities.find((f) => f.id === sourceManagerFacilityId);
  }, [facilities, sourceManagerFacilityId]);

  // Initialize smooth scrolling and click-to-scroll
  useEffect(() => {
    const cleanup3 = initClickToScrollEverywhere();
    return () => {
      cleanup3();
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

  return (
    <ProvenanceModeProvider>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {demoBannerVisible && (
          <div
            className="fixed left-0 right-0 top-0 z-[600] flex flex-wrap items-start gap-3 border-b border-amber-500/40 bg-amber-950/95 px-4 py-3 text-sm text-amber-100 backdrop-blur-sm"
            role="status"
          >
            <span className="shrink-0 pt-0.5" aria-hidden="true">
              🟡
            </span>
            <p className="min-w-0 flex-1 leading-snug">
              Demo data loaded. The 11,992 facilities shown are seeded sample data for demonstration. To track real compliance, import verified data sources via the Settings panel.{' '}
              <a
                href="#methodology"
                className="font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = '#methodology';
                }}
              >
                Learn more about methodology
              </a>
            </p>
            <button
              type="button"
              onClick={() => setDemoBannerVisible(false)}
              className="shrink-0 rounded border border-amber-500/50 px-2 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
              aria-label="Dismiss demo data notice"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className={`flex min-h-0 flex-1 flex-col ${demoBannerVisible ? 'pt-24' : ''}`}>
        {showMethodology ? (
          <Methodology onClose={handleExitMethodology} />
        ) : (
          <>
            {useTestVersion ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {console.log('🧪 Rendering Test Version')}
                <MissionControlGridTest />
              </div>
            ) : useNewArchitecture ? (
              <OmniscientCommandInterface />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {console.log('📊 Rendering Old Dashboard')}
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
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </ProvenanceModeProvider>
  );
}

export default App;