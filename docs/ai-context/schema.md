# Data Schema & File Relationships

**Purpose**: Document all data structures, database schemas, and file relationships for quick AI reference.

---

## 🗄️ IndexedDB Schema

### Database: `dcim-compliance`

#### Table: `facilities`
```typescript
interface Facility {
  id?: number;                    // Auto-increment primary key
  name: string;                   // Facility name
  operator: string;               // Company operating the facility
  state: string;                  // US state code (e.g., "TX", "CA")
  city: string;                   // City name
  address?: string;               // Street address
  jobsPromised: number;           // Jobs promised in subsidy agreement
  jobsActual: number;             // Actual jobs created
  subsidyAmount: number;          // Subsidy received (in dollars)
  complianceStatus: 'compliant' | 'non-compliant' | 'unknown';
  subsidyYear?: number;           // Year subsidy was granted
  notes?: string;                 // Additional notes
  lastUpdated: Date;              // Last data update
}
```

**Indexes**:
- Primary: `id` (auto-increment)
- Index: `state` (for geographic queries)
- Index: `operator` (for company-specific queries)
- Index: `complianceStatus` (for compliance filtering)

**Queries**:
```typescript
// Get all facilities
await db.facilities.toArray();

// Filter by state
await db.facilities.where('state').equals('TX').toArray();

// Filter by compliance status
await db.facilities.where('complianceStatus').equals('non-compliant').toArray();

// Search by operator (case-insensitive)
await db.facilities.where('operator').startsWithIgnoreCase('Amazon').toArray();
```

---

#### Table: `complianceReports`
```typescript
interface ComplianceReport {
  id?: number;                    // Auto-increment primary key
  facilityId: number;             // Foreign key to facilities
  reportDate: Date;               // When report was generated
  complianceScore: number;        // 0-100 score
  violations: string[];           // Array of violation descriptions
  recommendations: string[];       // Suggested actions
  generatedBy: string;            // "user" | "ai" | "system"
  metadata?: Record<string, any>; // Additional report data
}
```

**Relationships**:
- `complianceReports.facilityId` → `facilities.id` (many-to-one)

---

## 📁 File Structure

### Source Code Structure
```
src/
├── main.tsx                 # App entry point, React render
├── App.tsx                  # Root component, routing, error boundaries
├── db.ts                    # Dexie database schema definition
│
├── components/
│   ├── DCIMCommandCenter.tsx      # Main dashboard orchestrator
│   ├── ChatInterface.tsx          # AI-powered natural language search
│   ├── HelpModal.tsx              # Interactive help system
│   ├── ReportModal.tsx            # Compliance report generator
│   ├── NetworkTraceModal.tsx      # Network diagnostics
│   ├── SourceManager.tsx          # Data source management
│   │
│   └── tabs/
│       ├── OverviewTab.tsx        # Statistics overview
│       ├── GeographyTab.tsx       # Geographic breakdown
│       ├── ProblemsTab.tsx        # Compliance violations
│       ├── TimelineTab.tsx        # Temporal analysis
│       └── NetworkTab.tsx         # Network visualization
│
└── utils/
    ├── circuitBreaker.ts          # Circuit breaker pattern
    ├── dbOperations.ts            # Safe database wrappers
    ├── errorTracking.ts           # Error logging system
    ├── globalErrorHandler.ts      # Global error catch
    ├── rateLimiter.ts             # API rate limiting
    ├── resourceLimits.ts          # Memory protection
    ├── sanitization.ts            # Input cleaning
    └── timeout.ts                 # Timeout wrappers
```

### Component Relationships

```
App.tsx
  └─ ErrorBoundary
      └─ DCIMCommandCenter.tsx (main container)
          ├─ Header (navigation buttons)
          ├─ Timeline Component
          ├─ Live Alerts Panel
          └─ Tab Content (conditional render)
              ├─ OverviewTab
              ├─ GeographyTab
              ├─ ProblemsTab
              ├─ TimelineTab
              └─ NetworkTab
          
          └─ Modals (conditional)
              ├─ ChatInterface (AI search)
              ├─ HelpModal (help center)
              ├─ ReportModal (report generator)
              ├─ NetworkTraceModal (diagnostics)
              └─ SourceManager (data management)
```

### Data Flow

