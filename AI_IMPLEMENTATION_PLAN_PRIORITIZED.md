# DCIM AI Implementation Plan - Safest Priority Order

**Date**: January 1, 2026  
**Approach**: API-first with local fallback, prominent UI  
**Goal**: Best quality for $2.48B+ subsidy gap investigation

---

## Priority 1: Foundation (Week 1) - SAFEST, HIGHEST VALUE

### **1.1 API Key Management UI** ✅ Zero Risk
*Setup before any AI features*

**Why First**: Need this before anything else works

**Files to Create**:
```
src/components/AISettingsModal.tsx
src/utils/apiKeyManager.ts
src/ai/config.ts
```

**Implementation**:
```typescript
// src/utils/apiKeyManager.ts
const STORAGE_KEY = 'dcim_ai_config';

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'none';
  apiKey: string;
  model: string;
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(config)));
}

export function loadAIConfig(): AIConfig | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(atob(stored));
  } catch {
    return null;
  }
}
```

**UI in OmniscientCommandInterface**:
```tsx
// Add to top bar
<button 
  onClick={() => setShowAISettings(true)}
  className="px-3 py-1 bg-[#00d2d3]/20 border border-[#00d2d3] rounded
             flex items-center gap-2 text-sm"
>
  <Sparkles size={16} />
  AI Settings
</button>
```

**Time**: 4 hours  
**Risk**: Zero (just UI + localStorage)  
**Value**: Required for all AI features

---

### **1.2 Investigation Templates** ✅ Zero Risk
*No AI needed, pure IndexedDB queries*

**Why Second**: Provides immediate value, no AI required, zero failure points

**Implementation**:
```typescript
// src/utils/investigationTemplates.ts
export const TEMPLATES = [
  {
    id: 'regional-comparison',
    name: 'Compare to Regional Facilities',
    description: 'See how this facility compares to others in the same state',
    icon: MapPin,
    execute: async (facility: Facility) => {
      return await db.facilities
        .where('state').equals(facility.state)
        .and(f => f.id !== facility.id)
        .sortBy('subsidyGap');
    }
  },
  {
    id: 'operator-track-record',
    name: 'Operator Track Record',
    description: 'All facilities by this operator, sorted by compliance',
    icon: Building,
    execute: async (facility: Facility) => {
      return await db.facilities
        .where('operator').equals(facility.operator)
        .sortBy('complianceStatus');
    }
  },
  {
    id: 'similar-scale',
    name: 'Similar Scale Facilities',
    description: 'Find facilities with similar capacity (±20%)',
    icon: Scale,
    execute: async (facility: Facility) => {
      const min = (facility.capacity || 0) * 0.8;
      const max = (facility.capacity || 0) * 1.2;
      return await db.facilities
        .filter(f => 
          f.capacity && f.capacity >= min && f.capacity <= max && f.id !== facility.id
        )
        .toArray();
    }
  },
  {
    id: 'worst-offenders',
    name: 'Largest Subsidy Gaps',
    description: 'Facilities with the biggest subsidy shortfalls',
    icon: AlertTriangle,
    execute: async () => {
      return await db.facilities
        .orderBy('subsidyGap')
        .reverse()
        .limit(50)
        .toArray();
    }
  },
  {
    id: 'recent-additions',
    name: 'Recently Opened Facilities',
    description: 'Newest facilities in the last 2 years',
    icon: Calendar,
    execute: async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return await db.facilities
        .where('openedDate')
        .above(twoYearsAgo.toISOString())
        .toArray();
    }
  }
];
```

