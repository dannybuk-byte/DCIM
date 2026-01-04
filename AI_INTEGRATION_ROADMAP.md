# AI Integration Roadmap for DCIM Compliance Dashboard

**Based on Latent Space AI Engineering Patterns**  
**Date**: January 1, 2026  
**Status**: Planning Phase  
**Integration with**: Zero-backend browser architecture

---

## Executive Summary

This document merges Latent Space AI engineering patterns with the DCIM Compliance Dashboard's existing zero-backend architecture. The goal: **transform investigation workflows** for the $2.48B+ subsidy gap without compromising the zero-backend, privacy-first design.

**Key Alignment**: Your Investigation Canvas paradigm already embodies many best practices from the AI UX community—spatial investigation, progressive disclosure, and tool-first interfaces over chat. AI should **amplify** these metaphors, not replace them.

---

## Architecture Compatibility Analysis

### ✅ Perfect Alignment

| Your Architecture | Latent Space Pattern | Integration Path |
|-------------------|---------------------|------------------|
| **Zero-backend** | Browser-based AI (WebLLM, Transformers.js) | Direct implementation |
| **IndexedDB via Dexie** | Local semantic search + embeddings | Store vectors alongside data |
| **Investigation Canvas** | Spatial investigation > chat | AI suggests nodes, users navigate |
| **React + TypeScript** | Zod schemas for structured outputs | Type-safe AI responses |
| **11,992 facilities** | Local context + smart routing | Query classification before execution |
| **Privacy-first** | Local processing, no data sharing | Core selling point |

### ⚠️ Needs Adaptation

| Challenge | Solution |
|-----------|----------|
| **No Backend** | Use API fallback pattern with local-first priority |
| **Large Dataset** | Incremental embedding, indexed search, smart pagination |
| **Browser Memory** | Lazy load models, cache aggressively, prefer small models |

---

## Proposed AI Capabilities Hierarchy

### **Tier 1: No-Backend Pure Client** (Highest Priority)

These work entirely in the browser with zero external dependencies:

#### **1.1 Natural Language to IndexedDB Query** ✅ HIGHEST VALUE
```typescript
// User types: "facilities in Texas with subsidies over $10M"
// AI converts to:
const query = {
  state: "TX",
  subsidyReceived: { $gt: 10000000 }
};
await db.facilities.where(query).toArray();
```

**Implementation**: 
- Use Claude/GPT-4 API with structured outputs (Zod schema)
- Fallback to keyword matching when offline
- 1-2 days to implement

**Value**: Removes barrier for non-technical users

#### **1.2 Statistical Anomaly Detection + Explanations**
```typescript
// Calculate z-scores for each facility metric
// Flag outliers (z-score > 2)
// Generate explanation: "PUE 42% above regional average (1.8 vs 1.27)"
```

**Implementation**:
- Pre-compute baselines (mean, std dev) for each metric
- Client-side z-score calculation
- Template-based explanations (no LLM needed)
- 2-3 days to implement

**Value**: Surfaces compliance issues automatically

#### **1.3 Investigation Templates**
```typescript
const templates = [
  "Compare to regional averages",
  "Subsidy vs compliance history",
  "Find similar facilities",
  "Cooling efficiency analysis",
  "Job creation gap breakdown"
];
```

**Implementation**:
- Pre-built queries with parameter slots
- UI: Click template → fill parameters → execute
- 1 day to implement

**Value**: Guides investigation without requiring prompt engineering

### **Tier 2: Browser AI Models** (Medium Priority)

Requires one-time model download, then fully offline:

#### **2.1 Client-Side Embeddings for Semantic Search**
```typescript
// Using Transformers.js: all-MiniLM-L6-v2 (~50MB)
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 
  'Xenova/all-MiniLM-L6-v2');

// Embed facility descriptions
const embedding = await embedder(facility.description);

// Store in IndexedDB
await db.embeddings.put({
  facilityId: facility.id,
  vector: Array.from(embedding.data)
});

// Query: "cooling system failures"
const queryEmbedding = await embedder("cooling system failures");
const similar = await findKNN(queryEmbedding, 10); // Top 10 similar
```

