import type { Facility } from '../../types';
import type {
  CorrelationInsight,
  ExplainFeature,
  FacilityFeatureRow,
  PatternFinding,
  PatternLabOutput,
  PatternSeverity,
  ScenarioSettings
} from './types';

const COLORS = {
  red: '#ff4757',
  yellow: '#ffa502',
  green: '#2ed573',
  cyan: '#00d2d3',
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function safeNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const arr = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 0) return (arr[mid - 1] + arr[mid]) / 2;
  return arr[mid];
}

function mad(values: number[], med: number): number {
  if (values.length === 0) return 0;
  const deviations = values.map((v) => Math.abs(v - med));
  return median(deviations) || 0;
}

// Robust z-score using MAD. 0.6745 normalizes to match std-dev for normal data.
function robustZ(x: number, med: number, madVal: number): number {
  const denom = madVal || 1e-9;
  return (0.6745 * (x - med)) / denom;
}

function pearson(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 3) return 0;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = xs[i] - mx;
    const vy = ys[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx) * Math.sqrt(dy);
  if (!Number.isFinite(den) || den === 0) return 0;
  return num / den;
}

function statusToScore(status: Facility['complianceStatus']): number {
  if (status === 'Compliant') return 0;
  if (status === 'At Risk') return 0.55;
  if (status === 'Non-Compliant') return 1;
  return 0.35;
}

export function defaultScenario(): ScenarioSettings {
  return {
    minSubsidyGap: 1_000_000,
    minIssuesCount: 2,
    maxAuditRecencyDays: 180,
    operatorCascadeMinFacilities: 10,
    operatorCascadeMinNonComplianceRate: 0.35,
    sensitivity: 0.55,
  };
}

export function buildFeatureRows(facilities: Facility[]): FacilityFeatureRow[] {
  const now = Date.now();
  return facilities.map((f) => {
    const auditRecencyDays = (() => {
      const d = new Date(f.lastAuditDate);
      const t = d.getTime();
      if (Number.isNaN(t)) return null;
      return Math.max(0, Math.floor((now - t) / (1000 * 60 * 60 * 24)));
    })();

    return {
      id: f.id,
      name: f.name,
      operator: f.operator || 'Unknown',
      state: f.state || 'Unknown',
      city: f.city || 'Unknown',
      country: f.country || 'Unknown',
      type: f.type,
      complianceStatus: f.complianceStatus,
      subsidyGap: safeNum(f.subsidyGap, 0),
      issuesCount: Array.isArray(f.issues) ? f.issues.length : safeNum((f as any).issuesCount, 0),
      auditRecencyDays,
      statusScore: statusToScore(f.complianceStatus),
    };
  });
}

function severityFromScore(score01: number, sensitivity: number): PatternSeverity {
  // sensitivity increases finding volume by lowering thresholds
  const adj = (v: number) => v - (sensitivity - 0.5) * 0.18;
  if (score01 >= adj(0.86)) return 'critical';
  if (score01 >= adj(0.72)) return 'high';
  if (score01 >= adj(0.56)) return 'medium';
  return 'low';
}

function formatCurrency(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000_000) return `${'$'}${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${'$'}${(n / 1_000_000).toFixed(2)}M`;
  return `${'$'}${Math.round(n).toLocaleString()}`;
}

