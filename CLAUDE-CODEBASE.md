# DCIM Compliance App - Complete Codebase Export

**Generated**: January 4, 2026  
**Purpose**: Comprehensive codebase export for Claude debugging and hardening assistance  
**Total Files**: 150+  
**Estimated Lines**: ~25,000+

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Package Dependencies](#2-package-dependencies)
3. [Configuration Files](#3-configuration-files)
4. [Database Schema](#4-database-schema)
5. [Type Definitions](#5-type-definitions)
6. [Entry Points](#6-entry-points)
7. [Core Services](#7-core-services)
8. [API Integrations](#8-api-integrations)
9. [Core Utilities](#9-core-utilities)
10. [Main Components](#10-main-components)

---

## 1. Project Structure

```
DCIM Compliance App/
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Root component
│   ├── types.ts                          # Core type definitions
│   ├── index.css                         # Global styles
│   │
│   ├── db/
│   │   └── database.ts                   # IndexedDB schema (Dexie)
│   │
│   ├── services/
│   │   ├── patternInference.ts           # ML pattern detection
│   │   ├── bgpMonitoring.ts              # BGP anomaly detection
│   │   ├── ctMonitoring.ts               # Certificate Transparency
│   │   ├── correlationEngine.ts          # Multi-signal correlation
│   │   └── predictiveSubsidyIntelligence.ts
│   │
│   ├── integrations/
│   │   ├── index.ts                      # Integration exports
│   │   ├── secEdgar.ts                   # SEC EDGAR API
│   │   ├── epaEcho.ts                    # EPA ECHO API
│   │   ├── usaSpending.ts                # USASpending API
│   │   ├── peeringDb.ts                  # PeeringDB API
│   │   ├── openCorporates.ts             # OpenCorporates API
│   │   ├── censusApi.ts                  # Census Bureau API
│   │   ├── blsApi.ts                     # BLS API
│   │   ├── oshaApi.ts                    # OSHA API
│   │   ├── ipfsStorage.ts                # IPFS integration
│   │   └── nostrRelay.ts                 # Nostr integration
│   │
│   ├── utils/
│   │   ├── circuitBreaker.ts             # Circuit breaker pattern
│   │   ├── dbOperations.ts               # Safe DB operations
│   │   ├── errorTracking.ts              # Error logging
│   │   ├── globalErrorHandler.ts         # Global error handling
│   │   ├── rateLimiter.ts                # Rate limiting
│   │   ├── sanitization.ts               # Input sanitization
│   │   ├── retry.ts                      # Retry logic
│   │   ├── timeout.ts                    # Timeout utilities
│   │   ├── stats.ts                      # Statistics calculations
│   │   ├── formatting.ts                 # Currency/date formatting
│   │   └── ... (40+ utility files)
│   │
│   ├── components/
│   │   ├── DCIMCommandCenter.tsx         # Main dashboard (1800+ lines)
│   │   ├── AntifragileNavigation.tsx     # Navigation system
│   │   ├── PatternIntelligenceDashboard.tsx
│   │   ├── DeepIntelligence.tsx          # Full API data extraction
│   │   ├── PredictiveSubsidyDashboard.tsx
│   │   ├── RegulatoryToolkit.tsx         # Municipal DCIM toolkit
│   │   ├── RealTimeIntelligence.tsx      # Live API scraping
│   │   ├── ChatInterface.tsx             # AI chat
│   │   ├── ErrorBoundary.tsx             # Error boundaries
│   │   │
│   │   ├── tabs/                         # Tab components (20+)
│   │   │   ├── OverviewTab.tsx
│   │   │   ├── GeographyTab.tsx
│   │   │   ├── ProblemsTab.tsx
│   │   │   ├── IntelligenceHubTab.tsx
│   │   │   ├── NetworkSecurityTab.tsx
│   │   │   └── ...
│   │   │
│   │   └── shared/                       # Shared components (40+)
│   │       ├── ExpandableSection.tsx
│   │       ├── NestedTabs.tsx
│   │       ├── CommandPalette.tsx
│   │       ├── Breadcrumbs.tsx
│   │       └── ...
│   │
│   ├── hooks/                            # Custom React hooks
│   ├── contexts/                         # React contexts
│   ├── config/                           # Configuration files
│   ├── analyzers/                        # Analysis engines
│   ├── search/                           # FlexSearch engine
│   └── schemas/                          # Validation schemas
│
├── public/                               # Static assets
├── cloudflare-worker/                    # CORS proxy worker
├── docs/ai-context/                      # AI documentation
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── index.html
```

---

## 2. Package Dependencies

### package.json
```json
{
  "name": "dcim-compliance-app",
  "version": "1.0.0",
  "description": "Infrastructure Accountability Dashboard with AI Chat",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "prebuild": "bash generate-build-info.sh",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "postinstall": "node -e \"const fs = require('fs'); const dir = 'node_modules/echarts/lib/chart/sankey'; try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(dir + '/install.js', '// Stub file\\nexport function install() {}\\n'); console.log('✅ Created echarts stub'); } catch(e) { console.warn('⚠️ Could not create echarts stub:', e.message); }\""
  },
  "dependencies": {
    "@deck.gl/aggregation-layers": "^9.2.5",
    "@deck.gl/core": "^9.2.5",
    "@deck.gl/layers": "^9.2.5",
    "@deck.gl/react": "^9.2.5",
    "@deck.gl/widgets": "^9.2.5",
    "@langchain/community": "^1.1.1",
    "@langchain/core": "^1.1.8",
    "@open-policy-agent/opa-wasm": "^1.10.0",
    "@react-pdf/renderer": "^4.3.2",
    "@tanstack/react-virtual": "^3.13.13",
    "@tensorflow/tfjs": "^4.22.0",
    "@types/leaflet": "^1.9.21",
    "arima": "^0.2.5",
    "cytoscape": "^3.33.1",
    "dexie": "^3.2.4",
    "echarts": "^6.0.0",
    "echarts-for-react": "^3.0.5",
    "flexsearch": "^0.8.212",
    "isolation-forest": "^0.0.9",
    "jspdf": "^3.0.4",
    "jspdf-autotable": "^5.0.2",
    "langchain": "^1.2.3",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.562.0",
    "maplibre-gl": "^4.7.1",
    "openai": "^6.15.0",
    "react": "^18.2.0",
    "react-cytoscapejs": "^2.0.0",
    "react-dom": "^18.2.0",
    "react-leaflet": "^5.0.0",
    "react-window": "^1.8.10",
    "simple-statistics": "^7.8.8",
    "slayer": "^1.0.1",
    "vite-plugin-pwa": "^1.2.0",
    "workbox-window": "^7.4.0",
    "zod": "^4.3.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.1",
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/react-window": "^1.8.8",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "jsdom": "^27.4.0",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "vitest": "^4.0.16"
  }
}
```

---

## 3. Configuration Files

### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dcim-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/(api\.usaspending\.gov|api\.sec\.gov|echo\.epa\.gov)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dcim-gov-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 12 }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.tile\./,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dcim-map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ],
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'DCIM Infrastructure Accountability Dashboard',
        short_name: 'DCIM Dashboard',
        description: 'Labor-focused infrastructure accountability tool',
        theme_color: '#0a0e17',
        background_color: '#0a0e17',
        display: 'standalone',
        start_url: '/',
      },
      devOptions: { enabled: false }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: [
      'echarts-for-react',
      '@tensorflow/tfjs',
      'arima',
      'slayer',
      'isolation-forest',
      '@deck.gl/core',
      '@deck.gl/layers',
      '@deck.gl/react',
      '@deck.gl/aggregation-layers'
    ]
  },
  build: {
    commonjsOptions: { transformMixedEsModules: true },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-map': ['maplibre-gl', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/aggregation-layers'],
          'vendor-charts': ['echarts', 'echarts-for-react'],
          'vendor-analysis': ['@tensorflow/tfjs', 'arima', 'isolation-forest']
        }
      }
    }
  },
  logLevel: 'warn'
});
```

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Space Grotesk', 'DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a',
        },
        accent: {
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
          400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
        },
        success: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
          400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
        },
        danger: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
        },
        neutral: {
          0: '#ffffff', 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
          300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569',
          700: '#334155', 800: '#1e293b', 900: '#0f172a',
        },
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 4. Database Schema

### src/db/database.ts
```typescript
import Dexie, { Table } from 'dexie';
import { Facility } from '../types';
import { SourceType } from '../config/sourceTypes';

// Provenance tracking interfaces
export interface DataProvenance {
  id?: number;
  dataPointId: string;
  facilityId: number;
  metricName: string;
  sourceType: SourceType;
  capturedAt: string;
  sourceDescription: string;
  collectionMethod: string;
  confidence: string;
  variance?: string;
  limitations?: string[];
}

export interface CommunityContext {
  countyFips: string;
  population: number;
  medianIncome: number;
  ejIndex: number;
  gridOperator: string;
  waterAuthority: string;
  updatedAt: string;
}

export interface SubsidyAgreement {
  id?: number;
  facilityId: number;
  promisedJobs: number;
  promisedInvestment: number;
  incentiveValue: number;
  incentiveType: string;
  permitDate: string;
  sourceDocument: string;
  sourceType: SourceType;
}

export interface LocalSignature {
  id?: number;
  facilityId: number;
  laborSignature?: string;
  energySignature?: string;
  municipalSignature?: string;
  lm3Signature?: string;
  calculatedAt: string;
}

export interface LocalOrganization {
  id?: number;
  countyFips: string;
  type: 'government' | 'environmental' | 'journalism' | 'labor';
  name: string;
  website?: string;
  relevance: string;
}

export interface KnowledgeGap {
  id?: number;
  facilityId: number;
  question: string;
  foiaTemplateId?: string;
  status: 'identified' | 'investigating' | 'resolved';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AppSettings {
  key: string;
  value: any;
}

export interface SearchHistoryEntry {
  id?: number;
  query: string;
  context: string;
  createdAt: string;
  lastUsedAt: string;
  count: number;
}

// Pattern Intelligence Engine tables
export interface BGPAnomalyRecord {
  id: string;
  timestamp: number;
  type: 'new_prefix' | 'route_leak' | 'unusual_path' | 'withdrawal' | 'origin_change';
  prefix: string;
  asn: string;
  provider: string;
  previousPath?: number[];
  currentPath?: number[];
  significance: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  businessInference: string;
}

export interface CTAlertRecord {
  sha256: string;
  commonName: string;
  domains: string[];
  issuer: string;
  loggedAt: number;
  notBefore: number;
  notAfter: number;
  alertType: 'facility_pattern' | 'new_subdomain' | 'wildcard' | 'renewal' | 'mass_issuance';
  provider?: string;
  geographicHint?: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  businessInference: string;
}

export interface CuriosityQuestionRecord {
  id: string;
  type: string;
  text: string;
  context: Record<string, unknown>;
  investigationPath: string[];
  learningValue: number;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolution?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface PredictionRecord {
  id: string;
  detectionId: string;
  predictedConfidence: number;
  predictedOutcome: string;
  actualOutcome?: string;
  timestamp: number;
  resolvedAt?: number;
  errorMagnitude?: number;
}

export interface LearnedPatternRecord {
  id: string;
  source: string;
  type: string;
  pattern: string;
  confidence: number;
  occurrences: number;
  learnedAt: number;
  lastSeen: number;
}

export interface CorrelationRecord {
  id: string;
  facilityId: string;
  provider?: string;
  timestamp: number;
  signalCount: number;
  combinedConfidence: number;
  hypothesis: string;
  pattern: string;
  businessInference: string;
  investigationPriority: string;
}

export interface NetworkSecurity {
  id?: number;
  facilityId: number;
  asn?: string;
  asnName?: string;
  rpkiStatus: 'Safe' | 'Unsafe' | 'Partially Safe' | 'Unknown';
  networkRiskScore?: number;
  bgpAnomalies?: number;
  networkProvider?: string;
  transitProviders?: string[];
  peeringPartners?: string[];
  ddosMitigation?: string;
  bgpCommunities?: string[];
  securityFeatures?: string[];
  lastVerified?: string;
  notes?: string;
}

export interface Source {
  id?: number;
  title: string;
  type: 'PDF' | 'URL' | 'Document' | 'Report' | 'API' | 'News' | 'Legal' | 'Government';
  url?: string;
  content?: string;
  addedAt: string;
  tags?: string[];
  facilityIds?: number[];
  summary?: string;
  credibility?: 'High' | 'Medium' | 'Low';
}

export interface Citation {
  id?: number;
  sourceId: number;
  entityType: 'facility' | 'operator' | 'state' | 'finding';
  entityId: string;
  quote?: string;
  pageNumber?: number;
  context?: string;
  createdAt: string;
}

export interface ResearchNote {
  id?: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  relatedFacilities?: number[];
  relatedSources?: number[];
  category?: 'compliance' | 'network' | 'financial' | 'environmental' | 'general';
}

export class ComplianceDatabase extends Dexie {
  facilities!: Table<Facility, number>;
  dataProvenance!: Table<DataProvenance, number>;
  communityContext!: Table<CommunityContext, string>;
  subsidyAgreements!: Table<SubsidyAgreement, number>;
  localSignatures!: Table<LocalSignature, number>;
  localOrganizations!: Table<LocalOrganization, number>;
  knowledgeGaps!: Table<KnowledgeGap, number>;
  engagementTracking!: Table<EngagementTracking, number>;
  settings!: Table<AppSettings, string>;
  searchHistory!: Table<SearchHistoryEntry, number>;
  networkSecurity!: Table<NetworkSecurity, number>;
  sources!: Table<Source, number>;
  citations!: Table<Citation, number>;
  researchNotes!: Table<ResearchNote, number>;
  bgpAnomalies!: Table<BGPAnomalyRecord, string>;
  ctAlerts!: Table<CTAlertRecord, string>;
  curiosityQuestions!: Table<CuriosityQuestionRecord, string>;
  predictions!: Table<PredictionRecord, string>;
  learnedPatterns!: Table<LearnedPatternRecord, string>;
  correlations!: Table<CorrelationRecord, string>;

  constructor() {
    super('ComplianceDatabase');
    
    // Version 8: Full schema with Pattern Intelligence Engine
    this.version(8).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key',
      networkSecurity: '++id, facilityId, asn, rpkiStatus',
      sources: '++id, type, addedAt, *tags, *facilityIds',
      citations: '++id, sourceId, [entityType+entityId]',
      researchNotes: '++id, createdAt, updatedAt, *tags, *relatedFacilities, *relatedSources, category',
      searchHistory: '++id, query, context, lastUsedAt, [context+lastUsedAt]',
      bgpAnomalies: 'id, timestamp, type, asn, provider, significance',
      ctAlerts: 'sha256, loggedAt, alertType, provider, significance',
      curiosityQuestions: 'id, type, status, createdAt, learningValue',
      predictions: 'id, detectionId, timestamp, resolvedAt',
      learnedPatterns: 'id, source, type, learnedAt, lastSeen',
      correlations: 'id, facilityId, timestamp, pattern, investigationPriority'
    });
  }
}

export const db = new ComplianceDatabase();
```

---

## 5. Type Definitions

### src/types.ts
```typescript
import { DataSourceType } from './services/DataFetcher';

export interface DataSource {
  type: DataSourceType;
  field: string;
  verified: boolean;
  fetchedAt?: string;
  reference?: string;
}

export interface Facility {
  id: number;
  name: string;
  type: 'Switch' | 'CO' | 'POP' | 'Data Center' | 'Other';
  facilityType?: 'Switch' | 'CO' | 'POP' | 'Data Center' | 'Other';
  operator: string;
  country: string;
  state: string;
  city: string;
  complianceStatus: 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown';
  subsidyGap: number;
  lastAuditDate: string;
  issues: string[];
  latitude?: number;
  longitude?: number;
  dataSources?: DataSource[];
  address?: string;
  powerCapacityMW?: number;
  jobsPromised?: number;
  jobsCreated?: number;
  taxIncentives?: number;
  yearEstablished?: number;
}

export interface ComplianceStats {
  totalFacilities: number;
  compliant: number;
  nonCompliant: number;
  atRisk: number;
  unknown: number;
  totalSubsidyGap: number;
  totalIssues: number;
  avgDaysSinceAudit: number;
  overdueAudits: number;
  medianSubsidyGap: number;
  maxSubsidyGap: number;
}

export type TabType = 'Overview' | 'Geography' | 'Problems' | 'Early Warning' | 'Explorer';
```

---

## 6. Entry Points

### src/main.tsx
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Initialize offline queue monitoring
import { initOfflineQueue } from './utils/offlineQueue'
const cleanupOfflineQueue = initOfflineQueue();

// Initialize global error handling
import { setupGlobalErrorHandling } from './utils/globalErrorHandler'
setupGlobalErrorHandling();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupOfflineQueue();
});
```

### src/App.tsx
```tsx
import { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import DCIMCommandCenter from './components/DCIMCommandCenter';
import ChatInterface from './components/ChatInterface';
import ReportModal from './components/ReportModal';
import NetworkTraceModal from './components/NetworkTraceModal';
import SourceManager from './components/SourceManager';
import { DynamicActionButtons } from './components/DynamicActionButtons';
import { NavigationHelper } from './components/NavigationHelper';
import { MissionControlGridTest } from './components/MissionControlGridTest';
import { OmniscientCommandInterface } from './components/OmniscientCommandInterface';
import { LightDashboard } from './components/LightDashboard';
import { initClickToScrollEverywhere } from './utils/clickToScrollEverywhere';
import { db } from './db/database';
import { Facility } from './types';
import { safeDbOperation } from './utils/dbOperations';
import { trackError } from './utils/errorTracking';
import { ProvenanceModeProvider } from './components/shared/ProvenanceMode';
import { DensityProvider } from './contexts/DensityContext';
import { getSettings, saveSettings, settingsKey } from './utils/settingsPersistence';
import { OfflineIndicator } from './hooks/useOfflineStatus';
import { EnhancedCapabilitiesBanner } from './components/EnhancedCapabilitiesBanner';
import { Sun, Moon, Palette } from 'lucide-react';

// Theme Context
type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ 
  theme: 'light', 
  setTheme: () => {} 
});
export const useTheme = () => useContext(ThemeContext);

function App() {
  type AppShell = 'light' | 'omniscient' | 'commandCenter' | 'missionControlTest';
  const [appShell, setAppShell] = useState<AppShell>('light');
  const [shellMenuOpen, setShellMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [networkTraceOpen, setNetworkTraceOpen] = useState(false);
  const [sourceManagerOpen, setSourceManagerOpen] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sourceManagerFacilityId, setSourceManagerFacilityId] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  
  // Load persisted theme
  useEffect(() => {
    const saved = localStorage.getItem('dcim:theme') as Theme;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, []);
  
  // Save theme and apply to document
  useEffect(() => {
    localStorage.setItem('dcim:theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // ... (rest of App.tsx - see full file for complete implementation)
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <DensityProvider>
        <ProvenanceModeProvider>
          {/* Theme Toggle, Interface Switcher, and Shell Rendering */}
        </ProvenanceModeProvider>
      </DensityProvider>
    </ThemeContext.Provider>
  );
}

export default App;
```

---

## 7. Core Services

### src/services/patternInference.ts (Pattern Inference Engine)
```typescript
/**
 * Pattern Inference Engine
 * Browser-based ML system that extracts business intelligence from infrastructure
 * metadata - the same pattern inference cloud DCIM vendors perform, but client-side.
 */

import * as tf from '@tensorflow/tfjs';
import * as ss from 'simple-statistics';
import { db } from '../db/database';

// Types
export interface PowerReading {
  timestamp: number;
  facilityId: string;
  powerKW: number;
  temperatureC?: number;
  humidity?: number;
  gpuUtilization?: number;
  networkMbps?: number;
}

export interface AnomalyResult {
  timestamp: number;
  facilityId: string;
  anomalyScore: number;
  pattern: 'spike' | 'decline' | 'flatline' | 'variance_change' | 'normal';
  businessInference: string;
  confidence: number;
  rawValue: number;
  expectedValue: number;
  deviation: number;
}

export interface WorkloadSignature {
  facilityId: string;
  period: { start: number; end: number };
  powerVariance24h: number;
  avgUtilization: number;
  peakUtilization: number;
  diurnalPattern: number;
  weekendDrop: number;
  thermalConsistency: number;
  networkToComputeRatio: number;
  hurstExponent?: number;
}

export type WorkloadType = 
  | 'crypto_mining' 
  | 'ai_training' 
  | 'traditional_compute' 
  | 'hpc_scientific' 
  | 'cdn_edge' 
  | 'unknown';

// Autoencoder-based Anomaly Detector
export class AnomalyDetector {
  private model: tf.LayersModel | null = null;
  private isTraining = false;
  private readonly sequenceLength = 24;
  private readonly encodingDim = 8;
  private normalMean = 0;
  private normalStd = 1;

  private buildModel(): tf.LayersModel {
    const input = tf.input({ shape: [this.sequenceLength] });
    const encoded = tf.layers.dense({ units: 16, activation: 'relu' }).apply(input) as tf.SymbolicTensor;
    const bottleneck = tf.layers.dense({ units: this.encodingDim, activation: 'relu' }).apply(encoded) as tf.SymbolicTensor;
    const decoded = tf.layers.dense({ units: 16, activation: 'relu' }).apply(bottleneck) as tf.SymbolicTensor;
    const output = tf.layers.dense({ units: this.sequenceLength, activation: 'linear' }).apply(decoded) as tf.SymbolicTensor;
    const model = tf.model({ inputs: input, outputs: output });
    model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
    return model;
  }

  async train(readings: PowerReading[]): Promise<void> { /* ... */ }
  async detect(readings: PowerReading[]): Promise<AnomalyResult[]> { /* ... */ }
  async saveModel(name: string): Promise<void> { /* ... */ }
  async loadModel(name: string): Promise<boolean> { /* ... */ }
}

// Workload Classifier using XMR-Ray Methodology
export class WorkloadClassifier {
  extractSignature(readings: PowerReading[], facilityId: string): WorkloadSignature { /* ... */ }
  calculateHurstExponent(timeSeries: number[]): number { /* ... */ }
  classify(signature: WorkloadSignature): WorkloadClassification { /* ... */ }
}

// Business Health Analyzer
export class BusinessHealthAnalyzer {
  analyze(readings: PowerReading[], facilityId: string, knownCapacity?: number): BusinessHealthSignal { /* ... */ }
}

// Unified Engine
export class PatternInferenceEngine {
  private anomalyDetector: AnomalyDetector;
  private workloadClassifier: WorkloadClassifier;
  private healthAnalyzer: BusinessHealthAnalyzer;

  async initialize(historicalReadings: PowerReading[]): Promise<void> { /* ... */ }
  async analyzeAll(readings: PowerReading[], facilityId: string, knownCapacity?: number): Promise<PatternAnalysis> { /* ... */ }
}

export const patternEngine = new PatternInferenceEngine();
```

### src/services/bgpMonitoring.ts (BGP Monitoring)
```typescript
/**
 * BGP Monitoring Service
 * Real-time BGP monitoring via RIPE RIS Live WebSocket.
 */

import { db } from '../db/database';

const RIPE_WS_URL = 'wss://ris-live.ripe.net/v1/ws/';

export const WATCHED_ASNS: Record<string, string> = {
  '16509': 'Amazon (AWS)',
  '14618': 'Amazon (AWS GovCloud)',
  '8075': 'Microsoft',
  '15169': 'Google',
  '32934': 'Meta (Facebook)',
  '714': 'Apple',
  '13335': 'Cloudflare',
  '20940': 'Akamai',
  // ... more ASNs
};

export interface BGPAnomaly {
  id: string;
  timestamp: number;
  type: 'new_prefix' | 'route_leak' | 'unusual_path' | 'withdrawal' | 'origin_change';
  prefix: string;
  asn: string;
  provider: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  businessInference: string;
}

class BGPMonitoringService {
  private ws: WebSocket | null = null;
  private state: BGPMonitoringState;
  
  async connect(): Promise<void> { /* ... */ }
  disconnect(): void { /* ... */ }
  onAnomaly(handler: (anomaly: BGPAnomaly) => void): () => void { /* ... */ }
  getRecentAnomalies(limit: number): BGPAnomaly[] { /* ... */ }
}

export const bgpMonitor = new BGPMonitoringService();

// React Hook
export function useBGPMonitoring() {
  const [state, setState] = useState<BGPMonitoringState>(bgpMonitor.getState());
  const [recentAnomalies, setRecentAnomalies] = useState<BGPAnomaly[]>([]);
  // ... hook implementation
  return { ...state, recentAnomalies, connect, disconnect, watchASN, unwatchASN };
}
```

### src/services/ctMonitoring.ts (Certificate Transparency)
```typescript
/**
 * Certificate Transparency Monitoring Service
 * Monitors CT logs for new certificates indicating facility deployments.
 */

const CERTSTREAM_WS_URL = 'wss://certstream.calidog.io/';

export const WATCHED_DOMAINS: string[] = [
  'amazonaws.com', 'azure.com', 'google.com', 'meta.com', 'apple.com',
  'cloudflare.com', 'equinix.com', 'digitalrealty.com', 'akamai.com',
  // ... more domains
];

const FACILITY_PATTERNS: RegExp[] = [
  /^(us|eu|ap|sa|af|me)-(east|west|north|south|central)-\d+/i,
  /^(ash|iad|dfw|sjc|lax|fra|dub|sin|nrt|syd)\d*/i,
  /^(dc|colo|pop|edge|node|cluster|zone|region)\d*/i,
  // ... more patterns
];

export interface CTCertificate {
  sha256: string;
  commonName: string;
  domains: string[];
  issuer: string;
  alertType: 'facility_pattern' | 'new_subdomain' | 'wildcard' | 'renewal' | 'mass_issuance';
  provider?: string;
  geographicHint?: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  businessInference: string;
}

class CTMonitoringService {
  async connect(): Promise<void> { /* ... */ }
  disconnect(): void { /* ... */ }
  onAlert(handler: (cert: CTCertificate) => void): () => void { /* ... */ }
}

export const ctMonitor = new CTMonitoringService();
```

### src/services/correlationEngine.ts (Multi-Signal Correlation)
```typescript
/**
 * Multi-Signal Correlation Engine
 * Creates unified intelligence by correlating signals across data sources.
 */

export interface CorrelatedIntelligence {
  id: string;
  facilityId: string;
  provider?: string;
  timestamp: number;
  signals: {
    power: PowerSignal | null;
    bgp: BGPSignal | null;
    ct: CTSignal | null;
    sec: SECSignal | null;
    epa: EPASignal | null;
  };
  signalCount: number;
  combinedConfidence: number;
  hypothesis: string;
  pattern: 'expansion' | 'contraction' | 'stress' | 'stable' | 'unknown';
  businessInference: string;
  investigationPriority: 'critical' | 'high' | 'medium' | 'low';
  recommendedActions: string[];
}

const CORRELATION_RULES: CorrelationRule[] = [
  { id: 'expansion_confirmed', name: 'Confirmed Expansion', /* ... */ },
  { id: 'expansion_likely', name: 'Probable Expansion', /* ... */ },
  { id: 'business_stress', name: 'Business Stress Indicators', /* ... */ },
  { id: 'crypto_detection', name: 'Cryptocurrency Mining Detected', /* ... */ },
  { id: 'ai_training', name: 'AI Training Activity', /* ... */ },
  // ... more rules
];

export class CorrelationEngine {
  addSignal(facilityId: string, signal: Signal): void { /* ... */ }
  correlateSignals(facilityId: string, timeWindow?: { start: number; end: number }): CorrelatedIntelligence { /* ... */ }
  getHighPriorityCorrelations(): CorrelatedIntelligence[] { /* ... */ }
}

export const correlationEngine = new CorrelationEngine();
```

---

## 8. API Integrations

### src/integrations/index.ts
```typescript
/**
 * Real API Integrations Index
 * All integrations are REAL and connect to actual APIs.
 */

// Government APIs
export { secEdgarApi, BIG_TECH_CIKS } from './secEdgar';
export { epaEchoApi, DATA_CENTER_NAICS } from './epaEcho';
export { blsApi, BLS_SERIES, STATE_CODES } from './blsApi';
export { oshaApi } from './oshaApi';
export { censusApi, STATE_FIPS, DATA_CENTER_COUNTIES } from './censusApi';
export { usaSpendingApi, BIG_TECH_RECIPIENTS } from './usaSpending';

// Infrastructure APIs
export { peeringDbApi, BIG_TECH_ASNS } from './peeringDb';

// Corporate Intelligence
export { openCorporatesApi, BIG_TECH_SEARCHES } from './openCorporates';

// Decentralized Storage
export { ipfsStorage } from './ipfsStorage';
export { nostrRelay, DEFAULT_RELAYS } from './nostrRelay';
```

### src/integrations/secEdgar.ts (SEC EDGAR)
```typescript
/**
 * SEC EDGAR API Integration
 * Real integration with SEC's EDGAR database.
 */

const SEC_BASE_URL = 'https://data.sec.gov';

export const BIG_TECH_CIKS: Record<string, string> = {
  'Apple': '0000320193',
  'Microsoft': '0000789019',
  'Amazon': '0001018724',
  'Google/Alphabet': '0001652044',
  'Meta': '0001326801',
  // ... more companies
};

export interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  form: string;
  company: string;
  cik: string;
}

export async function fetchCompanyFilings(cik: string, formTypes: string[]): Promise<SECFiling[]> {
  const response = await fetch(`${SEC_BASE_URL}/submissions/CIK${cik}.json`, {
    headers: { 'User-Agent': 'DCIM-Compliance-App contact@dcim-compliance.org' }
  });
  // ... implementation
}

export const secEdgarApi = {
  fetchCompanyFilings: circuitBreaker(fetchCompanyFilings, { failureThreshold: 3, resetTimeout: 60000 }),
  searchSubsidyDisclosures: circuitBreaker(searchSubsidyDisclosures, { failureThreshold: 3, resetTimeout: 60000 }),
};
```

### src/integrations/epaEcho.ts (EPA ECHO)
```typescript
/**
 * EPA ECHO API Integration
 * Environmental compliance data for data center facilities.
 */

const EPA_ECHO_BASE = 'https://echodata.epa.gov/echo';

export const DATA_CENTER_NAICS = ['518210', '517110', '517312', '541512'];

export interface EchoFacility {
  registryId: string;
  facilityName: string;
  city: string;
  state: string;
  caaStatus: string;
  cwaStatus: string;
  rcraStatus: string;
  totalViolations: number;
  totalPenalties: number;
}

export async function searchDataCenterFacilities(state?: string, onlyViolations?: boolean): Promise<EchoFacility[]> {
  // Try real API, fall back to sample data when CORS blocks
}

export const epaEchoApi = {
  searchFacilities: circuitBreaker(searchFacilities, { failureThreshold: 3, resetTimeout: 60000 }),
  searchDataCenterFacilities: circuitBreaker(searchDataCenterFacilities, { failureThreshold: 3, resetTimeout: 60000 }),
};
```

### src/integrations/usaSpending.ts (USASpending)
```typescript
/**
 * USASpending.gov API Integration
 * Federal contracts, grants, and spending data for Big Tech.
 */

const USA_SPENDING_BASE = 'https://api.usaspending.gov/api/v2';

export const BIG_TECH_RECIPIENTS = [
  'AMAZON WEB SERVICES', 'MICROSOFT', 'GOOGLE', 'ORACLE', 'IBM', 'SALESFORCE'
];

export interface FederalContract {
  contractId: string;
  recipientName: string;
  awardAmount: number;
  awardDate: string;
  description: string;
  awardingAgency: string;
  placeOfPerformance: { city: string; state: string; country: string };
}

export async function searchAwards(params: SpendingSearchParams): Promise<FederalContract[]> {
  const response = await fetch(`${USA_SPENDING_BASE}/search/spending_by_award/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, fields, page: 1, limit: 100 })
  });
  // ... implementation
}

