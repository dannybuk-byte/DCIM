/**
 * AI Agent Services Index
 * 
 * Central export point for all TWIML-inspired AI agent capabilities:
 * 
 * 1. FRE 902(14) Legal Evidence Chain
 *    - SHA-256 hashing via SubtleCrypto
 *    - Chain of custody tracking
 *    - Court-ready evidence export
 * 
 * 2. Knowledge Graph (Triple Store)
 *    - Corporate ownership mapping
 *    - Shell company detection
 *    - Graph-based anomaly patterns
 * 
 * 3. Multi-Agent Orchestrator
 *    - BroadcastChannel coordination
 *    - Specialized agents (anomaly, compliance, subsidy, network, ownership)
 *    - Human-in-the-loop approval workflow
 * 
 * 4. Evidence Triangulation
 *    - Cross-source verification (SEC, EPA, BGP, CT)
 *    - Weighted confidence scoring
 *    - Conflict detection
 * 
 * Based on TWIML AI Podcast episodes:
 * - #746: PlayerZero semantic graphs
 * - #756: Yutori Scouts multi-agent
 * - #718: AutoGen actor patterns
 * - #740: Networks of Networks
 * - #593: PayPal graph ML
 * - #739: A2A/MCP protocols
 * 
 * @module aiAgentServices
 */

// ============================================================================
// LEGAL EVIDENCE CHAIN (FRE 902(14))
// ============================================================================

export {
  legalEvidenceManager,
  useLegalEvidence,
  type EvidenceRecord,
  type CustodyEntry,
  type VerificationReport,
  type EvidenceExport,
} from './legalEvidenceChain';

// ============================================================================
// KNOWLEDGE GRAPH (TRIPLE STORE)
// ============================================================================

export {
  knowledgeGraph,
  useKnowledgeGraph,
  type Triple,
  type Entity,
  type EntityType,
  type GraphQueryResult,
  type OwnershipChain,
  type AnomalyPattern,
} from './knowledgeGraph';

// ============================================================================
// MULTI-AGENT ORCHESTRATOR
// ============================================================================

export {
  agentOrchestrator,
  useAgentOrchestrator,
  APPROVAL_THRESHOLDS,
  type AgentType,
  type AgentStatus,
  type AgentConfig,
  type AgentMessage,
  type AgentTask,
  type AgentState,
  type ApprovalRequest,
} from './multiAgentOrchestrator';

// ============================================================================
// EVIDENCE TRIANGULATION
// ============================================================================

export {
  evidenceTriangulation,
  useEvidenceTriangulation,
  SOURCE_WEIGHTS,
  type SourceType,
  type SourceResult,
  type TriangulationResult,
  type Claim,
  type Conflict,
} from './evidenceTriangulation';

// ============================================================================
// TWIML EPISODE #718, #756: WEB WORKER MANAGEMENT
// ============================================================================

export {
  agentWorkerManager,
  useAgentWorkers,
  type AgentWorkerType,
  type WorkerState,
  type WorkerMessage,
  type WorkerTask,
} from './agentWorkerManager';

// ============================================================================
// TWIML EPISODE #756: AGENT MEMORY SYSTEM
// ============================================================================

export {
  agentMemory,
  useAgentMemory,
  type AgentMemoryEntry,
  type MemoryType,
  type MemoryContent,
  type TaskOutcomeMemory,
  type FeedbackMemory,
  type PatternMemory,
  type LearnedDecision,
} from './agentMemory';

// ============================================================================
// TWIML EPISODE #740: MULTI-SIGNAL CORRELATION
// ============================================================================

export {
  signalCorrelation,
  useSignalCorrelation,
  STANDARD_PATTERNS,
  type Signal,
  type SignalSource,
  type SignalType,
  type SignalPattern,
  type Correlation,
  type CorrelationResult,
} from './signalCorrelation';

// ============================================================================
// TWIML EPISODE #739: MCP TOOL REGISTRY
// ============================================================================

