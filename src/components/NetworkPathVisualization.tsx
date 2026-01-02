import { memo } from 'react';
import { MapPin, Network, ArrowRight } from 'lucide-react';

interface NetworkPathHop {
  hop: number;
  asn: string;
  name: string;
  location: string;
  lat?: number;
  lon?: number;
}

interface NetworkPathVisualizationProps {
  origin: { lat: number; lon: number };
  networkPath: NetworkPathHop[];
  address: string;
}

/**
 * CSS-based network path visualization
 * No external map library required
 */
export const NetworkPathVisualization = memo(({ origin, networkPath, address }: NetworkPathVisualizationProps) => {
  return (
    <div className="w-full h-full bg-gray-900 rounded-lg border border-gray-700 p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Network className="w-6 h-6 text-cyan-400" />
          <h3 className="text-xl font-bold text-white">Network Path Visualization</h3>
        </div>
        <p className="text-sm text-gray-400">Showing route from {address}</p>
      </div>

      {/* Network Path Flow */}
      <div className="space-y-4">
        {networkPath.map((hop, index) => {
          const isOrigin = index === 0;
          const isDestination = index === networkPath.length - 1;
          
          return (
            <div key={hop.hop} className="relative">
              {/* Connection Line */}
              {index < networkPath.length - 1 && (
                <div className="absolute left-6 top-16 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-500 opacity-50 animate-pulse" 
                     style={{ 
                       height: 'calc(100% + 1rem)',
                       animationDuration: '2s',
                       animationDelay: `${index * 0.2}s`
                     }} 
                />
              )}

              {/* Hop Card */}
              <div className={`relative flex items-start gap-4 p-4 rounded-lg border transition-all duration-300 hover:scale-105 ${
                isOrigin ? 'bg-green-900/20 border-green-600' :
                isDestination ? 'bg-red-900/20 border-red-600' :
                'bg-blue-900/20 border-blue-600'
              }`}>
                {/* Hop Number Badge */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 ${
                  isOrigin ? 'bg-green-600 border-green-400 text-white' :
                  isDestination ? 'bg-red-600 border-red-400 text-white' :
                  'bg-blue-600 border-blue-400 text-white'
                }`}>
                  {hop.hop}
                </div>

                {/* Hop Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isOrigin && <MapPin className="w-4 h-4 text-green-400" />}
                    {isDestination && <MapPin className="w-4 h-4 text-red-400" />}
                    <h4 className="font-semibold text-white truncate">{hop.name}</h4>
                    {isOrigin && <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">ORIGIN</span>}
                    {isDestination && <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">DESTINATION</span>}
                  </div>
                  
                  <div className="text-sm text-gray-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">ASN:</span>
                      <span className="font-mono text-cyan-400">{hop.asn}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Location:</span>
                      <span>{hop.location}</span>
                    </div>
                    {hop.lat && hop.lon && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Coordinates:</span>
                        <span className="font-mono text-gray-400">
                          {hop.lat.toFixed(4)}, {hop.lon.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow Indicator */}
                {index < networkPath.length - 1 && (
                  <div className="flex-shrink-0 text-cyan-400 animate-bounce" style={{ animationDuration: '2s', animationDelay: `${index * 0.2}s` }}>
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Latency Indicator */}
              {index < networkPath.length - 1 && (
                <div className="flex items-center justify-center my-2 ml-6">
                  <div className="px-3 py-1 bg-gray-800 border border-gray-600 rounded-full text-xs text-gray-400">
                    ~{Math.floor(Math.random() * 20 + 10)}ms
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 pt-6 border-t border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-cyan-400">{networkPath.length}</div>
            <div className="text-xs text-gray-400">Total Hops</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {Math.floor(Math.random() * 50 + 100)}ms
            </div>
            <div className="text-xs text-gray-400">Est. Latency</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {new Set(networkPath.map(h => h.asn)).size}
            </div>
            <div className="text-xs text-gray-400">Unique ASNs</div>
          </div>
        </div>
      </div>
    </div>
  );
});

NetworkPathVisualization.displayName = 'NetworkPathVisualization';

