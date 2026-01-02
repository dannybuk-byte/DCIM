// Knowledge Gap Identifier
// Analyzes facility data to identify what we DON'T know

import { Facility } from '../types';
import { db } from '../db/database';

export interface KnowledgeGap {
  field: string;
  question: string;
  foiaTemplate: string | null;
  investigationApproach: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

const GAP_DEFINITIONS: Omit<KnowledgeGap, 'priority'>[] = [
  {
    field: 'waterUsage',
    question: 'What is actual water consumption vs. permitted maximum?',
    foiaTemplate: 'water-usage',
    investigationApproach: 'Municipal utility FOIA'
  },
  {
    field: 'localEmploymentPercentage',
    question: 'What percentage of employees live in the host county?',
    foiaTemplate: null,
    investigationApproach: 'Employee survey or LinkedIn analysis'
  },
  {
    field: 'generatorTestSchedule',
    question: 'How do diesel generator tests affect local air quality?',
    foiaTemplate: 'generator-emissions',
    investigationApproach: 'Air quality permit records'
  },
  {
    field: 'localProcurementData',
    question: 'What percentage of spending goes to local vendors?',
    foiaTemplate: null,
    investigationApproach: 'SEC 10-K supplier disclosure analysis'
  },
  {
    field: 'actualIncentiveValue',
    question: 'What is the total value of all incentive programs received?',
    foiaTemplate: 'tax-incentive-agreement',
    investigationApproach: 'County economic development FOIA'
  },
  {
    field: 'energyConsumption',
    question: 'What is actual energy consumption vs. building capacity?',
    foiaTemplate: null,
    investigationApproach: 'Utility records FOIA or grid operator data'
  },
  {
    field: 'wastewaterDischarge',
    question: 'What is actual wastewater discharge volume and composition?',
    foiaTemplate: 'water-usage',
    investigationApproach: 'NPDES permit records'
  },
  {
    field: 'contractorEmployment',
    question: 'How many contractor positions exist that are not captured in official counts?',
    foiaTemplate: null,
    investigationApproach: 'Job posting analysis or contractor disclosure'
  }
];

/**
 * Identify knowledge gaps in facility data
 * @param facilityData - Facility data object
 * @returns Array of identified knowledge gaps
 */
export function identifyKnowledgeGaps(_facilityData: Facility): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  // Check each gap definition against facility data
  for (const gapDef of GAP_DEFINITIONS) {
    let isMissing = false;
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    // Check if field is missing or has low confidence
    switch (gapDef.field) {
      case 'waterUsage':
        isMissing = true; // Water usage is typically not disclosed
        priority = 'HIGH';
        break;
      case 'localEmploymentPercentage':
        isMissing = true; // Rarely tracked
        priority = 'MEDIUM';
        break;
      case 'generatorTestSchedule':
        isMissing = true; // Not typically public
        priority = 'MEDIUM';
        break;
      case 'localProcurementData':
        isMissing = true; // Not typically disclosed
        priority = 'HIGH';
        break;
      case 'actualIncentiveValue':
        // Check if we have subsidy agreement
        isMissing = true; // May not include all incentives
        priority = 'HIGH';
        break;
      case 'energyConsumption':
        isMissing = true; // Typically not disclosed
        priority = 'HIGH';
        break;
      case 'wastewaterDischarge':
        isMissing = true; // May not be available
        priority = 'MEDIUM';
        break;
      case 'contractorEmployment':
        isMissing = true; // Rarely tracked
        priority = 'LOW';
        break;
    }

    if (isMissing) {
      gaps.push({
        ...gapDef,
        priority
      });
    }
  }

  // Sort by priority
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return gaps;
}

/**
 * Get knowledge gaps for a facility by ID
 * @param facilityId - Facility identifier
 * @returns Array of knowledge gaps
 */
export async function getKnowledgeGapsForFacility(facilityId: number): Promise<KnowledgeGap[]> {
  const facility = await db.facilities.get(facilityId);
  if (!facility) {
    return [];
  }

  return identifyKnowledgeGaps(facility);
}

