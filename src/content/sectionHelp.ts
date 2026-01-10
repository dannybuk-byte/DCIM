/**
 * Section Help Content - FAQs, Guides, and How-Tos
 * 
 * Contextual help content for each section of the DCIM Compliance App.
 * Designed to help labor organizers and community activists understand
 * and effectively use each tool.
 */

import { SectionContext } from '../ai/sectionPrompts';

export interface FAQ {
  question: string;
  answer: string;
  tags: string[];
}

export interface Guide {
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
  warnings?: string[];
  relatedFAQs?: string[];
}

export interface HowTo {
  title: string;
  goal: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeEstimate: string;
  prerequisites?: string[];
  steps: {
    action: string;
    detail?: string;
    tip?: string;
  }[];
  outcome: string;
}

export interface SectionHelpContent {
  overview: string;
  keyTerms: { term: string; definition: string }[];
  faqs: FAQ[];
  guides: Guide[];
  howTos: HowTo[];
  resources: { title: string; url: string; type: 'internal' | 'external' }[];
}

export const SECTION_HELP: Record<SectionContext, SectionHelpContent> = {
  global: {
    overview: 'The DCIM Compliance Dashboard helps labor organizers track Big Tech\'s broken job creation promises. With data on 11,992+ facilities and $2.48B+ in subsidy gaps, you can identify organizing targets and hold corporations accountable.',
    keyTerms: [
      { term: 'Subsidy Gap', definition: 'The difference between what a company received in tax breaks and what they delivered in promised jobs.' },
      { term: 'Compliance Status', definition: 'Whether a facility is meeting its job creation commitments: Compliant, At Risk, or Non-Compliant.' },
      { term: 'Job Fulfillment Rate', definition: 'The percentage of promised jobs that were actually created (Jobs Created ÷ Jobs Promised).' },
    ],
    faqs: [
      {
        question: 'What data does this dashboard track?',
        answer: 'We track 11,992 data center facilities across the US, including their job promises, actual job creation, subsidy amounts, compliance status, and operator information.',
        tags: ['data', 'overview']
      },
      {
        question: 'Where does the data come from?',
        answer: 'Data is aggregated from SEC filings, state economic development agencies, local government records, news sources, and labor organization research.',
        tags: ['data', 'sources']
      },
      {
        question: 'How often is the data updated?',
        answer: 'Facility data is updated monthly. Real-time features like BGP monitoring update continuously.',
        tags: ['data', 'updates']
      },
    ],
    guides: [
      {
        title: 'Getting Started with the Dashboard',
        description: 'Learn the basics of navigating and using the DCIM Compliance Dashboard.',
        steps: [
          'Use the sidebar to navigate between main sections: Overview, Facilities, Intelligence, and Tools.',
          'The top bar shows real-time statistics: total facilities, compliance rates, and subsidy gap.',
          'Click on any facility to see detailed information including job data and compliance history.',
          'Use the search bar to find specific facilities, operators, or locations.',
        ],
        tips: [
          'Press Alt+1/2/3 to quickly switch between density modes.',
          'Use keyboard shortcuts [ and ] to toggle the sidebar.',
        ],
      },
    ],
    howTos: [
      {
        title: 'Find Non-Compliant Facilities in Your State',
        goal: 'Identify data centers in your state that have broken their job creation promises.',
        difficulty: 'beginner',
        timeEstimate: '2 minutes',
        steps: [
          { action: 'Go to the Facilities tab', detail: 'Click "Facilities" in the sidebar.' },
          { action: 'Use the state filter', detail: 'Select your state from the dropdown or type it in the search.' },
          { action: 'Filter by compliance status', detail: 'Click "Non-Compliant" to see only facilities that have broken promises.' },
          { action: 'Sort by subsidy gap', detail: 'Click the "Subsidy Gap" column header to see the worst offenders first.' },
        ],
        outcome: 'You\'ll have a list of non-compliant facilities in your state, sorted by how much they\'ve benefited from taxpayer subsidies without delivering promised jobs.',
      },
    ],
    resources: [
      { title: 'Labor Organizing Basics', url: 'https://aflcio.org/formaunion', type: 'external' },
      { title: 'Understanding Tax Incentives', url: '/guides/tax-incentives', type: 'internal' },
    ],
  },

  sanctions: {
    overview: 'The OFAC Sanctions Monitor helps identify potential sanctions violations at data center facilities. Under IEEPA strict liability, facilities can be held responsible for hosting sanctioned entities even without knowledge. Whistleblowers can receive 10-30% of sanctions over $1M.',
    keyTerms: [
      { term: 'OFAC', definition: 'Office of Foreign Assets Control - the US Treasury department that enforces economic sanctions.' },
      { term: 'SDN List', definition: 'Specially Designated Nationals list - individuals and entities blocked from transacting with US persons.' },
      { term: 'Strict Liability', definition: 'Legal standard where violations occur regardless of intent or knowledge.' },
      { term: 'Whistleblower Award', definition: 'Financial reward (10-30% of penalties over $1M) for reporting sanctions violations.' },
      { term: 'Sanctioned ASN', definition: 'Autonomous System Number associated with sanctioned countries or entities.' },
    ],
    faqs: [
      {
        question: 'What makes a facility "high risk" for sanctions?',
        answer: 'High risk factors include: tenant names matching SDN list entries, network traffic from sanctioned countries (Iran, Russia, Cuba, North Korea, Syria), BGP peering with sanctioned ASNs, cryptocurrency mining indicators, or cash/crypto-only payment patterns.',
        tags: ['risk', 'sanctions', 'compliance']
      },
      {
        question: 'How does the SDN name matching work?',
        answer: 'We use fuzzy matching (Levenshtein distance) to find potential matches between facility tenants and SDN list entries, including aliases. A match score above 85% triggers a high-risk alert.',
        tags: ['sdn', 'matching', 'technical']
      },
      {
        question: 'What are the whistleblower protections?',
        answer: 'Under the AML Whistleblower Improvement Act and Dodd-Frank, reporters are protected from retaliation. You can report anonymously through an attorney. Awards are 10-30% of sanctions over $1M.',
        tags: ['whistleblower', 'legal', 'protection']
      },
      {
        question: 'What should I document before filing a report?',
        answer: 'Document: tenant names and business activities, unusual network traffic patterns, payment methods observed, any communications about avoiding compliance, timestamps and evidence of what you witnessed.',
        tags: ['reporting', 'documentation', 'evidence']
      },
      {
        question: 'Can I report anonymously?',
        answer: 'Yes. You can report through the OFAC hotline anonymously, or work with a whistleblower attorney who can file on your behalf while protecting your identity.',
        tags: ['anonymous', 'reporting', 'privacy']
      },
    ],
    guides: [
      {
        title: 'Understanding Sanctions Risk Scores',
        description: 'Learn how facility risk scores are calculated and what they mean.',
        steps: [
          'Risk scores range from 0-100 and combine multiple factors.',
          'SDN Name Match (0-40 points): How closely tenant names match the SDN list.',
          'Sanctioned Jurisdiction Traffic (0-25 points): Network traffic to/from sanctioned countries.',
          'Sanctioned AS Peering (0-15 points): BGP routes through sanctioned networks.',
          'Additional factors: Crypto mining indicators, documentation avoidance, payment anomalies.',
        ],
        tips: [
          'CRITICAL (80+) and HIGH (60-79) risk facilities warrant immediate attention.',
          'Even MODERATE (40-59) risk should be monitored and documented.',
        ],
        warnings: [
          'Risk scores are indicators, not proof of violations. Always verify before reporting.',
          'False SDN matches can occur with common names - verify with additional research.',
        ],
      },
      {
        title: 'Searching the SDN List',
        description: 'How to effectively search for entities on the OFAC SDN list.',
        steps: [
          'Go to the "SDN Search" tab in Sanctions Monitor.',
          'Enter the name, alias, or partial name you want to search.',
          'Review matches sorted by confidence score.',
          'Click on a match to see full SDN entry details including programs, aliases, and addresses.',
          'Use "Export" to save search results for documentation.',
        ],
        tips: [
          'Search for company names, individual names, and known aliases.',
          'Try variations: "Ltd" vs "Limited", with/without middle names.',
          'SDN entries include multiple aliases - check all variations.',
        ],
      },
    ],
    howTos: [
      {
        title: 'Calculate Your Potential Whistleblower Award',
        goal: 'Estimate what financial award you might receive for reporting a sanctions violation.',
        difficulty: 'beginner',
        timeEstimate: '5 minutes',
        steps: [
          { action: 'Go to the Awards Calculator tab', detail: 'Click "Awards" in the Sanctions Monitor navigation.' },
          { action: 'Estimate the violation value', detail: 'Consider: transaction amounts, duration of violation, number of affected accounts/services.' },
          { action: 'Enter the estimated value', detail: 'Use the slider or type the amount directly.' },
          { action: 'Review award ranges', detail: 'See potential awards across AMLA/FinCEN (10-30%), IRS (15-30%), and SEC (10-30%) programs.' },
        ],
        outcome: 'You\'ll see the potential award range for your report. For a $10M violation, awards could be $1M-$3M.',
      },
      {
        title: 'Document Sanctions Red Flags',
        goal: 'Create a proper evidence chain for a whistleblower report.',
        difficulty: 'intermediate',
        timeEstimate: '30 minutes',
        steps: [
          { action: 'Go to the Report tab', detail: 'Click "Report" in Sanctions Monitor.' },
          { action: 'Complete the Red Flag Checklist', detail: 'Check all indicators you\'ve personally observed.', tip: 'Be honest - only check what you\'ve actually witnessed.' },
          { action: 'Add detailed notes', detail: 'For each red flag, add specific dates, times, and observations.' },
          { action: 'Upload supporting evidence', detail: 'Screenshots, documents, photos are automatically hashed for integrity.' },
          { action: 'Review and save', detail: 'Your report is saved locally with SHA-256 hashing and RFC 3161 timestamps.' },
        ],
        outcome: 'A timestamped, integrity-verified evidence package ready for submission to OFAC or a whistleblower attorney.',
      },
    ],
    resources: [
      { title: 'OFAC SDN List Search', url: 'https://sanctionssearch.ofac.treas.gov/', type: 'external' },
      { title: 'Whistleblower Attorney Network', url: '/resources/attorneys', type: 'internal' },
      { title: 'OFAC Hotline', url: 'tel:1-800-540-6322', type: 'external' },
    ],
  },

  organizing: {
    overview: 'The Organizing Intelligence dashboard helps labor organizers identify and prioritize data center facilities for union campaigns. Based on the "docks to data centers" framework, it provides target scoring, contractor mapping, IBEW coverage, and corridor analysis.',
    keyTerms: [
      { term: 'Target Score', definition: 'A composite score (0-100) indicating how favorable a facility is for organizing based on worker count, conditions, and strategic factors.' },
      { term: 'Joint Employer', definition: 'When two companies share control over workers (e.g., a staffing agency and data center operator), making both liable under labor law.' },
      { term: 'IBEW', definition: 'International Brotherhood of Electrical Workers - the union representing electrical workers including data center technicians.' },
      { term: 'Corridor', definition: 'A geographic concentration of data centers (e.g., Northern Virginia, Dallas-Fort Worth) with shared infrastructure.' },
      { term: 'PLA', definition: 'Project Labor Agreement - a pre-hire collective bargaining agreement covering construction and sometimes operations.' },
    ],
    faqs: [
      {
        question: 'How are target scores calculated?',
        answer: 'Target scores combine: worker count (larger = higher), facility age (newer = higher due to less established anti-union culture), operator reputation, local labor climate, existing union presence in the area, and recent organizing momentum.',
        tags: ['scoring', 'methodology']
      },
      {
        question: 'What is joint employer liability and why does it matter?',
        answer: 'Joint employer means both the staffing agency AND the data center operator are responsible for labor law compliance. This is important because it gives workers leverage to organize against the big tech company, not just the staffing agency.',
        tags: ['legal', 'contractors', 'strategy']
      },
      {
        question: 'How do I find my IBEW local?',
        answer: 'Use the IBEW Footprint tab and enter the facility location. The map shows which IBEW local has jurisdiction over each area, along with contact information and expansion opportunities.',
        tags: ['ibew', 'unions', 'contacts']
      },
      {
        question: 'What makes a facility "critical priority"?',
        answer: 'Critical priority facilities have: high worker counts, strategic location (chokepoint corridors), favorable labor climate, weak existing anti-union presence, and recent momentum (new hires, expansion, or complaints).',
        tags: ['priority', 'strategy', 'targets']
      },
    ],
    guides: [
      {
        title: 'Understanding Contractor Structures',
        description: 'Learn how Big Tech uses staffing agencies and how to organize through them.',
        steps: [
          'Most data centers use 2-3 layers of contractors: prime contractors, staffing agencies, and subcontractors.',
          'Workers are often technically employed by staffing agencies like Modis, Aerotek, or TEKsystems.',
          'The "Joint Employer Probability Calculator" estimates if Big Tech shares legal responsibility.',
          'Key indicators: Who directs daily work? Who sets schedules? Who controls badges?',
          'If the data center operator controls these, they may be a joint employer.',
        ],
        tips: [
          'Document every instance of direct control by data center management over contractor workers.',
          'Recent NLRB rulings have expanded joint employer standards - this helps organizing.',
        ],
        warnings: [
          'Contractors may have different union eligibility rules than direct employees.',
          'Some contractors have arbitration clauses - check employment agreements.',
        ],
      },
      {
        title: 'Using Corridor Intelligence',
        description: 'Identify strategic chokepoints and coordinate regional organizing.',
        steps: [
          'Corridors are geographic clusters where organizing one facility affects many.',
          'Northern Virginia has the highest concentration - organizing there impacts cloud infrastructure.',
          'Look for "chokepoint" facilities - those with highest traffic share or lowest redundancy.',
          'Coordinate with IBEW locals that have jurisdiction over the corridor.',
          'Consider timing campaigns across multiple facilities for maximum leverage.',
        ],
        tips: [
          'Work stoppages at chokepoint facilities have outsized impact.',
          'Northern Virginia, Dallas, and Phoenix corridors are strategically critical.',
        ],
      },
    ],
    howTos: [
      {
        title: 'Identify Top Organizing Targets in Your Region',
        goal: 'Find the best facilities to organize in your IBEW local\'s jurisdiction.',
        difficulty: 'beginner',
        timeEstimate: '10 minutes',
        steps: [
          { action: 'Go to IBEW Footprint tab', detail: 'See which facilities fall in your local\'s jurisdiction.' },
          { action: 'Filter by your local number', detail: 'Click on your local to see covered facilities.' },
          { action: 'Sort by target score', detail: 'Highest scores = best organizing opportunities.' },
          { action: 'Review facility details', detail: 'Check worker counts, contractor structures, and recent activity.' },
          { action: 'Note expansion opportunities', detail: 'Facilities under construction or expanding are easier to organize.' },
        ],
        outcome: 'A prioritized list of organizing targets in your jurisdiction with key intelligence on each.',
      },
      {
        title: 'Build a Joint Employer Case',
        goal: 'Document evidence that Big Tech is a joint employer of contractor workers.',
        difficulty: 'advanced',
        timeEstimate: '2-4 weeks of documentation',
        prerequisites: ['Access to the facility as a worker or organizer', 'Understanding of NLRB joint employer standards'],
        steps: [
          { action: 'Use the Joint Employer Calculator', detail: 'Go to Contractor Mapping > Joint Employer Probability Calculator.' },
          { action: 'Document control indicators', detail: 'For each indicator, note specific examples with dates and witnesses.', tip: 'Focus on: who directs work, sets schedules, controls access, provides equipment.' },
          { action: 'Interview workers', detail: 'Ask who tells them what to do day-to-day, who they report problems to.' },
          { action: 'Gather documentary evidence', detail: 'Training materials, badges, org charts, email communications.' },
          { action: 'Consult with NLRB or labor attorney', detail: 'Review your evidence before filing a joint employer petition.' },
        ],
        outcome: 'A documented case for joint employer status that could allow organizing against the tech company directly.',
      },
    ],
    resources: [
      { title: 'IBEW Local Finder', url: 'https://ibew.org/local-union-directory', type: 'external' },
      { title: 'NLRB Joint Employer Standard', url: 'https://www.nlrb.gov/about-nlrb/what-we-do/investigate-charges', type: 'external' },
      { title: 'Tech Workers Coalition', url: 'https://techworkerscoalition.org/', type: 'external' },
    ],
  },

  subsidies: {
    overview: 'The Subsidy Tracking dashboard exposes Big Tech\'s broken job creation promises. When companies receive tax breaks, they typically promise to create jobs. This tool tracks whether they delivered - and how much taxpayer money was wasted when they didn\'t.',
    keyTerms: [
      { term: 'Subsidy Gap', definition: 'Money received minus value of jobs actually created. A $100M tax break with 50% job fulfillment = $50M gap.' },
      { term: 'Job Fulfillment Rate', definition: 'Percentage of promised jobs that were actually created and maintained.' },
      { term: 'Clawback', definition: 'Contract provisions allowing government to recover subsidies if job promises aren\'t met.' },
      { term: 'Tax Increment Financing (TIF)', definition: 'A subsidy where future tax revenue from development is redirected to the developer.' },
      { term: 'PILOT', definition: 'Payment In Lieu Of Taxes - a reduced tax payment negotiated in exchange for development.' },
    ],
    faqs: [
      {
        question: 'How is subsidy gap calculated?',
        answer: 'Subsidy Gap = Total Subsidies Received × (1 - Job Fulfillment Rate). If a company got $100M in subsidies and created only 60% of promised jobs, the gap is $40M.',
        tags: ['calculation', 'methodology']
      },
      {
        question: 'Why do companies get away with not meeting promises?',
        answer: 'Many subsidy agreements have weak enforcement: no clawback clauses, vague job definitions, long timelines, or friendly local governments unwilling to enforce. This dashboard helps identify these failures.',
        tags: ['enforcement', 'accountability']
      },
      {
        question: 'Can subsidies be recovered?',
        answer: 'Yes, if the agreement includes clawback provisions. Some states (like Texas and Virginia) have started enforcing clawbacks. Public pressure campaigns can push local governments to act.',
        tags: ['clawback', 'enforcement', 'action']
      },
      {
        question: 'What counts as a "job created"?',
        answer: 'This varies by agreement. Some count only full-time permanent jobs, others count part-time or contractor positions. Some require minimum wages. Check the specific subsidy agreement for definitions.',
        tags: ['jobs', 'definitions', 'details']
      },
    ],
    guides: [
      {
        title: 'Researching a Facility\'s Subsidies',
        description: 'How to find out what tax breaks a specific facility received.',
        steps: [
          'Start with the Subsidy Tracking tab and search for the facility.',
          'Review the "Subsidy Details" section for known incentives.',
          'Check the original sources: state economic development agency, county tax assessor, city council records.',
          'Look for press releases announcing the deal - they often have specific promises.',
          'FOIA requests to state/local agencies can reveal full subsidy agreements.',
        ],
        tips: [
          'Good Jobs First database (goodjobsfirst.org) tracks major subsidies.',
          'Local news archives often have original coverage of subsidy deals.',
          'Some states have online subsidy disclosure databases.',
        ],
      },
      {
        title: 'Building an Accountability Campaign',
        description: 'Use subsidy data to pressure companies and governments.',
        steps: [
          'Identify facilities with large subsidy gaps in your area.',
          'Research the original subsidy agreement and promises made.',
          'Calculate the per-job cost: Total Subsidy ÷ Jobs Created.',
          'Compare to what that money could have funded (schools, infrastructure).',
          'Engage local media, present at city council, organize community pressure.',
        ],
        tips: [
          'Per-job cost is often shocking: $100K+ per job is common for Big Tech subsidies.',
          'Frame the issue as taxpayer accountability, not anti-business.',
        ],
      },
    ],
    howTos: [
      {
        title: 'Find the Worst Subsidy Offenders',
        goal: 'Identify facilities and operators with the largest broken promises.',
        difficulty: 'beginner',
        timeEstimate: '5 minutes',
        steps: [
          { action: 'Open Subsidy Tracking tab', detail: 'Click on Subsidy Tracking in the navigation.' },
          { action: 'Review the Critical Gap section', detail: 'This shows facilities with gaps over $10M.' },
          { action: 'Sort by subsidy gap', detail: 'Click the gap column to see largest offenders first.' },
          { action: 'Check operator totals', detail: 'The sidebar shows which operators have the worst overall records.' },
        ],
        outcome: 'A ranked list of the worst subsidy offenders, useful for targeting accountability campaigns.',
      },
      {
        title: 'Research Clawback Eligibility',
        goal: 'Determine if taxpayers can recover subsidies from a non-compliant facility.',
        difficulty: 'intermediate',
        timeEstimate: '1-2 hours',
        prerequisites: ['Facility name and location', 'Basic understanding of public records requests'],
        steps: [
          { action: 'Identify the subsidy programs', detail: 'Note all incentive types listed in the facility details.' },
          { action: 'Find the original agreement', detail: 'FOIA the state economic development agency and local government.' },
          { action: 'Look for clawback provisions', detail: 'Search the agreement for "clawback", "recapture", or "repayment" clauses.' },
          { action: 'Check job verification requirements', detail: 'How are jobs counted? When are they verified? By whom?' },
          { action: 'Calculate potential recovery', detail: 'Based on the gap and clawback terms, estimate recoverable amount.' },
        ],
        outcome: 'Understanding of whether and how subsidies can be recovered, and ammunition for demanding enforcement.',
      },
    ],
    resources: [
      { title: 'Good Jobs First Subsidy Tracker', url: 'https://subsidytracker.goodjobsfirst.org/', type: 'external' },
      { title: 'Tax Incentive Accountability Guide', url: '/guides/accountability', type: 'internal' },
    ],
  },

  contractors: {
    overview: 'The Contractor Mapping section analyzes the complex web of staffing agencies and subcontractors at data center facilities. Understanding these relationships is key to identifying joint employer opportunities and organizing contractor workforces.',
    keyTerms: [
      { term: 'Prime Contractor', definition: 'The main contractor with a direct relationship to the data center operator.' },
      { term: 'Staffing Agency', definition: 'Companies like Modis, Aerotek, or TEKsystems that employ workers placed at data centers.' },
      { term: 'Subcontractor', definition: 'Companies working under the prime contractor, often for specialized work.' },
      { term: 'Joint Employer Probability', definition: 'Estimated likelihood that the data center operator shares legal employer status with contractors.' },
    ],
    faqs: [
      {
        question: 'Why do tech companies use so many contractors?',
        answer: 'To reduce costs, avoid employment liabilities, prevent unionization, and maintain flexibility. Workers employed by staffing agencies typically get lower wages, fewer benefits, and weaker job security.',
        tags: ['contractors', 'business model']
      },
      {
        question: 'What\'s the difference between contractors for organizing purposes?',
        answer: 'For NLRB purposes, what matters is who controls the work, not what the contract says. If the tech company directs daily work, sets schedules, and controls access, workers may be able to organize against them directly.',
        tags: ['legal', 'nlrb', 'organizing']
      },
    ],
    guides: [
      {
        title: 'Mapping a Facility\'s Contractor Structure',
        description: 'How to identify and document all contractors at a facility.',
        steps: [
          'Start with known prime contractors (usually announced in press releases).',
          'Workers often know their employer - ask "who signs your paycheck?"',
          'Badge and uniform branding often reveals contractor relationships.',
          'LinkedIn searches for "data center technician" + location can reveal staffing agencies.',
          'Job postings often reveal which agencies staff which facilities.',
        ],
      },
    ],
    howTos: [
      {
        title: 'Calculate Joint Employer Probability',
        goal: 'Estimate whether a tech company could be held legally responsible as a joint employer.',
        difficulty: 'intermediate',
        timeEstimate: '15 minutes',
        steps: [
          { action: 'Open the Joint Employer Calculator', detail: 'Go to Contractor Mapping > Calculator panel.' },
          { action: 'Check each control indicator', detail: 'Only check indicators you\'ve personally observed or documented.' },
          { action: 'Review the probability score', detail: '70%+ indicates strong joint employer case.' },
          { action: 'Document your evidence', detail: 'For each checked indicator, note specific examples with dates.' },
        ],
        outcome: 'A preliminary assessment of joint employer status to guide organizing strategy.',
      },
    ],
    resources: [],
  },

  corridors: {
    overview: 'Corridor Intelligence maps the geographic concentration of data centers and identifies strategic chokepoints. Understanding corridors helps organizers target facilities where action would have maximum impact on cloud infrastructure.',
    keyTerms: [
      { term: 'Chokepoint', definition: 'A facility where disruption would significantly impact regional or national cloud services due to limited redundancy.' },
      { term: 'Traffic Share', definition: 'Percentage of regional internet traffic that passes through a facility or corridor.' },
      { term: 'Redundancy', definition: 'The degree to which traffic can be rerouted if a facility goes offline.' },
    ],
    faqs: [
      {
        question: 'What makes Northern Virginia so important?',
        answer: 'Northern Virginia (Ashburn/Loudoun County) hosts more data center capacity than anywhere else in the world. Over 70% of global internet traffic passes through the region daily. Organizing there affects the entire cloud industry.',
        tags: ['nova', 'strategy', 'geography']
      },
      {
        question: 'How do I identify chokepoint facilities?',
        answer: 'Look for: high traffic share, low redundancy rating, strategic fiber route placement, and concentration of multiple operators. The Corridor Intelligence view highlights these automatically.',
        tags: ['chokepoints', 'strategy']
      },
    ],
    guides: [],
    howTos: [],
    resources: [],
  },

  'ibew-footprint': {
    overview: 'The IBEW Footprint section maps International Brotherhood of Electrical Workers local coverage across data center facilities. This helps identify which locals have jurisdiction, find expansion opportunities, and coordinate organizing efforts.',
    keyTerms: [
      { term: 'Jurisdiction', definition: 'The geographic area where an IBEW local has authority to represent workers.' },
      { term: 'Expansion Opportunity', definition: 'A non-union facility in an IBEW local\'s jurisdiction that could be organized.' },
      { term: 'Contract Expiration', definition: 'When a collective bargaining agreement ends, creating an opening for negotiation or organizing.' },
    ],
    faqs: [
      {
        question: 'How do I find my IBEW local?',
        answer: 'Enter a city, state, or ZIP code in the search. The map shows local boundaries. You can also visit ibew.org for the official local finder.',
        tags: ['ibew', 'locals', 'search']
      },
      {
        question: 'What does "expansion potential" mean?',
        answer: 'Expansion potential counts non-union data center workers in a local\'s jurisdiction. Higher numbers mean more organizing opportunity.',
        tags: ['expansion', 'opportunity', 'organizing']
      },
    ],
    guides: [],
    howTos: [],
    resources: [
      { title: 'IBEW Official Website', url: 'https://ibew.org', type: 'external' },
      { title: 'Local Union Directory', url: 'https://ibew.org/local-union-directory', type: 'external' },
    ],
  },

  'target-prioritization': {
    overview: 'Target Prioritization uses multi-factor scoring to rank data center facilities by organizing potential. Scores combine worker count, strategic location, labor climate, and momentum indicators to help organizers focus resources on winnable campaigns.',
    keyTerms: [
      { term: 'Priority Score', definition: 'A 0-100 score combining multiple factors that indicate organizing potential.' },
      { term: 'Critical Priority', definition: 'Score 90+. These are the best immediate organizing targets.' },
      { term: 'High Priority', definition: 'Score 70-89. Strong organizing potential with some challenges.' },
    ],
    faqs: [
      {
        question: 'What factors go into the priority score?',
        answer: 'Worker count (25%), strategic importance (20%), labor climate (15%), operator reputation (15%), recent momentum (15%), and existing union presence (10%).',
        tags: ['scoring', 'methodology']
      },
      {
        question: 'Should I only target "critical" priority facilities?',
        answer: 'Not necessarily. Sometimes "high" or "medium" priority facilities are better due to existing relationships, geographic convenience, or coordinator availability. Use scores as guidance, not gospel.',
        tags: ['strategy', 'priorities']
      },
    ],
    guides: [],
    howTos: [],
    resources: [],
  },

  'network-security': {
    overview: 'Network Security tools monitor BGP routing and network infrastructure at data center facilities. This helps identify potential sanctions risks, network dependencies, and infrastructure vulnerabilities.',
    keyTerms: [
      { term: 'BGP', definition: 'Border Gateway Protocol - the system that routes internet traffic between networks.' },
      { term: 'ASN', definition: 'Autonomous System Number - a unique identifier for a network in the global routing system.' },
      { term: 'Peering', definition: 'Direct network connections between organizations to exchange traffic.' },
    ],
    faqs: [],
    guides: [],
    howTos: [],
    resources: [],
  },

  'compliance-overview': {
    overview: 'The Compliance Overview provides high-level statistics and trends across all tracked data center facilities. Use this view to understand the overall state of Big Tech accountability.',
    keyTerms: [
      { term: 'Compliance Rate', definition: 'Percentage of facilities meeting their job creation commitments.' },
      { term: 'At Risk', definition: 'Facilities that may become non-compliant if trends continue.' },
    ],
    faqs: [
      {
        question: 'What\'s a healthy compliance rate?',
        answer: 'Ideally 100%, but even well-run programs typically achieve 80-90% compliance. The current average across Big Tech data centers is around 45-55%.',
        tags: ['compliance', 'benchmarks']
      },
    ],
    guides: [],
    howTos: [],
    resources: [],
  },
};

/**
 * Get help content for a section
 */
export function getSectionHelp(context: SectionContext): SectionHelpContent {
  return SECTION_HELP[context] || SECTION_HELP.global;
}

/**
 * Search FAQs across all sections or within a specific section
 */
export function searchFAQs(query: string, context?: SectionContext): FAQ[] {
  const lower = query.toLowerCase();
  const sections = context ? [SECTION_HELP[context]] : Object.values(SECTION_HELP);
  
  return sections.flatMap(section => 
    section.faqs.filter(faq => 
      faq.question.toLowerCase().includes(lower) ||
      faq.answer.toLowerCase().includes(lower) ||
      faq.tags.some(tag => tag.toLowerCase().includes(lower))
    )
  );
}

/**
 * Get related FAQs based on tags
 */
export function getRelatedFAQs(tags: string[], context: SectionContext, limit = 3): FAQ[] {
  const section = SECTION_HELP[context];
  const tagSet = new Set(tags.map(t => t.toLowerCase()));
  
  return section.faqs
    .filter(faq => faq.tags.some(t => tagSet.has(t.toLowerCase())))
    .slice(0, limit);
}

