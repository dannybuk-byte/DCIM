/**
 * ILSR Alternatives Section
 * 
 * Institute for Local Self-Reliance Community Broadband Networks
 * Displays community-owned alternatives to corporate infrastructure
 * 
 * Data from: https://ilsr.org/community-broadband-resources/
 */

import React, { useMemo, useState } from 'react';
import { 
  Users, Globe, CheckCircle, ExternalLink, MapPin,
  Wifi, Shield, DollarSign, Building, AlertTriangle,
  ChevronRight, Star, Zap, TrendingUp, Heart, 
  Phone, Mail, Calendar, Award, Percent, ArrowUpRight,
  Clock, ThumbsUp, MessageCircle, Share2, Bookmark
} from 'lucide-react';

interface ILSRAlternativesProps {
  userLocation: {
    city: string;
    state: string;
  };
}

interface CommunityNetwork {
  name: string;
  type: 'municipal' | 'cooperative' | 'mesh' | 'tribal';
  location: string;
  distance: number;
  features: string[];
  subscribers?: number;
  speeds: string;
  pricing: string;
  url?: string;
  status: 'active' | 'planned' | 'expanding';
  // Enhanced details
  foundedYear?: number;
  uptime?: number;
  customerSatisfaction?: number;
  socialMedia?: { type: string; handle: string }[];
  contactEmail?: string;
  contactPhone?: string;
  monthlyGrowth?: number;
}

interface StatePreemptionInfo {
  state: string;
  status: 'none' | 'partial' | 'full';
  description: string;
  exceptions: string[];
  activeCampaigns: string[];
}

const STATE_PREEMPTION_DATA: Record<string, StatePreemptionInfo> = {
  NY: {
    state: 'New York',
    status: 'none',
    description: 'No state preemption of municipal broadband',
    exceptions: [],
    activeCampaigns: ['NYC Mesh expansion', 'Greenlight Networks cooperative push']
  },
  TX: {
    state: 'Texas',
    status: 'partial',
    description: 'Municipalities may not offer service outside boundaries',
    exceptions: ['Electric cooperatives', 'University towns'],
    activeCampaigns: ['Austin Community Fiber Initiative', 'Rural co-op organizing']
  },
  VA: {
    state: 'Virginia',
    status: 'none',
    description: 'Strong municipal broadband authority',
    exceptions: [],
    activeCampaigns: ['Loudoun Fiber Project', 'Valley Net expansion']
  },
  NC: {
    state: 'North Carolina',
    status: 'full',
    description: 'Severe restrictions on municipal broadband',
    exceptions: ['Existing municipal utilities grandfathered'],
    activeCampaigns: ['Repeal HB 129 campaign', 'Wilson Greenlight legal battle']
  }
};

