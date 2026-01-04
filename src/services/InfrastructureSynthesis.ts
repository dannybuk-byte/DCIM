/**
 * Infrastructure Detail Synthesis Service
 * 
 * Generates realistic rack layouts, device inventories, and infrastructure details
 * based on facility data. Since free APIs don't provide rack/device level data,
 * we synthesize realistic models based on facility characteristics.
 */

import { Facility } from '../types';

export interface Rack {
  id: string;
  location: string; // e.g., "Floor 1, Row A, Position 12"
  height: number; // Rack units (U), typically 42U or 45U
  used: number; // Used U space
  powerCapacity: number; // kW
  powerUsed: number; // kW
  devices: Device[];
  coolingZone?: string;
}

export interface Device {
  id: string;
  rackId: string;
  position: number; // U position in rack (1-42)
  height: number; // U height
  type: 'server' | 'switch' | 'router' | 'storage' | 'firewall' | 'load_balancer' | 'other';
  manufacturer?: string;
  model?: string;
  powerConsumption: number; // kW
  cpu?: { cores: number; model: string };
  memory?: number; // GB
  storage?: number; // TB
  networkPorts?: number;
  status: 'active' | 'standby' | 'maintenance' | 'offline';
  tenant?: string; // For colocation facilities
}

export interface InfrastructureDetails {
  racks: Rack[];
  totalRacks: number;
  totalDevices: number;
  totalPowerCapacity: number; // MW
  totalPowerUsed: number; // MW
  averagePowerUsage: number; // Percentage
  coolingZones: string[];
  powerDistribution: {
    totalCapacity: number; // MW
    used: number; // MW
    available: number; // MW
    redundancy: 'N' | 'N+1' | '2N'; // Redundancy level
  };
  networkInfrastructure: {
    coreSwitches: number;
    accessSwitches: number;
    routers: number;
    firewalls: number;
    loadBalancers: number;
  };
  dataSource: 'synthesized' | 'estimated' | 'verified';
}

/**
 * Generate infrastructure details for a facility
 */
export function synthesizeInfrastructure(facility: Facility, facilityDetails: {
  buildingSize?: number;
  powerCapacity?: number;
  tier?: number;
  type: Facility['type'];
  isColocation?: boolean;
  tenants?: Array<{ company: string; rackCount: number }>;
}): InfrastructureDetails {
  // Calculate rack count based on facility size
  const rackCount = calculateRackCount(
    facilityDetails.buildingSize || 100000,
    facilityDetails.tier || 3,
    facilityDetails.type
  );

  // Calculate power distribution
  const powerCapacity = facilityDetails.powerCapacity || 10; // MW
  const powerDistribution = calculatePowerDistribution(powerCapacity, facilityDetails.tier || 3);

  // Generate racks
  const racks = generateRacks(
    rackCount,
    powerCapacity,
    facilityDetails.type,
    facilityDetails.tenants || [],
    facility.id
  );

  // Calculate network infrastructure
  const networkInfrastructure = calculateNetworkInfrastructure(racks);

  // Calculate total power used
  const totalPowerUsed = racks.reduce((sum, rack) => sum + rack.powerUsed, 0) / 1000; // Convert to MW
  const averagePowerUsage = (totalPowerUsed / powerCapacity) * 100;

  // Extract cooling zones
  const coolingZones = [...new Set(racks.map(r => r.coolingZone).filter(Boolean) as string[])];

  return {
    racks,
    totalRacks: rackCount,
    totalDevices: racks.reduce((sum, rack) => sum + rack.devices.length, 0),
    totalPowerCapacity: powerCapacity,
    totalPowerUsed,
    averagePowerUsage,
    coolingZones,
    powerDistribution,
    networkInfrastructure,
    dataSource: 'synthesized',
  };
}

/**
 * Calculate number of racks based on facility size and tier
 */
function calculateRackCount(buildingSize: number, tier: number, type: Facility['type']): number {
  // Data center space utilization varies by tier
  // Tier 1: ~25% space for IT equipment
  // Tier 2: ~35%
  // Tier 3: ~45%
  // Tier 4: ~50%
  const utilizationRates = { 1: 0.25, 2: 0.35, 3: 0.45, 4: 0.50 };
  const utilization = utilizationRates[tier as keyof typeof utilizationRates] || 0.45;

  // IT space in square feet
  const itSpace = buildingSize * utilization;

  // Average rack footprint (including aisle space): ~30-40 sq ft per rack
  // Smaller facilities may have tighter spacing
  const sqftPerRack = type === 'POP' ? 25 : type === 'Switch' ? 30 : 35;

  const baseRacks = Math.floor(itSpace / sqftPerRack);

  // Edge/POP facilities have fewer racks
  if (type === 'POP') {
    return Math.max(5, Math.floor(baseRacks * 0.3));
  }
  if (type === 'Switch') {
    return Math.max(10, Math.floor(baseRacks * 0.5));
  }

  return Math.max(20, baseRacks);
}

