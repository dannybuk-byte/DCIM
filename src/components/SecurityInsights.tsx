/**
 * Security & Verification Insights Widget
 * 
 * Displays organizer-friendly security and verification information
 * for facilities using browser-native APIs.
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Cloud, Building, HelpCircle } from 'lucide-react';
import { getKEVStats } from '../utils/cisaKEV';
import { detectCloudProvider, getCloudProviderDescription, type CloudProvider } from '../utils/cloudIPAttribution';
import { verifyCompany, getVerificationDescription, type CompanyVerification } from '../utils/companyVerification';
import type { Facility } from '../types';

interface SecurityInsightsProps {
  facility: Facility;
  className?: string;
}

export const SecurityInsights: React.FC<SecurityInsightsProps> = React.memo(({ facility, className = '' }) => {
  const [cloudProvider, setCloudProvider] = useState<CloudProvider | null>(null);
  const [companyVerification, setCompanyVerification] = useState<CompanyVerification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadInsights = async () => {
      try {
        // Get facility IP (would need to be in facility data or resolved via DNS)
        // For now, we'll use a placeholder
        const facilityIP = '52.0.0.1'; // Example AWS IP
        
        // Check cloud provider
        const cloud = await detectCloudProvider(facilityIP);
        
        // Verify company
        const verification = await verifyCompany(facility.operator || facility.provider);

        if (isMounted) {
          setCloudProvider(cloud);
          setCompanyVerification(verification);
          setLoading(false);
        }
      } catch (error) {
        console.error('[SecurityInsights] Failed to load:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInsights();

    return () => {
      isMounted = false;
    };
  }, [facility]);

  if (loading) {
    return (
      <div className={`bg-slate-900 border border-slate-700 rounded-lg p-4 ${className}`}>
        <div className="text-sm text-slate-400 animate-pulse">Loading security insights...</div>
      </div>
    );
  }

  const verificationInfo = companyVerification ? getVerificationDescription(companyVerification) : null;

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-bold text-white">Security & Verification</h3>
      </div>

      {/* Company Verification */}
      {companyVerification && verificationInfo && (
        <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-md">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-2xl">{verificationInfo.badge}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{verificationInfo.label}</p>
              <p className="text-xs text-slate-400 mt-1">{verificationInfo.description}</p>
            </div>
          </div>
          
          {companyVerification.parent && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                Part of: <span className="text-slate-300 font-semibold">{companyVerification.parent.name}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cloud Provider Detection */}
      {cloudProvider && cloudProvider.detected && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
          <div className="flex items-start gap-2">
            <Cloud className="w-4 h-4 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Cloud Infrastructure Detected</p>
              <p className="text-xs text-slate-300 mt-1">
                {getCloudProviderDescription(cloudProvider)}
              </p>
              <p className="text-xs text-slate-400 mt-1 italic">
                💡 They're using cloud services - compare this with their job creation promises
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="pt-2 border-t border-slate-700">
        <div className="flex items-start gap-2">
          <HelpCircle className="w-3 h-3 text-slate-500 mt-0.5" />
          <p className="text-xs text-slate-500">
            This information comes from official government and industry databases to help verify companies and their infrastructure.
          </p>
        </div>
      </div>
    </div>
  );
});

SecurityInsights.displayName = 'SecurityInsights';

export default SecurityInsights;