export const usaSpendingApi = {
  searchAwards: circuitBreaker(searchAwards, { failureThreshold: 3, resetTimeout: 60000 }),
  getBigTechContracts: circuitBreaker(getBigTechContracts, { failureThreshold: 3, resetTimeout: 60000 }),
};
```

---

## 9. Core Utilities

### src/utils/circuitBreaker.ts
```typescript
/**
 * Circuit Breaker Pattern for Resilient Error Handling
 */

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxAttempts?: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime = 0;

  async execute<T>(fn: () => Promise<T> | T, fallback?: () => T): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = 'half-open';
      } else if (fallback) {
        return fallback();
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }
}

// Global circuit breakers
export const circuitBreakers = {
  nlpSearch: new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 }),
  claudeAPI: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 60000 }),
  epaAPI: new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 }),
  secAPI: new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 }),
};

// Higher-order function wrapper
export function circuitBreaker<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: CircuitBreakerOptions
): (...args: T) => Promise<R> {
  const breaker = new CircuitBreaker(options);
  return async (...args: T): Promise<R> => breaker.execute(() => fn(...args));
}
```

### src/utils/dbOperations.ts
```typescript
/**
 * Safe Database Operations with retry logic and error handling
 */

import { db } from '../db/database';
import { retry, isRetryableError } from './retry';
import { resourceLimiters } from './resourceLimits';

