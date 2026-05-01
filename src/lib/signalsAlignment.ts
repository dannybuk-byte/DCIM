/**
 * Shared copy for positioning DCIM as complementary to OpenAI Signals (UI / clipboard only).
 * No integration, endorsement, or data access is implied.
 */

/** High-level positioning line for reviewers and funders. */
export const SIGNALS_DCIM_FRAMING_LINE =
  'OpenAI Signals helps measure how AI is being adopted and used. DCIM helps measure whether the physical infrastructure supporting AI expansion is delivering promised public benefits.';

export const SIGNALS_PANEL_TITLE = 'Complement to OpenAI Signals';

export const SIGNALS_PANEL_INTRO =
  'OpenAI Signals improves public understanding of AI adoption through recurring, aggregated, privacy-preserving usage indicators. DCIM extends that public-interest measurement logic to the physical infrastructure layer: data centers, subsidies, jobs, disclosure obligations, and resilience risks.';

export const SIGNALS_PANEL_BULLETS: readonly string[] = [
  'Signals measures AI adoption and usage patterns.',
  'DCIM measures infrastructure accountability and public-benefit delivery.',
  'Together, they support evidence-based AI industrial policy: where AI is used, where infrastructure is built, and whether public commitments are being met.',
];

export const SIGNALS_REVIEWER_DISCLAIMER =
  'This prototype does not claim affiliation with OpenAI Signals. It is designed as a complementary civic measurement layer for AI-era infrastructure accountability.';

export const SIGNALS_FUNDING_SECTION_TITLE = 'Funding Relevance';

export const SIGNALS_FUNDING_SECTION_BODY =
  'Why this matters for funders:\nAs AI adoption scales, public decision-makers need measurement systems for both digital adoption and physical buildout. DCIM focuses on the public-interest questions that sit below model usage: land, power, subsidies, jobs, local fiscal exposure, and infrastructure resilience.';

export const SIGNALS_DO_NOT_OVERCLAIM_TITLE = 'Do not overclaim';

export const SIGNALS_DO_NOT_OVERCLAIM_ITEMS: readonly string[] = [
  'Do not imply OpenAI endorsement.',
  'Do not imply direct integration with OpenAI Signals.',
  'Do not claim access to OpenAI data.',
  'Do not describe DCIM as part of Signals.',
  'Use “complementary to,” “aligned with,” or “inspired by public-interest measurement goals.”',
];

/** Paragraph for Methodology Drawer and aligned reviewer copy. */
export const SIGNALS_METHODOLOGY_RELATION_TITLE = 'Relation to OpenAI Signals';

export const SIGNALS_METHODOLOGY_RELATION_BODY =
  'This dashboard is conceptually aligned with the public-interest measurement goals of OpenAI Signals, but operates on a different layer. Signals focuses on AI adoption and usage. DCIM focuses on the infrastructure, subsidy, labor, and resilience commitments associated with AI/data-center expansion.';

/** Plain-text block appended to Copy Brief (deterministic). */
export function getSignalsAlignmentClipboardParagraph(): string {
  return [
    'Signals alignment (framing):',
    SIGNALS_DCIM_FRAMING_LINE,
    '',
    `${SIGNALS_METHODOLOGY_RELATION_TITLE}: ${SIGNALS_METHODOLOGY_RELATION_BODY}`,
    '',
    SIGNALS_REVIEWER_DISCLAIMER,
  ].join('\n');
}