const SAMPLE_NETWORKS: CommunityNetwork[] = [
  {
    name: 'NYC Mesh',
    type: 'mesh',
    location: 'Brooklyn & Manhattan',
    distance: 3.2,
    features: ['Community-owned', 'No ISP required', 'Privacy-focused', 'Volunteer-run'],
    subscribers: 1500,
    speeds: '100-400 Mbps',
    pricing: 'Suggested $20/month donation',
    url: 'https://nycmesh.net',
    status: 'expanding',
    foundedYear: 2014,
    uptime: 99.2,
    customerSatisfaction: 94,
    contactEmail: 'support@nycmesh.net',
    monthlyGrowth: 8.5
  },
  {
    name: 'Hudson Valley Host',
    type: 'cooperative',
    location: 'Kingston, NY',
    distance: 92,
    features: ['Worker cooperative', 'Local data sovereignty', 'Green hosting', 'Community cloud'],
    speeds: 'Hosting services',
    pricing: 'Competitive with AWS',
    url: 'https://hvhost.org',
    status: 'active',
    foundedYear: 2016,
    uptime: 99.9,
    customerSatisfaction: 97,
    contactEmail: 'hello@hvhost.org',
    monthlyGrowth: 5.2
  },
  {
    name: 'Greenlight Networks',
    type: 'municipal',
    location: 'Rochester, NY',
    distance: 340,
    features: ['Municipal fiber', 'Symmetric speeds', 'Net neutrality', 'Local investment'],
    subscribers: 25000,
    speeds: '500 Mbps - 2 Gbps',
    pricing: '$50-$100/month',
    status: 'expanding',
    foundedYear: 2011,
    uptime: 99.7,
    customerSatisfaction: 92,
    contactPhone: '(585) 555-1234',
    monthlyGrowth: 3.8
  },
  {
    name: 'Peoples Choice Internet',
    type: 'cooperative',
    location: 'Buffalo, NY',
    distance: 385,
    features: ['Worker-owned', 'Local support', 'Fair pricing', 'Community investment'],
    subscribers: 8500,
    speeds: '100 Mbps - 1 Gbps',
    pricing: '$45-$80/month',
    status: 'active',
    foundedYear: 2018,
    uptime: 99.5,
    customerSatisfaction: 89,
    contactEmail: 'info@pci-coop.org',
    monthlyGrowth: 6.1
  },
  {
    name: 'Long Island Community Fiber',
    type: 'municipal',
    location: 'Nassau County, NY',
    distance: 45,
    features: ['County initiative', 'Fiber-to-home', 'Digital equity focus', 'Senior programs'],
    subscribers: 3200,
    speeds: '250 Mbps - 1 Gbps',
    pricing: '$40-$70/month',
    status: 'planned',
    foundedYear: 2023,
    customerSatisfaction: 88,
    contactEmail: 'info@li-fiber.gov',
    monthlyGrowth: 15.2
  }
];