export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback?: () => T,
  options: { maxRetries?: number; useResourceLimiter?: boolean } = {}
): Promise<T> {
  const { maxRetries = 3, useResourceLimiter = true } = options;

  try {
    let release: (() => void) | undefined;
    if (useResourceLimiter) {
      release = await resourceLimiters.database.acquire();
    }

    try {
      return await retry(operation, {
        maxRetries,
        retryable: isRetryableError,
        initialDelay: 100,
        backoffMultiplier: 2,
        maxDelay: 5000
      });
    } finally {
      if (release) release();
    }
  } catch (error) {
    console.error('[SafeDB] Operation failed after retries:', error);
    if (fallback) return fallback();
    throw error;
  }
}
```

### src/utils/errorTracking.ts
```typescript
/**
 * Error Tracking Utility - Centralized error logging
 */

export function trackError(error: Error | string, context: Record<string, any> = {}) {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  const errorInfo = {
    message: errorObj.message,
    stack: errorObj.stack,
    name: errorObj.name,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  console.error('[ErrorTracking]', errorInfo);

  // Store in localStorage for debugging
  try {
    const errors = JSON.parse(localStorage.getItem('__error_log__') || '[]');
    errors.push(errorInfo);
    if (errors.length > 100) errors.shift();
    localStorage.setItem('__error_log__', JSON.stringify(errors));
  } catch (e) {
    console.warn('Failed to store error log:', e);
  }
}

export function getRecentErrors(limit: number = 10): any[] {
  try {
    return JSON.parse(localStorage.getItem('__error_log__') || '[]').slice(-limit);
  } catch {
    return [];
  }
}
```

---

## 10. Main Components

### src/components/DCIMCommandCenter.tsx (Main Dashboard)

The main dashboard component is 1870 lines. Key sections:

```typescript
/**
 * DCIM Command Center - Main Component
 * Enhanced version with Mission Control layout for maximum data density
 */

export type CommandCenterTab = 
  | 'Guides' | 'Overview' | 'Geography' | 'Problems' | 'Early Warning'
  | 'Geographic Intel' | 'Subsidy Tracking' | 'Worker Safety' | 'Facilities'
  | 'OSINT Tools' | 'Pattern Intelligence' | 'Deep Intelligence' 
  | 'Predictive Intel' | 'Predictive Subsidy' | 'Regulatory Toolkit'
  | 'Infrastructure' | 'Network Security' | 'Reports' | 'Explorer'
  | 'Compare' | 'Connectography' | 'Intelligence' | 'Compliance Flow'
  | 'Assurance Monitor';

export default function DCIMCommandCenter({ onActionRequested, onOpenChat }: Props) {
  // Core State
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CommandCenterTab>('Overview');
  const [useMissionControl, setUseMissionControl] = useState(false);
  
  // State for smart search, filters, modals, etc.
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const [filters, setFilters] = useState({ state: '', operator: '', complianceStatus: '', minGap: 0 });
  
  // Initialize data with error handling
  useEffect(() => {
    async function init() {
      await seedDatabase();
      const allFacilities = await safeDbOperation(() => db.facilities.toArray(), () => []);
      setFacilities(allFacilities);
      setFilteredFacilities(allFacilities);
      setStats(calculateStats(allFacilities));
      indexFacilities(allFacilities); // FlexSearch
      setLoading(false);
    }
    init();
  }, []);
  
  // Tab navigation, keyboard shortcuts, etc.
  useKeyboardShortcuts([
    { key: 'k', ctrl: true, action: () => setShowSmartSearch(true) },
    { key: 'Escape', action: () => setShowSmartSearch(false) },
  ]);
  
  if (loading) return <LoadingScreen />;
  
  return (
    <NavProvider tabs={NAV_TABS} activeTab={activeTab} onTabChange={handleTabChange}>
      <div className="h-screen bg-gray-950 text-white flex">
        <SmartSearchNav isOpen={showSmartSearch} onClose={() => setShowSmartSearch(false)} />
        <NavigationSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        
        <main className="flex-1 flex flex-col">
          <header>{/* Top bar with metrics, search, controls */}</header>
          <nav>{/* Tab navigation */}</nav>
          
          <div className="flex-1 flex">
            <aside>{/* Sidebar with filters and stats */}</aside>
            <section>{/* Tab content with ErrorBoundary wrappers */}</section>
          </div>
        </main>
        
        <QuickAccessNav />
      </div>
    </NavProvider>
  );
}
```

---

## Key Architecture Patterns

### 1. Antifragility Layers (7 Layers)
1. **Error Boundaries** - Component crash isolation
2. **Circuit Breakers** - API failure protection
3. **Database Resilience** - Auto-retry with fallbacks
4. **Rate Limiting** - API abuse prevention
5. **Input Sanitization** - Malicious input blocking
6. **Global Error Handler** - Unhandled error catching
7. **Error Tracking** - Full debugging capability

### 2. Navigation System
- Smart Search (⌘K) with fuzzy matching
- Tab Groups by category
- Quick Access Bar for favorites
- Keyboard shortcuts throughout

### 3. Real-Time Monitoring
- BGP anomaly detection via RIPE RIS Live
- Certificate Transparency via CertStream
- Multi-signal correlation engine

### 4. API Integration Pattern
```typescript
// All APIs wrapped with circuit breakers
export const apiName = {
  method: circuitBreaker(methodImplementation, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
};
```

---

## Development Commands

```bash
npm run dev      # Start development server on port 5173
npm run build    # Production build to dist/
npm run test     # Run tests with Vitest
npm run preview  # Preview production build
```

---

## File Count Summary

| Directory | Files | Lines (est.) |
|-----------|-------|--------------|
| src/components/ | 50+ | ~15,000 |
| src/services/ | 8 | ~3,000 |
| src/integrations/ | 10 | ~3,000 |
| src/utils/ | 40+ | ~3,000 |
| src/hooks/ | 10 | ~1,000 |
| Config files | 5 | ~500 |
| **Total** | **~125** | **~25,500** |

---

**End of Codebase Export**
