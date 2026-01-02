import React, { useState, useCallback, memo } from 'react';
import { ChevronRight, ChevronDown, Building2, Server, Activity, Shield, MapPin } from 'lucide-react';
import { Facility } from '../types';

// Static Tailwind class mappings (CRITICAL: No dynamic classes)
const getStatusClasses = (status: Facility['complianceStatus']) => {
  const classes = {
    'Compliant': 'bg-green-900 text-green-300 border-green-700',
    'Non-Compliant': 'bg-red-900 text-red-300 border-red-700',
    'At Risk': 'bg-amber-900 text-amber-300 border-amber-700',
    'Unknown': 'bg-gray-700 text-gray-300 border-gray-600'
  };
  return classes[status] || classes['Unknown'];
};

const getTypeClasses = (type: Facility['type']) => {
  const classes = {
    'Switch': 'bg-blue-900 text-blue-300 border-blue-700',
    'CO': 'bg-purple-900 text-purple-300 border-purple-700',
    'POP': 'bg-cyan-900 text-cyan-300 border-cyan-700',
    'Data Center': 'bg-indigo-900 text-indigo-300 border-indigo-700',
    'Other': 'bg-gray-700 text-gray-300 border-gray-600'
  };
  return classes[type] || classes['Other'];
};

export interface DisclosureNode {
  id: string;
  label: string;
  level: number;
  icon?: React.ReactNode;
  data?: any;
  children?: DisclosureNode[];
  facility?: Facility;
}

interface ProgressiveDisclosureProps {
  rootNodes: DisclosureNode[];
  maxLevel?: number;
  onNodeSelect?: (node: DisclosureNode) => void;
  renderContent?: (node: DisclosureNode) => React.ReactNode;
}

