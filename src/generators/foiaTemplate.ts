// FOIA Template Generator
// Generates customized FOIA request letters

import { db } from '../db/database';

export type FOIATemplateId = 
  | 'water-usage'
  | 'employment-verification'
  | 'tax-incentive-agreement'
  | 'generator-emissions'
  | 'energy-consumption';

export interface FOIATemplate {
  subject: string;
  body: string;
  recipientAgency: string;
  recipientAddress: string;
  estimatedResponseTime: string;
  tips: string[];
}

const TEMPLATES: Record<FOIATemplateId, {
  subject: string;
  bodyTemplate: string;
  agency: string;
  address: string;
  responseTime: string;
  tips: string[];
}> = {
  'water-usage': {
    subject: 'FOIA Request: Water Consumption Records',
    bodyTemplate: `To Whom It May Concern:

I am submitting a request under the Freedom of Information Act (FOIA) for water consumption records related to the following facility:

Facility Name: {{FACILITY_NAME}}
Facility Address: {{FACILITY_ADDRESS}}
County: {{COUNTY_NAME}}

I am requesting:
1. Monthly water consumption records for the period {{DATE_RANGE}}
2. Permitted maximum water consumption for this facility
3. Any water usage agreements or contracts
4. Records of any water usage violations or exceedances

This request is made in the public interest for research purposes related to infrastructure accountability and local resource management.

Please provide these records in electronic format if possible. I request a fee waiver for this request as it is in the public interest and will be used for non-commercial research purposes.

Thank you for your attention to this matter.

Sincerely,
[YOUR NAME]
[YOUR ADDRESS]
[YOUR EMAIL]
[YOUR PHONE]`,
    agency: 'Municipal Water Authority',
    address: '[Local Water Authority Address]',
    responseTime: '20 business days',
    tips: [
      'Request waiver of fees for public interest research',
      'Specify date range to narrow request (e.g., "2020-2024")',
      'Ask for electronic format to speed delivery',
      'Include facility address and any permit numbers if known'
    ]
  },
  'employment-verification': {
    subject: 'FOIA Request: Employment Verification Records',
    bodyTemplate: `To Whom It May Concern:

I am submitting a request under the Freedom of Information Act (FOIA) for employment verification records related to the following facility:

Facility Name: {{FACILITY_NAME}}
Facility Address: {{FACILITY_ADDRESS}}
County: {{COUNTY_NAME}}

I am requesting:
1. Employment verification records or headcount reports for the period {{DATE_RANGE}}
2. Records of job creation commitments and actual employment numbers
3. Any reports submitted to economic development agencies regarding employment
4. Records of contractor employment if available

This request is made in the public interest for research purposes related to economic development accountability.

Please provide these records in electronic format if possible. I request a fee waiver for this request as it is in the public interest.

Thank you for your attention to this matter.

Sincerely,
[YOUR NAME]
[YOUR ADDRESS]
[YOUR EMAIL]
[YOUR PHONE]`,
    agency: 'County Economic Development Office',
    address: '[County Economic Development Office Address]',
    responseTime: '20 business days',
    tips: [
      'Request waiver of fees for public interest research',
      'Specify date range to narrow request',
      'Ask for electronic format',
      'Reference any known agreement IDs or resolution numbers'
    ]
  },
  'tax-incentive-agreement': {
    subject: 'FOIA Request: Tax Incentive Agreement',
    bodyTemplate: `To Whom It May Concern:

I am submitting a request under the Freedom of Information Act (FOIA) for tax incentive agreement records related to the following facility:

Facility Name: {{FACILITY_NAME}}
Facility Address: {{FACILITY_ADDRESS}}
County: {{COUNTY_NAME}}

I am requesting:
1. The complete tax incentive agreement or development agreement
2. All amendments or modifications to the agreement
3. Records of incentive value calculations
4. Any compliance reports or status updates
5. Records of any incentive clawbacks or penalties

This request is made in the public interest for research purposes related to public investment transparency.

Please provide these records in electronic format if possible. I request a fee waiver for this request as it is in the public interest.

Thank you for your attention to this matter.

Sincerely,
[YOUR NAME]
[YOUR ADDRESS]
[YOUR EMAIL]
[YOUR PHONE]`,
    agency: 'County Economic Development Office',
    address: '[County Economic Development Office Address]',
    responseTime: '20 business days',
    tips: [
      'Request waiver of fees for public interest research',
      'Reference any known agreement IDs or resolution numbers',
      'Ask for electronic format',
      'Request all related documents, not just the main agreement'
    ]
  },
  'generator-emissions': {
    subject: 'FOIA Request: Backup Generator Emissions Records',
    bodyTemplate: `To Whom It May Concern:

I am submitting a request under the Freedom of Information Act (FOIA) for backup generator emissions records related to the following facility:

Facility Name: {{FACILITY_NAME}}
Facility Address: {{FACILITY_ADDRESS}}
County: {{COUNTY_NAME}}

I am requesting:
1. Air quality permits for backup generators
2. Records of generator test schedules and durations
3. Emissions reports or test results
4. Records of any violations or exceedances
5. Diesel fuel consumption records if available

This request is made in the public interest for research purposes related to local air quality impacts.

Please provide these records in electronic format if possible. I request a fee waiver for this request as it is in the public interest.

Thank you for your attention to this matter.

Sincerely,
[YOUR NAME]
[YOUR ADDRESS]
[YOUR EMAIL]
[YOUR PHONE]`,
    agency: 'State Environmental Protection Agency',
    address: '[State EPA Address]',
    responseTime: '20 business days',
    tips: [
      'Request waiver of fees for public interest research',
      'Specify date range for test records',
      'Ask for electronic format',
      'Include any known permit numbers if available'
    ]
  },
  'energy-consumption': {
    subject: 'FOIA Request: Energy Consumption Records',
    bodyTemplate: `To Whom It May Concern:

I am submitting a request under the Freedom of Information Act (FOIA) for energy consumption records related to the following facility:

Facility Name: {{FACILITY_NAME}}
Facility Address: {{FACILITY_ADDRESS}}
County: {{COUNTY_NAME}}

I am requesting:
1. Monthly energy consumption records (kWh) for the period {{DATE_RANGE}}
2. Peak demand records
3. Utility agreements or contracts
4. Records of any demand response participation
5. Building capacity or nameplate capacity information

This request is made in the public interest for research purposes related to infrastructure energy impacts.

Please provide these records in electronic format if possible. I request a fee waiver for this request as it is in the public interest.

Thank you for your attention to this matter.

Sincerely,
[YOUR NAME]
[YOUR ADDRESS]
[YOUR EMAIL]
[YOUR PHONE]`,
    agency: 'Municipal Utility or Grid Operator',
    address: '[Utility Company Address]',
    responseTime: '20 business days',
    tips: [
      'Request waiver of fees for public interest research',
      'Specify date range to narrow request',
      'Ask for electronic format',
      'Include account numbers or service addresses if known'
    ]
  }
};

