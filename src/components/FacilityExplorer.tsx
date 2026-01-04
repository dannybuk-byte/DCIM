import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Facility } from '../types';
import { ProgressiveDisclosure, buildFacilityHierarchy, DisclosureNode } from './ProgressiveDisclosure';
import { db } from '../db/database';
import { getFacilityDetails } from '../services/getFacilityDetails';
import { ErrorBoundary } from './ErrorBoundary';

// Static Tailwind classes (CRITICAL: No dynamic classes)
const contentPanelClasses = 'bg-gray-800 border border-gray-700 rounded-lg p-4';
const detailRowClasses = 'flex justify-between py-2 border-b border-gray-700 last:border-b-0';
const stickyPanelClasses = 'bg-gray-800 border border-gray-700 rounded-lg p-4 sticky top-4';

// Status badge component with static classes
const StatusBadge: React.FC<{ status: Facility['complianceStatus'] }> = ({ status }) => {
  const statusClassMap: Record<Facility['complianceStatus'], string> = {
    'Compliant': 'px-2 py-1 rounded text-xs bg-green-900 text-green-300',
    'Non-Compliant': 'px-2 py-1 rounded text-xs bg-red-900 text-red-300',
    'At Risk': 'px-2 py-1 rounded text-xs bg-amber-900 text-amber-300',
    'Unknown': 'px-2 py-1 rounded text-xs bg-gray-700 text-gray-300'
  };
  const className = statusClassMap[status] || statusClassMap['Unknown'];
  return <span className={className}>{status}</span>;
};

interface FacilityExplorerProps {
  facilities?: Facility[];
  onFacilitySelect?: (facility: Facility) => void;
}

export const FacilityExplorer: React.FC<FacilityExplorerProps> = ({
  facilities: externalFacilities,
  onFacilitySelect
}) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedNode, setSelectedNode] = useState<DisclosureNode | null>(null);
  const [facilityDetails, setFacilityDetails] = useState<Record<number, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());

  // Load facilities
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    async function loadFacilities() {
      try {
        const allFacilities = externalFacilities || await db.facilities.toArray();
        if (isMounted && !abortController.signal.aborted) {
          setFacilities(allFacilities);
        }
      } catch (error) {
        console.error('Error loading facilities:', error);
      }
    }
    
    loadFacilities();
    
    return () => {
      isMounted = false;
    };
  }, [externalFacilities]);

  // Build hierarchy
  const hierarchy = useMemo(() => {
    if (facilities.length === 0) return [];
    return buildFacilityHierarchy(facilities);
  }, [facilities]);

  // Handle node selection
  const handleNodeSelect = useCallback((node: DisclosureNode) => {
    setSelectedNode(node);
    
    if (node.facility) {
      onFacilitySelect?.(node.facility);
      
      // Load facility details if not already loaded
      if (!facilityDetails[node.facility.id]) {
        setLoadingDetails(prev => new Set(prev).add(node.facility!.id));
        getFacilityDetails(node.facility)
          .then(details => {
            setFacilityDetails(prev => ({
              ...prev,
              [node.facility!.id]: details
            }));
          })
          .catch(error => {
            console.error('Error loading facility details:', error);
          })
          .finally(() => {
            setLoadingDetails(prev => {
              const next = new Set(prev);
              next.delete(node.facility!.id);
              return next;
            });
          });
      }
    }
  }, [facilityDetails, onFacilitySelect]);

  // Render facility details content
  const renderFacilityContent = useCallback((node: DisclosureNode): React.ReactNode => {
    if (!node.facility) return null;

    const facility = node.facility;
    const details = facilityDetails[facility.id];
    const isLoading = loadingDetails.has(facility.id);

    if (isLoading) {
      return (
        <div className={contentPanelClasses}>
          <div className="text-center text-gray-400 py-4">
            Loading facility details...
          </div>
        </div>
      );
    }

    if (!details) {
      return null;
    }

    return (
      <div className={contentPanelClasses}>
        <h3 className="text-lg font-semibold text-white mb-4">{facility.name}</h3>
        
        {/* Basic Info */}
        <div className="space-y-2 mb-4">
          <div className={detailRowClasses}>
            <span className="text-gray-400">Operator</span>
            <span className="text-white">{facility.operator}</span>
          </div>
          <div className={detailRowClasses}>
            <span className="text-gray-400">Location</span>
            <span className="text-white">{facility.city}, {facility.state}, {facility.country}</span>
          </div>
          <div className={detailRowClasses}>
            <span className="text-gray-400">Type</span>
            <span className="text-white">{facility.type}</span>
          </div>
          <div className={detailRowClasses}>
            <span className="text-gray-400">Compliance Status</span>
            <StatusBadge status={facility.complianceStatus} />
          </div>
          <div className={detailRowClasses}>
            <span className="text-gray-400">Subsidy Gap</span>
            <span className="text-red-400 font-semibold">
              ${(facility.subsidyGap / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>

        {/* Infrastructure Details */}
        {details.buildingSize && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Infrastructure</h4>
            <div className="space-y-2">
              <div className={detailRowClasses}>
                <span className="text-gray-400">Building Size</span>
                <span className="text-white">{details.buildingSize.toLocaleString()} sq ft</span>
              </div>
              {details.tier && (
                <div className={detailRowClasses}>
                  <span className="text-gray-400">Tier Classification</span>
                  <span className="text-white">Tier {details.tier}</span>
                </div>
              )}
              {details.powerCapacity && (
                <div className={detailRowClasses}>
                  <span className="text-gray-400">Power Capacity</span>
                  <span className="text-white">{details.powerCapacity} MW</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Issues */}
        {facility.issues && facility.issues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-amber-400 mb-2">Compliance Issues</h4>
            <ul className="space-y-1">
              {facility.issues.map((issue: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }, [facilityDetails, loadingDetails]);

  if (facilities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 border border-gray-700 rounded-lg">
        <div className="text-gray-400">Loading facilities...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
        {/* Left: Hierarchy Tree */}
        <ErrorBoundary>
          <div className="lg:col-span-2 overflow-auto">
            <ProgressiveDisclosure
              rootNodes={hierarchy}
              onNodeSelect={handleNodeSelect}
              renderContent={renderFacilityContent}
            />
          </div>
        </ErrorBoundary>

        {/* Right: Selected Facility Details */}
        <ErrorBoundary>
          <div className="lg:col-span-1">
            {selectedNode?.facility ? (
              <div className={stickyPanelClasses}>
                <h2 className="text-xl font-bold text-white mb-4">
                  {selectedNode.facility.name}
                </h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Location</div>
                    <div className="text-white">
                      {selectedNode.facility.city}, {selectedNode.facility.state}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Operator</div>
                    <div className="text-white">{selectedNode.facility.operator}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Subsidy Gap</div>
                    <div className="text-red-400 font-semibold">
                      ${(selectedNode.facility.subsidyGap / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={stickyPanelClasses}>
                <div className="text-gray-400 text-center py-8">
                  Select a facility to view details
                </div>
              </div>
            )}
          </div>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