/**
 * Calculate power distribution setup
 */
function calculatePowerDistribution(totalCapacity: number, tier: number): InfrastructureDetails['powerDistribution'] {
  // Tier 1: N (no redundancy)
  // Tier 2: N+1
  // Tier 3: N+1 with some 2N
  // Tier 4: 2N (full redundancy)
  let redundancy: 'N' | 'N+1' | '2N' = 'N';
  if (tier >= 4) redundancy = '2N';
  else if (tier >= 2) redundancy = 'N+1';

  // Power usage typically 60-80% of capacity
  const usageFactor = 0.65 + (Math.random() * 0.15);
  const used = totalCapacity * usageFactor;
  const available = totalCapacity - used;

  return {
    totalCapacity,
    used,
    available,
    redundancy,
  };
}

/**
 * Generate racks with devices
 */
function generateRacks(
  count: number,
  totalPowerCapacity: number,
  facilityType: Facility['type'],
  tenants: Array<{ company: string; rackCount: number }>,
  facilityId: number
): Rack[] {
  const racks: Rack[] = [];
  const powerPerRack = (totalPowerCapacity * 1000) / count; // kW per rack
  const hash = facilityId * 31;

  // Device type distributions based on facility type
  const deviceTypes: Record<Facility['type'], Array<{ type: Device['type']; ratio: number }>> = {
    'Data Center': [
      { type: 'server', ratio: 0.6 },
      { type: 'storage', ratio: 0.15 },
      { type: 'switch', ratio: 0.15 },
      { type: 'router', ratio: 0.05 },
      { type: 'firewall', ratio: 0.03 },
      { type: 'load_balancer', ratio: 0.02 },
    ],
    'CO': [
      { type: 'server', ratio: 0.5 },
      { type: 'switch', ratio: 0.25 },
      { type: 'router', ratio: 0.1 },
      { type: 'firewall', ratio: 0.08 },
      { type: 'load_balancer', ratio: 0.05 },
      { type: 'storage', ratio: 0.02 },
    ],
    'POP': [
      { type: 'router', ratio: 0.4 },
      { type: 'switch', ratio: 0.4 },
      { type: 'server', ratio: 0.15 },
      { type: 'firewall', ratio: 0.05 },
    ],
    'Switch': [
      { type: 'switch', ratio: 0.7 },
      { type: 'router', ratio: 0.2 },
      { type: 'firewall', ratio: 0.1 },
    ],
    'Other': [
      { type: 'server', ratio: 0.5 },
      { type: 'switch', ratio: 0.3 },
      { type: 'storage', ratio: 0.2 },
    ],
  };

  const typeDistribution = deviceTypes[facilityType] || deviceTypes['Data Center'];

  // Distribute tenants across racks (for colocation)
  let currentTenantIndex = 0;
  let racksForCurrentTenant = 0;

  for (let i = 0; i < count; i++) {
    const rackId = `RACK-${String(i + 1).padStart(3, '0')}`;
    
    // Determine rack location
    const floor = Math.floor(i / 50) + 1;
    const row = String.fromCharCode(65 + Math.floor((i % 50) / 10)); // A, B, C, ...
    const position = (i % 10) + 1;
    const location = `Floor ${floor}, Row ${row}, Position ${position}`;

    // Assign tenant if colocation
    let currentTenant: string | undefined;
    if (tenants.length > 0 && facilityType === 'CO') {
      if (racksForCurrentTenant >= tenants[currentTenantIndex].rackCount) {
        currentTenantIndex = (currentTenantIndex + 1) % tenants.length;
        racksForCurrentTenant = 0;
      }
      currentTenant = tenants[currentTenantIndex].company;
      racksForCurrentTenant++;
    }

    // Generate devices for this rack
    const rackHash = hash + i;
    const devices = generateDevicesForRack(
      rackId,
      typeDistribution,
      powerPerRack,
      currentTenant,
      rackHash
    );

    // Calculate rack power usage
    const powerUsed = devices.reduce((sum, dev) => sum + dev.powerConsumption, 0);

    // Cooling zone (typically by row or floor)
    const coolingZone = `Zone-${floor}-${row}`;

    racks.push({
      id: rackId,
      location,
      height: 42, // Standard 42U rack
      used: devices.reduce((sum, dev) => sum + dev.height, 0),
      powerCapacity: powerPerRack,
      powerUsed,
      devices,
      coolingZone,
    });
  }

  return racks;
}

/**
 * Generate devices for a rack
 */
