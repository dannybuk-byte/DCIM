/**
 * Plain Language Mappings
 * 
 * Converts technical terminology to organizer-friendly language.
 * For labor organizers, community advocates, and non-technical users.
 */

export const PLAIN_LANGUAGE = {
  // View Modes
  views: {
    omniscient: {
      label: 'Overview',
      description: 'See all facilities at a glance with key stats',
      icon: '📊',
      tooltip: 'Quick overview of all data centers and their compliance status',
    },
    deepdive: {
      label: 'Facility Details',
      description: 'Explore detailed information about each facility',
      icon: '🔍',
      tooltip: 'Drill down into specific facilities to see detailed compliance data',
    },
    hud: {
      label: 'Alert Dashboard',
      description: 'See critical issues that need immediate attention',
      icon: '🚨',
      tooltip: 'Prioritized view of facilities with the most serious compliance violations',
    },
    time: {
      label: 'Timeline',
      description: 'Track changes over time',
      icon: '📅',
      tooltip: 'See how compliance has changed over the years',
    },
    map: {
      label: 'Map View',
      description: 'See where facilities are located',
      icon: '🗺️',
      tooltip: 'Geographic view showing data centers by state and region',
    },
  },

  // Technical Terms → Plain Language
  terms: {
    'security posture': 'compliance risk',
    'subsidy gap': 'broken job promises',
    'compliance score': 'accountability rating',
    'facility': 'data center',
    'operator': 'company running the data center',
    'provider': 'company that owns the data center',
    'BGP': 'network monitoring',
    'OSINT': 'public records research',
    'ASN': 'network identifier',
    'infrastructure': 'buildings and equipment',
    'anomaly': 'unusual pattern',
    'intelligence': 'insights and analysis',
  },

  // Risk Levels
  riskLevels: {
    low: {
      label: 'Good Standing',
      description: 'This facility is meeting its job creation promises',
      color: 'green',
      icon: '✅',
      action: 'Monitor regularly',
    },
    medium: {
      label: 'Needs Attention',
      description: 'This facility is falling behind on its commitments',
      color: 'yellow',
      icon: '⚠️',
      action: 'Schedule a review',
    },
    high: {
      label: 'Serious Concern',
      description: 'This facility has significant job creation shortfalls',
      color: 'orange',
      icon: '⚠️',
      action: 'Immediate investigation recommended',
    },
    critical: {
      label: 'Major Violation',
      description: 'This facility has broken its promises and should be held accountable',
      color: 'red',
      icon: '🚨',
      action: 'Urgent action required',
    },
  },

  // Metrics
  metrics: {
    subsidyGap: {
      label: 'Broken Job Promises',
      description: 'Dollar value of jobs promised but not created',
      example: 'If a company got $10M in tax breaks to create 100 jobs but only created 50, the gap is $5M',
    },
    complianceScore: {
      label: 'Accountability Rating',
      description: 'How well the facility is keeping its promises (0-100)',
      example: '80+ = Good, 60-80 = Concerning, Below 60 = Problem',
    },
    jobsPromised: {
      label: 'Jobs They Promised',
      description: 'Number of jobs the company said they would create',
    },
    jobsCreated: {
      label: 'Jobs Actually Created',
      description: 'Number of jobs the company has actually created',
    },
  },

  // Actions
  actions: {
    investigate: {
      label: 'Start Investigation',
      description: 'Gather evidence and build a case',
      steps: [
        'Review the facility\'s promises',
        'Check job creation numbers',
        'Look at public records',
        'Document violations',
      ],
    },
    organize: {
      label: 'Build Campaign',
      description: 'Organize community response',
      steps: [
        'Identify affected workers',
        'Connect with community groups',
        'Plan public actions',
        'Demand accountability',
      ],
    },
    research: {
      label: 'Deep Dive Research',
      description: 'Find additional evidence',
      steps: [
        'Search public records',
        'Track company history',
        'Find similar cases',
        'Build timeline',
      ],
    },
  },

  // Help Text
  help: {
    whatIsThis: 'What am I looking at?',
    whatDoIDo: 'What should I do next?',
    howDoIUse: 'How do I use this?',
    whereIsHelp: 'Need help?',
    explainThis: 'Explain this to me',
  },
};

/**
 * Get plain language version of a technical term
 */
export function getPlainLanguage(technicalTerm: string): string {
  const term = technicalTerm.toLowerCase();
  return PLAIN_LANGUAGE.terms[term] || technicalTerm;
}

/**
 * Get action-oriented description for a metric
 */
export function getMetricDescription(metric: string): {
  label: string;
  description: string;
  example?: string;
} {
  return PLAIN_LANGUAGE.metrics[metric] || {
    label: metric,
    description: 'Data about this facility',
  };
}

/**
 * Get risk level information in plain language
 */
export function getRiskLevelInfo(level: 'low' | 'medium' | 'high' | 'critical'): {
  label: string;
  description: string;
  color: string;
  icon: string;
  action: string;
} {
  return PLAIN_LANGUAGE.riskLevels[level];
}

/**
 * Convert number to plain language
 */
export function formatForOrganizers(value: number, type: 'currency' | 'number' | 'percent'): string {
  switch (type) {
    case 'currency':
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)} million`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)} thousand`;
      }
      return `$${value.toLocaleString()}`;
    
    case 'percent':
      return `${Math.round(value)}%`;
    
    case 'number':
      if (value >= 1000) {
        return value.toLocaleString();
      }
      return value.toString();
    
    default:
      return value.toString();
  }
}

/**
 * Get contextual help text based on what user is viewing
 */
export function getContextualHelp(context: string): {
  question: string;
  answer: string;
  nextSteps: string[];
} {
  const helpMap: Record<string, any> = {
    'high-risk-facility': {
      question: 'Why is this facility flagged?',
      answer: 'This data center received public money (tax breaks, subsidies) to create jobs, but hasn\'t kept its promise. The company is significantly behind on job creation.',
      nextSteps: [
        'Review the specific violations',
        'Check if there are other facilities by the same company',
        'Document this for organizing campaign',
        'Share with community members',
      ],
    },
    'subsidy-gap': {
      question: 'What does "broken job promises" mean?',
      answer: 'When companies get tax breaks or subsidies, they promise to create a certain number of jobs. The "broken job promises" shows the dollar value of jobs they promised but didn\'t deliver.',
      nextSteps: [
        'Calculate how many jobs weren\'t created',
        'Find out where that money went',
        'Demand the company fulfill its promises',
        'Consider organizing public pressure',
      ],
    },
    'security-overview': {
      question: 'What am I looking at here?',
      answer: 'This shows which data centers are breaking their promises. Red = serious violations, Yellow = concerning patterns, Green = keeping promises.',
      nextSteps: [
        'Click on red (critical) facilities first',
        'Review their broken promises',
        'Export evidence for your campaign',
        'Share findings with your team',
      ],
    },
  };

  return helpMap[context] || {
    question: 'Need help?',
    answer: 'Click the Help button (bottom-left) for detailed guidance',
    nextSteps: ['Press ? for keyboard shortcuts', 'Click Help for full documentation'],
  };
}

export default PLAIN_LANGUAGE;