```
User Input
    ↓
Component Event Handler
    ↓
Sanitization (utils/sanitization.ts)
    ↓
[If API Call]
    → Rate Limiter (utils/rateLimiter.ts)
    → Circuit Breaker (utils/circuitBreaker.ts)
    → Timeout Wrapper (utils/timeout.ts)
    → External API
    ← Response / Error
    ↓
[If Database Operation]
    → Safe DB Operation (utils/dbOperations.ts)
    → Dexie (db.ts)
    → IndexedDB
    ← Query Results
    ↓
Component State Update
    ↓
React Re-render
    ↓
UI Update
```

---

## 🔧 Configuration File Relationships

### Build Pipeline
```
package.json (dependencies, scripts)
    ↓
tsconfig.json (TypeScript compiler)
    ↓
vite.config.ts (Vite bundler)
    ↓
tailwind.config.js (Tailwind CSS)
    ↓
postcss.config.js (CSS processing)
    ↓
dist/ (build output)
```

### VS Code Configuration
```
.vscode/
├── settings.json
│   - files.autoSave: "afterDelay" (1000ms)
│   - task.autoDetect: "on"
│
└── tasks.json
    - "Start Dev Server" task
    - runOn: "folderOpen" (auto-start)
```

### Git Hooks
```
.git/hooks/pre-commit → pre-commit-hook.sh
    ├── Check dynamic Tailwind classes
    ├── Check for large files
    ├── Check for console.log
    ├── Check for TODO/FIXME/HACK
    └── Check useEffect cleanup
```

---

## 🎨 Component Props Interfaces

### DCIMCommandCenter
```typescript
interface DCIMCommandCenterProps {
  // No props - top-level component
}

interface DCIMCommandCenterState {
  facilities: Facility[];
  activeTab: string;
  modalsOpen: {
    chat: boolean;
    help: boolean;
    report: boolean;
    networkTrace: boolean;
    sourceManager: boolean;
  };
}
```

### ChatInterface
```typescript
interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];  // For search context
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
```

### HelpModal
```typescript
interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}
```

---

## 🔌 External API Schemas

### OpenAI Chat Completion
```typescript
interface OpenAIRequest {
  model: string;            // "gpt-4" | "gpt-3.5-turbo"
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;     // 0-2, default 1
  max_tokens?: number;      // Max response length
}

interface OpenAIResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

---

## 📊 Statistics Calculations

### Calculated Fields
```typescript
interface CalculatedStats {
  totalFacilities: number;              // facilities.length
  compliantCount: number;               // where complianceStatus === 'compliant'
  nonCompliantCount: number;            // where complianceStatus === 'non-compliant'
  totalSubsidies: number;               // sum(subsidyAmount)
  totalJobsPromised: number;            // sum(jobsPromised)
  totalJobsActual: number;              // sum(jobsActual)
  subsidyGap: number;                   // totalSubsidies - (recoverable portion)
  complianceRate: number;               // (compliantCount / totalFacilities) * 100
  jobFulfillmentRate: number;           // (totalJobsActual / totalJobsPromised) * 100
}
```

### Formulas
- **Compliance Rate**: `(compliant / total) × 100`
- **Subsidy Gap**: `totalSubsidies × (1 - jobFulfillmentRate)`
- **Jobs Shortfall**: `totalJobsPromised - totalJobsActual`

---

## 🔗 State Management Flow

### Component State (useState)
```typescript
// Local component state
const [data, setData] = useState<Type>(initialValue);

// Derived state (useMemo)
const calculatedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

// Event handlers (useCallback)
const handleEvent = useCallback(() => {
  setData(newValue);
}, [dependencies]);
```

### Global State (via Context - if needed)
```typescript
// Not currently implemented
// Future: Could use React Context for cross-component state
```

---

## 🗂️ File Type Conventions

### TypeScript Files
- `.tsx` - React components (JSX)
- `.ts` - Utilities, types, non-React code

### Configuration Files
- `.json` - JSON config (package.json, tsconfig.json)
- `.js` - JavaScript config (tailwind.config.js, postcss.config.js)
- `.md` - Markdown documentation

### Naming Conventions
- **Components**: PascalCase (`ChatInterface.tsx`)
- **Utilities**: camelCase (`dbOperations.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_TIMEOUT`)
- **Interfaces**: PascalCase with `Interface` or `Props` suffix

---

## 🔍 Key Type Definitions

### Utility Types
```typescript
// Safe database operation result
type DbOperationResult<T> = {
  success: boolean;
  data?: T;
  error?: Error;
};

// Circuit breaker states
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// Rate limiter queue item
type QueuedRequest<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};
```

---

**Quick Reference Note**: This schema file serves as the single source of truth for data structures. Update this file whenever adding new database tables, components, or changing interfaces.

