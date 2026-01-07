/**
 * Community Benefit Agreement (CBA) Generator Service
 * 
 * Standardized templates for negotiating data center CBAs with
 * environmental, labor, and community provisions.
 * 
 * Based on:
 * - LAX Modernization CBA (2004) - $500M in benefits
 * - Wilmington OH provisions (environmental focus)
 * - Lancaster PA draft (CoreWeave negotiation)
 * - Gaming industry CBAs (Nevada model)
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CBAProvision {
  id: string;
  category: 'environmental' | 'labor' | 'community' | 'transparency' | 'enforcement';
  name: string;
  description: string;
  legalLanguage: string;
  estimatedValue?: string;
  implementationCost?: string;
  precedents: string[];
  difficulty: 'standard' | 'negotiable' | 'aggressive';
  recommended: boolean;
}

export interface CBATemplate {
  id: string;
  name: string;
  description: string;
  provisions: CBAProvision[];
  totalEstimatedValue: string;
  precedentAgreements: string[];
  legalConsiderations: string[];
}

export interface CBADraft {
  projectName: string;
  operator: string;
  location: {
    city: string;
    state: string;
    county: string;
  };
  projectValue: number;
  selectedProvisions: string[];
  customProvisions: string[];
  generatedAt: string;
  estimatedBenefits: number;
}

export interface EconomicImpact {
  directJobs: number;
  indirectJobs: number;
  constructionJobs: number;
  operationsJobs: number;
  localHireJobs: number;
  wageImpact: number;
  taxRevenue: number;
  communityFundContribution: number;
  totalEconomicImpact: number;
}

// =============================================================================
// CBA PROVISIONS DATABASE
// =============================================================================

export const CBA_PROVISIONS: CBAProvision[] = [
  // ENVIRONMENTAL PROVISIONS
  {
    id: 'env-tier4-generators',
    category: 'environmental',
    name: 'Tier 4 EPA Generators Only',
    description: 'Require all backup generators to meet EPA Tier 4 Final emission standards, the strictest available.',
    legalLanguage: `Developer shall ensure that all diesel backup generators installed at the Facility meet or exceed U.S. Environmental Protection Agency Tier 4 Final emission standards (40 CFR Part 1039). No generator failing to meet these standards shall be installed or operated at the Facility. Developer shall provide certification of compliance to the Community Oversight Committee within 30 days of generator installation.`,
    estimatedValue: '$2.3M/year in health benefits',
    implementationCost: '15-20% premium over Tier 2',
    precedents: ['Wilmington OH (2024)', 'San Jose Google CBA (2021)'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'env-air-monitoring',
    category: 'environmental',
    name: 'Continuous Air Quality Monitoring',
    description: 'Install and maintain air quality monitoring stations with public real-time data access.',
    legalLanguage: `Developer shall install and maintain no fewer than [NUMBER] air quality monitoring stations at locations approved by the Community Oversight Committee. Monitors shall measure PM2.5, PM10, NOx, SO2, and VOCs on a continuous basis. All data shall be transmitted in real-time to a publicly accessible dashboard. Developer shall fund monitoring for the operational life of the Facility or 30 years, whichever is longer.`,
    estimatedValue: '$450K/year operational cost',
    implementationCost: '$150K installation + $300K/year operations',
    precedents: ['LAX CBA (2004)', 'Port of Oakland (2018)'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'env-closed-loop-cooling',
    category: 'environmental',
    name: 'Closed-Loop Water Cooling',
    description: 'Require closed-loop cooling systems to minimize water consumption and discharge.',
    legalLanguage: `Developer shall design and construct the Facility using closed-loop water cooling systems that recirculate water rather than using once-through cooling. The Facility shall achieve a Water Usage Effectiveness (WUE) of no greater than [X] liters per kilowatt-hour. Developer shall not discharge cooling water to surface waters or municipal storm drains without treatment meeting [STANDARD].`,
    estimatedValue: '$8.1M capital investment',
    implementationCost: '$8.1M vs. evaporative cooling',
    precedents: ['Singapore DC moratorium requirements', 'Netherlands cooling regulations'],
    difficulty: 'negotiable',
    recommended: true,
  },
  {
    id: 'env-renewable-energy',
    category: 'environmental',
    name: '100% Renewable Energy Commitment',
    description: 'Commit to powering the facility entirely with renewable energy within specified timeframe.',
    legalLanguage: `Developer commits to procuring 100% of the Facility's electrical consumption from renewable energy sources (solar, wind, hydroelectric, or geothermal) within [X] years of commercial operation. Renewable energy shall be procured through (a) on-site generation, (b) power purchase agreements with new renewable projects, or (c) verified renewable energy certificates from projects within the same grid region. Natural gas or other fossil fuel generation shall not qualify.`,
    estimatedValue: 'Variable based on PPA terms',
    implementationCost: 'Often cost-neutral with 10-year PPAs',
    precedents: ['Google 24/7 carbon-free commitment', 'Microsoft carbon negative pledge'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'env-noise-limits',
    category: 'environmental',
    name: 'Noise Limitation Standards',
    description: 'Establish maximum noise levels at property boundaries and nearby residences.',
    legalLanguage: `The Facility shall not produce noise levels exceeding [X] dBA at the property boundary and [Y] dBA at any residential receptor between the hours of 7:00 PM and 7:00 AM. Developer shall install sound barriers and low-noise equipment as necessary to achieve compliance. Noise monitoring shall be conducted quarterly and results reported to the Community Oversight Committee.`,
    estimatedValue: 'Quality of life improvement',
    implementationCost: '$500K-2M depending on site',
    precedents: ['Loudoun County VA noise ordinance', 'Prineville OR Google agreement'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'env-zero-carbon-2030',
    category: 'environmental',
    name: 'Zero Carbon Operations by 2030',
    description: 'Commit to achieving net-zero carbon emissions from operations by 2030.',
    legalLanguage: `Developer commits to achieving net-zero Scope 1 and Scope 2 greenhouse gas emissions from Facility operations by December 31, 2030. Progress toward this goal shall be reported annually to the Community Oversight Committee with third-party verification. Carbon offsets may constitute no more than [X]% of the pathway to net-zero.`,
    estimatedValue: 'Climate leadership',
    implementationCost: 'Variable',
    precedents: ['Microsoft carbon negative', 'Amazon Climate Pledge'],
    difficulty: 'aggressive',
    recommended: false,
  },
  
  // LABOR PROVISIONS
  {
    id: 'labor-apprenticeship',
    category: 'labor',
    name: 'State-Certified Apprenticeship Programs',
    description: 'Require contractors to participate in state-certified apprenticeship programs.',
    legalLanguage: `All construction contractors and subcontractors performing work on the Project shall participate in state-certified apprenticeship programs for each craft employed. A minimum of [X]% of total construction work hours shall be performed by registered apprentices. Developer shall require documentation of apprenticeship participation in all construction contracts and shall report apprenticeship hours quarterly to the Community Oversight Committee.`,
    estimatedValue: '1,200+ apprenticeship slots for $6B project',
    implementationCost: 'Minimal - part of union contracts',
    precedents: ['LAX CBA (2004)', 'SoFi Stadium PLA (2016)'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'labor-local-hire',
    category: 'labor',
    name: 'Local Hire Minimum (30%)',
    description: 'Require minimum percentage of workers to be hired from local community.',
    legalLanguage: `Developer shall use best efforts to ensure that at least [X]% of construction work hours and [Y]% of permanent operations positions are filled by residents of [GEOGRAPHIC AREA]. "Local resident" means an individual whose primary residence is within [DEFINITION]. Developer shall report hiring statistics quarterly and implement targeted recruitment in partnership with local workforce development organizations.`,
    estimatedValue: '~400 local jobs for $6B project',
    implementationCost: 'Recruitment costs',
    precedents: ['LA Construction Careers Policy', 'NYC Local Law 63'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'labor-prevailing-wage',
    category: 'labor',
    name: 'Prevailing Wage Requirement',
    description: 'Require payment of prevailing wages for all construction and operations work.',
    legalLanguage: `All workers employed in the construction, maintenance, and operation of the Facility shall be paid not less than the prevailing wage for the applicable craft as determined by the [STATE] Department of Labor. Developer shall require prevailing wage compliance in all contracts and subcontracts and shall maintain certified payroll records available for inspection.`,
    estimatedValue: '+$12/hr average vs. non-prevailing',
    implementationCost: '10-15% labor cost premium',
    precedents: ['Davis-Bacon Act projects', 'State prevailing wage laws'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'labor-pla',
    category: 'labor',
    name: 'Project Labor Agreement (PLA)',
    description: 'Require a comprehensive PLA covering all construction work.',
    legalLanguage: `Developer shall enter into a Project Labor Agreement with the [Building Trades Council] covering all construction work on the Project. The PLA shall establish uniform terms and conditions of employment, provide for dispute resolution through binding arbitration, and ensure continuity of work without strikes or lockouts for the duration of construction.`,
    estimatedValue: 'Full union coverage',
    implementationCost: 'Union wage and benefit costs',
    precedents: ['Vantage DC Wisconsin ($15B)', 'QTS Ashburn expansion'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'labor-neutrality',
    category: 'labor',
    name: 'Operations Neutrality Agreement',
    description: 'Commit to neutrality if operations workers seek union representation.',
    legalLanguage: `Developer agrees that in the event employees of the Facility seek union representation, Developer shall (a) remain neutral and not campaign against unionization, (b) provide union organizers reasonable access to non-work areas, (c) agree to card check recognition if a majority of employees sign authorization cards, and (d) commit to binding arbitration for first contract if negotiations exceed [X] days.`,
    estimatedValue: 'Worker empowerment',
    implementationCost: 'Potential wage/benefit increases',
    precedents: ['Kaiser Permanente LMP', 'UNITE HERE neutrality agreements'],
    difficulty: 'aggressive',
    recommended: false,
  },
  {
    id: 'labor-health-safety',
    category: 'labor',
    name: 'Enhanced Health & Safety Standards',
    description: 'Exceed OSHA requirements with additional safety measures and worker health programs.',
    legalLanguage: `Developer shall implement a comprehensive health and safety program exceeding OSHA requirements, including: (a) quarterly third-party safety audits, (b) heat stress prevention protocols for outdoor work, (c) mental health resources and EAP access for all workers, (d) ergonomic assessments for operations positions, and (e) joint labor-management safety committees with authority to halt unsafe work.`,
    estimatedValue: 'Worker protection',
    implementationCost: '$50-100K/year',
    precedents: ['ILWU safety programs', 'OSHA VPP sites'],
    difficulty: 'negotiable',
    recommended: true,
  },
  
  // COMMUNITY PROVISIONS
  {
    id: 'comm-fund',
    category: 'community',
    name: 'Community Benefit Fund ($X per MW)',
    description: 'Establish ongoing community fund based on facility capacity.',
    legalLanguage: `Developer shall contribute to the [COMMUNITY NAME] Community Benefit Fund at a rate of $[X] per megawatt of installed IT load capacity per year, adjusted annually for inflation. The Fund shall be administered by a board consisting of [COMPOSITION] and shall support community priorities including affordable housing, workforce development, youth programs, and environmental justice initiatives.`,
    estimatedValue: '$2.5M/year for 100MW facility',
    implementationCost: '$25K/MW/year',
    precedents: ['LAX CBA community fund', 'Ports of LA/Long Beach community funds'],
    difficulty: 'negotiable',
    recommended: true,
  },
  {
    id: 'comm-emergency-response',
    category: 'community',
    name: 'Emergency Response Cost Sharing',
    description: 'Establish escrow fund for emergency response capabilities.',
    legalLanguage: `Developer shall establish and maintain an escrow account of not less than $[X] to fund enhanced emergency response capabilities in [JURISDICTION]. Funds may be used for: (a) specialized firefighting equipment for lithium-ion battery incidents, (b) hazmat training for local first responders, (c) emergency communication systems, and (d) mutual aid agreements with neighboring jurisdictions.`,
    estimatedValue: '$500K escrow minimum',
    implementationCost: '$500K initial + replenishment',
    precedents: ['Tesla Gigafactory Nevada', 'Battery storage facility requirements'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'comm-affordable-housing',
    category: 'community',
    name: 'Affordable Housing Contribution',
    description: 'Contribute to affordable housing fund to offset workforce housing impacts.',
    legalLanguage: `Recognizing that the Project will increase housing demand and potentially affect affordability, Developer shall contribute $[X] per construction worker-year and $[Y] per permanent position to the [JURISDICTION] Affordable Housing Trust Fund. Contributions shall be made annually for the first [Z] years of operation.`,
    estimatedValue: '$1-5M depending on project size',
    implementationCost: '$500-2,000 per worker-year',
    precedents: ['San Francisco development fees', 'Boston linkage program'],
    difficulty: 'negotiable',
    recommended: false,
  },
  {
    id: 'comm-infrastructure',
    category: 'community',
    name: 'Infrastructure Improvement Fund',
    description: 'Fund improvements to local roads, utilities, and public infrastructure.',
    legalLanguage: `Developer shall contribute $[X] to fund improvements to public infrastructure impacted by the Project, including: (a) road improvements on [SPECIFIC ROUTES], (b) water and sewer capacity upgrades, (c) electrical grid improvements beyond the property boundary, and (d) telecommunications infrastructure. Specific projects shall be identified in consultation with [JURISDICTION] and the Community Oversight Committee.`,
    estimatedValue: '$5-20M depending on impacts',
    implementationCost: 'Variable',
    precedents: ['Development impact fees', 'Traffic mitigation requirements'],
    difficulty: 'negotiable',
    recommended: true,
  },
  
  // TRANSPARENCY PROVISIONS
  {
    id: 'trans-pilot-transparency',
    category: 'transparency',
    name: 'PILOT Agreement Transparency',
    description: 'Require public disclosure of all tax incentive agreements and compliance reports.',
    legalLanguage: `All Payment in Lieu of Taxes (PILOT) agreements, tax abatements, and other financial incentives provided to the Project shall be publicly disclosed, including: (a) the full text of all agreements, (b) annual reports on incentive value received, (c) compliance with job creation and investment commitments, and (d) clawback triggers and any clawback amounts collected. Reports shall be posted on a public website within 60 days of each fiscal year end.`,
    estimatedValue: 'Accountability',
    implementationCost: 'Administrative only',
    precedents: ['Good Jobs First disclosure requirements', 'State subsidy transparency laws'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'trans-energy-reporting',
    category: 'transparency',
    name: 'Energy & Water Usage Reporting',
    description: 'Require quarterly public reporting of energy and water consumption.',
    legalLanguage: `Developer shall report quarterly to the Community Oversight Committee and make publicly available: (a) total energy consumption (kWh), (b) Power Usage Effectiveness (PUE), (c) total water consumption and Water Usage Effectiveness (WUE), (d) renewable energy percentage, and (e) carbon emissions (Scope 1 and 2). Reports shall be verified annually by a third party.`,
    estimatedValue: 'Environmental accountability',
    implementationCost: '$25-50K/year reporting costs',
    precedents: ['EU Energy Efficiency Directive', 'Singapore BCA Green Mark'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'trans-job-verification',
    category: 'transparency',
    name: 'Job Creation Verification',
    description: 'Require third-party verification of job creation claims.',
    legalLanguage: `Developer shall engage an independent third party acceptable to the Community Oversight Committee to verify annually: (a) the number of jobs created (construction and permanent), (b) wage levels and benefits provided, (c) local hire percentages achieved, and (d) contractor compliance with labor provisions. Verification reports shall be made public and any shortfalls shall trigger remediation requirements.`,
    estimatedValue: 'Prevents subsidy abuse',
    implementationCost: '$50-100K/year audit costs',
    precedents: ['Good Jobs First recommendations', 'State clawback provisions'],
    difficulty: 'standard',
    recommended: true,
  },
  
  // ENFORCEMENT PROVISIONS
  {
    id: 'enf-oversight-committee',
    category: 'enforcement',
    name: 'Community Oversight Committee',
    description: 'Establish independent committee with monitoring and enforcement authority.',
    legalLanguage: `The Parties shall establish a Community Oversight Committee consisting of: [X] representatives appointed by [COMMUNITY ORGANIZATIONS], [Y] representatives appointed by [LABOR UNIONS], [Z] representatives appointed by [JURISDICTION], and [W] representatives appointed by Developer. The Committee shall meet quarterly, have access to all compliance reports and monitoring data, and authority to investigate complaints and recommend enforcement actions.`,
    estimatedValue: 'Ongoing accountability',
    implementationCost: '$50-100K/year staffing support',
    precedents: ['LAX CBA oversight committee', 'Port community advisory committees'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'enf-binding-arbitration',
    category: 'enforcement',
    name: 'Binding Arbitration for Disputes',
    description: 'Require binding arbitration for CBA compliance disputes.',
    legalLanguage: `Any dispute regarding compliance with this Agreement shall be submitted to binding arbitration under the rules of the American Arbitration Association. The arbitrator shall have authority to order specific performance, assess damages, and award attorneys' fees to the prevailing party. Arbitration shall be completed within [X] days of filing and the decision shall be final and enforceable in any court of competent jurisdiction.`,
    estimatedValue: 'Enforceable commitments',
    implementationCost: 'Arbitration costs if triggered',
    precedents: ['Labor arbitration provisions', 'Commercial contract arbitration'],
    difficulty: 'standard',
    recommended: true,
  },
  {
    id: 'enf-clawback',
    category: 'enforcement',
    name: 'Enhanced Clawback Provisions',
    description: 'Establish strong clawback triggers for subsidy non-compliance.',
    legalLanguage: `If Developer fails to meet job creation, investment, or other commitments specified in incentive agreements, the following clawback provisions shall apply: (a) for job shortfalls, Developer shall repay $[X] per job below target; (b) for investment shortfalls, Developer shall repay the proportionate share of incentives received; (c) for environmental violations, Developer shall repay 150% of incentive value; (d) for labor violations, Developer shall repay 200% of incentive value. Clawback amounts shall bear interest at [Y]% from the date of non-compliance.`,
    estimatedValue: 'Deterrence and recovery',
    implementationCost: 'None unless triggered',
    precedents: ['Texas Chapter 313 clawbacks', 'New York State clawback provisions'],
    difficulty: 'aggressive',
    recommended: true,
  },
  {
    id: 'enf-third-party-beneficiary',
    category: 'enforcement',
    name: 'Third-Party Beneficiary Rights',
    description: 'Grant community organizations standing to enforce CBA provisions.',
    legalLanguage: `The undersigned community organizations are intended third-party beneficiaries of this Agreement with standing to enforce its provisions through arbitration or court action. Developer waives any defense based on lack of privity or standing. Community beneficiaries include: [LIST OF ORGANIZATIONS].`,
    estimatedValue: 'Community enforcement power',
    implementationCost: 'Litigation risk',
    precedents: ['LAX CBA (2004)', 'Some PLAs'],
    difficulty: 'aggressive',
    recommended: false,
  },
];

// =============================================================================
// TEMPLATE PRESETS
// =============================================================================

export const CBA_TEMPLATES: CBATemplate[] = [
  {
    id: 'standard-environmental',
    name: 'Standard Environmental Focus',
    description: 'Emphasis on environmental protections and air/water quality. Good starting point for communities concerned about pollution.',
    provisions: CBA_PROVISIONS.filter(p => 
      p.category === 'environmental' || 
      p.id === 'trans-energy-reporting' ||
      p.id === 'enf-oversight-committee'
    ),
    totalEstimatedValue: '$15-25M over 10 years',
    precedentAgreements: ['Wilmington OH (2024)', 'Singapore DC requirements'],
    legalConsiderations: [
      'Environmental provisions are generally enforceable as contract terms',
      'Air quality monitoring may require coordination with state EPA',
      'Water usage limits may interact with existing permits',
    ],
  },
  {
    id: 'comprehensive-labor',
    name: 'Comprehensive Labor Package',
    description: 'Full labor protections including PLA, apprenticeships, local hire, and prevailing wage. Maximizes worker benefits.',
    provisions: CBA_PROVISIONS.filter(p => 
      p.category === 'labor' || 
      p.id === 'trans-job-verification' ||
      p.id === 'enf-binding-arbitration'
    ),
    totalEstimatedValue: '$50M+ over construction period',
    precedentAgreements: ['LAX CBA (2004)', 'Vantage Wisconsin PLA (2024)'],
    legalConsiderations: [
      'PLAs are legal for private projects but may face political opposition',
      'Local hire requirements must comply with state law restrictions',
      'Prevailing wage extends to subcontractors at all tiers',
    ],
  },
  {
    id: 'community-first',
    name: 'Community First',
    description: 'Prioritizes community fund, local investment, and transparency. Good for projects seeking public acceptance.',
    provisions: CBA_PROVISIONS.filter(p => 
      p.category === 'community' || 
      p.category === 'transparency' ||
      p.id === 'enf-oversight-committee'
    ),
    totalEstimatedValue: '$10-20M in direct community benefits',
    precedentAgreements: ['Atlanta Beltline CBA', 'Detroit community benefits'],
    legalConsiderations: [
      'Community funds should be structured as 501(c)(3) for tax efficiency',
      'PILOT transparency may conflict with existing confidentiality provisions',
      'Infrastructure contributions should be credited against impact fees',
    ],
  },
  {
    id: 'maximum-comprehensive',
    name: 'Maximum Comprehensive',
    description: 'All recommended provisions across all categories. Use for large projects ($1B+) with significant community leverage.',
    provisions: CBA_PROVISIONS.filter(p => p.recommended),
    totalEstimatedValue: '$100M+ over project lifecycle',
    precedentAgreements: ['LAX CBA (2004) - $500M', 'SoFi Stadium (2016)'],
    legalConsiderations: [
      'Comprehensive CBAs require significant legal review',
      'May need approval from multiple government entities',
      'Enforcement mechanisms should be prioritized',
    ],
  },
];

// =============================================================================
// GENERATOR FUNCTIONS
// =============================================================================

/**
 * Calculate economic impact of selected provisions
 */