export function computePatternLab(
  facilities: Facility[],
  scenario: ScenarioSettings
): PatternLabOutput {
  const createdAt = new Date().toISOString();
  const rows = buildFeatureRows(facilities);

  const globalGaps = rows.map((r) => r.subsidyGap);
  const globalGapMed = median(globalGaps);
  const globalGapMad = mad(globalGaps, globalGapMed);

  const byOperator = new Map<string, FacilityFeatureRow[]>();
  const byState = new Map<string, FacilityFeatureRow[]>();
  rows.forEach((r) => {
    if (!byOperator.has(r.operator)) byOperator.set(r.operator, []);
    byOperator.get(r.operator)!.push(r);
    if (!byState.has(r.state)) byState.set(r.state, []);
    byState.get(r.state)!.push(r);
  });

  const operatorStats = new Map<string, { med: number; mad: number; nonComplianceRate: number; count: number }>();
  const stateStats = new Map<string, { med: number; mad: number }>();

  for (const [op, arr] of byOperator.entries()) {
    const gaps = arr.map((r) => r.subsidyGap);
    const med = median(gaps);
    const madVal = mad(gaps, med);
    const nonC = arr.filter((r) => r.complianceStatus === 'Non-Compliant').length;
    const rate = arr.length ? nonC / arr.length : 0;
    operatorStats.set(op, { med, mad: madVal, nonComplianceRate: rate, count: arr.length });
  }
  for (const [st, arr] of byState.entries()) {
    const gaps = arr.map((r) => r.subsidyGap);
    const med = median(gaps);
    const madVal = mad(gaps, med);
    stateStats.set(st, { med, mad: madVal });
  }

  const findings: PatternFinding[] = [];

  // Facility outliers (global + cohort). Focused on subsidy gap + audit recency + issues.
  for (const r of rows) {
    const opStat = operatorStats.get(r.operator) || { med: globalGapMed, mad: globalGapMad, nonComplianceRate: 0, count: 0 };
    const stStat = stateStats.get(r.state) || { med: globalGapMed, mad: globalGapMad };

    const zGlobal = robustZ(r.subsidyGap, globalGapMed, globalGapMad);
    const zOp = robustZ(r.subsidyGap, opStat.med, opStat.mad);
    const zState = robustZ(r.subsidyGap, stStat.med, stStat.mad);

    const auditPenalty = r.auditRecencyDays == null ? 0.65 : clamp01(r.auditRecencyDays / Math.max(1, scenario.maxAuditRecencyDays));
    const issuesPenalty = clamp01(r.issuesCount / Math.max(1, scenario.minIssuesCount * 6));

    const gapGate = r.subsidyGap >= scenario.minSubsidyGap ? 1 : 0;
    const issuesGate = r.issuesCount >= scenario.minIssuesCount ? 1 : 0;

    const anomalyStrength = clamp01(Math.abs(zGlobal) / 6) * 0.42 + clamp01(Math.abs(zOp) / 6) * 0.32 + clamp01(Math.abs(zState) / 6) * 0.26;
    const score =
      (anomalyStrength * 0.62 +
        auditPenalty * 0.16 +
        issuesPenalty * 0.12 +
        clamp01(r.statusScore) * 0.10) *
      (0.55 + 0.45 * Math.max(gapGate, issuesGate));

    const score01 = clamp01(score);

    // Gate to avoid noise, but sensitivity can relax.
    const threshold = 0.50 - (scenario.sensitivity - 0.5) * 0.12;
    if (score01 < threshold) continue;

    const explain: ExplainFeature[] = [
      {
        feature: 'subsidyGap',
        value: r.subsidyGap,
        cohort: 'global',
        cohortMedian: globalGapMed,
        cohortMad: globalGapMad,
        robustZ: zGlobal,
        contribution: clamp01(anomalyStrength * 0.62),
      },
      {
        feature: 'subsidyGap',
        value: r.subsidyGap,
        cohort: 'operator',
        cohortMedian: opStat.med,
        cohortMad: opStat.mad,
        robustZ: zOp,
        contribution: clamp01(anomalyStrength * 0.22),
      },
      {
        feature: 'subsidyGap',
        value: r.subsidyGap,
        cohort: 'state',
        cohortMedian: stStat.med,
        cohortMad: stStat.mad,
        robustZ: zState,
        contribution: clamp01(anomalyStrength * 0.18),
      },
    ];

    const evidence = [
      {
        metric: 'Subsidy gap',
        facilityValue: r.subsidyGap,
        cohortMedian: opStat.med,
        deltaPercent: opStat.med ? ((r.subsidyGap - opStat.med) / opStat.med) * 100 : 0,
        note: 'Compared to operator cohort median (robust baseline).',
      },
      {
        metric: 'Issues count',
        facilityValue: r.issuesCount,
        cohortMedian: median((byOperator.get(r.operator) || []).map((x) => x.issuesCount)),
        deltaPercent: 0,
        note: 'Issues are self-reported/derived; treat as directional signal.',
      },
      {
        metric: 'Audit recency (days)',
        facilityValue: r.auditRecencyDays ?? scenario.maxAuditRecencyDays + 1,
        cohortMedian: median((byOperator.get(r.operator) || []).map((x) => x.auditRecencyDays ?? scenario.maxAuditRecencyDays + 1)),
        deltaPercent: 0,
        note: r.auditRecencyDays == null ? 'Audit date missing/invalid → elevated strategic ignorance risk.' : 'Higher is worse (older audit).',
      },
    ];

    const strategicIgnorance = r.auditRecencyDays == null;
    const type = strategicIgnorance ? 'strategic_ignorance_risk' : 'temporal_anomaly';

    findings.push({
      id: `facility-${r.id}`,
      type,
      severity: severityFromScore(score01, scenario.sensitivity),
      title: strategicIgnorance
        ? `Strategic ignorance risk: missing audit recency for ${r.name}`
        : `Outlier facility pressure: ${r.name}`,
      description: strategicIgnorance
        ? `Audit timing for this facility is missing/invalid, which undermines compliance accountability and can mask under-compliance patterns.`
        : `Facility deviates from its operator/state cohorts on subsidy gap pressure, with compounding risk from audit recency and issue density.`,
      confidence: clamp01(0.55 + anomalyStrength * 0.35 + (strategicIgnorance ? 0.05 : 0)),
      createdAt,
      affectedFacilities: [r.id],
      affectedOperators: [r.operator],
      score: score01,
      explain,
      evidence,
      recommendations: [
        `Prioritize an audit scheduling check for ${r.name} (target ≤ ${scenario.maxAuditRecencyDays} days).`,
        `Prepare an evidence packet focusing on subsidy gap (${formatCurrency(r.subsidyGap)}) and operator cohort context.`,
      ],
      limitations: [
        'Facility-level signals are cross-sectional (not true time series) unless additional historical snapshots are ingested.',
        'Subsidy gap and issues are only as accurate as their upstream sources and parsing.',
      ],
    });
  }

  // Operator cascade: non-compliance concentration + high subsidy gap cohort.
  for (const [op, arr] of byOperator.entries()) {
    if (arr.length < scenario.operatorCascadeMinFacilities) continue;
    const nonC = arr.filter((r) => r.complianceStatus === 'Non-Compliant').length;
    const rate = arr.length ? nonC / arr.length : 0;
    if (rate < scenario.operatorCascadeMinNonComplianceRate) continue;

    const stat = operatorStats.get(op)!;
    const topFacilities = arr
      .slice()
      .sort((a, b) => b.subsidyGap - a.subsidyGap)
      .slice(0, 12)
      .map((r) => r.id);

    const gapPressure = clamp01(Math.abs(robustZ(stat.med, globalGapMed, globalGapMad)) / 6);
    const score01 = clamp01(0.35 + rate * 0.45 + gapPressure * 0.20);
    const threshold = 0.52 - (scenario.sensitivity - 0.5) * 0.12;
    if (score01 < threshold) continue;

    findings.push({
      id: `operator-${op}`,
      type: 'compliance_cascade',
      severity: score01 >= 0.86 ? 'critical' : score01 >= 0.72 ? 'high' : score01 >= 0.56 ? 'medium' : 'low',
      title: `Compliance cascade risk: ${op}`,
      description: `${Math.round(rate * 100)}% non-compliance concentration across ${arr.length} facilities, with elevated subsidy gap pressure (operator median ${formatCurrency(stat.med)}).`,
      confidence: clamp01(0.65 + rate * 0.25 + gapPressure * 0.1),
      createdAt,
      affectedFacilities: topFacilities,
      affectedOperators: [op],
      score: score01,
      explain: [
        {
          feature: 'operatorNonComplianceRate',
          value: rate,
          cohort: 'global',
          cohortMedian: median(Array.from(operatorStats.values()).map((s) => s.nonComplianceRate)),
          cohortMad: mad(Array.from(operatorStats.values()).map((s) => s.nonComplianceRate), median(Array.from(operatorStats.values()).map((s) => s.nonComplianceRate))),
          robustZ: 0,
          contribution: 0.6,
        },
        {
          feature: 'operatorMedianSubsidyGap',
          value: stat.med,
          cohort: 'global',
          cohortMedian: globalGapMed,
          cohortMad: globalGapMad,
          robustZ: robustZ(stat.med, globalGapMed, globalGapMad),
          contribution: 0.4,
        },
      ],
      evidence: [
        {
          metric: 'Non-compliance rate',
          facilityValue: rate,
          cohortMedian: median(Array.from(operatorStats.values()).map((s) => s.nonComplianceRate)),
          deltaPercent: 0,
          note: 'Operator-level concentration raises enforcement leverage.',
        },
        {
          metric: 'Operator median subsidy gap',
          facilityValue: stat.med,
          cohortMedian: globalGapMed,
          deltaPercent: globalGapMed ? ((stat.med - globalGapMed) / globalGapMed) * 100 : 0,
          note: 'Operator median vs global median (robust baseline).',
        },
      ],
      recommendations: [
        `Escalate operator-wide review: ${op} (cascade conditions met).`,
        'Prioritize the top 10 highest-gap facilities for immediate evidence packaging and audit scheduling review.',
      ],
      limitations: [
        'Cascade risk uses current snapshot fields; true escalation timing requires historical longitudinal data.',
      ],
    });
  }

  // Correlations (cross-sectional, but useful for hypothesis generation)
  const correlations: CorrelationInsight[] = (() => {
    const xsGap = rows.map((r) => r.subsidyGap);
    const xsIssues = rows.map((r) => r.issuesCount);
    const xsAudit = rows.map((r) => (r.auditRecencyDays ?? scenario.maxAuditRecencyDays + 1));
    const xsStatus = rows.map((r) => r.statusScore);

    const items: Array<{ a: string; b: string; x: number[]; y: number[]; hint: string }> = [
      { a: 'Subsidy gap', b: 'Issues count', x: xsGap, y: xsIssues, hint: 'Higher gap correlating with higher issue density can indicate systematic under-compliance.' },
      { a: 'Subsidy gap', b: 'Audit recency (days)', x: xsGap, y: xsAudit, hint: 'Older audits correlating with higher gap suggests enforcement lag.' },
      { a: 'Issues count', b: 'Compliance severity', x: xsIssues, y: xsStatus, hint: 'Issue density correlating with severity validates triage rules.' },
    ];

    return items.map((it) => {
      const r = pearson(it.x, it.y);
      const abs = Math.abs(r);
      const actionable = abs >= 0.35;
      const interpretation =
        abs < 0.2
          ? `Weak correlation (r=${r.toFixed(2)}). ${it.hint}`
          : abs < 0.45
            ? `Moderate correlation (r=${r.toFixed(2)}). ${it.hint}`
            : `Strong correlation (r=${r.toFixed(2)}). ${it.hint}`;

      return {
        id: `corr-${it.a}-${it.b}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        metric1: it.a,
        metric2: it.b,
        correlation: Number(r.toFixed(3)),
        interpretation,
        actionable,
        sampleSize: rows.length,
      };
    });
  })();

  // Sort findings by score (desc) and cap for UI sanity.
  findings.sort((a, b) => b.score - a.score);
  const cappedFindings = findings.slice(0, 900);

  const critical = cappedFindings.filter((f) => f.severity === 'critical').length;
  const high = cappedFindings.filter((f) => f.severity === 'high').length;

  const operatorCounts = new Map<string, { findings: number; nonComplianceRate: number }>();
  for (const f of cappedFindings) {
    for (const op of f.affectedOperators) {
      const stat = operatorStats.get(op);
      const cur = operatorCounts.get(op) || { findings: 0, nonComplianceRate: stat?.nonComplianceRate ?? 0 };
      cur.findings += 1;
      cur.nonComplianceRate = stat?.nonComplianceRate ?? cur.nonComplianceRate;
      operatorCounts.set(op, cur);
    }
  }

  const topOperators = Array.from(operatorCounts.entries())
    .map(([operator, v]) => ({ operator, findings: v.findings, nonComplianceRate: v.nonComplianceRate }))
    .sort((a, b) => b.findings - a.findings)
    .slice(0, 10);

  return {
    generatedAt: createdAt,
    scenario,
    summary: {
      totalFindings: cappedFindings.length,
      critical,
      high,
      topOperators,
    },
    findings: cappedFindings,
    correlations,
  };
}


