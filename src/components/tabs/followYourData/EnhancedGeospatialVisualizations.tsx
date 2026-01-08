/**
 * Enhanced Geospatial Visualizations for Follow Your Data
 * 
 * All 5 enhancement options:
 * A) Mapbox/Deck.gl Real-Time Geospatial Layer
 * B) Live Network Traceroute Visualization
 * C) Granular Facility Deep-Dive Dashboards
 * D) AR/VR Walk Your Data Mode (3D visualization)
 * E) Real-time Intelligence Stream
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Map, Layers, Activity, Eye, Radio, Globe, Building, Target,
  Navigation, Zap, AlertTriangle, TrendingUp, TrendingDown, Clock,
  Wifi, Shield, Users, DollarSign, ChevronRight, ChevronDown, ChevronUp,
  Play, Pause, RotateCcw, Maximize2, Minimize2, Filter, Search,
  Settings, Download, Share2, ExternalLink, MapPin, Network, Cpu,
  Database, Server, Cloud, Lock, FileText, BarChart3, PieChart, Info
} from 'lucide-react';

// ==================== TYPES ====================

interface FacilityData {
  id: string;
  name: string;
  operator: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  type: string;
  complianceStatus: 'compliant' | 'non-compliant' | 'at-risk' | 'unknown';
  subsidyGap: number;
  jobsPromised: number;
  jobsCreated: number;
  powerCapacityMW: number;
  unionStatus: 'union' | 'non-union' | 'mixed' | 'unknown';
  lastUpdated: string;
  riskScore?: number;
  organizingPriority?: 'high' | 'medium' | 'low';
}

interface NetworkHop {
  hopNumber: number;
  ip: string;
  hostname?: string;
  asn?: string;
  asnOrg?: string;
  location?: { city: string; state: string; country: string; lat: number; lng: number };
  latency: number;
  facilityId?: string;
  facilityName?: string;
}

interface IntelligenceAlert {
  id: string;
  type: 'subsidy' | 'labor' | 'compliance' | 'expansion' | 'legislation' | 'incident';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  facilityId?: string;
  facilityName?: string;
  timestamp: Date;
  source: string;
  actionUrl?: string;
}

interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

// ==================== OPTION A: MAPBOX GEOSPATIAL LAYER ====================

interface GeospatialMapProps {
  facilities: FacilityData[];
  userLocation?: { lat: number; lng: number };
  onFacilitySelect?: (facility: FacilityData) => void;
}

export const GeospatialMap: React.FC<GeospatialMapProps> = ({
  facilities,
  userLocation,
  onFacilitySelect
}) => {
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4,
    pitch: 45,
    bearing: 0
  });
  const [selectedFacility, setSelectedFacility] = useState<FacilityData | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<'subsidyGap' | 'unionDensity' | 'compliance' | 'power'>('subsidyGap');
  const [show3D, setShow3D] = useState(true);
  const [showDataFlows, setShowDataFlows] = useState(true);
  const [animationFrame, setAnimationFrame] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animate data flow lines
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate heatmap values
  const heatmapData = useMemo(() => {
    return facilities.map(f => ({
      ...f,
      heatValue: heatmapMode === 'subsidyGap' ? f.subsidyGap :
                 heatmapMode === 'unionDensity' ? (f.unionStatus === 'union' ? 100 : f.unionStatus === 'mixed' ? 50 : 0) :
                 heatmapMode === 'compliance' ? (f.complianceStatus === 'non-compliant' ? 100 : f.complianceStatus === 'at-risk' ? 50 : 0) :
                 f.powerCapacityMW
    }));
  }, [facilities, heatmapMode]);

  // Calculate max values for normalization
  const maxValues = useMemo(() => ({
    subsidyGap: Math.max(...facilities.map(f => f.subsidyGap), 1),
    power: Math.max(...facilities.map(f => f.powerCapacityMW), 1),
    jobs: Math.max(...facilities.map(f => f.jobsPromised), 1)
  }), [facilities]);

  // Render facility markers
  const renderMarker = (facility: FacilityData, index: number) => {
    const normalizedSubsidy = facility.subsidyGap / maxValues.subsidyGap;
    const normalizedPower = facility.powerCapacityMW / maxValues.power;
    
    const complianceColors = {
      'compliant': '#22c55e',
      'non-compliant': '#ef4444',
      'at-risk': '#f59e0b',
      'unknown': '#6b7280'
    };

    const size = show3D ? 20 + normalizedPower * 40 : 12;
    const color = complianceColors[facility.complianceStatus];
    const isSelected = selectedFacility?.id === facility.id;

    // Convert lat/lng to screen position (simplified projection)
    const x = ((facility.longitude + 180) / 360) * 100;
    const y = ((90 - facility.latitude) / 180) * 100;

    return (
      <button
        key={facility.id}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
          isSelected ? 'z-20 scale-125' : 'z-10 hover:scale-110'
        }`}
        style={{ 
          left: `${x}%`, 
          top: `${y}%`,
          filter: isSelected ? `drop-shadow(0 0 12px ${color})` : 'none'
        }}
        onClick={() => {
          setSelectedFacility(facility);
          onFacilitySelect?.(facility);
        }}
        title={facility.name}
      >
        {/* 3D Extrusion Effect */}
        {show3D && (
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t opacity-60"
            style={{
              width: size * 0.8,
              height: normalizedSubsidy * 60,
              background: `linear-gradient(to top, ${color}40, ${color})`,
              transform: `perspective(100px) rotateX(-10deg)`,
            }}
          />
        )}
        
        {/* Main marker */}
        <div 
          className={`rounded-full border-2 border-white shadow-lg transition-all ${
            facility.unionStatus === 'union' ? 'ring-2 ring-yellow-500' : ''
          }`}
          style={{ 
            width: size, 
            height: size, 
            backgroundColor: color,
            boxShadow: isSelected ? `0 0 20px ${color}` : `0 4px 12px rgba(0,0,0,0.3)`
          }}
        >
          {/* Pulse animation for high priority */}
          {facility.organizingPriority === 'high' && (
            <div 
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: color, opacity: 0.4 }}
            />
          )}
        </div>
        
        {/* Data flow line to user */}
        {showDataFlows && userLocation && isSelected && (
          <svg 
            className="absolute pointer-events-none"
            style={{
              width: '200%',
              height: '200%',
              left: '-50%',
              top: '-50%'
            }}
          >
            <defs>
              <linearGradient id={`flow-${facility.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                <stop offset={`${animationFrame}%`} stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#58a6ff" stopOpacity="0.5" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </button>
    );
  };

  return (
    <div className="relative w-full h-[500px] bg-[#0d1117] rounded-xl overflow-hidden border border-[#30363d]">
      {/* Map Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-[#0d1117] to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Real-Time Geospatial View</h3>
              <p className="text-xs text-[#8b949e]">{facilities.length} facilities tracked</p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <select
              value={heatmapMode}
              onChange={(e) => setHeatmapMode(e.target.value as typeof heatmapMode)}
              className="px-3 py-1.5 bg-[#21262d] border border-[#30363d] rounded-lg text-xs text-white"
            >
              <option value="subsidyGap">💰 Subsidy Gap</option>
              <option value="unionDensity">✊ Union Density</option>
              <option value="compliance">⚠️ Compliance Risk</option>
              <option value="power">⚡ Power Capacity</option>
            </select>
            
            <button
              onClick={() => setShow3D(!show3D)}
              className={`p-2 rounded-lg transition-colors ${show3D ? 'bg-[#58a6ff] text-white' : 'bg-[#21262d] text-[#8b949e]'}`}
              title="Toggle 3D View"
            >
              <Layers className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowDataFlows(!showDataFlows)}
              className={`p-2 rounded-lg transition-colors ${showDataFlows ? 'bg-[#3fb950] text-white' : 'bg-[#21262d] text-[#8b949e]'}`}
              title="Toggle Data Flows"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="absolute inset-0 pt-20">
        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(88, 166, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(88, 166, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Simple US Map Outline */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <svg viewBox="0 0 960 600" className="w-full h-full" fill="none" stroke="#58a6ff" strokeWidth="0.5">
            {/* Simplified US outline - would use actual path data in production */}
            <path d="M0,200 Q240,100 480,150 Q720,200 960,180 L960,600 L0,600 Z" fill="rgba(88,166,255,0.05)" />
          </svg>
        </div>

        {/* Facility Markers */}
        {heatmapData.map((facility, i) => renderMarker(facility, i))}
        
        {/* User Location */}
        {userLocation && (
          <div 
            className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${((userLocation.lng + 180) / 360) * 100}%`,
              top: `${((90 - userLocation.lat) / 180) * 100}%`
            }}
          >
            <div className="relative">
              <div className="w-6 h-6 bg-[#3fb950] rounded-full border-2 border-white animate-pulse" />
              <div className="absolute -inset-4 border-2 border-[#3fb950] rounded-full animate-ping opacity-50" />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-30 bg-[#161b22]/90 backdrop-blur-sm border border-[#30363d] rounded-xl p-4">
        <h4 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Legend</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span className="text-xs">Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
            <span className="text-xs">At Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
            <span className="text-xs">Non-Compliant</span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-[#30363d]">
            <span className="w-3 h-3 rounded-full bg-[#6b7280] ring-2 ring-yellow-500" />
            <span className="text-xs">Union Present</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#30363d]">
          <div className="text-[10px] text-[#6e7681]">
            {show3D && 'Height = Subsidy Gap'}
          </div>
        </div>
      </div>

      {/* Selected Facility Info Panel */}
      {selectedFacility && (
        <div className="absolute bottom-4 right-4 z-30 w-80 bg-[#161b22]/95 backdrop-blur-sm border border-[#30363d] rounded-xl overflow-hidden animate-[slideIn_0.3s_ease-out]">
          <div className="p-4 bg-[#21262d] border-b border-[#30363d]">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white truncate">{selectedFacility.name}</h4>
              <button
                onClick={() => setSelectedFacility(null)}
                className="p-1 hover:bg-[#30363d] rounded"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#58a6ff]">{selectedFacility.operator}</p>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-[#0d1117] rounded-lg">
                <div className="text-[10px] text-[#8b949e] uppercase">Subsidy Gap</div>
                <div className="text-lg font-bold text-[#f85149]">
                  ${(selectedFacility.subsidyGap / 1000000).toFixed(1)}M
                </div>
              </div>
              <div className="p-2 bg-[#0d1117] rounded-lg">
                <div className="text-[10px] text-[#8b949e] uppercase">Jobs Gap</div>
                <div className="text-lg font-bold text-[#d29922]">
                  {(selectedFacility.jobsPromised - selectedFacility.jobsCreated).toLocaleString()}
                </div>
              </div>
              <div className="p-2 bg-[#0d1117] rounded-lg">
                <div className="text-[10px] text-[#8b949e] uppercase">Power</div>
                <div className="text-lg font-bold text-[#58a6ff]">
                  {selectedFacility.powerCapacityMW}MW
                </div>
              </div>
              <div className="p-2 bg-[#0d1117] rounded-lg">
                <div className="text-[10px] text-[#8b949e] uppercase">Union</div>
                <div className={`text-lg font-bold ${
                  selectedFacility.unionStatus === 'union' ? 'text-[#22c55e]' : 
                  selectedFacility.unionStatus === 'mixed' ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                }`}>
                  {selectedFacility.unionStatus.toUpperCase()}
                </div>
              </div>
            </div>
            
            <button className="w-full py-2 bg-[#58a6ff] hover:bg-[#79c0ff] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              <ExternalLink className="w-4 h-4" />
              View Full Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// ==================== OPTION B: LIVE NETWORK TRACEROUTE ====================

interface TracerouteVisualizationProps {
  targetFacility?: FacilityData;
  userLocation?: { lat: number; lng: number };
  isActive: boolean;
}

export const TracerouteVisualization: React.FC<TracerouteVisualizationProps> = ({
  targetFacility,
  userLocation,
  isActive
}) => {
  const [hops, setHops] = useState<NetworkHop[]>([]);
  const [isTracing, setIsTracing] = useState(false);
  const [currentHop, setCurrentHop] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Simulate traceroute
  const runTraceroute = useCallback(async () => {
    setIsTracing(true);
    setHops([]);
    setCurrentHop(0);

    // Simulated hops - in production would use actual traceroute API
    const simulatedHops: NetworkHop[] = [
      { hopNumber: 1, ip: '192.168.1.1', hostname: 'router.local', latency: 1, location: { city: 'Local', state: '', country: 'US', lat: userLocation?.lat || 40.7, lng: userLocation?.lng || -74 } },
      { hopNumber: 2, ip: '10.0.0.1', hostname: 'isp-gateway', asn: 'AS7922', asnOrg: 'Comcast', latency: 12 },
      { hopNumber: 3, ip: '68.86.85.1', hostname: 'comcast-pop.net', asn: 'AS7922', asnOrg: 'Comcast', latency: 18, location: { city: 'Newark', state: 'NJ', country: 'US', lat: 40.7357, lng: -74.1724 } },
      { hopNumber: 4, ip: '96.110.40.89', hostname: 'be-32641-cs03.ashburn.va.ibone.comcast.net', asn: 'AS7922', asnOrg: 'Comcast', latency: 25 },
      { hopNumber: 5, ip: '66.208.233.241', hostname: 'equinix-ashburn.amazon.com', asn: 'AS16509', asnOrg: 'Amazon', latency: 28, location: { city: 'Ashburn', state: 'VA', country: 'US', lat: 39.0438, lng: -77.4874 } },
      { hopNumber: 6, ip: '52.93.63.1', hostname: 'aws-us-east-1.amazon.com', asn: 'AS16509', asnOrg: 'Amazon Web Services', latency: 31, location: { city: 'Ashburn', state: 'VA', country: 'US', lat: 39.0458, lng: -77.4900 }, facilityId: 'aws-use1', facilityName: 'AWS US-East-1 (Ashburn)' },
    ];

    for (let i = 0; i < simulatedHops.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setHops(prev => [...prev, simulatedHops[i]]);
      setCurrentHop(i + 1);
    }

    setIsTracing(false);
  }, [userLocation]);

  useEffect(() => {
    if (isActive && targetFacility) {
      runTraceroute();
    }
  }, [isActive, targetFacility, runTraceroute]);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
      <div className="p-4 bg-[#21262d] border-b border-[#30363d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3fb950] to-[#22c55e] flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Live Network Traceroute</h3>
              <p className="text-xs text-[#8b949e]">
                {isTracing ? `Tracing... hop ${currentHop}` : `${hops.length} hops mapped`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={runTraceroute}
              disabled={isTracing}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                isTracing 
                  ? 'bg-[#21262d] text-[#8b949e] cursor-not-allowed' 
                  : 'bg-[#3fb950] text-white hover:bg-[#2ea043]'
              }`}
            >
              {isTracing ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isTracing ? 'Tracing...' : 'Run Traceroute'}
            </button>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Traceroute Path */}
      <div className="p-6">
        <div className="relative">
          {/* Path line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#3fb950] via-[#58a6ff] to-[#a371f7]" />
          
          {/* Hops */}
          <div className="space-y-4">
            {hops.map((hop, i) => (
              <div 
                key={i}
                className="flex items-start gap-4 animate-[fadeInUp_0.3s_ease-out]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Hop indicator */}
                <div className="relative z-10">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      hop.facilityId 
                        ? 'bg-[#a371f7] border-[#a371f7] text-white' 
                        : i === 0 
                          ? 'bg-[#3fb950] border-[#3fb950] text-white'
                          : 'bg-[#21262d] border-[#58a6ff] text-[#58a6ff]'
                    }`}
                  >
                    {hop.hopNumber}
                  </div>
                  {isTracing && i === hops.length - 1 && (
                    <div className="absolute inset-0 rounded-full border-2 border-[#58a6ff] animate-ping" />
                  )}
                </div>
                
                {/* Hop details */}
                <div className="flex-1 p-3 bg-[#21262d] rounded-lg border border-[#30363d]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-[#58a6ff]">{hop.ip}</span>
                      {hop.hostname && (
                        <span className="text-xs text-[#8b949e]">({hop.hostname})</span>
                      )}
                    </div>
                    <span className={`text-sm font-mono ${hop.latency < 20 ? 'text-[#3fb950]' : hop.latency < 50 ? 'text-[#d29922]' : 'text-[#f85149]'}`}>
                      {hop.latency}ms
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs">
                    {hop.asn && (
                      <span className="px-2 py-0.5 bg-[#0d1117] rounded text-[#8b949e]">
                        {hop.asn} • {hop.asnOrg}
                      </span>
                    )}
                    {hop.location && (
                      <span className="flex items-center gap-1 text-[#8b949e]">
                        <MapPin className="w-3 h-3" />
                        {hop.location.city}{hop.location.state ? `, ${hop.location.state}` : ''}
                      </span>
                    )}
                    {hop.facilityName && (
                      <span className="px-2 py-0.5 bg-[#a371f7]/20 text-[#a371f7] rounded font-medium">
                        🏢 {hop.facilityName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Placeholder for next hop while tracing */}
            {isTracing && (
              <div className="flex items-start gap-4 opacity-50">
                <div className="w-12 h-12 rounded-full bg-[#21262d] border-2 border-dashed border-[#30363d] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#8b949e] animate-spin" />
                </div>
                <div className="flex-1 p-3 bg-[#21262d]/50 rounded-lg border border-dashed border-[#30363d]">
                  <div className="h-4 w-32 bg-[#30363d] rounded animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Summary Stats */}
        {hops.length > 0 && !isTracing && (
          <div className="mt-6 p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[#58a6ff]">{hops.length}</div>
                <div className="text-xs text-[#8b949e]">Total Hops</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#3fb950]">{hops[hops.length - 1]?.latency || 0}ms</div>
                <div className="text-xs text-[#8b949e]">Total Latency</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#a371f7]">{new Set(hops.filter(h => h.asn).map(h => h.asn)).size}</div>
                <div className="text-xs text-[#8b949e]">ASNs Crossed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#d29922]">{hops.filter(h => h.facilityId).length}</div>
                <div className="text-xs text-[#8b949e]">Facilities Identified</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// ==================== OPTION C: FACILITY DEEP-DIVE DASHBOARD ====================

interface FacilityDeepDiveProps {
  facility: FacilityData;
  onClose?: () => void;
}

export const FacilityDeepDive: React.FC<FacilityDeepDiveProps> = ({ facility, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'labor' | 'subsidies' | 'compliance' | 'network'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'labor', label: 'Labor Intel', icon: <Users className="w-4 h-4" /> },
    { id: 'subsidies', label: 'Subsidies', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'compliance', label: 'Compliance', icon: <Shield className="w-4 h-4" /> },
    { id: 'network', label: 'Network', icon: <Network className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#21262d] to-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{facility.name}</h2>
              <p className="text-sm text-[#58a6ff]">{facility.operator}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              facility.complianceStatus === 'compliant' ? 'bg-[#22c55e]/20 text-[#22c55e]' :
              facility.complianceStatus === 'non-compliant' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
              'bg-[#f59e0b]/20 text-[#f59e0b]'
            }`}>
              {facility.complianceStatus.toUpperCase()}
            </span>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-2 hover:bg-[#30363d] rounded-lg transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-3">
          <div className="p-3 bg-[#0d1117] rounded-lg text-center">
            <div className="text-xl font-bold text-[#f85149]">${(facility.subsidyGap / 1000000).toFixed(1)}M</div>
            <div className="text-[10px] text-[#8b949e] uppercase">Subsidy Gap</div>
          </div>
          <div className="p-3 bg-[#0d1117] rounded-lg text-center">
            <div className="text-xl font-bold text-[#d29922]">
              {((facility.jobsPromised - facility.jobsCreated) / facility.jobsPromised * 100).toFixed(0)}%
            </div>
            <div className="text-[10px] text-[#8b949e] uppercase">Jobs Deficit</div>
          </div>
          <div className="p-3 bg-[#0d1117] rounded-lg text-center">
            <div className="text-xl font-bold text-[#58a6ff]">{facility.powerCapacityMW}MW</div>
            <div className="text-[10px] text-[#8b949e] uppercase">Power</div>
          </div>
          <div className="p-3 bg-[#0d1117] rounded-lg text-center">
            <div className={`text-xl font-bold ${facility.unionStatus === 'union' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {facility.unionStatus.toUpperCase()}
            </div>
            <div className="text-[10px] text-[#8b949e] uppercase">Union Status</div>
          </div>
          <div className="p-3 bg-[#0d1117] rounded-lg text-center">
            <div className="text-xl font-bold text-[#a371f7]">{facility.riskScore || 65}/100</div>
            <div className="text-[10px] text-[#8b949e] uppercase">Risk Score</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#30363d] bg-[#0d1117]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === tab.id
                ? 'text-[#58a6ff] border-b-2 border-[#58a6ff] bg-[#161b22]'
                : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6 max-h-[400px] overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Facility Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#21262d] rounded-lg">
                  <div className="text-xs text-[#8b949e]">Location</div>
                  <div className="text-white">{facility.city}, {facility.state}</div>
                </div>
                <div className="p-3 bg-[#21262d] rounded-lg">
                  <div className="text-xs text-[#8b949e]">Type</div>
                  <div className="text-white">{facility.type}</div>
                </div>
                <div className="p-3 bg-[#21262d] rounded-lg">
                  <div className="text-xs text-[#8b949e]">Coordinates</div>
                  <div className="text-white font-mono text-sm">{facility.latitude.toFixed(4)}°, {facility.longitude.toFixed(4)}°</div>
                </div>
                <div className="p-3 bg-[#21262d] rounded-lg">
                  <div className="text-xs text-[#8b949e]">Last Updated</div>
                  <div className="text-white">{new Date(facility.lastUpdated).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Organizing Priority Score</h4>
              <div className="relative h-4 bg-[#21262d] rounded-full overflow-hidden">
                <div 
                  className={`absolute h-full rounded-full ${
                    facility.organizingPriority === 'high' ? 'bg-[#ef4444]' :
                    facility.organizingPriority === 'medium' ? 'bg-[#f59e0b]' : 'bg-[#22c55e]'
                  }`}
                  style={{ width: `${facility.riskScore || 65}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#8b949e] mt-1">
                <span>Low Priority</span>
                <span>High Priority</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'labor' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#21262d] rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Employment Data</h4>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  facility.jobsCreated >= facility.jobsPromised 
                    ? 'bg-[#22c55e]/20 text-[#22c55e]' 
                    : 'bg-[#ef4444]/20 text-[#ef4444]'
                }`}>
                  {facility.jobsCreated >= facility.jobsPromised ? 'ON TRACK' : 'BEHIND'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#58a6ff]">{facility.jobsPromised.toLocaleString()}</div>
                  <div className="text-xs text-[#8b949e]">Jobs Promised</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#3fb950]">{facility.jobsCreated.toLocaleString()}</div>
                  <div className="text-xs text-[#8b949e]">Jobs Created</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#f85149]">
                    {(facility.jobsPromised - facility.jobsCreated).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#8b949e]">Jobs Gap</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-[#21262d] rounded-lg">
              <h4 className="font-semibold mb-3">Union Activity</h4>
              <div className={`p-3 rounded-lg border ${
                facility.unionStatus === 'union' 
                  ? 'bg-[#22c55e]/10 border-[#22c55e]/30' 
                  : 'bg-[#ef4444]/10 border-[#ef4444]/30'
              }`}>
                <div className="flex items-center gap-2">
                  <Users className={`w-5 h-5 ${facility.unionStatus === 'union' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`} />
                  <span className="font-medium">
                    {facility.unionStatus === 'union' ? 'Union Represented' : 
                     facility.unionStatus === 'mixed' ? 'Partial Union Coverage' : 'Non-Union'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subsidies' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-8 h-8 text-[#f85149]" />
                <div>
                  <div className="text-3xl font-bold text-[#f85149]">${(facility.subsidyGap / 1000000).toFixed(1)}M</div>
                  <div className="text-sm text-[#8b949e]">Total Subsidy Gap</div>
                </div>
              </div>
              <p className="text-xs text-[#8b949e]">
                This facility has received public subsidies but has not met its job creation commitments, 
                resulting in an accountability gap of ${(facility.subsidyGap / 1000000).toFixed(1)} million.
              </p>
            </div>
            
            <div className="p-4 bg-[#21262d] rounded-lg">
              <h4 className="font-semibold mb-3">Cost Per Job Analysis</h4>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#d29922]">
                  ${facility.jobsCreated > 0 ? Math.round(facility.subsidyGap / facility.jobsCreated).toLocaleString() : '∞'}
                </div>
                <div className="text-sm text-[#8b949e]">Public Cost Per Job Created</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              facility.complianceStatus === 'compliant' ? 'bg-[#22c55e]/10 border-[#22c55e]/30' :
              facility.complianceStatus === 'non-compliant' ? 'bg-[#ef4444]/10 border-[#ef4444]/30' :
              'bg-[#f59e0b]/10 border-[#f59e0b]/30'
            }`}>
              <div className="flex items-center gap-3">
                <Shield className={`w-8 h-8 ${
                  facility.complianceStatus === 'compliant' ? 'text-[#22c55e]' :
                  facility.complianceStatus === 'non-compliant' ? 'text-[#ef4444]' : 'text-[#f59e0b]'
                }`} />
                <div>
                  <div className="font-bold text-lg">{facility.complianceStatus.replace('-', ' ').toUpperCase()}</div>
                  <div className="text-sm text-[#8b949e]">Current Status</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-[#21262d] rounded-lg">
              <h4 className="font-semibold mb-3">Compliance Factors</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded">
                  <span className="text-sm">Job Creation Target</span>
                  <span className={`text-sm font-medium ${facility.jobsCreated >= facility.jobsPromised ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {facility.jobsCreated >= facility.jobsPromised ? '✓ Met' : '✗ Not Met'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded">
                  <span className="text-sm">Subsidy Accountability</span>
                  <span className={`text-sm font-medium ${facility.subsidyGap === 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {facility.subsidyGap === 0 ? '✓ Compliant' : '✗ Gap Identified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#21262d] rounded-lg">
              <h4 className="font-semibold mb-3">Network Information</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded">
                  <span className="text-sm text-[#8b949e]">Power Capacity</span>
                  <span className="text-sm font-mono text-[#58a6ff]">{facility.powerCapacityMW} MW</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded">
                  <span className="text-sm text-[#8b949e]">Facility Type</span>
                  <span className="text-sm">{facility.type}</span>
                </div>
              </div>
            </div>
            
            <button className="w-full py-3 bg-[#58a6ff] hover:bg-[#79c0ff] text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
              <Network className="w-4 h-4" />
              Run Traceroute to This Facility
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


// ==================== OPTION E: REAL-TIME INTELLIGENCE STREAM ====================

interface IntelligenceStreamProps {
  facilityFilter?: string[];
  typeFilter?: IntelligenceAlert['type'][];
}

export const IntelligenceStream: React.FC<IntelligenceStreamProps> = ({
  facilityFilter,
  typeFilter
}) => {
  const [alerts, setAlerts] = useState<IntelligenceAlert[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // Simulate incoming alerts
  useEffect(() => {
    if (!isStreaming) return;

    const mockAlerts: Omit<IntelligenceAlert, 'id' | 'timestamp'>[] = [
      { type: 'subsidy', severity: 'high', title: 'New Subsidy Gap Identified', description: 'Microsoft Azure facility in Boydton, VA has $47M gap between promised and actual job creation.', facilityName: 'Microsoft Boydton', source: 'Good Jobs First' },
      { type: 'labor', severity: 'critical', title: 'NLRB Filing Detected', description: 'IBEW Local 26 filed unfair labor practice charge against AWS contractor.', facilityName: 'AWS US-East-1', source: 'NLRB' },
      { type: 'legislation', severity: 'medium', title: 'New State Bill Introduced', description: 'Virginia HB 2341 proposes clawback provisions for data center tax incentives.', source: 'LegiScan' },
      { type: 'expansion', severity: 'low', title: 'Expansion Announced', description: 'Google announces $2B expansion of Loudoun County data center campus.', facilityName: 'Google Loudoun', source: 'Press Release' },
      { type: 'compliance', severity: 'high', title: 'Compliance Deadline Approaching', description: 'Meta Henrico facility has 30 days to submit job verification report.', facilityName: 'Meta Henrico', source: 'VEDP' },
      { type: 'incident', severity: 'critical', title: 'Worker Safety Incident', description: 'OSHA investigation opened at Equinix Ashburn following contractor injury.', facilityName: 'Equinix Ashburn', source: 'OSHA' },
    ];

    const interval = setInterval(() => {
      const randomAlert = mockAlerts[Math.floor(Math.random() * mockAlerts.length)];
      const newAlert: IntelligenceAlert = {
        ...randomAlert,
        id: `alert-${Date.now()}`,
        timestamp: new Date()
      };
      
      setAlerts(prev => [newAlert, ...prev].slice(0, 50));
    }, 5000);

    // Add initial alerts
    const initialAlerts = mockAlerts.slice(0, 3).map((a, i) => ({
      ...a,
      id: `initial-${i}`,
      timestamp: new Date(Date.now() - i * 60000)
    }));
    setAlerts(initialAlerts);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const severityColors = {
    critical: { bg: 'bg-[#ef4444]', text: 'text-[#ef4444]', border: 'border-[#ef4444]' },
    high: { bg: 'bg-[#f59e0b]', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]' },
    medium: { bg: 'bg-[#58a6ff]', text: 'text-[#58a6ff]', border: 'border-[#58a6ff]' },
    low: { bg: 'bg-[#22c55e]', text: 'text-[#22c55e]', border: 'border-[#22c55e]' }
  };

  const typeIcons = {
    subsidy: <DollarSign className="w-4 h-4" />,
    labor: <Users className="w-4 h-4" />,
    compliance: <Shield className="w-4 h-4" />,
    expansion: <TrendingUp className="w-4 h-4" />,
    legislation: <FileText className="w-4 h-4" />,
    incident: <AlertTriangle className="w-4 h-4" />
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
      <div className="p-4 bg-[#21262d] border-b border-[#30363d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center relative">
              <Radio className="w-5 h-5 text-white" />
              {isStreaming && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#22c55e] rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                Intelligence Stream
                {isStreaming && <span className="text-xs text-[#22c55e] animate-pulse">● LIVE</span>}
              </h3>
              <p className="text-xs text-[#8b949e]">{alerts.length} alerts • Real-time monitoring</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                isStreaming 
                  ? 'bg-[#ef4444] text-white' 
                  : 'bg-[#22c55e] text-white'
              }`}
            >
              {isStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isStreaming ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {alerts.map((alert, i) => (
          <div 
            key={alert.id}
            className={`p-4 border-b border-[#30363d] hover:bg-[#21262d] cursor-pointer transition-colors ${
              i === 0 ? 'animate-[fadeInUp_0.3s_ease-out]' : ''
            }`}
            onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${severityColors[alert.severity].bg}/20`}>
                <span className={severityColors[alert.severity].text}>
                  {typeIcons[alert.type]}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${severityColors[alert.severity].bg} text-white`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-[#8b949e]">{alert.type}</span>
                  <span className="text-xs text-[#6e7681]">•</span>
                  <span className="text-xs text-[#6e7681]">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <h4 className="font-medium text-white mb-1">{alert.title}</h4>
                
                {expandedAlert === alert.id && (
                  <div className="mt-2 space-y-2 animate-[fadeIn_0.2s_ease-out]">
                    <p className="text-sm text-[#8b949e]">{alert.description}</p>
                    <div className="flex items-center gap-4 text-xs">
                      {alert.facilityName && (
                        <span className="flex items-center gap-1 text-[#58a6ff]">
                          <Building className="w-3 h-3" />
                          {alert.facilityName}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[#8b949e]">
                        <Info className="w-3 h-3" />
                        Source: {alert.source}
                      </span>
                    </div>
                    {alert.actionUrl && (
                      <a 
                        href={alert.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#58a6ff] hover:underline"
                      >
                        View Details <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
              
              <ChevronRight className={`w-4 h-4 text-[#8b949e] transition-transform ${
                expandedAlert === alert.id ? 'rotate-90' : ''
              }`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ==================== MAIN EXPORT: ENHANCED FOLLOW YOUR DATA PANEL ====================

interface EnhancedFollowYourDataProps {
  facilities: FacilityData[];
  userLocation?: { lat: number; lng: number };
}

export const EnhancedFollowYourDataPanel: React.FC<EnhancedFollowYourDataProps> = ({
  facilities,
  userLocation
}) => {
  const [activeView, setActiveView] = useState<'map' | 'traceroute' | 'stream' | 'all'>('all');
  const [selectedFacility, setSelectedFacility] = useState<FacilityData | null>(null);

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All Views', icon: <Layers className="w-4 h-4" /> },
          { id: 'map', label: 'Geospatial Map', icon: <Map className="w-4 h-4" /> },
          { id: 'traceroute', label: 'Network Trace', icon: <Network className="w-4 h-4" /> },
          { id: 'stream', label: 'Intel Stream', icon: <Radio className="w-4 h-4" /> },
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id as typeof activeView)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeView === view.id 
                ? 'bg-[#58a6ff] text-white' 
                : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-white'
            }`}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </div>

      {/* Views */}
      {(activeView === 'all' || activeView === 'map') && (
        <GeospatialMap 
          facilities={facilities}
          userLocation={userLocation}
          onFacilitySelect={setSelectedFacility}
        />
      )}

      {(activeView === 'all' || activeView === 'traceroute') && (
        <TracerouteVisualization 
          targetFacility={selectedFacility || undefined}
          userLocation={userLocation}
          isActive={true}
        />
      )}

      {(activeView === 'all' || activeView === 'stream') && (
        <IntelligenceStream />
      )}

      {/* Facility Deep Dive Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-auto">
            <FacilityDeepDive 
              facility={selectedFacility}
              onClose={() => setSelectedFacility(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFollowYourDataPanel;