function generateDevicesForRack(
  rackId: string,
  typeDistribution: Array<{ type: Device['type']; ratio: number }>,
  rackPowerCapacity: number,
  tenant?: string,
  seed: number = 0
): Device[] {
  const devices: Device[] = [];
  let currentPosition = 1;
  const maxHeight = 42;
  const rackPowerUsed = rackPowerCapacity * 0.65; // Use ~65% of rack power capacity

  // Server manufacturers
  const serverManufacturers = ['Dell', 'HP', 'IBM', 'Cisco', 'SuperMicro', 'Lenovo'];
  const serverModels = ['PowerEdge', 'ProLiant', 'System x', 'UCS', 'X10', 'ThinkSystem'];

  // Network equipment
  const networkManufacturers = ['Cisco', 'Juniper', 'Arista', 'HPE', 'Dell'];
  const switchModels = ['Catalyst', 'Nexus', 'EX', 'QFX', 'ProVision', 'PowerConnect'];
  const routerModels = ['ASR', 'MX', 'ISR', 'SRX'];

  // Create device pool based on distribution
  const devicePool: Device['type'][] = [];
  typeDistribution.forEach(({ type, ratio }) => {
    const count = Math.floor(ratio * 20); // Scale to ~20 devices per distribution
    for (let i = 0; i < count; i++) {
      devicePool.push(type);
    }
  });

  // Shuffle using seed
  const shuffled = devicePool.sort(() => (seed % 3 === 0 ? 1 : -1));

  let totalPower = 0;
  let deviceIndex = 0;

  for (const deviceType of shuffled) {
    if (currentPosition >= maxHeight - 5) break; // Leave some space
    if (totalPower >= rackPowerUsed * 0.9) break; // Don't exceed power

    const deviceSeed = seed + deviceIndex++;
    const height = getDeviceHeight(deviceType);
    
    if (currentPosition + height > maxHeight) break;

    const powerConsumption = getDevicePowerConsumption(deviceType, deviceSeed);

    if (totalPower + powerConsumption > rackPowerUsed) continue;

    const device: Device = {
      id: `${rackId}-DEV-${String(deviceIndex).padStart(3, '0')}`,
      rackId,
      position: currentPosition,
      height,
      type: deviceType,
      powerConsumption,
      status: deviceSeed % 10 === 0 ? 'maintenance' : deviceSeed % 20 === 0 ? 'standby' : 'active',
    };

    // Add device-specific details
    if (deviceType === 'server') {
      device.manufacturer = serverManufacturers[deviceSeed % serverManufacturers.length];
      device.model = serverModels[deviceSeed % serverModels.length];
      device.cpu = {
        cores: [8, 16, 32, 64][deviceSeed % 4],
        model: ['Intel Xeon', 'AMD EPYC'][deviceSeed % 2],
      };
      device.memory = [64, 128, 256, 512][deviceSeed % 4]; // GB
      device.storage = [4, 8, 16, 32][deviceSeed % 4]; // TB
    } else if (deviceType === 'switch' || deviceType === 'router') {
      device.manufacturer = networkManufacturers[deviceSeed % networkManufacturers.length];
      device.model = deviceType === 'switch' 
        ? switchModels[deviceSeed % switchModels.length]
        : routerModels[deviceSeed % routerModels.length];
      device.networkPorts = deviceType === 'switch' 
        ? [24, 48, 96][deviceSeed % 3]
        : [4, 8, 16][deviceSeed % 3];
    } else if (deviceType === 'storage') {
      device.manufacturer = serverManufacturers[deviceSeed % serverManufacturers.length];
      device.model = 'Storage Array';
      device.storage = [50, 100, 200, 500][deviceSeed % 4]; // TB
    }

    if (tenant) {
      device.tenant = tenant;
    }

    devices.push(device);
    currentPosition += height + 1; // Add 1U spacing
    totalPower += powerConsumption;
  }

  return devices;
}

/**
 * Get device height in rack units (U)
 */
function getDeviceHeight(type: Device['type']): number {
  const heights: Record<Device['type'], number[]> = {
    server: [1, 2],
    storage: [2, 4],
    switch: [1, 2],
    router: [1, 2],
    firewall: [1],
    load_balancer: [1, 2],
    other: [1, 2],
  };
  const options = heights[type] || [1];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get device power consumption in kW
 */
function getDevicePowerConsumption(type: Device['type'], seed: number): number {
  const powerRanges: Record<Device['type'], [number, number]> = {
    server: [0.3, 0.8],
    storage: [0.5, 1.5],
    switch: [0.2, 0.6],
    router: [0.4, 1.2],
    firewall: [0.1, 0.3],
    load_balancer: [0.2, 0.5],
    other: [0.2, 0.6],
  };
  const [min, max] = powerRanges[type] || [0.2, 0.6];
  return min + ((seed % 100) / 100) * (max - min);
}

/**
 * Calculate network infrastructure requirements
 */
function calculateNetworkInfrastructure(racks: Rack[]): InfrastructureDetails['networkInfrastructure'] {
  const devices = racks.flatMap(r => r.devices);
  
  return {
    coreSwitches: Math.max(2, Math.floor(racks.length / 50)),
    accessSwitches: Math.floor(racks.length / 20),
    routers: devices.filter(d => d.type === 'router').length,
    firewalls: devices.filter(d => d.type === 'firewall').length,
    loadBalancers: devices.filter(d => d.type === 'load_balancer').length,
  };
}

