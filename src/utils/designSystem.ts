/**
 * Connectography Design System
 * Based on handoff document specifications
 */

export const COLORS = {
  // Backgrounds
  bg: '#0a0e17',
  bgCard: '#0d1219',
  bgElevated: '#141c28',
  bgGlow: '#1a2436',
  
  // Borders
  border: '#1e2d42',
  borderActive: '#3b82f6',
  
  // Text
  text: '#e8eef6',
  textSecondary: '#8b9dc3',
  textMuted: '#5a6d8a',
  
  // Status (with glow variants)
  red: '#ff4757',
  redGlow: 'rgba(255,71,87,0.6)',
  yellow: '#ffa502',
  yellowGlow: 'rgba(255,165,2,0.6)',
  green: '#2ed573',
  greenGlow: 'rgba(46,213,115,0.6)',
  cyan: '#00d2d3',
  cyanGlow: 'rgba(0,210,211,0.6)',
  amber: '#f59e0b',
  amberGlow: 'rgba(245,158,11,0.6)',
  
  // Infrastructure
  cable: '#00b4d8',
  facility: '#ffd700',
  flow: '#00ff88',
} as const;

// Tailwind class mappings (static only - Rule 1 compliance)
export const getStatusColorClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    'Compliant': 'text-green-400 bg-green-900/30 border-green-500/50',
    'Non-Compliant': 'text-red-400 bg-red-900/30 border-red-500/50',
    'At Risk': 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50',
    'Unknown': 'text-gray-400 bg-gray-800 border-gray-700',
  };
  return statusMap[status] || statusMap['Unknown'];
};

export const getComplianceBadgeClass = (status: string): string => {
  const badgeMap: Record<string, string> = {
    'Compliant': 'bg-green-900 text-green-300',
    'Non-Compliant': 'bg-red-900 text-red-300',
    'At Risk': 'bg-yellow-900 text-yellow-300',
    'Unknown': 'bg-gray-700 text-gray-300',
  };
  return badgeMap[status] || badgeMap['Unknown'];
};