// Memoized node item component
const DisclosureNodeItem = memo<{
  node: DisclosureNode;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onSelect: (node: DisclosureNode) => void;
  renderContent?: (node: DisclosureNode) => React.ReactNode;
  depth: number;
}>(({ node, isExpanded, isSelected, onToggle, onSelect, renderContent, depth }) => {
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 20;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  }, [node.id, onToggle]);

  const handleSelect = useCallback(() => {
    onSelect(node);
  }, [node, onSelect]);

  return (
    <div className="select-none">
      {/* Node Header */}
      <div
        className={
          isSelected
            ? 'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800 border-l-4 border-blue-500 bg-gray-800 transition-colors'
            : 'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800 border-l-4 border-transparent transition-colors'
        }
        style={{ paddingLeft: `${12 + indent}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-gray-700 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        {/* Icon */}
        {node.icon && (
          <div className="flex-shrink-0 text-gray-400">
            {node.icon}
          </div>
        )}

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200 truncate">{node.label}</div>
          {node.facility && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded border ${getStatusClasses(node.facility.complianceStatus)}`}>
                {node.facility.complianceStatus}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded border ${getTypeClasses(node.facility.type)}`}>
                {node.facility.type}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <DisclosureNodeItem
              key={child.id}
              node={child}
              isExpanded={false}
              isSelected={false}
              onToggle={onToggle}
              onSelect={onSelect}
              renderContent={renderContent}
              depth={depth + 1}
            />
          ))}
          {renderContent && renderContent(node)}
        </div>
      )}

      {/* Custom Content for Leaf Nodes */}
      {!hasChildren && renderContent && renderContent(node)}
    </div>
  );
}, (prev, next) => {
  return (
    prev.node.id === next.node.id &&
    prev.isExpanded === next.isExpanded &&
    prev.isSelected === next.isSelected &&
    prev.depth === next.depth
  );
});

DisclosureNodeItem.displayName = 'DisclosureNodeItem';

export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  rootNodes,
  onNodeSelect,
  renderContent
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((node: DisclosureNode) => {
    setSelectedId(node.id);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="divide-y divide-gray-800">
        {rootNodes.map((node) => (
          <DisclosureNodeItem
            key={node.id}
            node={node}
            isExpanded={expandedIds.has(node.id)}
            isSelected={selectedId === node.id}
            onToggle={handleToggle}
            onSelect={handleSelect}
            renderContent={renderContent}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
};

// Helper function to build facility hierarchy
export function buildFacilityHierarchy(facilities: Facility[]): DisclosureNode[] {
  // Level 1: By Country
  const byCountry = new Map<string, Facility[]>();
  facilities.forEach(f => {
    const country = f.country || 'Unknown';
    if (!byCountry.has(country)) {
      byCountry.set(country, []);
    }
    byCountry.get(country)!.push(f);
  });

  return Array.from(byCountry.entries()).map(([country, countryFacilities]) => {
    // Level 2: By State/Region
    const byState = new Map<string, Facility[]>();
    countryFacilities.forEach(f => {
      const state = f.state || 'Unknown';
      if (!byState.has(state)) {
        byState.set(state, []);
      }
      byState.get(state)!.push(f);
    });

    const stateNodes: DisclosureNode[] = Array.from(byState.entries()).map(([state, stateFacilities]) => {
      // Level 3: By Operator
      const byOperator = new Map<string, Facility[]>();
      stateFacilities.forEach(f => {
        const op = f.operator || 'Unknown';
        if (!byOperator.has(op)) {
          byOperator.set(op, []);
        }
        byOperator.get(op)!.push(f);
      });

      const operatorNodes: DisclosureNode[] = Array.from(byOperator.entries()).map(([operator, operatorFacilities]) => {
        // Level 4: By Compliance Status
        const byStatus = new Map<string, Facility[]>();
        operatorFacilities.forEach(f => {
          const status = f.complianceStatus;
          if (!byStatus.has(status)) {
            byStatus.set(status, []);
          }
          byStatus.get(status)!.push(f);
        });

        const statusNodes: DisclosureNode[] = Array.from(byStatus.entries()).map(([status, statusFacilities]) => {
          // Level 5: By Facility Type
          const byType = new Map<string, Facility[]>();
          statusFacilities.forEach(f => {
            const type = f.type;
            if (!byType.has(type)) {
              byType.set(type, []);
            }
            byType.get(type)!.push(f);
          });

          const typeNodes: DisclosureNode[] = Array.from(byType.entries()).map(([type, typeFacilities]) => {
            // Level 6: By City
            const byCity = new Map<string, Facility[]>();
            typeFacilities.forEach(f => {
              const city = f.city || 'Unknown';
              if (!byCity.has(city)) {
                byCity.set(city, []);
              }
              byCity.get(city)!.push(f);
            });

            const cityNodes: DisclosureNode[] = Array.from(byCity.entries()).map(([city, cityFacilities]) => {
              // Level 7: Individual Facilities
              const facilityNodes: DisclosureNode[] = cityFacilities.map(f => ({
                id: `facility-${f.id}`,
                label: f.name,
                level: 7,
                icon: <Building2 className="w-4 h-4" />,
                facility: f,
                data: { facility: f }
              }));

              return {
                id: `city-${country}-${state}-${operator}-${status}-${type}-${city}`,
                label: `${city} (${cityFacilities.length})`,
                level: 6,
                icon: <Activity className="w-4 h-4" />,
                children: facilityNodes
              };
            });

            return {
              id: `type-${country}-${state}-${operator}-${status}-${type}`,
              label: `${type} (${typeFacilities.length})`,
              level: 5,
              icon: <Server className="w-4 h-4" />,
              children: cityNodes
            };
          });

          return {
            id: `status-${country}-${state}-${operator}-${status}`,
            label: `${status} (${statusFacilities.length})`,
            level: 4,
            icon: <Shield className="w-4 h-4" />,
            children: typeNodes
          };
        });

        return {
          id: `operator-${country}-${state}-${operator}`,
          label: `${operator} (${operatorFacilities.length})`,
          level: 3,
          icon: <Building2 className="w-4 h-4" />,
          children: statusNodes
        };
      });

      return {
        id: `state-${country}-${state}`,
        label: `${state} (${stateFacilities.length})`,
        level: 2,
        icon: <MapPin className="w-4 h-4" />,
        children: operatorNodes
      };
    });

    return {
      id: `country-${country}`,
      label: `${country} (${countryFacilities.length})`,
      level: 1,
      icon: <Building2 className="w-4 h-4" />,
      children: stateNodes
    };
  });
}


