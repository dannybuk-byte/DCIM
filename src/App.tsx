import { useState, useEffect, useMemo } from 'react';
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
import { ErrorBoundary } from './components/ErrorBoundary';
import { safeDbOperation } from './utils/dbOperations';
import { trackError } from './utils/errorTracking';
import { ProvenanceModeProvider } from './components/shared/ProvenanceMode';

function App() {
  const [useNewArchitecture, setUseNewArchitecture] = useState(true); // Toggle between old and new
  const [useTestVersion, setUseTestVersion] = useState(false); // Test version for debugging
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
      <div className="relative">
        {useTestVersion ? (
          <>
            {console.log('🧪 Rendering Test Version')}
            <MissionControlGridTest />
          </>
        ) : useNewArchitecture ? (
          <>
            {console.log('🌌 Rendering Omniscient Command Interface')}
            <OmniscientCommandInterface />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </ProvenanceModeProvider>
  );
}

export default App;