export function calculateEconomicImpact(
  projectValue: number,
  selectedProvisionIds: string[],
  estimatedMW: number = 100
): EconomicImpact {
  const provisions = CBA_PROVISIONS.filter(p => selectedProvisionIds.includes(p.id));
  
  // Base job estimates (industry averages)
  const constructionJobsPerMillion = 5; // 5 jobs per $1M construction
  const operationsJobsPerMW = 0.5; // 0.5 FTE per MW
  
  const directJobs = Math.round(projectValue / 1000000 * constructionJobsPerMillion * 0.3);
  const constructionJobs = Math.round(projectValue / 1000000 * constructionJobsPerMillion);
  const operationsJobs = Math.round(estimatedMW * operationsJobsPerMW);
  
  // Local hire impact
  const hasLocalHire = selectedProvisionIds.includes('labor-local-hire');
  const localHirePercentage = hasLocalHire ? 0.30 : 0.10;
  const localHireJobs = Math.round((constructionJobs + operationsJobs) * localHirePercentage);
  
  // Wage impact from prevailing wage
  const hasPrevailingWage = selectedProvisionIds.includes('labor-prevailing-wage');
  const wageImpact = hasPrevailingWage ? constructionJobs * 12 * 2080 : 0; // $12/hr premium * hours
  
  // Community fund
  const hasCommFund = selectedProvisionIds.includes('comm-fund');
  const communityFundContribution = hasCommFund ? estimatedMW * 25000 : 0; // $25K per MW per year
  
  // Tax revenue (rough estimate)
  const taxRevenue = projectValue * 0.02; // 2% of project value annually
  
  // Indirect jobs (multiplier effect)
  const indirectJobs = Math.round(directJobs * 1.5);
  
  return {
    directJobs,
    indirectJobs,
    constructionJobs,
    operationsJobs,
    localHireJobs,
    wageImpact,
    taxRevenue,
    communityFundContribution,
    totalEconomicImpact: wageImpact + communityFundContribution * 10 + taxRevenue * 10,
  };
}

