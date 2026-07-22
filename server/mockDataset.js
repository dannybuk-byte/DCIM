/**
 * Expanded mock corpus: richer public AI rows + multiple disruption signals;
 * formal WARN/legal rows omit AI causation (prototype).
 *
 * RETIRED REGISTER (census 2026-07-22): the WARN/legal/labor-disclosure source
 * types in these rows belong to the retired WARN/WWW register. They are kept
 * solely as DEMO/SEED fixtures and are never served as real evidence.
 * Demo-only reachability: seeded fallback and mixed append both require
 * DESIGN labels (corpusLoader.js assertDesignLabeled), and outside
 * SIGNALS_DEMO_MODE the production assembly filters and re-checks synthetic
 * records at startup (index.js R-F2 invariant).
 *
 * R-F3: this is DEMO/SEED data. Every company and every source is stamped
 * with synthetic/DESIGN provenance at construction, so no consumer — however
 * it obtains these rows — can score or display them as real evidence.
 */

export const DISCLAIMER_LINES = [
  'Signal, not verdict — potential under-disclosure is a signal for review, not evidence of wrongdoing.',
  'AI attribution inferred from reported public statements; causal labor impact not independently proven.',
  'Mismatch indicates cross-channel discrepancy for review; mismatch ≠ causation.',
  'WARN filings may omit detailed cause fields depending on jurisdiction; WARN ≠ full layoff census.',
];

function S(
  id,
  company_id,
  type,
  date,
  excerpt,
  url,
  extra = {},
) {
  return {
    id,
    company_id,
    type,
    date,
    text_excerpt: excerpt,
    url,
    ...extra,
  };
}