export {
  mcpToolRegistry,
  useMCPTools,
  type MCPTool,
  type ToolCategory,
  type ToolPermission,
  type JSONSchema,
  type ToolHandler,
  type ToolResult,
  type ToolInvocation,
  type ToolQuery,
} from './mcpToolRegistry';

// ============================================================================
// TWIML EPISODE #746: AI IMMUNE SYSTEM
// ============================================================================

export {
  aiImmuneSystem,
  useAIImmuneSystem,
  type ComponentHealth,
  type ComponentType,
  type HealthStatus,
  type HealthEvent,
  type HealingAction,
  type HealingActionType,
  type ImmuneConfig,
} from './aiImmuneSystem';

// ============================================================================
// TWIML EPISODE #756: COST TRACKING
// ============================================================================

export {
  costTracking,
  useCostTracking,
  type CostEntry,
  type CostCategory,
  type ModelPricing,
  type Budget,
  type CostSummary,
  type CostOptimization,
  type OptimizationType,
} from './costTracking';

// ============================================================================
// QUICK START EXAMPLES
// ============================================================================

/**
 * Example: Capture legal evidence for a subsidy claim
 * 
 * ```typescript
 * import { legalEvidenceManager } from './services/aiAgentServices';
 * 
 * const record = await legalEvidenceManager.captureEvidence(
 *   subsidyDocument,
 *   'State Records',
 *   'investigator@coalition.org',
 *   { 
 *     facilityId: 1234,
 *     method: 'manual',
 *     jurisdiction: 'Texas',
 *     caseReference: 'TX-2026-001'
 *   }
 * );
 * 
 * // Later: export for court
 * const courtPackage = await legalEvidenceManager.exportForCourt(
 *   [record.id],
 *   'Legal Team',
 *   'TX-2026-001'
 * );
 * ```
 */

/**
 * Example: Query corporate ownership chain
 * 
 * ```typescript
 * import { knowledgeGraph } from './services/aiAgentServices';
 * 
 * // Add ownership relationship
 * await knowledgeGraph.addTriple(
 *   'company:amazon-inc',
 *   'owns',
 *   'subsidiary:aws-datacenters-llc',
 *   { confidence: 0.95, sources: ['SEC 10-K'] }
 * );
 * 
 * // Find all facilities owned by Amazon (through subsidiaries)
 * const facilities = await knowledgeGraph.findOwnedFacilities('company:amazon-inc');
 * 
 * // Detect shell company patterns
 * const anomalies = await knowledgeGraph.detectAllAnomalies();
 * ```
 */

/**
 * Example: Triangulate a subsidy claim
 * 
 * ```typescript
 * import { evidenceTriangulation } from './services/aiAgentServices';
 * 
 * const result = await evidenceTriangulation.triangulateSubsidyClaim(
 *   facilityId: 1234,
 *   subsidyAmount: 50_000_000,
 *   jobsPromised: 500,
 *   company: 'MegaCorp Inc'
 * );
 * 
 * if (result.verified) {
 *   console.log(`Claim verified with ${result.overallConfidence * 100}% confidence`);
 * } else {
 *   console.log('Conflicts found:', result.conflicts);
 * }
 * ```
 */

/**
 * Example: Submit task to multi-agent system
 * 
 * ```typescript
 * import { agentOrchestrator } from './services/aiAgentServices';
 * 
 * // Initialize orchestrator
 * agentOrchestrator.initialize();
 * 
 * // Submit analysis task
 * const taskId = await agentOrchestrator.submitTask({
 *   type: 'detect_anomaly',
 *   priority: 'high',
 *   payload: { facilityId: 1234, dataSource: 'power_consumption' }
 * });
 * 
 * // Subscribe to events
 * agentOrchestrator.subscribe((event) => {
 *   if (event.type === 'approval_requested') {
 *     console.log('Human review needed:', event.request);
 *   }
 * });
 * ```
 */