/**
 * Generate CBA draft document
 */
export function generateCBADraft(
  projectName: string,
  operator: string,
  location: CBADraft['location'],
  projectValue: number,
  selectedProvisionIds: string[],
  customProvisions: string[] = []
): CBADraft {
  return {
    projectName,
    operator,
    location,
    projectValue,
    selectedProvisions: selectedProvisionIds,
    customProvisions,
    generatedAt: new Date().toISOString(),
    estimatedBenefits: calculateEconomicImpact(projectValue, selectedProvisionIds).totalEconomicImpact,
  };
}

/**
 * Generate full CBA document text
 */
export function generateCBADocument(draft: CBADraft): string {
  const provisions = CBA_PROVISIONS.filter(p => draft.selectedProvisions.includes(p.id));
  const impact = calculateEconomicImpact(draft.projectValue, draft.selectedProvisions);
  
  let document = `
COMMUNITY BENEFITS AGREEMENT

FOR THE ${draft.projectName.toUpperCase()}

This Community Benefits Agreement ("Agreement") is entered into as of [DATE] by and among:

${draft.operator} ("Developer")

AND

The undersigned community organizations and labor unions (collectively, "Community Partners")

RECITALS

WHEREAS, Developer proposes to construct and operate a data center facility known as the ${draft.projectName} in ${draft.location.city}, ${draft.location.county} County, ${draft.location.state} (the "Project");

WHEREAS, the Project represents an investment of approximately $${(draft.projectValue / 1000000).toFixed(0)} million and is expected to create approximately ${impact.constructionJobs} construction jobs and ${impact.operationsJobs} permanent operations positions;

WHEREAS, the parties desire to ensure that the Project provides maximum benefit to the local community while minimizing potential negative impacts;

NOW, THEREFORE, in consideration of the mutual covenants and agreements herein, the parties agree as follows:

`;

  // Group provisions by category
  const categories = ['environmental', 'labor', 'community', 'transparency', 'enforcement'];
  const categoryNames: Record<string, string> = {
    environmental: 'ENVIRONMENTAL COMMITMENTS',
    labor: 'LABOR AND WORKFORCE COMMITMENTS',
    community: 'COMMUNITY INVESTMENT COMMITMENTS',
    transparency: 'TRANSPARENCY AND REPORTING',
    enforcement: 'ENFORCEMENT AND OVERSIGHT',
  };
  
  let articleNum = 1;
  
  for (const category of categories) {
    const categoryProvisions = provisions.filter(p => p.category === category);
    if (categoryProvisions.length === 0) continue;
    
    document += `
ARTICLE ${articleNum}: ${categoryNames[category]}

`;
    
    let sectionNum = 1;
    for (const provision of categoryProvisions) {
      document += `Section ${articleNum}.${sectionNum} - ${provision.name}

${provision.legalLanguage}

`;
      sectionNum++;
    }
    
    articleNum++;
  }
  
  // Add custom provisions
  if (draft.customProvisions.length > 0) {
    document += `
ARTICLE ${articleNum}: ADDITIONAL PROVISIONS

`;
    let sectionNum = 1;
    for (const custom of draft.customProvisions) {
      document += `Section ${articleNum}.${sectionNum} - Additional Provision ${sectionNum}

${custom}

`;
      sectionNum++;
    }
    articleNum++;
  }
  
  // Signature block
  document += `
ARTICLE ${articleNum}: GENERAL PROVISIONS

Section ${articleNum}.1 - Entire Agreement
This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements and understandings.

Section ${articleNum}.2 - Amendments
This Agreement may be amended only by written instrument signed by all parties.

Section ${articleNum}.3 - Severability
If any provision of this Agreement is held invalid, the remaining provisions shall continue in full force and effect.

Section ${articleNum}.4 - Term
This Agreement shall remain in effect for the operational life of the Project or 30 years, whichever is longer.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

DEVELOPER:
${draft.operator}

By: _______________________________
Name:
Title:
Date:


COMMUNITY PARTNERS:

[ORGANIZATION 1]
By: _______________________________
Name:
Title:
Date:

[ORGANIZATION 2]
By: _______________________________
Name:
Title:
Date:

[LABOR UNION 1]
By: _______________________________
Name:
Title:
Date:

`;
  
  return document;
}

