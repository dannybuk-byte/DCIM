/**
 * Rack Visualization Component
 * 
 * Displays a visual representation of a data center rack with devices.
 * Shows device positions, power consumption, and status.
 */

import React from 'react';
import { Rack, Device } from '../services/InfrastructureSynthesis';
import { Server, Network, HardDrive, Shield, Loader } from 'lucide-react';

interface RackVisualizationProps {
  rack: Rack;
  onDeviceClick?: (device: Device) => void;
  showPowerDetails?: boolean;
}

// Static Tailwind classes (CRITICAL: No dynamic classes)
const rackBorderClasses = 'border-2 border-gray-600';
const rackBackgroundClasses = 'bg-gray-800';
const deviceSlotClasses = 'border-b border-gray-700';
const deviceActiveClasses = 'bg-green-900 border-green-600';
const deviceStandbyClasses = 'bg-yellow-900 border-yellow-600';
const deviceMaintenanceClasses = 'bg-blue-900 border-blue-600';
const deviceOfflineClasses = 'bg-red-900 border-red-600';

const getDeviceIcon = (type: Device['type']) => {
  const iconClass = 'w-4 h-4';
  switch (type) {
    case 'server':
      return <Server className={iconClass} />;
    case 'switch':
    case 'router':
      return <Network className={iconClass} />;
    case 'storage':
      return <HardDrive className={iconClass} />;
    case 'firewall':
      return <Shield className={iconClass} />;
    default:
      return <Loader className={iconClass} />;
  }
};

const getDeviceColorClasses = (status: Device['status']) => {
  switch (status) {
    case 'active':
      return deviceActiveClasses;
    case 'standby':
      return deviceStandbyClasses;
    case 'maintenance':
      return deviceMaintenanceClasses;
    case 'offline':
      return deviceOfflineClasses;
    default:
      return 'bg-gray-700 border-gray-600';
  }
};

const RackVisualization: React.FC<RackVisualizationProps> = ({ 
  rack, 
  onDeviceClick,
  showPowerDetails = true,
}) => {
  // Create a map of U positions to devices
  const uMap = new Map<number, Device>();
  rack.devices.forEach(device => {
    for (let u = device.position; u < device.position + device.height; u++) {
      uMap.set(u, device);
    }
  });

  // Render rack slots (42U standard)
  const renderRackSlots = () => {
    const slots = [];
    for (let u = 42; u >= 1; u--) {
      const device = uMap.get(u);
      const isFirstU = device && device.position === u;

      if (device && isFirstU) {
        // Render device spanning multiple U
        const deviceClasses = `${getDeviceColorClasses(device.status)} ${deviceSlotClasses} cursor-pointer hover:opacity-80`;
        slots.push(
          <div
            key={u}
            style={{ height: `${device.height * 20}px` }}
            className={deviceClasses}
            onClick={() => onDeviceClick?.(device)}
          >
            <div className="flex items-center justify-between p-2 h-full">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0 text-gray-300">
                  {getDeviceIcon(device.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    {device.model || device.type}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {device.manufacturer || ''} {device.tenant ? `(${device.tenant})` : ''}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 text-right ml-2">
                <div className="text-xs text-gray-300">U{device.position}-{device.position + device.height - 1}</div>
                {showPowerDetails && (
                  <div className="text-xs text-gray-400">{device.powerConsumption.toFixed(1)}kW</div>
                )}
              </div>
            </div>
          </div>
        );
      } else if (!device) {
        // Empty slot
        slots.push(
          <div
            key={u}
            className={`${deviceSlotClasses} bg-gray-900 text-gray-600 text-center text-xs flex items-center justify-center`}
            style={{ height: '20px' }}
          >
            {u}
          </div>
        );
      }
      // Skip rendering for middle U positions of multi-U devices
    }
    return slots;
  };

  return (
    <div className={`${rackBackgroundClasses} ${rackBorderClasses} rounded-lg overflow-hidden`}>
      {/* Rack Header */}
      <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-white">{rack.id}</div>
            <div className="text-xs text-gray-400">{rack.location}</div>
          </div>
          <div className="text-right">
            {showPowerDetails && (
              <>
                <div className="text-sm text-white">
                  {rack.powerUsed.toFixed(1)} / {rack.powerCapacity.toFixed(1)} kW
                </div>
                <div className="text-xs text-gray-400">
                  {((rack.powerUsed / rack.powerCapacity) * 100).toFixed(0)}% used
                </div>
              </>
            )}
          </div>
        </div>
        {rack.coolingZone && (
          <div className="text-xs text-gray-400 mt-1">Cooling: {rack.coolingZone}</div>
        )}
      </div>

      {/* Rack Body (42U slots) */}
      <div className="p-2" style={{ height: '840px', overflowY: 'auto' }}>
        {renderRackSlots()}
      </div>

      {/* Rack Footer */}
      <div className="bg-gray-700 px-4 py-2 border-t border-gray-600 text-xs text-gray-400">
        {rack.used}U used / {rack.height}U total • {rack.devices.length} devices
      </div>
    </div>
  );
};

export default RackVisualization;