**UI Component**:
```tsx
// src/components/InvestigationTemplates.tsx
export const InvestigationTemplates: React.FC<{
  facility?: Facility;
  onResults: (results: Facility[]) => void;
}> = ({ facility, onResults }) => {
  const [loading, setLoading] = useState<string | null>(null);
  
  const runTemplate = async (template: Template) => {
    setLoading(template.id);
    try {
      const results = await template.execute(facility);
      onResults(results);
    } finally {
      setLoading(null);
    }
  };
  
  return (
    <div className="investigation-templates p-4 bg-[#0d1219] rounded-lg border border-[#00d2d3]/20">
      <div className="flex items-center gap-2 mb-3">
        <Target size={20} className="text-[#00d2d3]" />
        <h3 className="text-sm font-bold text-white">Quick Investigations</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map(template => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => runTemplate(template)}
              disabled={loading === template.id}
              className="p-3 bg-[#00d2d3]/10 hover:bg-[#00d2d3]/20 
                         border border-[#00d2d3]/30 rounded text-left
                         transition-all group"
            >
              <div className="flex items-start gap-2">
                <Icon size={16} className="text-[#00d2d3] mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white">
                    {template.name}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {template.description}
                  </div>
                </div>
              </div>
              {loading === template.id && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-[#00d2d3]">
                  <Loader size={12} className="animate-spin" />
                  Running...
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

**Time**: 6 hours  
**Risk**: Zero (pure client-side queries)  
**Value**: Immediate investigation acceleration

---

## Priority 2: Core AI Features (Week 2) - LOW RISK, HIGH VALUE

### **2.1 Natural Language Search** ⭐ HIGHEST VALUE
*API-based, structured outputs*

**Why Third**: Core feature, reliable with API, high user impact

**Dependencies**:
```bash
npm install zod openai
```

**Implementation** (see AI_INTEGRATION_ROADMAP.md for full code):

1. Create Zod schemas (`src/schemas/facilityQuery.ts`)
2. LLM conversion function (`src/utils/nlQueryConverter.ts`)
3. Query executor (`src/utils/executeQuery.ts`)
4. React hook (`src/hooks/useNaturalLanguageSearch.ts`)
5. UI component (`src/components/NaturalLanguageSearch.tsx`)

**Caching Strategy**:
```typescript
// Cache queries for 24 hours
const CACHE_KEY = 'nl_query_cache';

interface CachedQuery {
  input: string;
  structured: FacilityQuery;
  timestamp: number;
}