/**
 * Get provisions by category
 */
export function getProvisionsByCategory(category: CBAProvision['category']): CBAProvision[] {
  return CBA_PROVISIONS.filter(p => p.category === category);
}

/**
 * Get recommended provisions
 */
export function getRecommendedProvisions(): CBAProvision[] {
  return CBA_PROVISIONS.filter(p => p.recommended);
}

/**
 * Get provision by ID
 */
export function getProvisionById(id: string): CBAProvision | undefined {
  return CBA_PROVISIONS.find(p => p.id === id);
}

/**
 * Estimate total benefit value of selected provisions
 */
export function estimateBenefitValue(selectedProvisionIds: string[], projectValue: number): string {
  const provisions = CBA_PROVISIONS.filter(p => selectedProvisionIds.includes(p.id));
  
  // Rough calculation based on provision types
  let totalValue = 0;
  
  for (const provision of provisions) {
    if (provision.category === 'labor') {
      totalValue += projectValue * 0.01; // 1% of project value
    } else if (provision.category === 'environmental') {
      totalValue += projectValue * 0.005; // 0.5% of project value
    } else if (provision.category === 'community') {
      totalValue += projectValue * 0.008; // 0.8% of project value
    } else {
      totalValue += projectValue * 0.001; // 0.1% of project value
    }
  }
  
  if (totalValue >= 1000000000) {
    return `$${(totalValue / 1000000000).toFixed(1)}B`;
  } else if (totalValue >= 1000000) {
    return `$${(totalValue / 1000000).toFixed(1)}M`;
  } else {
    return `$${(totalValue / 1000).toFixed(0)}K`;
  }
}