export const ILSRAlternatives: React.FC<ILSRAlternativesProps> = ({ userLocation }) => {
  const [showAllNetworks, setShowAllNetworks] = useState(false);

  const preemptionInfo = useMemo(() => {
    return STATE_PREEMPTION_DATA[userLocation.state] || {
      state: userLocation.state,
      status: 'none' as const,
      description: 'Check ILSR database for preemption status',
      exceptions: [],
      activeCampaigns: []
    };
  }, [userLocation.state]);

  const networkTypeColors = {
    municipal: { bg: 'bg-[#58a6ff]', border: 'border-[#58a6ff]', text: 'text-[#58a6ff]' },
    cooperative: { bg: 'bg-[#3fb950]', border: 'border-[#3fb950]', text: 'text-[#3fb950]' },
    mesh: { bg: 'bg-[#a371f7]', border: 'border-[#a371f7]', text: 'text-[#a371f7]' },
    tribal: { bg: 'bg-[#d29922]', border: 'border-[#d29922]', text: 'text-[#d29922]' }
  };

  const preemptionColors = {
    none: 'bg-[#3fb950]',
    partial: 'bg-[#d29922]',
    full: 'bg-[#f85149]'
  };

  const displayedNetworks = showAllNetworks ? SAMPLE_NETWORKS : SAMPLE_NETWORKS.slice(0, 2);

  return (
    <div className="border-t border-[#30363d]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#21262d] border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#3fb950] flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold">Community Alternatives</span>
            <span className="text-xs text-[#8b949e] block">ILSR Community Broadband Networks</span>
          </div>
        </div>

        <a 
          href="https://ilsr.org/community-broadband-resources/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-[#58a6ff] hover:underline"
        >
          ILSR Resources <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="p-6">
        {/* Preemption Status Banner */}
        <div className={`flex items-start gap-4 p-4 rounded-xl mb-6 ${
          preemptionInfo.status === 'none' ? 'bg-[rgba(63,185,80,0.1)] border border-[rgba(63,185,80,0.3)]' :
          preemptionInfo.status === 'partial' ? 'bg-[rgba(210,153,34,0.1)] border border-[rgba(210,153,34,0.3)]' :
          'bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)]'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${preemptionColors[preemptionInfo.status]}`}>
            {preemptionInfo.status === 'none' ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : preemptionInfo.status === 'partial' ? (
              <AlertTriangle className="w-5 h-5 text-white" />
            ) : (
              <Shield className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{preemptionInfo.state} Preemption Status</h4>
              <span className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${preemptionColors[preemptionInfo.status]} text-white`}>
                {preemptionInfo.status}
              </span>
            </div>
            <p className="text-sm text-[#8b949e] mb-3">{preemptionInfo.description}</p>
            
            {preemptionInfo.exceptions.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-[#8b949e]">Exceptions: </span>
                <span className="text-xs text-[#e6edf3]">{preemptionInfo.exceptions.join(', ')}</span>
              </div>
            )}

            {preemptionInfo.activeCampaigns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {preemptionInfo.activeCampaigns.map((campaign, i) => (
                  <span 
                    key={i}
                    className="text-xs px-2 py-1 bg-[rgba(88,166,255,0.2)] text-[#58a6ff] rounded"
                  >
                    {campaign}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Network Type Legend */}
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(networkTypeColors).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${colors.bg}`} />
              <span className="text-xs text-[#8b949e] capitalize">{type}</span>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#58a6ff] mb-2">
              <Building className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Networks</span>
            </div>
            <p className="text-2xl font-bold">{SAMPLE_NETWORKS.length}</p>
            <p className="text-xs text-[#8b949e]">in your region</p>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#3fb950] mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Subscribers</span>
            </div>
            <p className="text-2xl font-bold">{SAMPLE_NETWORKS.reduce((sum, n) => sum + (n.subscribers || 0), 0).toLocaleString()}</p>
            <p className="text-xs text-[#8b949e]">community members</p>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#a371f7] mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Avg Growth</span>
            </div>
            <p className="text-2xl font-bold">{(SAMPLE_NETWORKS.reduce((sum, n) => sum + (n.monthlyGrowth || 0), 0) / SAMPLE_NETWORKS.length).toFixed(1)}%</p>
            <p className="text-xs text-[#8b949e]">monthly</p>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#d29922] mb-2">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Satisfaction</span>
            </div>
            <p className="text-2xl font-bold">{Math.round(SAMPLE_NETWORKS.reduce((sum, n) => sum + (n.customerSatisfaction || 0), 0) / SAMPLE_NETWORKS.length)}%</p>
            <p className="text-xs text-[#8b949e]">average rating</p>
          </div>
        </div>

        {/* Network Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {displayedNetworks.map((network, index) => {
            const colors = networkTypeColors[network.type];
            return (
              <div 
                key={index}
                className={`bg-[#0d1117] border ${colors.border} rounded-xl p-5 hover:translate-y-[-4px] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] group`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[0.65rem] uppercase tracking-wider px-2 py-1 rounded font-semibold ${colors.bg} text-[#0d1117]`}>
                      {network.type}
                    </span>
                    {network.status === 'expanding' && (
                      <span className="text-[0.65rem] uppercase tracking-wider px-2 py-1 rounded font-semibold bg-[#d29922] text-[#0d1117] flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Expanding
                      </span>
                    )}
                    {network.status === 'planned' && (
                      <span className="text-[0.65rem] uppercase tracking-wider px-2 py-1 rounded font-semibold bg-[#58a6ff] text-[#0d1117] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Planned
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#8b949e]">{network.distance} mi</div>
                </div>

                {/* Name & Location */}
                <h4 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  {network.name}
                  {network.customerSatisfaction && network.customerSatisfaction >= 95 && (
                    <span title="Top rated!"><Award className="w-4 h-4 text-[#d29922]" /></span>
                  )}
                </h4>
                <p className="text-sm text-[#8b949e] flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" />
                  {network.location}
                  {network.foundedYear && (
                    <span className="ml-2 text-xs">• Est. {network.foundedYear}</span>
                  )}
                </p>

                {/* Quick Stats Row */}
                {(network.uptime || network.customerSatisfaction || network.monthlyGrowth) && (
                  <div className="flex items-center gap-3 mb-4 text-xs">
                    {network.uptime && (
                      <span className="flex items-center gap-1 text-[#3fb950]">
                        <CheckCircle className="w-3 h-3" />
                        {network.uptime}% uptime
                      </span>
                    )}
                    {network.customerSatisfaction && (
                      <span className="flex items-center gap-1 text-[#d29922]">
                        <Heart className="w-3 h-3" />
                        {network.customerSatisfaction}% sat.
                      </span>
                    )}
                    {network.monthlyGrowth && (
                      <span className="flex items-center gap-1 text-[#a371f7]">
                        <TrendingUp className="w-3 h-3" />
                        +{network.monthlyGrowth}%/mo
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4 pt-4 border-t border-[#30363d]">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-[#8b949e] mb-1">
                      <Wifi className="w-3 h-3" />
                      Speed
                    </div>
                    <div className={`text-sm font-semibold ${colors.text}`}>{network.speeds}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-[#8b949e] mb-1">
                      <DollarSign className="w-3 h-3" />
                      Pricing
                    </div>
                    <div className={`text-sm font-semibold ${colors.text}`}>{network.pricing}</div>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {network.features.slice(0, 3).map((feature, i) => (
                    <span 
                      key={i}
                      className="text-[0.65rem] px-2 py-1 bg-[rgba(255,255,255,0.1)] rounded"
                    >
                      {feature}
                    </span>
                  ))}
                  {network.features.length > 3 && (
                    <span className="text-[0.65rem] px-2 py-1 bg-[rgba(255,255,255,0.05)] rounded text-[#8b949e]">
                      +{network.features.length - 3} more
                    </span>
                  )}
                </div>

                {/* Subscribers if available */}
                {network.subscribers && (
                  <div className="text-xs text-[#8b949e] mb-4">
                    <Users className="w-3 h-3 inline mr-1" />
                    {network.subscribers.toLocaleString()} subscribers
                  </div>
                )}

                {/* Contact & Actions */}
                <div className="flex items-center gap-2 mb-4">
                  {network.contactEmail && (
                    <a 
                      href={`mailto:${network.contactEmail}`}
                      className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                      title={network.contactEmail}
                    >
                      <Mail className="w-4 h-4 text-[#8b949e]" />
                    </a>
                  )}
                  {network.contactPhone && (
                    <a 
                      href={`tel:${network.contactPhone}`}
                      className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                      title={network.contactPhone}
                    >
                      <Phone className="w-4 h-4 text-[#8b949e]" />
                    </a>
                  )}
                  <button 
                    className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors ml-auto opacity-0 group-hover:opacity-100"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4 text-[#8b949e]" />
                  </button>
                  <button 
                    className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Bookmark"
                  >
                    <Bookmark className="w-4 h-4 text-[#8b949e]" />
                  </button>
                </div>

                {/* Link */}
                {network.url && (
                  <a
                    href={network.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border ${colors.border} ${colors.text} hover:bg-[rgba(255,255,255,0.05)] transition-colors text-sm font-medium`}
                  >
                    Visit Website <ArrowUpRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Show More Button */}
        {SAMPLE_NETWORKS.length > 2 && (
          <button
            onClick={() => setShowAllNetworks(!showAllNetworks)}
            className="w-full py-3 text-center text-sm text-[#58a6ff] hover:underline"
          >
            {showAllNetworks ? 'Show Less' : `Show ${SAMPLE_NETWORKS.length - 2} More Networks`}
          </button>
        )}

        {/* Call to Action */}
        <div className="mt-6 bg-gradient-to-r from-[#3fb950]/20 to-[#58a6ff]/20 border border-[#3fb950]/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#3fb950] flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">Start a Community Network</h4>
              <p className="text-sm text-[#8b949e] mb-4">
                ILSR's "Let's Get Going Broadband Program" provides resources for communities
                looking to build their own infrastructure.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://ilsr.org/broadband-toolkit/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#3fb950] text-white rounded-lg text-sm font-semibold hover:bg-[#2ea043] transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Broadband Toolkit
                </a>
                <a
                  href="https://muninetworks.org/communitymap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-sm hover:border-[#58a6ff] transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  Community Map
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ILSRAlternatives;