async function convertWithCache(input: string): Promise<FacilityQuery> {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  const cached = cache.find(c => c.input === input);
  
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached.structured;
  }
  
  const structured = await convertNLToQuery(input);
  cache.push({ input, structured, timestamp: Date.now() });
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  
  return structured;
}
```

**Fallback for No API Key**:
```typescript
function parseKeywords(input: string): FacilityQuery {
  const query: FacilityQuery = {};
  
  // Simple keyword matching
  if (/texas|tx/i.test(input)) query.states = ['TX'];
  if (/california|ca/i.test(input)) query.states = ['CA'];
  
  // Operators
  if (/google/i.test(input)) query.operators = ['Google'];
  if (/amazon|aws/i.test(input)) query.operators = ['Amazon'];
  
  // Amounts
  const match = input.match(/\$(\d+)([MmBb])/);
  if (match) {
    const amount = parseInt(match[1]);
    const multiplier = match[2].toLowerCase() === 'm' ? 1e6 : 1e9;
    query.subsidyMin = amount * multiplier;
  }
  
  // Compliance
  if (/non-compliant|failing/i.test(input)) {
    query.complianceStatuses = ['Non-Compliant'];
  }
  
  return query;
}
```

**Time**: 2 days  
**Risk**: Low (API reliable, good fallback)  
**Value**: 10/10 - Makes data accessible to non-technical users

---

### **2.2 Statistical Anomaly Detection** ✅ Zero Risk
*Pure math, no AI needed*

**Why Fourth**: High value, zero dependencies, always works

**Implementation**:
```typescript
// src/utils/anomalyDetector.ts
interface AnomalyResult {
  metric: string;
  value: number;
  mean: number;
  stdDev: number;
  zScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

export async function detectAnomalies(
  facility: Facility
): Promise<AnomalyResult[]> {
  const anomalies: AnomalyResult[] = [];
  
  // Get regional baseline
  const regionalFacilities = await db.facilities
    .where('state')
    .equals(facility.state)
    .toArray();
  
  // Metrics to check
  const metrics = [
    { key: 'subsidyGap', label: 'Subsidy Gap', format: '$' },
    { key: 'jobGap', label: 'Job Gap', format: 'jobs' },
    { key: 'powerCapacity', label: 'Power Capacity', format: 'MW' }
  ];
  
  for (const metric of metrics) {
    const values = regionalFacilities
      .map(f => f[metric.key])
      .filter(v => v != null) as number[];
    
    if (values.length < 3) continue;
    
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const facilityValue = facility[metric.key] as number;
    if (facilityValue == null) continue;
    
    const zScore = (facilityValue - mean) / stdDev;
    
    if (Math.abs(zScore) > 2) {
      anomalies.push({
        metric: metric.label,
        value: facilityValue,
        mean,
        stdDev,
        zScore,
        severity: 
          Math.abs(zScore) > 4 ? 'critical' :
          Math.abs(zScore) > 3 ? 'high' :
          Math.abs(zScore) > 2.5 ? 'medium' : 'low',
        explanation: generateExplanation(metric, facilityValue, mean, zScore)
      });
    }
  }
  
  return anomalies;
}

function generateExplanation(
  metric: { label: string; format: string },
  value: number,
  mean: number,
  zScore: number
): string {
  const direction = zScore > 0 ? 'above' : 'below';
  const pct = Math.abs(((value - mean) / mean) * 100).toFixed(1);
  
  return `${metric.label} is ${pct}% ${direction} regional average ` +
         `(${formatValue(value, metric.format)} vs ${formatValue(mean, metric.format)})`;
}
```

**UI Component**:
```tsx
// Add to DeepDiveView.tsx Overview tab
<AnomalyHighlights facility={facility} />

// src/components/AnomalyHighlights.tsx
export const AnomalyHighlights: React.FC<{ facility: Facility }> = ({ facility }) => {
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  
  useEffect(() => {
    detectAnomalies(facility).then(setAnomalies);
  }, [facility.id]);
  
  if (anomalies.length === 0) return null;
  
  return (
    <div className="anomaly-highlights p-4 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={20} className="text-[#ff4757]" />
        <h3 className="text-sm font-bold text-white">Statistical Anomalies Detected</h3>
      </div>
      
      <div className="space-y-2">
        {anomalies.map((anomaly, i) => (
          <div key={i} className={`p-2 rounded ${
            anomaly.severity === 'critical' ? 'bg-[#ff4757]/20' :
            anomaly.severity === 'high' ? 'bg-[#ffa502]/20' :
            'bg-[#ffa502]/10'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white">
                {anomaly.metric}
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-black/30 rounded">
                Z-score: {anomaly.zScore.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-300">
              {anomaly.explanation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Time**: 1 day  
**Risk**: Zero  
**Value**: 8/10 - Surfaces compliance issues automatically

---

## Priority 3: AI Summaries (Week 3) - MEDIUM RISK

### **3.1 Facility Summaries** 🤖 API-First
*GPT-4 Turbo with aggressive caching*

**Why Fifth**: High value, but depends on API quality

**Implementation**:
```typescript
// src/utils/aiSummary.ts
import OpenAI from 'openai';
import { loadAIConfig } from './apiKeyManager';

const CACHE_KEY = 'facility_summaries';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedSummary {
  facilityId: number;
  summary: string;
  timestamp: number;
  version: number; // Increment when facility data changes
}

export async function generateSummary(
  facility: Facility
): Promise<string> {
  // Check cache
  const cached = getCachedSummary(facility.id);
  if (cached) return cached;
  
  // Try API
  const config = loadAIConfig();
  if (config?.apiKey) {
    try {
      const apiSummary = await generateAPISummary(facility, config);
      cacheSummary(facility.id, apiSummary);
      return apiSummary;
    } catch (err) {
      console.warn('API summary failed, using template:', err);
    }
  }
  
  // Fallback to template
  return generateTemplateSummary(facility);
}

async function generateAPISummary(
  facility: Facility,
  config: AIConfig
): Promise<string> {
  const openai = new OpenAI({ 
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true // Client-side usage
  });
  
  const prompt = `Summarize this data center facility in 2-3 clear sentences for a labor organizer investigating compliance with job creation promises:

**Facility**: ${facility.name}
**Operator**: ${facility.operator}
**Location**: ${facility.city}, ${facility.state}
**Type**: ${facility.type}

**Job Compliance**:
- Promised: ${facility.jobsPromised?.toLocaleString() || 'Unknown'} jobs
- Created: ${facility.jobsCreated?.toLocaleString() || 'Unknown'} jobs
- Gap: ${facility.jobGap?.toLocaleString() || 'Unknown'} jobs (${((facility.jobGap / facility.jobsPromised) * 100).toFixed(1)}% shortfall)
- Status: ${facility.complianceStatus}

**Financial**:
- Subsidy Received: $${(facility.subsidyReceived / 1e6).toFixed(1)}M
- Subsidy Gap: $${(facility.subsidyGap / 1e6).toFixed(1)}M

**Infrastructure**:
- Capacity: ${facility.capacity || 'Unknown'} MW
- Opened: ${facility.openedDate || 'Unknown'}

Focus on: (1) compliance status and severity, (2) key numbers that matter for accountability, (3) context that helps investigators understand significance.

Use clear, direct language. Avoid jargon. Be factual and specific.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 200
  });
  
  return response.choices[0].message.content || generateTemplateSummary(facility);
}

function generateTemplateSummary(facility: Facility): string {
  const jobShortfall = facility.jobsPromised > 0
    ? ((facility.jobGap / facility.jobsPromised) * 100).toFixed(0)
    : 0;
  
  let summary = `${facility.name} is a ${facility.type} operated by ${facility.operator} in ${facility.city}, ${facility.state}. `;
  
  if (facility.complianceStatus === 'Non-Compliant') {
    summary += `The facility is significantly non-compliant, creating only ${facility.jobsCreated} of ${facility.jobsPromised} promised jobs (${jobShortfall}% shortfall), resulting in a $${(facility.subsidyGap / 1e6).toFixed(1)}M subsidy gap. `;
  } else if (facility.complianceStatus === 'At Risk') {
    summary += `The facility is at risk of non-compliance with ${facility.jobsCreated} jobs created vs ${facility.jobsPromised} promised. `;
  } else {
    summary += `The facility is meeting its job creation commitments with ${facility.jobsCreated} jobs created. `;
  }
  
  if (facility.capacity) {
    summary += `Facility capacity is ${facility.capacity} MW.`;
  }
  
  return summary;
}

// Cache management
function getCachedSummary(facilityId: number): string | null {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') as CachedSummary[];
  const cached = cache.find(c => c.facilityId === facilityId);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.summary;
  }
  
  return null;
}

function cacheSummary(facilityId: number, summary: string) {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') as CachedSummary[];
  const existing = cache.findIndex(c => c.facilityId === facilityId);
  
  const entry: CachedSummary = {
    facilityId,
    summary,
    timestamp: Date.now(),
    version: 1
  };
  
  if (existing >= 0) {
    cache[existing] = entry;
  } else {
    cache.push(entry);
  }
  
  // Keep last 1000 summaries
  if (cache.length > 1000) {
    cache.sort((a, b) => b.timestamp - a.timestamp);
    cache.splice(1000);
  }
  
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
```

**UI Integration**:
```tsx
// In DeepDiveView.tsx Overview tab
const [summary, setSummary] = useState<string>('');
const [loadingSummary, setLoadingSummary] = useState(false);

useEffect(() => {
  setLoadingSummary(true);
  generateSummary(facility).then(s => {
    setSummary(s);
    setLoadingSummary(false);
  });
}, [facility.id]);

// Render
<div className="ai-summary p-4 bg-[#00d2d3]/10 border border-[#00d2d3]/20 rounded-lg">
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <Sparkles size={16} className="text-[#00d2d3]" />
      <span className="text-xs font-semibold text-white">AI Summary</span>
    </div>
    {loadingSummary && (
      <Loader size={14} className="animate-spin text-[#00d2d3]" />
    )}
  </div>
  <p className="text-sm text-gray-300 leading-relaxed">
    {summary}
  </p>
</div>
```

**Time**: 1.5 days  
**Risk**: Medium (depends on API, but has fallback)  
**Value**: 7/10 - Quick comprehension

---

## Priority 4: Advanced Features (Week 4+) - HIGHER RISK

### **4.1 Semantic Search with Embeddings**
*Transformers.js, 2-3 weeks*

### **4.2 Deep Research Reports**
*Multi-step LLM, 3-4 weeks*

### **4.3 Investigation Agent**
*Memory + ReAct loops, 4-6 weeks*

*(See AI_INTEGRATION_ROADMAP.md for full details)*

---

## Risk Mitigation Strategies

### **For API Failures**
```typescript
// Exponential backoff
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
  throw new Error('Max retries exceeded');
}
```

### **For Rate Limits**
```typescript
// Simple rate limiter
class RateLimiter {
  private queue: Array<() => void> = [];
  private running = 0;
  
  constructor(
    private maxConcurrent = 5,
    private minInterval = 200 // ms between calls
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.running++;
    
    try {
      return await fn();
    } finally {
      await new Promise(resolve => setTimeout(resolve, this.minInterval));
      this.running--;
      this.queue.shift()?.();
    }
  }
}

export const apiLimiter = new RateLimiter(5, 200);
```

### **For Cost Control**
```typescript
// Track API usage
interface UsageStats {
  queries: number;
  estimatedCost: number; // USD
  periodStart: number;
}

function trackUsage(tokens: number) {
  const stats = JSON.parse(
    localStorage.getItem('api_usage') || 
    JSON.stringify({ queries: 0, estimatedCost: 0, periodStart: Date.now() })
  ) as UsageStats;
  
  stats.queries++;
  stats.estimatedCost += (tokens / 1000) * 0.01; // $0.01 per 1K tokens
  
  // Reset monthly
  if (Date.now() - stats.periodStart > 30 * 24 * 60 * 60 * 1000) {
    stats.queries = 1;
    stats.estimatedCost = (tokens / 1000) * 0.01;
    stats.periodStart = Date.now();
  }
  
  localStorage.setItem('api_usage', JSON.stringify(stats));
  
  // Warn if over budget
  if (stats.estimatedCost > 10) {
    console.warn('API usage over $10 this month');
  }
}
```

---

## Success Metrics

Track these to measure AI feature value:

1. **Adoption Rate**: % of users who use NL search
2. **Query Success**: % of NL queries that return useful results
3. **Investigation Speed**: Time to find compliance gaps (before/after)
4. **Feature Usage**: Which templates/AI features used most
5. **API Costs**: Average $ per user per month
6. **Fallback Rate**: How often API fails → template used

---

## Week-by-Week Timeline

| Week | Tasks | Risk | Deliverables |
|------|-------|------|--------------|
| **Week 1** | API settings UI + Investigation templates | ✅ Zero | Working templates, API config modal |
| **Week 2** | NL search + Anomaly detection | ⚠️ Low | Natural language queries, auto-flagged anomalies |
| **Week 3** | AI summaries | ⚠️ Medium | Generated summaries with fallback |
| **Week 4+** | Embeddings, reports, agents | ⚠️ High | Advanced features |

---

## Ready to Start?

**Recommended first step**: Implement Priority 1.1 (API Key Management UI)

This is:
- Zero risk (just localStorage + UI)
- Required for everything else
- 4 hours of work
- Immediate feedback to Daniel

**Should I start implementing now?** 🚀


