/**
 * Network Discovery Dashboard
 * 
 * Displays comprehensive network intelligence for facilities using
 * DNS-over-HTTPS and RIPEstat APIs.
 * 
 * Organizer-friendly presentation with plain language insights.
 */

import React, { useState, useEffect } from 'react';
import { Globe, Network, Shield, MapPin, Server, AlertTriangle, Info } from 'lucide-react';
import { getFacilityDNSInfo, detectDataCenterPatterns, type FacilityDNSInfo } from '../utils/dnsRecon';
import { getFacilityNetworkIntel, type GeolocationInfo, type NetworkInfo, type AbuseContact } from '../utils/ripestat';
import { resolveFacilityDomainLinkage } from '../utils/entityFacilityLinkage';
import type { Facility } from '../types';

interface NetworkDiscoveryProps {
  facility: Facility;
  domain?: string; // Optional domain override
  className?: string;
}

export const NetworkDiscovery: React.FC<NetworkDiscoveryProps> = React.memo(({ 
  facility, 
  domain,
  className = '' 
}) => {
  const [loading, setLoading] = useState(true);
  const [dnsInfo, setDnsInfo] = useState<FacilityDNSInfo | null>(null);
  const [networkIntel, setNetworkIntel] = useState<{
    geolocation: GeolocationInfo | null;
    network: NetworkInfo | null;
    abuseContact: AbuseContact | null;
    organizerInsights: string[];
  } | null>(null);
  const [expanded, setExpanded] = useState(false);

  // R-F4: resolve the domain through the linkage resolver so an unverified
  // (name-guessed or caller-provided) domain is tracked as such and never
  // presented as a verified facility fact.
  const linkage = resolveFacilityDomainLinkage(facility, domain);
  const domainVerified = linkage.verified;

  useEffect(() => {
    let isMounted = true;

    const runDiscovery = async () => {
      try {
        const targetDomain = linkage.domain;
        if (!targetDomain) {
          if (isMounted) setLoading(false);
          return;
        }

        // Run DNS reconnaissance
        const dns = await getFacilityDNSInfo(targetDomain);
        
        // Get first IP address for network intelligence
        let intel = null;
        if (dns.ipAddresses.length > 0) {
          intel = await getFacilityNetworkIntel(
            dns.ipAddresses[0],
            dns.asn?.number
          );
        }

        if (isMounted) {
          setDnsInfo(dns);
          setNetworkIntel(intel);
          setLoading(false);
        }
      } catch (error) {
        console.error('[NetworkDiscovery] Failed:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    runDiscovery();

    return () => {
      isMounted = false;
    };
  }, [facility, domain]);

  if (loading) {
    return (
      <div className={`bg-slate-900 border border-slate-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-5 h-5 text-blue-400 animate-pulse" />
          <h3 className="text-sm font-bold text-white">Network Discovery</h3>
        </div>
        <div className="text-sm text-slate-400 animate-pulse">
          Running DNS reconnaissance and network analysis...
        </div>
      </div>
    );
  }

  if (!dnsInfo && !networkIntel) {
    return (
      <div className={`bg-slate-900 border border-slate-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-5 h-5 text-slate-500" />
          <h3 className="text-sm font-bold text-white">Network Discovery</h3>
        </div>
        <p className="text-sm text-slate-400">
          No network information available for this facility.
        </p>
      </div>
    );
  }

  const patterns = dnsInfo ? detectDataCenterPatterns(dnsInfo) : null;

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white">Network Discovery</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded ? 'Show Less' : 'Show Details'}
        </button>
      </div>

      {/* Organizer Insights */}
      {networkIntel && networkIntel.organizerInsights.length > 0 && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
          <div className="flex items-start gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-2">Key Findings:</p>
              <ul className="space-y-1">
                {networkIntel.organizerInsights.map((insight, i) => (
                  <li key={i} className="text-xs text-slate-300">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        {dnsInfo && (
          <>
            <div className="p-2 bg-slate-800/50 border border-slate-700 rounded">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-3 h-3 text-green-400" />
                <span className="text-xs text-slate-400">IP Addresses</span>
              </div>
              <p className="text-sm font-bold text-white">
                {dnsInfo.ipAddresses.length}
              </p>
              <p className="text-xs text-slate-500">
                {dnsInfo.hasIPv6 ? 'IPv4 + IPv6' : 'IPv4 only'}
              </p>
            </div>

            <div className="p-2 bg-slate-800/50 border border-slate-700 rounded">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-slate-400">Security</span>
              </div>
              <p className="text-sm font-bold text-white">
                {dnsInfo.dnssecEnabled ? 'DNSSEC' : 'Basic'}
              </p>
              <p className="text-xs text-slate-500">
                {dnsInfo.dnssecEnabled ? 'Protected' : 'Not protected'}
              </p>
            </div>
          </>
        )}

        {networkIntel?.network && (
          <>
            <div className="p-2 bg-slate-800/50 border border-slate-700 rounded">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-slate-400">ASN</span>
              </div>
              <p className="text-sm font-bold text-white">
                AS{networkIntel.network.asn}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {networkIntel.network.holder}
              </p>
            </div>

            {networkIntel.geolocation && (
              <div className="p-2 bg-slate-800/50 border border-slate-700 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-slate-400">Location</span>
                </div>
                <p className="text-sm font-bold text-white truncate">
                  {networkIntel.geolocation.city || networkIntel.geolocation.country}
                </p>
                <p className="text-xs text-slate-500">
                  {networkIntel.geolocation.country}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Data Center Patterns */}
      {patterns && patterns.hasDataCenterIndicators && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-1">
                Data Center Indicators Found
              </p>
              <ul className="space-y-1">
                {patterns.patterns.slice(0, 3).map((pattern, i) => (
                  <li key={i} className="text-xs text-slate-300">
                    • {pattern}
                  </li>
                ))}
              </ul>
              {/* R-F4: unverified domain → entity/network signal, not a facility fact. */}
              {!domainVerified && (
                <p className="text-[11px] text-amber-300/90 mt-2">
                  Observed on <span className="font-mono">{linkage.domain}</span> (unverified domain
                  for this facility) — network/entity signal, not a facility claim.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && dnsInfo && (
        <div className="pt-3 border-t border-slate-700 space-y-3">
          {/* IP Addresses */}
          {dnsInfo.ipAddresses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">IP Addresses:</p>
              <div className="space-y-1">
                {dnsInfo.ipAddresses.slice(0, 5).map((ip, i) => (
                  <div key={i} className="text-xs text-slate-300 font-mono bg-slate-800 px-2 py-1 rounded">
                    {ip}
                  </div>
                ))}
                {dnsInfo.ipAddresses.length > 5 && (
                  <p className="text-xs text-slate-500">
                    +{dnsInfo.ipAddresses.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Name Servers */}
          {dnsInfo.nameServers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Name Servers:</p>
              <div className="space-y-1">
                {dnsInfo.nameServers.map((ns, i) => (
                  <div key={i} className="text-xs text-slate-300 truncate">
                    • {ns}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certificate Authorities */}
          {dnsInfo.certificateAuthorities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Certificate Authorities:</p>
              <div className="space-y-1">
                {dnsInfo.certificateAuthorities.map((ca, i) => (
                  <div key={i} className="text-xs text-slate-300">
                    • {ca}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Abuse Contact */}
          {networkIntel?.abuseContact && (
            <div className="p-2 bg-slate-800/50 border border-slate-700 rounded">
              <p className="text-xs font-semibold text-slate-400 mb-2">Abuse Contact:</p>
              {networkIntel.abuseContact.abuseEmail && (
                <p className="text-xs text-slate-300 mb-1">
                  📧 {networkIntel.abuseContact.abuseEmail}
                </p>
              )}
              {networkIntel.abuseContact.organization && (
                <p className="text-xs text-slate-400">
                  {networkIntel.abuseContact.organization}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="pt-2 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          💡 This uses DNS-over-HTTPS and RIPEstat to map network infrastructure without any backend servers.
        </p>
      </div>
    </div>
  );
});

NetworkDiscovery.displayName = 'NetworkDiscovery';

export default NetworkDiscovery;

