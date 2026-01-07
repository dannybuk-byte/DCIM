/**
 * Organizer Services Index
 * 
 * Central export for all labor organizing intelligence services.
 */

// FOIA Request Generator & Tracker
export * from './foiaGenerator';

// Worker Incident Reporting Portal
export * from './workerIncidents';

// Contractor Intelligence Network
export * from './contractorIntelligence';

// CBA Compliance Monitor
export * from './cbaCompliance';

// Legislative Alert System
export * from './legislativeAlerts';

// Union Density Heatmap (exclude UnionStatus to avoid conflict with contractorIntelligence)
export {
  saveUnionPresence,
  getUnionPresenceData,
  getUnionPresenceByState,
  calculateOrganizingPotential,
  getCorridorStats,
  getIBEWLocalForLocation,
  identifyOrganizingTargets,
  IBEW_LOCALS,
  DATA_CENTER_CORRIDORS,
  type UnionPresence,
  type OrganizingStatus,
  type OrganizingFactor,
  type IBEWLocal,
  type Corridor,
  type OrganizingTarget,
} from './unionDensityMap';

// Coalition Coordination Hub
export * from './coalitionHub';

