// Class Helper Functions
// Prevents dynamic Tailwind class failures (Rule 1)

export const getStatusBadgeClasses = (status: string) => {
  const classes: Record<string, string> = {
    'Compliant': 'bg-green-900/50 text-green-200',
    'Non-Compliant': 'bg-red-900/50 text-red-200',
    'At Risk': 'bg-yellow-900/50 text-yellow-200',
    'Unknown': 'bg-gray-700 text-gray-300',
    'overdue': 'bg-red-900 text-red-300',
    'warning': 'bg-yellow-900 text-yellow-300'
  };
  return classes[status] || 'bg-gray-700 text-gray-300';
};

export const getComplianceBadgeClasses = (status: string) => {
  const classes: Record<string, string> = {
    'Compliant': 'bg-green-900/50 text-green-200',
    'Non-Compliant': 'bg-red-900/50 text-red-200',
    'At Risk': 'bg-yellow-900/50 text-yellow-200',
    'Unknown': 'bg-gray-700 text-gray-300'
  };
  return classes[status] || 'bg-gray-700 text-gray-300';
};

export const getTypeBadgeClasses = (type: string) => {
  const classes: Record<string, string> = {
    'Data Center': 'bg-blue-900/50 text-blue-200',
    'CO': 'bg-purple-900/50 text-purple-200',
    'POP': 'bg-cyan-900/50 text-cyan-200',
    'Switch': 'bg-orange-900/50 text-orange-200',
    'Other': 'bg-gray-700 text-gray-300'
  };
  return classes[type] || 'bg-gray-700 text-gray-300';
};

export const getSignatureBadgeClasses = (signature: string) => {
  const classes: Record<string, string> = {
    'construction_cliff': 'bg-red-900/50 text-red-200',
    'gradual_decline': 'bg-yellow-900/50 text-yellow-200',
    'sustained_employment': 'bg-green-900/50 text-green-200',
    'baseload_with_cooling_peaks': 'bg-yellow-900/50 text-yellow-200',
    'flat_baseload': 'bg-green-900/50 text-green-200',
    'variable_load': 'bg-orange-900/50 text-orange-200',
    'asymmetric_extraction': 'bg-red-900/50 text-red-200',
    'balanced_contribution': 'bg-green-900/50 text-green-200',
    'minimal_footprint': 'bg-gray-700 text-gray-300',
    'high_leakage': 'bg-red-900/50 text-red-200',
    'moderate_circulation': 'bg-yellow-900/50 text-yellow-200',
    'strong_local_circulation': 'bg-green-900/50 text-green-200'
  };
  return classes[signature] || 'bg-gray-700 text-gray-300';
};

export const getTabActiveClasses = (isActive: boolean) => {
  return isActive
    ? 'border-amber-500 text-amber-500 bg-gray-950'
    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700';
};