/**
 * Generate FOIA template with facility data
 * @param templateId - Template identifier
 * @param facilityId - Facility identifier
 * @param dateRange - Optional date range (e.g., "2020-2024")
 * @returns FOIA template with placeholders replaced
 */
export async function generateFOIATemplate(
  templateId: FOIATemplateId,
  facilityId: number,
  dateRange?: string
): Promise<FOIATemplate | null> {
  const template = TEMPLATES[templateId];
  if (!template) {
    return null;
  }

  // Fetch facility data
  const facility = await db.facilities.get(facilityId);
  if (!facility) {
    return null;
  }

  // Fetch agreement for additional context (future use)
  await db.subsidyAgreements.where('facilityId').equals(facilityId).first();

  // Replace placeholders
  let body = template.bodyTemplate;
  body = body.replace(/{{FACILITY_NAME}}/g, facility.name);
  body = body.replace(/{{FACILITY_ADDRESS}}/g, `${facility.city}, ${facility.state}`);
  body = body.replace(/{{COUNTY_NAME}}/g, facility.state); // Would use actual county name
  body = body.replace(/{{DATE_RANGE}}/g, dateRange || '2020-present');
  body = body.replace(/{{AGENCY_NAME}}/g, template.agency);

  return {
    subject: template.subject,
    body,
    recipientAgency: template.agency,
    recipientAddress: template.address,
    estimatedResponseTime: template.responseTime,
    tips: template.tips
  };
}

