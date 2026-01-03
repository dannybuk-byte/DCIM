import { memo, useState } from 'react';
import { Search, CheckCircle, XCircle, Network } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import NetworkTraceModal from '../NetworkTraceModal';
import { OSINTQueryModal, OSINTToolConfig } from '../OSINTQueryModal';
import DataSourceStatus from '../DataSourceStatus';
import { RateLimitDashboard } from '../RateLimitDashboard';

type OSINTTool = OSINTToolConfig;

const osintTools: OSINTTool[] = [
  {
    name: 'PeeringDB',
    description: 'Internet Exchange Points and network interconnection data',
    status: 'available',
    endpoint: 'https://www.peeringdb.com/api',
    cors: true,
  },
  {
    name: 'SEC EDGAR',
    description: 'Securities filings and corporate disclosures',
    status: 'proxy-needed',
    endpoint: 'https://www.sec.gov/cgi-bin/browse-edgar',
    cors: false,
  },
  {
    name: 'EPA ECHO',
    description: 'Environmental compliance and enforcement data',
    status: 'available',
    endpoint: 'https://echo.epa.gov/api',
    cors: true,
  },
  {
    name: 'OSHA',
    description: 'Workplace safety violations and inspection records',
    status: 'requires-auth',
    endpoint: 'https://www.osha.gov/api',
    cors: true,
  },
  {
    name: 'Good Jobs First',
    description: 'Subsidy tracking and economic development data',
    status: 'available',
    endpoint: 'https://www.goodjobsfirst.org/api',
    cors: true,
  },
  {
    name: 'crt.sh',
    description: 'Certificate Transparency log monitoring',
    status: 'available',
    endpoint: 'https://crt.sh',
    cors: true,
  },
  {
    name: 'RIPE RIS Live',
    description: 'Real-time BGP routing data via WebSocket',
    status: 'available',
    endpoint: 'wss://ris-live.ripe.net/v1/ws',
    cors: true,
  },
  {
    name: 'Cloudflare DoH',
    description: 'DNS over HTTPS lookups',
    status: 'available',
    endpoint: 'https://cloudflare-dns.com/dns-query',
    cors: true,
  },
];

export const OSINTToolsTab = memo(() => {
  const [networkTraceOpen, setNetworkTraceOpen] = useState(false);
  const [queryTool, setQueryTool] = useState<OSINTTool | null>(null);
  const [queryOpen, setQueryOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'requires-auth':
        return <XCircle className="w-4 h-4 text-yellow-400" />;
      case 'proxy-needed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'requires-auth':
        return 'Requires API Key';
      case 'proxy-needed':
        return 'CORS Proxy Required';
      default:
        return 'Unknown';
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6" style={{ minHeight: '100%', paddingBottom: '2rem' }}>
        <div>
          <h2 className="text-2xl font-bold mb-2">OSINT Tools</h2>
          <p className="text-sm text-gray-400">Open Source Intelligence integrations for infrastructure monitoring</p>
        </div>

        {/* Rate Limit Status Dashboard */}
        <RateLimitDashboard />

        {/* Data Source Health Status */}
        <DataSourceStatus />

        {/* Featured Tool: Network Traffic Tracer */}
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-2 border-cyan-700/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-600/20 rounded-lg flex-shrink-0">
              <Network className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className="text-xl font-bold text-white">Network Traffic Tracer</h3>
                <span className="px-2 py-1 bg-cyan-600/30 border border-cyan-500/50 rounded text-xs text-cyan-300 font-semibold">
                  NEW
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Trace how internet traffic flows from any physical address in the world. 
                Discover ISPs, autonomous systems, peering points, and network routing paths.
              </p>
              <button
                onClick={() => setNetworkTraceOpen(true)}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors shadow-lg hover:shadow-cyan-500/20"
              >
                <Network className="w-4 h-4" />
                Launch Network Tracer
              </button>
            </div>
          </div>
        </div>

        {/* Network Trace Modal */}
        <NetworkTraceModal
          isOpen={networkTraceOpen}
          onClose={() => setNetworkTraceOpen(false)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {osintTools.map((tool) => (
            <div
              key={tool.name}
              className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{tool.name}</h3>
                    {getStatusIcon(tool.status)}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{tool.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    tool.status === 'available' ? 'bg-green-900/30 text-green-400' :
                    tool.status === 'requires-auth' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-red-900/30 text-red-400'
                  }`}>
                    {getStatusText(tool.status)}
                  </span>
                  {tool.cors && (
                    <span className="text-xs text-gray-500">CORS ✓</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQueryTool(tool);
                    setQueryOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded text-sm flex items-center gap-1"
                >
                  <Search className="w-3 h-3" />
                  Query
                </button>
              </div>
              {tool.endpoint && (
                <div className="mt-3 text-xs text-gray-500 font-mono truncate">
                  {tool.endpoint}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Integration Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Integration Status</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Available</div>
              <div className="text-2xl font-bold text-green-400">
                {osintTools.filter(t => t.status === 'available').length}
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Requires Auth</div>
              <div className="text-2xl font-bold text-yellow-400">
                {osintTools.filter(t => t.status === 'requires-auth').length}
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Proxy Needed</div>
              <div className="text-2xl font-bold text-red-400">
                {osintTools.filter(t => t.status === 'proxy-needed').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <OSINTQueryModal
        tool={queryTool}
        isOpen={queryOpen}
        onClose={() => setQueryOpen(false)}
      />
    </ErrorBoundary>
  );
});

OSINTToolsTab.displayName = 'OSINTToolsTab';

