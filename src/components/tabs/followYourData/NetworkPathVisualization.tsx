/**
 * Network Path Visualization
 * 
 * Animated data packet flow showing:
 * User Device → ISP → IXP → Data Center
 * 
 * Uses CSS animations for data packets flowing through network nodes.
 */

import React, { useEffect, useState } from 'react';
import { Laptop, Building, Network, Server, ArrowRight, Zap, Info, X, ExternalLink, Shield, AlertTriangle } from 'lucide-react';

interface NetworkPathVisualizationProps {
  isActive: boolean;
  userLocation: {
    city: string;
    state: string;
  };
}

interface NetworkNode {
  id: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  color: string;
  hops: string;
  details: {
    asn?: string;
    owner?: string;
    location?: string;
    privacy?: 'high' | 'medium' | 'low';
    note?: string;
    link?: string;
  };
}

export const NetworkPathVisualization: React.FC<NetworkPathVisualizationProps> = ({
  isActive,
  userLocation
}) => {
  const [animationStep, setAnimationStep] = useState(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      setAnimationStep(0);
      return;
    }

    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 4);
    }, 1500);

    return () => clearInterval(interval);
  }, [isActive]);

  const nodes: NetworkNode[] = [
    {
      id: 'user',
      icon: <Laptop className="w-6 h-6" />,
      label: 'Your Device',
      sublabel: `${userLocation.city}, ${userLocation.state}`,
      color: '#3fb950',
      hops: '',
      details: {
        privacy: 'high',
        note: 'Your location is processed locally in your browser and never sent to any server.',
        location: `${userLocation.city}, ${userLocation.state}`
      }
    },
    {
      id: 'isp',
      icon: <Building className="w-6 h-6" />,
      label: 'Local ISP',
      sublabel: 'Optimum / AS6128',
      color: '#58a6ff',
      hops: '+3ms',
      details: {
        asn: 'AS6128',
        owner: 'Cablevision Systems Corp (Altice USA)',
        location: 'Bethpage, NY',
        privacy: 'medium',
        note: 'Your ISP can see all unencrypted traffic and DNS queries.',
        link: 'https://bgp.he.net/AS6128'
      }
    },
    {
      id: 'ixp',
      icon: <Network className="w-6 h-6" />,
      label: 'NYIIX Exchange',
      sublabel: '60 Hudson Street',
      color: '#a371f7',
      hops: '+8ms',
      details: {
        asn: 'IX-NYC',
        owner: 'Telehouse America',
        location: '60 Hudson Street, Manhattan',
        privacy: 'medium',
        note: 'Major internet exchange point where 150+ networks peer. Critical infrastructure for NYC internet.',
        link: 'https://www.peeringdb.com/ix/13'
      }
    },
    {
      id: 'datacenter',
      icon: <Server className="w-6 h-6" />,
      label: 'AWS US-East-1',
      sublabel: 'Ashburn, Virginia',
      color: '#d29922',
      hops: '+14ms',
      details: {
        asn: 'AS16509',
        owner: 'Amazon.com, Inc.',
        location: 'Ashburn, Virginia (Data Center Alley)',
        privacy: 'low',
        note: 'AWS US-East-1 hosts ~33% of the internet. Subject to Virginia data center laws.',
        link: 'https://aws.amazon.com/about-aws/global-infrastructure/'
      }
    }
  ];

  return (
    <div className="px-6 py-8 border-t border-[#30363d]">
      <h3 className="text-sm font-semibold text-[#8b949e] mb-6 uppercase tracking-wider">
        Your Data Path
      </h3>

      <div className="relative">
        {/* Connection Lines */}
        <div className="absolute top-1/2 left-[50px] right-[50px] h-[2px] bg-gradient-to-r from-[#3fb950] via-[#58a6ff] via-[#a371f7] to-[#d29922] -translate-y-1/2 opacity-30" />

        {/* Animated Packets */}
        {isActive && (
          <div className="absolute top-1/2 left-[50px] right-[50px] -translate-y-1/2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full animate-pulse"
                style={{
                  background: 'linear-gradient(135deg, #3fb950, #58a6ff)',
                  boxShadow: '0 0 10px rgba(88, 166, 255, 0.5)',
                  left: `${((animationStep + i) % 4) * 33}%`,
                  transition: 'left 0.5s ease-out',
                  opacity: ((animationStep + i) % 4) < 3 ? 1 : 0
                }}
              />
            ))}
          </div>
        )}

        {/* Network Nodes */}
        <div className="relative flex justify-between items-center">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <div className="flex flex-col items-center gap-3 z-10 relative">
                {/* Node Circle - Now Clickable */}
                <button 
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 ${
                    isActive && animationStep >= index 
                      ? 'scale-110' 
                      : ''
                  } ${selectedNode === node.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d1117]' : ''}`}
                  style={{
                    background: `${node.color}20`,
                    border: `2px solid ${node.color}`,
                    boxShadow: isActive && animationStep >= index 
                      ? `0 0 20px ${node.color}40` 
                      : 'none'
                  }}
                >
                  <div style={{ color: node.color }}>
                    {node.icon}
                  </div>
                </button>

                {/* Info indicator */}
                <div className="absolute -top-1 -right-1">
                  <Info className="w-4 h-4 text-[#8b949e]" />
                </div>

                {/* Node Labels */}
                <div className="text-center">
                  <div className="font-semibold text-sm">{node.label}</div>
                  <div className="text-xs text-[#8b949e]">{node.sublabel}</div>
                </div>

                {/* Hop Time */}
                {node.hops && (
                  <div 
                    className="text-xs font-mono px-2 py-1 rounded"
                    style={{ 
                      background: `${node.color}20`,
                      color: node.color
                    }}
                  >
                    {node.hops}
                  </div>
                )}

                {/* Detail Popup */}
                {selectedNode === node.id && (
                  <div 
                    className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-72 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-4 z-50 animate-fadeIn"
                    style={{ borderTopColor: node.color, borderTopWidth: '3px' }}
                  >
                    <button 
                      onClick={() => setSelectedNode(null)}
                      className="absolute top-2 right-2 text-[#8b949e] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <h4 className="font-semibold mb-3" style={{ color: node.color }}>{node.label}</h4>
                    
                    {node.details.asn && (
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-[#8b949e]">ASN:</span>
                        <span className="font-mono text-[#e6edf3]">{node.details.asn}</span>
                      </div>
                    )}
                    {node.details.owner && (
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-[#8b949e]">Owner:</span>
                        <span className="text-[#e6edf3]">{node.details.owner}</span>
                      </div>
                    )}
                    {node.details.location && (
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-[#8b949e]">Location:</span>
                        <span className="text-[#e6edf3]">{node.details.location}</span>
                      </div>
                    )}
                    
                    {/* Privacy indicator */}
                    <div className="flex items-center gap-2 mt-3 mb-3">
                      <span className="text-xs text-[#8b949e]">Privacy:</span>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        node.details.privacy === 'high' ? 'bg-[#238636]/20 text-[#3fb950]' :
                        node.details.privacy === 'medium' ? 'bg-[#d29922]/20 text-[#d29922]' :
                        'bg-[#da3633]/20 text-[#f85149]'
                      }`}>
                        {node.details.privacy === 'high' ? <Shield className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {node.details.privacy?.toUpperCase()}
                      </div>
                    </div>
                    
                    {node.details.note && (
                      <p className="text-xs text-[#8b949e] border-t border-[#30363d] pt-3 mt-2">
                        {node.details.note}
                      </p>
                    )}
                    
                    {node.details.link && (
                      <a 
                        href={node.details.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#58a6ff] hover:underline mt-3"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Learn more
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow between nodes */}
              {index < nodes.length - 1 && (
                <div className="flex-1 flex justify-center">
                  <ArrowRight 
                    className={`w-5 h-5 transition-all duration-300 ${
                      isActive && animationStep > index 
                        ? 'text-[#58a6ff] scale-125' 
                        : 'text-[#30363d]'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Interactive hint */}
      <p className="text-center text-xs text-[#8b949e] mt-4">
        💡 Click on any node to see detailed information about that hop
      </p>

      {/* Stats Bar */}
      {isActive && (
        <div className="mt-6 grid grid-cols-4 gap-4 p-4 bg-[#21262d] rounded-lg">
          {[
            { label: 'Total Hops', value: '4', color: '#3fb950' },
            { label: 'Total Latency', value: '25ms', color: '#58a6ff' },
            { label: 'Distance', value: '~230 mi', color: '#a371f7' },
            { label: 'Encryption', value: 'TLS 1.3', color: '#d29922' }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-lg font-mono font-semibold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-[#8b949e]">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Path Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-[#8b949e]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#3fb950]" />
          <span>Origin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#58a6ff]" />
          <span>Internet Exchange</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#a371f7]" />
          <span>Peering Point</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#d29922]" />
          <span>Cloud Region</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkPathVisualization;