**Implementation**:
- Add Transformers.js dependency
- Create embedding worker (don't block UI)
- IndexedDB schema extension for vectors
- KNN search algorithm
- 2-3 weeks for full system

**Value**: "Find facilities like this one" without API calls

#### **2.2 Local LLM for Summaries (WebLLM)**
```typescript
// Using Gemini Nano (built into Chrome) or WebLLM
const summary = await chrome.ai.summarizer.create();
const result = await summary.summarize(facilityData);

// Fallback to WebLLM if Gemini Nano unavailable
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
const engine = await CreateWebWorkerMLCEngine(
  "Llama-3-8B-Instruct-q4f32_1",
  { temperature: 0.7 }
);
```

**Implementation**:
- Detect Chrome Gemini Nano availability
- Fallback to WebLLM with small model
- Cache responses aggressively
- 1-2 weeks

**Value**: Instant summaries without API costs

#### **2.3 Semantic Zoom Summaries**
```typescript
// At high zoom: Show AI-generated summaries
// At medium zoom: Show key metrics
// At low zoom: Show full data

const zoomLevel = canvasZoom;
if (zoomLevel < 0.3) {
  return <AISummaryCard facility={facility} />;
} else if (zoomLevel < 0.7) {
  return <KeyMetricsCard facility={facility} />;
} else {
  return <FullDataCard facility={facility} />;
}
```

**Implementation**:
- Integrate with existing Zoomable Canvas
- Generate summaries on-demand or pre-compute
- 2-3 days

**Value**: Information hierarchy matching investigation depth

### **Tier 3: API-Enhanced (Lowest Priority)**

Requires internet + API keys, but provides best quality:

#### **3.1 Deep Research-Style Reports**
```typescript
// Generate comprehensive compliance reports
async function generateDeepReport(facilityId: number) {
  // 1. Planning
  const plan = await llm.generatePlan(facilityId);
  
  // 2. Parallel collection
  const data = await Promise.all([
    getFinancialData(facilityId),
    getTechnicalData(facilityId),
    getComplianceHistory(facilityId),
    getRegionalComparisons(facilityId)
  ]);
  
  // 3. Iterative analysis
  const insights = await llm.analyzePatterns(data);
  
  // 4. Report generation
  return await llm.generateReport({
    plan,
    data,
    insights,
    format: 'markdown'
  });
}
```

**Implementation**:
- Multi-step workflow with user checkpoints
- Export to PDF/Markdown
- 3-4 weeks

**Value**: Professional reports for advocacy/journalism

#### **3.2 Investigation Agent with Memory**
```typescript
// ReAct loop for multi-step investigation
interface AgentMemory {
  episodic: Investigation[]; // Past investigations
  semantic: KnownPatterns[];  // Learned patterns
  working: CurrentContext;    // Active investigation state
}

async function investigateAnomaly(facilityId: number) {
  let steps = 0;
  let context = await loadContext(facilityId);
  
  while (steps < MAX_STEPS && !context.resolved) {
    // Observe
    const observation = await gatherData(context);
    
    // Think
    const thought = await llm.reason({
      observation,
      memory: agentMemory,
      plan: context.plan
    });
    
    // Act
    const action = await executeAction(thought.nextAction);
    context = updateContext(context, action.result);
    
    steps++;
  }
  
  return context.findings;
}
```

**Implementation**:
- Full IMPACT framework
- IndexedDB persistence for memory
- 4-6 weeks

**Value**: Multi-session investigations with continuity

---

## Quick Wins (Implementation Order)

### **Phase 1: Foundation (Week 1-2)**

#### **Quick Win 1: Natural Language Search**
```typescript
// Add to OmniscientCommandInterface.tsx
const [searchQuery, setSearchQuery] = useState('');

const handleNLSearch = async (query: string) => {
  // Convert to structured query
  const structured = await convertToQuery(query);
  
  // Execute against IndexedDB
  const results = await db.facilities
    .where(structured.filters)
    .toArray();
  
  setFilteredFacilities(results);
};
```

**UI Addition**:
```tsx
<div className="search-bar">
  <input 
    placeholder="Ask about facilities: 'Texas data centers over $10M in subsidies'"
    onChange={(e) => setSearchQuery(e.target.value)}
  />
  <button onClick={() => handleNLSearch(searchQuery)}>
    Search
  </button>
</div>
```

**Files to Modify**:
- `src/components/OmniscientCommandInterface.tsx` (add search bar)
- `src/utils/nlQueryParser.ts` (new - structured output conversion)
- `src/hooks/useNaturalLanguageSearch.ts` (new - hook)

**Dependencies**:
```bash
npm install zod openai
```

**Estimated Time**: 1-2 days  
**Value**: Immediate accessibility improvement

#### **Quick Win 2: AI Facility Summaries**
```typescript
// Add to DeepDiveView.tsx expandable sections
const generateSummary = async (facility: Facility) => {
  const summary = await llm.summarize({
    data: facility,
    context: "compliance investigation",
    maxLength: 200
  });
  return summary;
};

// Cache in IndexedDB
await db.summaries.put({
  facilityId: facility.id,
  summary,
  generatedAt: Date.now()
});
```

**UI Addition**:
```tsx
<div className="ai-summary">
  <div className="flex items-center gap-2">
    <Sparkles size={16} className="text-[#00d2d3]" />
    <span className="text-xs font-semibold">AI Summary</span>
  </div>
  <p className="text-sm text-gray-300 mt-2">
    {summary}
  </p>
</div>
```

**Files to Modify**:
- `src/components/DeepDiveView.tsx` (add summary section)
- `src/utils/aiSummary.ts` (new - summary generation)
- `src/db/schema.ts` (add summaries table)

**Estimated Time**: 1 day  
**Value**: Quick comprehension of complex facilities

#### **Quick Win 3: Investigation Templates**
```typescript
// Add to DeepDiveView.tsx header
const templates = [
  {
    name: "Regional Comparison",
    query: (facility) => ({
      state: facility.state,
      operator: { $ne: facility.operator }
    }),
    sort: "subsidyGap",
    description: "Compare to other facilities in the same state"
  },
  {
    name: "Operator Track Record",
    query: (facility) => ({
      operator: facility.operator
    }),
    sort: "complianceStatus",
    description: "See all facilities by this operator"
  },
  {
    name: "Similar Scale",
    query: (facility) => ({
      capacity: {
        $gte: facility.capacity * 0.8,
        $lte: facility.capacity * 1.2
      }
    }),
    sort: "subsidyGap",
    description: "Find facilities of similar size"
  }
];
```

**UI Addition**:
```tsx
<div className="investigation-templates">
  <div className="text-xs font-semibold mb-2">
    Quick Investigations:
  </div>
  <div className="flex gap-2 flex-wrap">
    {templates.map(template => (
      <button
        key={template.name}
        onClick={() => executeTemplate(template, facility)}
        className="px-3 py-1 bg-[#00d2d3]/20 hover:bg-[#00d2d3]/30 
                   border border-[#00d2d3] rounded text-xs"
        title={template.description}
      >
        {template.name}
      </button>
    ))}
  </div>
</div>
```

**Estimated Time**: 1 day  
**Value**: Guided investigation without prompt engineering

### **Phase 2: Browser AI (Week 3-6)**

#### **Implementation: Client-Side Embeddings**

**Step 1: Add Transformers.js**
```bash
npm install @xenova/transformers
```

**Step 2: Create Embedding Worker**
```typescript
// src/workers/embedding.worker.ts
import { pipeline } from '@xenova/transformers';

let embedder;

self.onmessage = async (e) => {
  const { text, action } = e.data;
  
  if (action === 'init') {
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
    self.postMessage({ status: 'ready' });
    return;
  }
  
  if (action === 'embed') {
    const embedding = await embedder(text);
    self.postMessage({ 
      embedding: Array.from(embedding.data) 
    });
  }
};
```

**Step 3: Extend Database Schema**
```typescript
// src/db/schema.ts
export class DCIMDatabase extends Dexie {
  facilities!: Table<Facility>;
  embeddings!: Table<FacilityEmbedding>; // NEW
  
  constructor() {
    super('DCIMComplianceDB');
    this.version(2).stores({
      facilities: '++id, operator, state, complianceStatus',
      embeddings: 'facilityId' // NEW
    });
  }
}

interface FacilityEmbedding {
  facilityId: number;
  vector: number[]; // 384 dimensions for MiniLM
  generatedAt: number;
}
```

**Step 4: Generate Embeddings**
```typescript
// src/utils/generateEmbeddings.ts
export async function generateAllEmbeddings() {
  const worker = new Worker(
    new URL('../workers/embedding.worker.ts', import.meta.url)
  );
  
  const facilities = await db.facilities.toArray();
  
  for (const facility of facilities) {
    const text = `${facility.name} ${facility.operator} 
                  ${facility.city} ${facility.state}
                  Jobs: ${facility.jobsCreated}/${facility.jobsPromised}
                  Subsidy: $${facility.subsidyReceived}`;
    
    const embedding = await embedInWorker(worker, text);
    
    await db.embeddings.put({
      facilityId: facility.id,
      vector: embedding,
      generatedAt: Date.now()
    });
  }
}
```

**Step 5: KNN Search**
```typescript
// src/utils/semanticSearch.ts
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function semanticSearch(
  query: string, 
  k: number = 10
): Promise<Facility[]> {
  // Embed query
  const queryEmbedding = await embedText(query);
  
  // Get all embeddings
  const allEmbeddings = await db.embeddings.toArray();
  
  // Calculate similarities
  const scored = allEmbeddings.map(emb => ({
    facilityId: emb.facilityId,
    similarity: cosineSimilarity(queryEmbedding, emb.vector)
  }));
  
  // Get top K
  const topK = scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
  
  // Fetch facilities
  const facilityIds = topK.map(s => s.facilityId);
  return await db.facilities
    .where('id')
    .anyOf(facilityIds)
    .toArray();
}
```

**Step 6: Add UI**
```tsx
// In OmniscientCommandInterface.tsx
const [semanticResults, setSemanticResults] = useState<Facility[]>([]);

const handleSemanticSearch = async (query: string) => {
  const results = await semanticSearch(query, 20);
  setSemanticResults(results);
};

// UI
<div className="semantic-search">
  <input 
    placeholder="Find facilities semantically: 'cooling problems in warm climates'"
    onKeyPress={(e) => {
      if (e.key === 'Enter') {
        handleSemanticSearch(e.currentTarget.value);
      }
    }}
  />
</div>
```

**Estimated Time**: 2-3 weeks  
**Value**: Semantic "find similar" without API

#### **Implementation: Local Summaries with WebLLM**

```bash
npm install @mlc-ai/web-llm
```

```typescript
// src/utils/localLLM.ts
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

let engine: any = null;

export async function initLocalLLM() {
  // Try Chrome Gemini Nano first
  if ('ai' in window && 'summarizer' in (window as any).ai) {
    return 'gemini-nano';
  }
  
  // Fallback to WebLLM
  engine = await CreateWebWorkerMLCEngine(
    "Llama-3-8B-Instruct-q4f32_1", // ~4GB download
    {
      initProgressCallback: (progress) => {
        console.log(`Loading model: ${progress.progress}%`);
      }
    }
  );
  
  return 'webllm';
}

export async function generateSummary(
  facilityData: Facility
): Promise<string> {
  const prompt = `Summarize this data center facility in 2-3 sentences:
  
Name: ${facilityData.name}
Operator: ${facilityData.operator}
Location: ${facilityData.city}, ${facilityData.state}
Jobs Promised: ${facilityData.jobsPromised}
Jobs Created: ${facilityData.jobsCreated}
Subsidy Received: $${facilityData.subsidyReceived.toLocaleString()}
Compliance Status: ${facilityData.complianceStatus}

Focus on compliance performance and key metrics.`;

  if (engine) {
    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    });
    return response.choices[0].message.content;
  }
  
  // Fallback to template if no engine available
  return generateTemplateSummary(facilityData);
}
```

**Estimated Time**: 1-2 weeks  
**Value**: Offline summaries, privacy-preserving

### **Phase 3: Advanced Features (Week 7-12)**

See full agent architecture and Deep Research implementation in sections below.

---

## Detailed Implementation: Structured Query Conversion

This is the **highest-value** feature for immediate impact.

### **System Architecture**

```
User Input (NL) → LLM with Schema → Zod Validation → IndexedDB Query → Results
```

### **Zod Schema Definition**

```typescript
// src/schemas/facilityQuery.ts
import { z } from 'zod';

export const FacilityQuerySchema = z.object({
  // Filters
  operators: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  types: z.array(z.enum(['Data Center', 'POP', 'CO', 'CDN'])).optional(),
  
  // Compliance
  complianceStatuses: z.array(
    z.enum(['Compliant', 'At Risk', 'Non-Compliant'])
  ).optional(),
  
  // Numeric filters
  subsidyMin: z.number().optional(),
  subsidyMax: z.number().optional(),
  jobGapMin: z.number().optional(),
  capacityMin: z.number().optional(),
  
  // Date filters
  openedAfter: z.string().datetime().optional(),
  openedBefore: z.string().datetime().optional(),
  
  // Sorting
  sortBy: z.enum([
    'subsidyGap', 
    'jobGap', 
    'openedDate', 
    'capacity',
    'name'
  ]).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  
  // Limits
  limit: z.number().int().positive().max(1000).optional(),
  
  // Explanation
  reasoning: z.string().describe(
    "Explain how you interpreted the user's query"
  )
});

export type FacilityQuery = z.infer<typeof FacilityQuerySchema>;
```

### **LLM Conversion Function**

```typescript
// src/utils/nlQueryConverter.ts
import { openai } from './openaiClient';
import { FacilityQuerySchema, type FacilityQuery } from '../schemas/facilityQuery';

const SYSTEM_PROMPT = `You are a query converter for a data center compliance database.

Database Schema:
- Facility: id, name, operator, city, state, type, complianceStatus
- Jobs: jobsPromised, jobsCreated, jobGap
- Money: subsidyReceived, subsidyGap
- Dates: openedDate, lastUpdated
- Technical: capacity, powerCapacity

Convert natural language to structured queries. Examples:

"Texas facilities over $10M in subsidies"
→ { states: ["TX"], subsidyMin: 10000000 }

"Non-compliant Google data centers"
→ { operators: ["Google"], complianceStatuses: ["Non-Compliant"], types: ["Data Center"] }

"Show me the worst subsidy gaps"
→ { sortBy: "subsidyGap", sortOrder: "desc", limit: 50 }

Return ONLY valid JSON matching the schema.`;

export async function convertNLToQuery(
  userQuery: string
): Promise<FacilityQuery> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userQuery }
    ],
    response_format: { type: "json_object" },
    temperature: 0
  });
  
  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);
  
  // Validate with Zod
  const validated = FacilityQuerySchema.parse(parsed);
  
  return validated;
}
```

### **IndexedDB Query Executor**

```typescript
// src/utils/executeQuery.ts
import { db } from '../db/schema';
import type { FacilityQuery } from '../schemas/facilityQuery';

export async function executeStructuredQuery(
  query: FacilityQuery
): Promise<Facility[]> {
  let collection = db.facilities.toCollection();
  
  // Apply filters
  if (query.operators && query.operators.length > 0) {
    collection = collection.filter(f => 
      query.operators!.includes(f.operator)
    );
  }
  
  if (query.states && query.states.length > 0) {
    collection = collection.filter(f => 
      query.states!.includes(f.state)
    );
  }
  
  if (query.complianceStatuses && query.complianceStatuses.length > 0) {
    collection = collection.filter(f => 
      query.complianceStatuses!.includes(f.complianceStatus)
    );
  }
  
  if (query.subsidyMin !== undefined) {
    collection = collection.filter(f => 
      f.subsidyReceived >= query.subsidyMin!
    );
  }
  
  if (query.subsidyMax !== undefined) {
    collection = collection.filter(f => 
      f.subsidyReceived <= query.subsidyMax!
    );
  }
  
  // ... more filters ...
  
  // Get results
  let results = await collection.toArray();
  
  // Sort
  if (query.sortBy) {
    const key = query.sortBy;
    const order = query.sortOrder || 'desc';
    results.sort((a, b) => {
      const aVal = a[key] ?? 0;
      const bVal = b[key] ?? 0;
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }
  
  // Limit
  if (query.limit) {
    results = results.slice(0, query.limit);
  }
  
  return results;
}
```

### **React Hook**

```typescript
// src/hooks/useNaturalLanguageSearch.ts
import { useState, useCallback } from 'react';
import { convertNLToQuery } from '../utils/nlQueryConverter';
import { executeStructuredQuery } from '../utils/executeQuery';
import type { Facility } from '../types';
import type { FacilityQuery } from '../schemas/facilityQuery';

export function useNaturalLanguageSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Facility[]>([]);
  const [query, setQuery] = useState<FacilityQuery | null>(null);
  
  const search = useCallback(async (userQuery: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert NL to structured query
      const structured = await convertNLToQuery(userQuery);
      setQuery(structured);
      
      // Execute against IndexedDB
      const facilities = await executeStructuredQuery(structured);
      setResults(facilities);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { search, loading, error, results, query };
}
```

### **UI Component**

```tsx
// src/components/NaturalLanguageSearch.tsx
import React, { useState } from 'react';
import { Search, Sparkles, AlertCircle } from 'lucide-react';
import { useNaturalLanguageSearch } from '../hooks/useNaturalLanguageSearch';

export const NaturalLanguageSearch: React.FC = () => {
  const [input, setInput] = useState('');
  const { search, loading, error, results, query } = useNaturalLanguageSearch();
  
  const handleSearch = () => {
    if (input.trim()) {
      search(input);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Sparkles size={20} className="text-[#00d2d3]" />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Ask about facilities: 'non-compliant operators in California' or 'largest subsidy gaps'"
          className="w-full pl-12 pr-4 py-3 bg-[#0d1219] border border-[#00d2d3]/30 
                     rounded-lg text-white placeholder-gray-500
                     focus:border-[#00d2d3] focus:ring-2 focus:ring-[#00d2d3]/20
                     transition-all"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 
                     px-4 py-1.5 bg-[#00d2d3] text-black rounded
                     hover:bg-[#00d2d3]/80 transition-all font-semibold
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {/* Query Interpretation */}
      {query && (
        <div className="mt-3 p-3 bg-[#00d2d3]/10 border border-[#00d2d3]/20 rounded">
          <div className="text-xs font-semibold text-[#00d2d3] mb-1">
            Query Interpretation:
          </div>
          <div className="text-sm text-gray-300">
            {query.reasoning}
          </div>
          {query.sortBy && (
            <div className="text-xs text-gray-400 mt-1">
              Sorted by: {query.sortBy} ({query.sortOrder || 'desc'})
            </div>
          )}
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="mt-3 p-3 bg-[#ff4757]/10 border border-[#ff4757]/20 rounded flex items-start gap-2">
          <AlertCircle size={16} className="text-[#ff4757] mt-0.5" />
          <div className="text-sm text-[#ff4757]">{error}</div>
        </div>
      )}
      
      {/* Results */}
      {results.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-[#00d2d3] mb-3">
            Found {results.length} facilities
          </div>
          <div className="space-y-2">
            {results.slice(0, 10).map(facility => (
              <div 
                key={facility.id}
                className="p-3 bg-[#0d1219] border border-[#00d2d3]/20 rounded
                          hover:border-[#00d2d3] transition-all cursor-pointer"
              >
                <div className="font-semibold text-white">{facility.name}</div>
                <div className="text-sm text-gray-400">
                  {facility.operator} • {facility.city}, {facility.state}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <div className={`px-2 py-1 rounded ${
                    facility.complianceStatus === 'Compliant' ? 'bg-[#2ed573]/20 text-[#2ed573]' :
                    facility.complianceStatus === 'At Risk' ? 'bg-[#ffa502]/20 text-[#ffa502]' :
                    'bg-[#ff4757]/20 text-[#ff4757]'
                  }`}>
                    {facility.complianceStatus}
                  </div>
                  <div className="text-gray-400">
                    Subsidy Gap: ${(facility.subsidyGap / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### **Integration into Main Interface**

```tsx
// In OmniscientCommandInterface.tsx
import { NaturalLanguageSearch } from './NaturalLanguageSearch';

// Add to expanded top bar or as modal
{showSearch && (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div className="bg-[#0a0e17] rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">AI-Powered Search</h2>
        <button onClick={() => setShowSearch(false)}>
          <X className="text-gray-400 hover:text-white" />
        </button>
      </div>
      <NaturalLanguageSearch />
    </div>
  </div>
)}
```

---

## Progressive Enhancement Architecture

### **Three-Tier Capability Model**

```typescript
// src/utils/aiCapabilities.ts
export enum AICapabilityTier {
  OFFLINE = 'offline',        // Pure client-side
  LOCAL_MODEL = 'local',      // Browser-embedded models
  API_ENHANCED = 'api'        // Cloud API calls
}

export function detectCapabilities(): AICapabilityTier {
  // Check for API key
  const hasAPIKey = !!localStorage.getItem('openai_api_key');
  
  // Check for WebGPU (needed for WebLLM)
  const hasWebGPU = 'gpu' in navigator;
  
  // Check for Gemini Nano
  const hasGeminiNano = 'ai' in window;
  
  if (hasAPIKey) return AICapabilityTier.API_ENHANCED;
  if (hasWebGPU || hasGeminiNano) return AICapabilityTier.LOCAL_MODEL;
  return AICapabilityTier.OFFLINE;
}

export async function executeWithFallback<T>(
  apiImpl: () => Promise<T>,
  localImpl: () => Promise<T>,
  offlineImpl: () => Promise<T>
): Promise<T> {
  const tier = detectCapabilities();
  
  try {
    switch (tier) {
      case AICapabilityTier.API_ENHANCED:
        return await apiImpl();
      case AICapabilityTier.LOCAL_MODEL:
        return await localImpl();
      default:
        return await offlineImpl();
    }
  } catch (error) {
    // Fallback chain
    if (tier === AICapabilityTier.API_ENHANCED) {
      try {
        return await localImpl();
      } catch {
        return await offlineImpl();
      }
    }
    throw error;
  }
}
```

**Usage Example**:
```typescript
const summary = await executeWithFallback(
  // API: Best quality
  () => openai.chat.completions.create({...}),
  
  // Local: Good quality, private
  () => generateLocalSummary(facility),
  
  // Offline: Template-based
  () => generateTemplateSummary(facility)
);
```

---

## File Organization

### **New Files to Create**

```
src/
├── ai/
│   ├── capabilities.ts          (Capability detection)
│   ├── fallback.ts              (Progressive enhancement)
│   └── config.ts                (API keys, model configs)
├── schemas/
│   ├── facilityQuery.ts         (Zod schemas for queries)
│   ├── summary.ts               (Zod schemas for summaries)
│   └── investigation.ts         (Zod schemas for agents)
├── workers/
│   ├── embedding.worker.ts      (Transformers.js worker)
│   └── llm.worker.ts            (WebLLM worker)
├── utils/
│   ├── nlQueryConverter.ts      (NL → Structured)
│   ├── executeQuery.ts          (Structured → IndexedDB)
│   ├── semanticSearch.ts        (KNN search)
│   ├── localLLM.ts              (WebLLM/Gemini Nano)
│   └── aiSummary.ts             (Summary generation)
├── hooks/
│   ├── useNaturalLanguageSearch.ts
│   ├── useSemanticSearch.ts
│   └── useAISummary.ts
└── components/
    ├── NaturalLanguageSearch.tsx
    ├── SemanticSearchResults.tsx
    └── AICapabilityBadge.tsx   (Show current tier)
```

---

## API Key Management

### **Secure Client-Side Storage**

```typescript
// src/utils/apiKeyManager.ts
const API_KEY_STORAGE_KEY = 'dcim_ai_api_keys';

interface APIKeys {
  openai?: string;
  anthropic?: string;
}

export function storeAPIKeys(keys: APIKeys) {
  // Encrypt before storing (optional but recommended)
  const encrypted = btoa(JSON.stringify(keys));
  localStorage.setItem(API_KEY_STORAGE_KEY, encrypted);
}

export function getAPIKeys(): APIKeys {
  const encrypted = localStorage.getItem(API_KEY_STORAGE_KEY);
  if (!encrypted) return {};
  
  try {
    return JSON.parse(atob(encrypted));
  } catch {
    return {};
  }
}

export function clearAPIKeys() {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}
```

### **Settings UI**

```tsx
// src/components/AISettings.tsx
export const AISettings: React.FC = () => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  
  const handleSave = () => {
    storeAPIKeys({ openai: openaiKey });
    // Refresh capability detection
    window.location.reload();
  };
  
  return (
    <div className="ai-settings">
      <h3>AI Settings</h3>
      <p className="text-sm text-gray-400">
        API keys are stored locally in your browser and never sent to our servers.
      </p>
      
      <div className="mt-4">
        <label className="text-sm font-semibold">OpenAI API Key (Optional)</label>
        <div className="flex gap-2 mt-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="flex-1 px-3 py-2 bg-[#0d1219] border border-[#00d2d3]/30 rounded"
          />
          <button onClick={() => setShowKey(!showKey)}>
            {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enables highest-quality AI features. Falls back to local models if not provided.
        </p>
      </div>
      
      <button onClick={handleSave} className="mt-4 px-4 py-2 bg-[#00d2d3] text-black rounded">
        Save Settings
      </button>
    </div>
  );
};
```

---

## Cost & Performance Analysis

### **API Costs (if using OpenAI)**

| Feature | Model | Cost per 1K Queries | Notes |
|---------|-------|---------------------|-------|
| **NL Query Conversion** | GPT-4 Turbo | $0.50 | ~500 tokens per query |
| **Facility Summaries** | GPT-3.5 | $0.05 | ~200 tokens per summary |
| **Deep Reports** | GPT-4 Turbo | $5.00 | ~5000 tokens per report |

**Mitigation**: Cache aggressively, use local models as primary

### **Browser Performance**

| Feature | Memory | Download | Latency |
|---------|--------|----------|---------|
| **Transformers.js** | ~500MB | 50MB (one-time) | 100-300ms/query |
| **WebLLM (7B)** | ~4GB | 4GB (one-time) | 2-5s per response |
| **Gemini Nano** | Built-in | 0MB | 500ms-2s |
| **Embeddings (11K)** | ~170MB | Generated locally | Instant after gen |

### **Recommended Defaults**

```typescript
const AI_DEFAULTS = {
  // Use local embeddings for semantic search
  semanticSearch: 'local',
  
  // Use API for NL query (critical accuracy)
  nlQuery: 'api-with-local-fallback',
  
  // Use local for summaries (good enough)
  summaries: 'local-first',
  
  // Use API for reports (need quality)
  reports: 'api-only',
  
  // Cache everything aggressively
  cacheExpiry: 7 * 24 * 60 * 60 * 1000 // 7 days
};
```

---

## Testing Strategy

### **Evaluation Dataset**

Create golden dataset of 100 queries:

```typescript
// tests/fixtures/queries.ts
export const EVALUATION_QUERIES = [
  {
    input: "facilities in Texas with subsidies over $10M",
    expected: {
      states: ["TX"],
      subsidyMin: 10000000
    },
    expectedCount: 15
  },
  {
    input: "non-compliant Google data centers",
    expected: {
      operators: ["Google"],
      complianceStatuses: ["Non-Compliant"],
      types: ["Data Center"]
    },
    expectedCount: 3
  },
  // ... 98 more
];
```

### **Automated Eval Harness**

```typescript
// tests/nlQueryEval.test.ts
import { convertNLToQuery } from '../src/utils/nlQueryConverter';
import { executeStructuredQuery } from '../src/utils/executeQuery';
import { EVALUATION_QUERIES } from './fixtures/queries';

describe('Natural Language Query Evaluation', () => {
  EVALUATION_QUERIES.forEach(testCase => {
    it(`should correctly interpret: "${testCase.input}"`, async () => {
      const structured = await convertNLToQuery(testCase.input);
      
      // Check schema correctness
      expect(structured).toMatchObject(testCase.expected);
      
      // Check result count
      const results = await executeStructuredQuery(structured);
      expect(results.length).toBe(testCase.expectedCount);
    });
  });
});
```

### **LLM-as-Judge for Quality**

```typescript
// tests/summaryQuality.test.ts
async function evaluateSummaryQuality(
  facility: Facility,
  summary: string
): Promise<number> {
  const judgePrompt = `Rate this facility summary from 1-10:

Facility Data:
${JSON.stringify(facility, null, 2)}

Generated Summary:
${summary}

Criteria:
- Accuracy (mentions key metrics)
- Clarity (understandable)
- Completeness (covers compliance status)
- Brevity (2-3 sentences)

Return ONLY a number from 1-10.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: judgePrompt }],
    temperature: 0
  });
  
  return parseInt(response.choices[0].message.content);
}

describe('Summary Quality', () => {
  it('should maintain quality threshold', async () => {
    const samples = facilities.slice(0, 20);
    const scores = await Promise.all(
      samples.map(async f => {
        const summary = await generateSummary(f);
        return await evaluateSummaryQuality(f, summary);
      })
    );
    
    const avgScore = scores.reduce((a, b) => a + b) / scores.length;
    expect(avgScore).toBeGreaterThan(7); // Quality gate
  });
});
```

---

## Privacy & Security Considerations

### **Data Never Leaves Browser (Default)**

1. **Local-first processing**: All Tier 1 & 2 features run entirely client-side
2. **Embeddings generated locally**: No facility data sent to external servers
3. **API calls optional**: Users choose whether to enable
4. **API keys in localStorage**: Never sent to your backend (because there is none!)

### **When API Calls Are Made**

Only when user:
1. Enables API features explicitly in settings
2. Provides their own API key
3. Triggers features that require API (NL search, reports)

### **Transparency UI**

```tsx
// Show users when AI makes external calls
<div className="ai-status">
  {isUsingAPI ? (
    <div className="flex items-center gap-2 text-xs text-[#ffa502]">
      <Cloud size={12} />
      <span>Using API (your key)</span>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-xs text-[#2ed573]">
      <Shield size={12} />
      <span>Processing locally</span>
    </div>
  )}
</div>
```

---

## Next Steps

### **Immediate (This Week)**

1. **Review this roadmap** with Daniel
2. **Prioritize features**: Which quick wins first?
3. **Set up OpenAI account** (if using API approach)
4. **Install dependencies**: `zod`, `openai`
5. **Implement Quick Win 1**: Natural Language Search

### **Short-term (Next 2 Weeks)**

1. Implement all Quick Wins (NL search, summaries, templates)
2. Test with real users
3. Gather feedback
4. Iterate on prompt quality

### **Medium-term (Next 1-2 Months)**

1. Add client-side embeddings
2. Implement semantic search
3. Local LLM integration
4. Semantic zoom summaries

### **Long-term (2-3 Months)**

1. Investigation agent with memory
2. Deep Research reports
3. Full progressive enhancement
4. Production evaluation system

---

## Questions for Daniel

Before implementation, please clarify:

1. **API Keys**: Are you comfortable asking users to provide their own OpenAI/Anthropic keys? Or should we focus purely on local models?

2. **Feature Priority**: Which matters most?
   - Natural language search
   - AI summaries
   - Investigation templates
   - Semantic "find similar"

3. **Quality vs Speed**: Would you rather have:
   - Best quality (requires API)
   - Good quality (local models, slower)
   - Fast but simpler (templates only)

4. **User Experience**: Should AI features be:
   - Prominent and encouraged
   - Available but subtle
   - Hidden in "Advanced" settings

5. **Privacy Messaging**: How should we communicate:
   - Local processing as privacy feature
   - Optional API enhancement
   - Data never leaves browser (by default)

---

## Conclusion

This roadmap merges Latent Space patterns with your existing DCIM architecture. The key insight: **your Investigation Canvas paradigm already aligns with AI UX best practices**—spatial investigation, progressive disclosure, tools over chat.

Start with **Quick Win 1 (Natural Language Search)**. It provides immediate value, requires minimal changes, and validates the AI integration approach. Then progressively enhance with browser-embedded models and eventually agent capabilities.

The zero-backend constraint is actually an **advantage**: privacy-preserving AI is a selling point for labor organizers and journalists investigating billion-dollar compliance gaps.

**Ready to implement when you are.** 🚀