const SEED_COMPANIES_RAW = [
  {
    id: 'goldman_sachs',
    name: 'Goldman Sachs',
    sector: 'Financial Services',
    period_start: '2025-01-01',
    period_end: '2025-09-30',
    sources: [
      S('gs-ec-1', 'goldman_sachs', 'earnings_call', '2025-02-04', 'Q4 remarks: scaling ML tooling in execution services to reduce manual touchpoints.', 'https://example.com/seed/gs-ec-q4', { ai_attribution_tier: 'moderate' }),
      S('gs-ec-2', 'goldman_sachs', 'earnings_call', '2025-05-14', 'Management ties expense discipline partly to workflow automation and AI-assisted research synthesis.', 'https://example.com/seed/gs-ec-q1', { ai_attribution_tier: 'strong' }),
      S('gs-sec-1', 'goldman_sachs', 'sec_filing', '2025-05-28', '10-Q MD&A notes technology-driven efficiency contributing to headcount plans in operations.', 'https://example.com/seed/gs-10q', { ai_attribution_tier: 'moderate' }),
      S('gs-pr-1', 'goldman_sachs', 'press_release', '2025-06-02', 'Press: partnership announcements emphasize AI platforms improving analyst throughput.', 'https://example.com/seed/gs-pr-ai', { ai_attribution_tier: 'weak' }),
      S('gs-ceo-1', 'goldman_sachs', 'ceo_interview', '2025-07-18', 'Interview: CEO describes generative AI reducing duplicative review roles over a multi-year horizon.', 'https://example.com/seed/gs-ceo-ft', { ai_attribution_tier: 'strong' }),
      S('gs-warn-1', 'goldman_sachs', 'warn_filing', '2025-08-12', 'NY WARN: role eliminations cited as restructuring/consolidation; no AI or automation listed as cause.', 'https://example.com/seed/gs-warn-ny', { workers_affected: 320, ai_disclosed_in_warn: false }),
      S('gs-warn-2', 'goldman_sachs', 'warn_filing', '2025-09-05', 'NJ WARN: supplementary notice for additional reductions—reason given as operational realignment.', 'https://example.com/seed/gs-warn-nj', { workers_affected: 110, ai_disclosed_in_warn: false }),
    ],
  },
  {
    id: 'amazon',
    name: 'Amazon',
    sector: 'Technology / Retail / Cloud',
    period_start: '2025-06-01',
    period_end: '2026-04-30',
    case_type: 'sourced_case',
    reviewer_flag: 'human_review_required',
    sources: [
      S(
        'amz-jassy-genai-2025',
        'amazon',
        'public_ai_statement',
        '2025-06-17',
        'Public AI workforce attribution detected: CEO Andy Jassy stated that as Amazon rolls out more generative AI and agents, the company expects this will reduce its total corporate workforce over the next few years (Amazon official post; primary source). Workforce reduction signal present in separate reporting — not linked as legal causation here. Signal, not verdict — human review required.',
        'https://www.aboutamazon.com/news/company-news/amazon-ceo-andy-jassy-on-generative-ai',
        {
          ai_attribution_tier: 'strong',
          classification_label: 'strong_ai_attribution',
        },
      ),
      S(
        'amz-reuters-genai-2025',
        'amazon',
        'secondary_public_report',
        '2025-06-17',
        'Secondary public report: Reuters stated Jassy said generative AI and agents would reduce Amazon’s corporate workforce over the next few years (journalism; paraphrase risk; does not verify WARN/legal AI disclosure). Formal WARN/legal AI disclosure not verified in attached records.',
        'https://www.reuters.com/business/retail-consumer/amazons-workforce-reduce-rollout-generative-ai-agents-2025-06-17/',
        {
          ai_attribution_tier: 'strong',
          classification_label: 'strong_ai_attribution',
        },
      ),
      S(
        'amz-reuters-layoffs-2025',
        'amazon',
        'workforce_disruption_signal',
        '2025-10-28',
        'Workforce reduction signal present: Reuters reported Amazon would cut its global corporate workforce by about 14,000 roles, describing the shakeup as driven in part by AI adoption (reported; does not establish causation for any specific separation or prove intent). Formal WARN/legal AI disclosure not verified in attached records.',
        'https://www.reuters.com/sustainability/amazon-lay-off-about-14000-roles-2025-10-28/',
        {
          ai_attribution_tier: 'moderate',
          workers_affected: 14000,
          classification_label: 'strong_layoff_signal',
        },
      ),
      S(
        'amz-pack-disclosure-check',
        'amazon',
        'disclosure_gap_annotation',
        '2025-10-29',
        'Disclosure check: No verified AI-specific WARN or legal filing text is attached to this sourced case pack; formal AI disclosure not verified in attached records. Legal disclosure verification is incomplete unless primary filings are attached and reviewed. Human review required.',
        '',
        {},
      ),
    ],
  },
  {
    id: 'klarna',
    name: 'Klarna',
    sector: 'Fintech',
    period_start: '2024-08-01',
    period_end: '2025-06-30',
    case_type: 'sourced_case',
    reviewer_flag: 'human_review_required',
    sources: [
      S(
        'klarna-pack-ceo-ai',
        'klarna',
        'public_ai_statement',
        '2024-08-15',
        'Public statements indicate (widely reported CEO remarks) that “AI is doing the work of hundreds of customer service agents” — suggests support automation leverage; not verified causation for any role change. Requires human review.',
        'https://example.com/corpus/klarna-ceo-ai-statement',
        {
          ai_attribution_tier: 'strong',
          classification_label: 'strong_ai_attribution',
          source_name: 'Klarna CEO statement (widely reported)',
        },
      ),
      S(
        'klarna-pack-workforce',
        'klarna',
        'workforce_disruption_signal',
        '2025-01-20',
        'Reported workforce reductions and efficiency initiatives tied to AI adoption (summaries; multiple causes possible). Not verified in available disclosure records as AI-specific legal causation. Requires human review.',
        'https://example.com/corpus/klarna-workforce-efficiency',
        {
          ai_attribution_tier: 'moderate',
          workers_affected: 2800,
          classification_label: 'workforce_disruption_signal',
        },
      ),
      S(
        'klarna-pack-disclosure',
        'klarna',
        'disclosure_gap_annotation',
        '2025-01-21',
        'Disclosure gap: no AI-specific attribution verified in available formal disclosure records for this sourced pack. Verification incomplete — attach primary filings. Requires human review.',
        '',
        { classification_label: 'no_verified_ai_legal_disclosure' },
      ),
    ],
  },
  {
    id: 'morgan_stanley',
    name: 'Morgan Stanley',
    sector: 'Financial Services',
    period_start: '2025-01-01',
    period_end: '2025-09-30',
    sources: [
      S('ms-int-1', 'morgan_stanley', 'ceo_interview', '2025-02-24', 'CEO interview on AI copilots trimming manual documentation in wealth platforms.', 'https://example.com/seed/ms-ceo', { ai_attribution_tier: 'moderate' }),
      S('ms-sec-1', 'morgan_stanley', 'sec_filing', '2025-05-15', '10-Q: AI-enabled process redesign referenced alongside staffing outlook.', 'https://example.com/seed/ms-10q', { ai_attribution_tier: 'strong' }),
      S('ms-ec-1', 'morgan_stanley', 'earnings_call', '2025-05-16', 'Call transcript: efficiency targets linked to machine-learning routing of client service tasks.', 'https://example.com/seed/ms-ec-q1', { ai_attribution_tier: 'moderate' }),
      S('ms-pr-1', 'morgan_stanley', 'press_release', '2025-06-08', 'PR on digital workplace tools reducing repetitive analyst workloads.', 'https://example.com/seed/ms-pr-digital', { ai_attribution_tier: 'weak' }),
      S('ms-deck-1', 'morgan_stanley', 'investor_deck', '2025-07-01', 'Deck: AI productivity lever in institutional securities middle office.', 'https://example.com/seed/ms-deck', { ai_attribution_tier: 'moderate' }),
      S('ms-warn-1', 'morgan_stanley', 'warn_filing', '2025-08-14', 'Jersey City WARN: positions eliminated—reason listed as reorganization.', 'https://example.com/seed/ms-warn', { workers_affected: 180, ai_disclosed_in_warn: false }),
      S('ms-warn-2', 'morgan_stanley', 'warn_filing', '2025-09-03', 'Additional NY WARN batch with same generic restructuring language.', 'https://example.com/seed/ms-warn-2', { workers_affected: 75, ai_disclosed_in_warn: false }),
    ],
  },
  {
    id: 'meta',
    name: 'Meta',
    sector: 'Technology',
    period_start: '2025-01-01',
    period_end: '2025-09-30',
    sources: [
      S('meta-pr-1', 'meta', 'press_release', '2025-01-22', 'AI-first product roadmap reiterated ahead of efficiency year.', 'https://example.com/seed/meta-pr', { ai_attribution_tier: 'weak' }),
      S('meta-ec-1', 'meta', 'earnings_call', '2025-04-30', 'Earnings: ranking/recommendation automation cited in margin commentary.', 'https://example.com/seed/meta-ec', { ai_attribution_tier: 'moderate' }),
      S('meta-blog-1', 'meta', 'blog_post', '2025-05-18', 'Engineering blog on ML infra lowering content review staffing intensity.', 'https://example.com/seed/meta-blog', { ai_attribution_tier: 'strong' }),
      S('meta-hire-1', 'meta', 'hiring_announcement', '2025-06-01', 'Public hiring update: selective freezes while scaling AI safety roles.', 'https://example.com/seed/meta-hiring', { ai_attribution_tier: 'weak' }),
      S('meta-deck-1', 'meta', 'investor_deck', '2025-06-20', 'Investor update slides tie capex mix to AI compute and leaner non-AI hiring.', 'https://example.com/seed/meta-deck', { ai_attribution_tier: 'moderate' }),
      S('meta-warn-1', 'meta', 'warn_filing', '2025-07-08', 'CA WARN: layoffs described as realignment without AI causation.', 'https://example.com/seed/meta-warn', { workers_affected: 420, ai_disclosed_in_warn: false }),
      S('meta-warn-2', 'meta', 'layoff_announcement', '2025-08-12', 'Follow-on workforce reduction announcement; WARN amendments filed.', 'https://example.com/seed/meta-layoff-2', { workers_affected: 130, ai_disclosed_in_warn: false }),
    ],
  },
  {
    id: 'alphabet',
    name: 'Alphabet',
    sector: 'Technology',
    period_start: '2025-01-01',
    period_end: '2025-09-30',
    sources: [
      S('goog-inv-1', 'alphabet', 'investor_deck', '2025-02-10', 'Deck: AI scaling and automation of internal workflows for leverage.', 'https://example.com/seed/goog-deck', { ai_attribution_tier: 'moderate' }),
      S('goog-ec-1', 'alphabet', 'earnings_call', '2025-05-01', 'Gemini-era tooling linked to slower growth in some support functions.', 'https://example.com/seed/goog-ec', { ai_attribution_tier: 'strong' }),
      S('goog-sec-1', 'alphabet', 'sec_filing', '2025-05-10', '10-Q risk/MD&A discusses AI product cadence and efficiency initiatives.', 'https://example.com/seed/goog-10q', { ai_attribution_tier: 'moderate' }),
      S('goog-blog-1', 'alphabet', 'blog_post', '2025-06-05', 'Blog on AI-assisted coding adoption across internal teams.', 'https://example.com/seed/goog-blog', { ai_attribution_tier: 'weak' }),
      S('goog-pr-1', 'alphabet', 'press_release', '2025-07-01', 'PR highlights AI-driven ads tooling reducing operational overhead.', 'https://example.com/seed/goog-pr', { ai_attribution_tier: 'moderate' }),
      S('goog-warn-1', 'alphabet', 'warn_filing', '2025-07-28', 'WARN: site consolidation cited; no AI stated as cause.', 'https://example.com/seed/goog-warn', { workers_affected: 210, ai_disclosed_in_warn: false }),
      S('goog-warn-2', 'alphabet', 'warn_filing', '2025-09-01', 'Second wave WARN notices with identical generic rationale.', 'https://example.com/seed/goog-warn-2', { workers_affected: 95, ai_disclosed_in_warn: false }),
    ],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    sector: 'Technology',
    period_start: '2025-01-01',
    period_end: '2025-09-30',
    sources: [
      S('msft-blog-1', 'microsoft', 'blog_post', '2025-02-28', 'Copilot narrative: enterprise support workflows reshaped by assistants.', 'https://example.com/seed/msft-blog', { ai_attribution_tier: 'moderate' }),
      S('msft-ec-1', 'microsoft', 'earnings_call', '2025-04-24', 'Margins partly from AI-driven SG&A containment vs prior hiring trajectory.', 'https://example.com/seed/msft-ec', { ai_attribution_tier: 'strong' }),
      S('msft-sec-1', 'microsoft', 'sec_filing', '2025-05-05', '10-Q ties cloud growth to AI services and operational efficiency programs.', 'https://example.com/seed/msft-10q', { ai_attribution_tier: 'moderate' }),
      S('msft-restr-1', 'microsoft', 'restructuring_announcement', '2025-05-30', 'Memo on tier-1 support automation rollouts.', 'https://example.com/seed/msft-memo', { ai_attribution_tier: 'moderate' }),
      S('msft-pr-1', 'microsoft', 'press_release', '2025-06-18', 'PR on AI safety and platform investment; references workforce mix shifts.', 'https://example.com/seed/msft-pr', { ai_attribution_tier: 'weak' }),
      S('msft-warn-1', 'microsoft', 'warn_filing', '2025-09-01', 'WA WARN: facility closure reductions—no AI cited.', 'https://example.com/seed/msft-warn', { workers_affected: 95, ai_disclosed_in_warn: false }),
      S('msft-warn-2', 'microsoft', 'warn_filing', '2025-09-18', 'Second WARN batch linked to overlapping restructuring waves.', 'https://example.com/seed/msft-warn-2', { workers_affected: 60, ai_disclosed_in_warn: false }),
    ],
  },
  {
    id: 'ibm',
    name: 'IBM',
    sector: 'Technology',
    period_start: '2025-03-01',
    period_end: '2025-08-31',
    case_type: 'sourced_case',
    reviewer_flag: 'human_review_required',
    sources: [
      S(
        'ibm-pack-ai-backoffice',
        'ibm',
        'public_ai_statement',
        '2025-03-10',
        'Public statements indicate AI could replace a significant number of back-office roles (reported executive framing; suggests mix shift — not a verified net employment outcome or legal disclosure). Requires human review.',
        'https://example.com/corpus/ibm-ai-backoffice-statement',
        {
          ai_attribution_tier: 'strong',
          classification_label: 'strong_ai_attribution',
        },
      ),
      S(
        'ibm-pack-workforce-shift',
        'ibm',
        'workforce_disruption_signal',
        '2025-05-01',
        'Reported hiring pause / workforce shift in back-office functions (journalism and company summaries; multiple drivers possible). Not verified in available disclosure records as explicit AI causation. Requires human review.',
        'https://example.com/corpus/ibm-workforce-shift',
        {
          ai_attribution_tier: 'moderate',
          workers_affected: 950,
          classification_label: 'workforce_disruption_signal',
        },
      ),
      S(
        'ibm-pack-disclosure',
        'ibm',
        'disclosure_gap_annotation',
        '2025-05-02',
        'Disclosure check: no explicit AI attribution observed in available disclosure records for reported workforce changes in this pack. Incomplete unless primary filings attached. Requires human review.',
        '',
        { classification_label: 'no_verified_ai_legal_disclosure' },
      ),
    ],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    sector: 'Technology',
    period_start: '2025-01-01',
    period_end: '2025-09-30',
    sources: [
      S(
        'crm-pub-1',
        'salesforce',
        'public_ai_statement',
        '2025-02-28',
        'Management reportedly emphasized AI-driven productivity alongside slower hiring in some go-to-market teams (earnings commentary; suggests efficiency-over-headcount framing — not verified outcomes).',
        'https://example.com/seed/crm-pub-ai',
        { ai_attribution_tier: 'moderate', classification_label: 'moderate_ai_attribution' },
      ),
      S('crm-ec-1', 'salesforce', 'earnings_call', '2025-03-05', 'Einstein / Agentforce narrative linked to margins and selective hiring restraint in portions of GTM.', 'https://example.com/seed/crm-ec', { ai_attribution_tier: 'moderate' }),
      S('crm-hire-1', 'salesforce', 'hiring_announcement', '2025-04-12', 'Public hiring note referenced AI tooling for sales ops productivity.', 'https://example.com/seed/crm-blog', { ai_attribution_tier: 'weak' }),
      S('crm-sec-1', 'salesforce', 'sec_filing', '2025-05-30', '10-Q discusses AI product attach and efficiency programs.', 'https://example.com/seed/crm-10q', { ai_attribution_tier: 'moderate' }),
      S('crm-pr-1', 'salesforce', 'press_release', '2025-06-22', 'PR on Agentforce reducing manual pipeline hygiene tasks.', 'https://example.com/seed/crm-pr', { ai_attribution_tier: 'strong' }),
      S('crm-deck-1', 'salesforce', 'investor_deck', '2025-07-08', 'Deck slide: AI-first GTM operating model.', 'https://example.com/seed/crm-deck', { ai_attribution_tier: 'moderate' }),
      S('crm-warn-1', 'salesforce', 'warn_filing', '2025-07-22', 'WARN: cost alignment cited; no technology cause.', 'https://example.com/seed/crm-warn', { workers_affected: 260, ai_disclosed_in_warn: false }),
      S('crm-warn-2', 'salesforce', 'warn_filing', '2025-08-30', 'SF WARN amendment for additional SF Bay reductions.', 'https://example.com/seed/crm-warn-2', { workers_affected: 90, ai_disclosed_in_warn: false }),
    ],
  },
  {
    id: 'duolingo',
    name: 'Duolingo',
    sector: 'Technology / Education',
    period_start: '2025-04-01',
    period_end: '2025-09-30',
    case_type: 'sourced_case',
    reviewer_flag: 'human_review_required',
    sources: [
      S(
        'duo-pack-ai-contractors',
        'duolingo',
        'public_ai_statement',
        '2025-04-15',
        'Public statements indicate AI is replacing portions of contractor-based content production (reported leadership remarks; suggests workflow substitution — not verified legal causation). Requires human review.',
        'https://example.com/corpus/duolingo-ai-contractor-workflows',
        {
          ai_attribution_tier: 'moderate',
          classification_label: 'moderate_ai_attribution',
        },
      ),
      S(
        'duo-pack-operational-shift',
        'duolingo',
        'workforce_disruption_signal',
        '2025-06-01',
        'Reported shift away from contractor workflows toward AI-assisted processes (summaries; operational and contractor mix — multiple factors possible). Not verified in available disclosure records as formal AI attribution. Requires human review.',
        'https://example.com/corpus/duolingo-operational-shift',
        {
          ai_attribution_tier: 'moderate',
          workers_affected: 220,
          classification_label: 'workforce_disruption_signal',
        },
      ),
      S(
        'duo-pack-disclosure',
        'duolingo',
        'disclosure_gap_annotation',
        '2025-06-02',
        'Disclosure gap: no formal AI attribution verified in available disclosure records for this sourced pack. Attach primaries to validate. Requires human review.',
        '',
        { classification_label: 'no_verified_ai_legal_disclosure' },
      ),
    ],
  },
  {
    id: 'midwest_retail_cooperative',
    name: 'Midwest Retail Cooperative',
    sector: 'Retail',
    period_start: '2024-06-01',
    period_end: '2025-06-30',
    case_type: 'control_case',
    sources: [
      S(
        'mrc-blog-efficiency',
        'midwest_retail_cooperative',
        'blog_post',
        '2024-08-10',
        'Operations blog on digital scheduling and in-store tooling improving throughput (generic efficiency; weak AI attribution tier in prototype).',
        'https://example.com/corpus/midwest-retail-blog',
        { ai_attribution_tier: 'weak' },
      ),
      S(
        'mrc-warn-ai-disclosed',
        'midwest_retail_cooperative',
        'warn_filing',
        '2025-03-04',
        'IL WARN excerpt lists technology and automation programs including AI-assisted scheduling as among stated drivers for role eliminations (prototype positive control — verify primary filing).',
        'https://example.com/corpus/midwest-retail-warn',
        { workers_affected: 220, ai_disclosed_in_warn: true },
      ),
      S(
        'mrc-sec-mdna',
        'midwest_retail_cooperative',
        'sec_filing',
        '2025-05-20',
        '10-K style MD&A references labor mix shifts tied to automation investments with cross-references to WARN notices (illustrative seed row).',
        'https://example.com/corpus/midwest-retail-10k',
        { ai_attribution_tier: 'moderate' },
      ),
    ],
  },
  {
    id: 'southeast_3pl_logistics',
    name: 'Southeast 3PL Logistics',
    sector: 'Logistics',
    period_start: '2024-09-01',
    period_end: '2025-08-31',
    case_type: 'control_case',
    sources: [
      S(
        'se3pl-pr-generic',
        'southeast_3pl_logistics',
        'press_release',
        '2024-10-05',
        'Press release on network consolidation and hub closures — cites cost and volume; no explicit AI workforce attribution in excerpt (prototype control).',
        'https://example.com/corpus/se3pl-pr',
        { ai_attribution_tier: 'irrelevant' },
      ),
      S(
        'se3pl-warn-1',
        'southeast_3pl_logistics',
        'warn_filing',
        '2025-02-12',
        'GA WARN: warehouse role reductions — reason listed as consolidation / lease exit; no AI or automation listed as cause in excerpt.',
        'https://example.com/corpus/se3pl-warn-ga',
        { workers_affected: 140, ai_disclosed_in_warn: false },
      ),
      S(
        'se3pl-warn-2',
        'southeast_3pl_logistics',
        'warn_filing',
        '2025-04-01',
        'SC WARN: second wave reductions — generic operational realignment language.',
        'https://example.com/corpus/se3pl-warn-sc',
        { workers_affected: 95, ai_disclosed_in_warn: false },
      ),
    ],
  },
];

const SEED_ATTRIBUTION =
  'Seed/demo corpus — illustrative mock rows, method demonstration only (DESIGN)';

/**
 * R-F3: stamp synthetic/DESIGN provenance onto every seed company and every
 * seed source. summarizeProvenance and the export surface treat any source
 * without an explicit provenance as 'real', so seed rows MUST carry the label
 * at the data boundary rather than relying on consumers to remember.
 */
function stampSeedProvenance(companies) {
  return companies.map(company => ({
    ...company,
    provenance: 'synthetic',
    synthetic: true,
    case_type: company.case_type || 'seed_demo_case',
    sources: (company.sources || []).map(source => ({
      ...source,
      provenance: 'synthetic',
      data_source: source.data_source || 'Seed/demo fixture',
      attribution: source.attribution || SEED_ATTRIBUTION,
      label: 'DESIGN',
    })),
  }));
}

export const SEED_COMPANIES = stampSeedProvenance(SEED_COMPANIES_RAW);
