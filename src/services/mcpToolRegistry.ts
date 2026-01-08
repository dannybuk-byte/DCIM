/**
 * MCP Tool Registry
 * 
 * Implements Model Context Protocol (MCP) tool discovery and registration
 * based on TWIML Episode #739 (A2A & MCP):
 * - Dynamic tool registration and discovery
 * - Tool versioning and capability matching
 * - Agent-to-Agent (A2A) protocol support
 * - Tool invocation with schema validation
 * 
 * Key MCP concepts:
 * - Tools are capabilities that agents can invoke
 * - Each tool has a schema describing inputs/outputs
 * - Agents discover tools through the registry
 * - Tools can be versioned and deprecated
 * 
 * @module mcpToolRegistry
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  version: string;
  provider: string;
  category: ToolCategory;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  permissions: ToolPermission[];
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };
  costPerCall?: number;
  status: 'active' | 'deprecated' | 'disabled';
  registeredAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  avgLatencyMs: number;
  handler?: ToolHandler;
}

export type ToolCategory =
  | 'data_retrieval'    // Fetch data from sources
  | 'analysis'          // Analyze data
  | 'evidence'          // Evidence capture/verification
  | 'notification'      // Send alerts/notifications
  | 'integration'       // External service integration
  | 'transformation'    // Data transformation
  | 'validation'        // Data validation
  | 'storage'           // Data persistence
  | 'monitoring'        // System monitoring
  | 'compliance';       // Compliance checking

export type ToolPermission =
  | 'read_facilities'
  | 'write_facilities'
  | 'read_subsidies'
  | 'write_subsidies'
  | 'read_evidence'
  | 'write_evidence'
  | 'send_notifications'
  | 'external_api'
  | 'file_access'
  | 'network_access';

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, {
    type: string;
    description?: string;
    required?: boolean;
    enum?: string[];
    default?: unknown;
  }>;
  required?: string[];
  description?: string;
}

export type ToolHandler = (input: unknown) => Promise<ToolResult>;

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  latencyMs: number;
  cost?: number;
}

export interface ToolInvocation {
  id: string;
  toolId: string;
  agentId: string;
  input: unknown;
  result?: ToolResult;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}

export interface ToolQuery {
  category?: ToolCategory;
  permission?: ToolPermission;
  namePattern?: string;
  provider?: string;
  minVersion?: string;
  maxCostPerCall?: number;
}

// ============================================================================
// BUILT-IN TOOLS
// ============================================================================

const BUILTIN_TOOLS: Omit<MCPTool, 'registeredAt' | 'lastUsedAt' | 'usageCount' | 'avgLatencyMs'>[] = [
  // Data Retrieval Tools
  {
    id: 'tool_get_facility',
    name: 'get_facility',
    description: 'Retrieve detailed information about a specific data center facility',
    version: '1.0.0',
    provider: 'dcim-core',
    category: 'data_retrieval',
    inputSchema: {
      type: 'object',
      properties: {
        facilityId: { type: 'number', description: 'The facility ID to retrieve', required: true },
        includeSubsidies: { type: 'boolean', description: 'Include subsidy information', default: true },
        includeCompliance: { type: 'boolean', description: 'Include compliance status', default: true },
      },
      required: ['facilityId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        facility: { type: 'object', description: 'Facility details' },
        subsidies: { type: 'array', description: 'Related subsidies' },
        compliance: { type: 'object', description: 'Compliance status' },
      },
    },
    permissions: ['read_facilities', 'read_subsidies'],
    status: 'active',
  },
  {
    id: 'tool_search_facilities',
    name: 'search_facilities',
    description: 'Search for facilities by various criteria',
    version: '1.0.0',
    provider: 'dcim-core',
    category: 'data_retrieval',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: 'Filter by US state code' },
        operator: { type: 'string', description: 'Filter by operator name' },
        complianceStatus: { type: 'string', enum: ['compliant', 'non-compliant', 'at-risk', 'unknown'] },
        minSubsidyGap: { type: 'number', description: 'Minimum subsidy gap in dollars' },
        limit: { type: 'number', description: 'Maximum results', default: 50 },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        facilities: { type: 'array', description: 'Matching facilities' },
        totalCount: { type: 'number', description: 'Total matching count' },
      },
    },
    permissions: ['read_facilities'],
    status: 'active',
  },
  // Analysis Tools
  {
    id: 'tool_calculate_clawback',
    name: 'calculate_clawback',
    description: 'Calculate potential clawback amount for a facility based on subsidy agreements',
    version: '1.0.0',
    provider: 'dcim-compliance',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        facilityId: { type: 'number', description: 'Facility to analyze', required: true },
        subsidyAgreementId: { type: 'string', description: 'Specific agreement ID (optional)' },
      },
      required: ['facilityId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        clawbackAmount: { type: 'number', description: 'Calculated clawback in dollars' },
        triggers: { type: 'array', description: 'Triggered clawback conditions' },
        confidence: { type: 'number', description: 'Calculation confidence 0-1' },
      },
    },
    permissions: ['read_facilities', 'read_subsidies'],
    costPerCall: 0.01,
    status: 'active',
  },
  {
    id: 'tool_detect_anomalies',
    name: 'detect_anomalies',
    description: 'Run anomaly detection on facility data',
    version: '1.0.0',
    provider: 'dcim-analytics',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        facilityIds: { type: 'array', description: 'Facilities to analyze' },
        anomalyTypes: { type: 'array', description: 'Types: power, workforce, bgp, ct' },
        sensitivity: { type: 'number', description: 'Detection sensitivity 0-1', default: 0.7 },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        anomalies: { type: 'array', description: 'Detected anomalies' },
        summary: { type: 'string', description: 'Summary of findings' },
      },
    },
    permissions: ['read_facilities'],
    costPerCall: 0.05,
    status: 'active',
  },
  // Evidence Tools
  {
    id: 'tool_capture_evidence',
    name: 'capture_evidence',
    description: 'Capture FRE 902(14) compliant legal evidence',
    version: '1.0.0',
    provider: 'dcim-legal',
    category: 'evidence',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Evidence content or URL', required: true },
        sourceType: { type: 'string', enum: ['document', 'screenshot', 'api_response', 'database_query'] },
        facilityId: { type: 'number', description: 'Related facility' },
        collector: { type: 'string', description: 'Evidence collector identifier', required: true },
      },
      required: ['content', 'collector'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        evidenceId: { type: 'string', description: 'Evidence record ID' },
        hash: { type: 'string', description: 'SHA-256 hash' },
        chainOfCustody: { type: 'array', description: 'Custody chain entries' },
      },
    },
    permissions: ['write_evidence', 'file_access'],
    status: 'active',
  },
  {
    id: 'tool_verify_evidence',
    name: 'verify_evidence',
    description: 'Verify integrity of captured evidence',
    version: '1.0.0',
    provider: 'dcim-legal',
    category: 'evidence',
    inputSchema: {
      type: 'object',
      properties: {
        evidenceId: { type: 'string', description: 'Evidence to verify', required: true },
      },
      required: ['evidenceId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', description: 'Whether evidence is valid' },
        hashMatch: { type: 'boolean', description: 'Hash verification result' },
        chainIntact: { type: 'boolean', description: 'Custody chain intact' },
        issues: { type: 'array', description: 'Any integrity issues found' },
      },
    },
    permissions: ['read_evidence'],
    status: 'active',
  },
  // Notification Tools
  {
    id: 'tool_send_coalition_alert',
    name: 'send_coalition_alert',
    description: 'Send alert to coalition partners',
    version: '1.0.0',
    provider: 'dcim-notifications',
    category: 'notification',
    inputSchema: {
      type: 'object',
      properties: {
        alertType: { type: 'string', enum: ['compliance_violation', 'workforce_change', 'ownership_change', 'security_incident'] },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], required: true },
        facilityId: { type: 'number', description: 'Related facility' },
        message: { type: 'string', description: 'Alert message', required: true },
        recipients: { type: 'array', description: 'Recipient organizations' },
      },
      required: ['priority', 'message'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        alertId: { type: 'string', description: 'Created alert ID' },
        delivered: { type: 'boolean', description: 'Delivery status' },
        recipientCount: { type: 'number', description: 'Number of recipients notified' },
      },
    },
    permissions: ['send_notifications'],
    rateLimit: { maxCalls: 10, windowMs: 60000 },
    status: 'active',
  },
  // Compliance Tools
  {
    id: 'tool_check_compliance',
    name: 'check_compliance',
    description: 'Check facility compliance with subsidy agreements',
    version: '1.0.0',
    provider: 'dcim-compliance',
    category: 'compliance',
    inputSchema: {
      type: 'object',
      properties: {
        facilityId: { type: 'number', description: 'Facility to check', required: true },
        checkTypes: { type: 'array', description: 'Check types: job_creation, environmental, tax, cba' },
      },
      required: ['facilityId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        compliant: { type: 'boolean', description: 'Overall compliance status' },
        checks: { type: 'array', description: 'Individual check results' },
        recommendations: { type: 'array', description: 'Recommended actions' },
      },
    },
    permissions: ['read_facilities', 'read_subsidies'],
    costPerCall: 0.02,
    status: 'active',
  },
  // Integration Tools
  {
    id: 'tool_query_knowledge_graph',
    name: 'query_knowledge_graph',
    description: 'Query the corporate ownership knowledge graph',
    version: '1.0.0',
    provider: 'dcim-knowledge',
    category: 'integration',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'Entity URI or name', required: true },
        relationship: { type: 'string', description: 'Relationship type to traverse' },
        depth: { type: 'number', description: 'Max traversal depth', default: 3 },
      },
      required: ['entity'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        entities: { type: 'array', description: 'Related entities' },
        relationships: { type: 'array', description: 'Discovered relationships' },
        anomalies: { type: 'array', description: 'Detected ownership anomalies' },
      },
    },
    permissions: ['read_facilities'],
    status: 'active',
  },
  // Monitoring Tools
  {
    id: 'tool_get_bgp_status',
    name: 'get_bgp_status',
    description: 'Get current BGP routing status for an ASN',
    version: '1.0.0',
    provider: 'dcim-network',
    category: 'monitoring',
    inputSchema: {
      type: 'object',
      properties: {
        asn: { type: 'string', description: 'Autonomous System Number', required: true },
        includePeers: { type: 'boolean', description: 'Include peer information', default: false },
      },
      required: ['asn'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Current status' },
        prefixes: { type: 'number', description: 'Announced prefix count' },
        peers: { type: 'array', description: 'Peer ASNs' },
        recentAnomalies: { type: 'array', description: 'Recent anomalies' },
      },
    },
    permissions: ['network_access'],
    status: 'active',
  },
];

// ============================================================================
// MCP TOOL REGISTRY
// ============================================================================

class MCPToolRegistryService {
  private tools = new Map<string, MCPTool>();
  private handlers = new Map<string, ToolHandler>();
  private invocations = new Map<string, ToolInvocation>();
  private rateLimitCounters = new Map<string, { count: number; resetAt: number }>();
  private listeners = new Set<(event: RegistryEvent) => void>();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    // Load persisted tools
    await this.loadPersistedTools();

    // Register built-in tools
    for (const tool of BUILTIN_TOOLS) {
      await this.registerTool(tool);
    }

    console.log(`🔧 MCP Tool Registry initialized with ${this.tools.size} tools`);
    this.emit({ type: 'registry_initialized', toolCount: this.tools.size });
  }

  private async loadPersistedTools(): Promise<void> {
    try {
      const stored = await db.table('mcpTools').toArray();
      for (const tool of stored) {
        this.tools.set(tool.id, {
          ...tool,
          status: tool.status || 'active',
          registeredAt: new Date(tool.registeredAt),
          lastUsedAt: tool.lastUsedAt ? new Date(tool.lastUsedAt) : undefined,
        } as MCPTool);
      }
    } catch (error) {
      console.warn('[MCPRegistry] Could not load persisted tools:', error);
    }
  }

  // ============================================================================
  // TOOL REGISTRATION
  // ============================================================================

  async registerTool(
    tool: Omit<MCPTool, 'registeredAt' | 'lastUsedAt' | 'usageCount' | 'avgLatencyMs'>,
    handler?: ToolHandler
  ): Promise<MCPTool> {
    const fullTool: MCPTool = {
      ...tool,
      registeredAt: new Date(),
      lastUsedAt: undefined,
      usageCount: 0,
      avgLatencyMs: 0,
    };

    // Check for existing tool with same ID
    if (this.tools.has(tool.id)) {
      const existing = this.tools.get(tool.id)!;
      // Keep usage stats from existing
      fullTool.usageCount = existing.usageCount;
      fullTool.avgLatencyMs = existing.avgLatencyMs;
      fullTool.lastUsedAt = existing.lastUsedAt;
    }

    this.tools.set(tool.id, fullTool);
    
    if (handler) {
      this.handlers.set(tool.id, handler);
    }

    // Persist to database
    await this.persistTool(fullTool);

    this.emit({ type: 'tool_registered', tool: fullTool });
    return fullTool;
  }

  private async persistTool(tool: MCPTool): Promise<void> {
    try {
      await db.table('mcpTools').put({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        provider: tool.provider,
        version: tool.version,
        registeredAt: tool.registeredAt,
        lastUsedAt: tool.lastUsedAt,
        usageCount: tool.usageCount,
        avgLatencyMs: tool.avgLatencyMs,
      });
    } catch (error) {
      console.error('[MCPRegistry] Failed to persist tool:', error);
    }
  }

  /**
   * Register a tool handler (implementation)
   */
  registerHandler(toolId: string, handler: ToolHandler): void {
    if (!this.tools.has(toolId)) {
      console.warn(`[MCPRegistry] Cannot register handler for unknown tool: ${toolId}`);
      return;
    }
    this.handlers.set(toolId, handler);
    console.log(`[MCPRegistry] Handler registered for tool: ${toolId}`);
  }

  /**
   * Unregister a tool
   */
  async unregisterTool(toolId: string): Promise<void> {
    if (this.tools.has(toolId)) {
      const tool = this.tools.get(toolId)!;
      this.tools.delete(toolId);
      this.handlers.delete(toolId);
      
      await db.table('mcpTools').delete(toolId).catch(() => {});
      
      this.emit({ type: 'tool_unregistered', toolId });
      console.log(`[MCPRegistry] Tool unregistered: ${tool.name}`);
    }
  }

  // ============================================================================
  // TOOL DISCOVERY (A2A Pattern)
  // ============================================================================

  /**
   * Discover tools matching criteria
   */
  discoverTools(query: ToolQuery = {}): MCPTool[] {
    let results = Array.from(this.tools.values())
      .filter(t => t.status === 'active');

    if (query.category) {
      results = results.filter(t => t.category === query.category);
    }

    if (query.permission) {
      results = results.filter(t => t.permissions.includes(query.permission!));
    }

    if (query.namePattern) {
      const pattern = new RegExp(query.namePattern, 'i');
      results = results.filter(t => pattern.test(t.name) || pattern.test(t.description));
    }

    if (query.provider) {
      results = results.filter(t => t.provider === query.provider);
    }

    if (query.maxCostPerCall !== undefined) {
      results = results.filter(t => !t.costPerCall || t.costPerCall <= query.maxCostPerCall!);
    }

    return results;
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): MCPTool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get tool by name
   */
  getToolByName(name: string): MCPTool | undefined {
    return Array.from(this.tools.values()).find(t => t.name === name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  // ============================================================================
  // TOOL INVOCATION
  // ============================================================================

  /**
   * Invoke a tool
   */
  async invoke(
    toolId: string,
    input: unknown,
    agentId: string
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolId}`,
        latencyMs: 0,
      };
    }

    if (tool.status !== 'active') {
      return {
        success: false,
        error: `Tool is ${tool.status}: ${toolId}`,
        latencyMs: 0,
      };
    }

    // Check rate limit
    if (tool.rateLimit) {
      const limited = this.checkRateLimit(toolId, tool.rateLimit);
      if (limited) {
        return {
          success: false,
          error: `Rate limit exceeded for tool: ${tool.name}`,
          latencyMs: 0,
        };
      }
    }

    // Validate input
    const validationError = this.validateInput(tool.inputSchema, input);
    if (validationError) {
      return {
        success: false,
        error: `Invalid input: ${validationError}`,
        latencyMs: 0,
      };
    }

    // Create invocation record
    const invocation: ToolInvocation = {
      id: `inv_${crypto.randomUUID()}`,
      toolId,
      agentId,
      input,
      status: 'pending',
      startedAt: new Date(),
    };
    this.invocations.set(invocation.id, invocation);

    const startTime = Date.now();
    let result: ToolResult;

    try {
      invocation.status = 'running';
      
      const handler = this.handlers.get(toolId);
      if (handler) {
        result = await handler(input);
      } else {
        // Simulate tool execution for demo
        result = await this.simulateToolExecution(tool, input);
      }

      invocation.status = 'completed';
      
    } catch (error) {
      invocation.status = 'failed';
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }

    // Update tool stats
    const latencyMs = Date.now() - startTime;
    result.latencyMs = latencyMs;
    result.cost = tool.costPerCall;
    
    tool.lastUsedAt = new Date();
    tool.usageCount++;
    tool.avgLatencyMs = (tool.avgLatencyMs * (tool.usageCount - 1) + latencyMs) / tool.usageCount;

    invocation.result = result;
    invocation.completedAt = new Date();

    this.emit({ type: 'tool_invoked', toolId, agentId, result });

    return result;
  }

  private checkRateLimit(toolId: string, limit: { maxCalls: number; windowMs: number }): boolean {
    const key = toolId;
    const now = Date.now();
    
    let counter = this.rateLimitCounters.get(key);
    
    if (!counter || now > counter.resetAt) {
      counter = { count: 0, resetAt: now + limit.windowMs };
      this.rateLimitCounters.set(key, counter);
    }

    if (counter.count >= limit.maxCalls) {
      return true; // Rate limited
    }

    counter.count++;
    return false;
  }

  private validateInput(schema: JSONSchema, input: unknown): string | null {
    if (schema.type === 'object' && typeof input !== 'object') {
      return 'Input must be an object';
    }

    if (schema.required && schema.type === 'object') {
      const inputObj = input as Record<string, unknown>;
      for (const field of schema.required) {
        if (!(field in inputObj)) {
          return `Missing required field: ${field}`;
        }
      }
    }

    return null; // Valid
  }

  private async simulateToolExecution(tool: MCPTool, input: unknown): Promise<ToolResult> {
    // Simulate varying latency
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200));

    // Generate simulated results based on tool category
    switch (tool.category) {
      case 'data_retrieval':
        return {
          success: true,
          data: { message: `Retrieved data using ${tool.name}`, input },
          latencyMs: 0,
        };
      case 'analysis':
        return {
          success: true,
          data: { 
            message: `Analysis complete using ${tool.name}`,
            confidence: 0.7 + Math.random() * 0.3,
            findings: ['Finding 1', 'Finding 2'],
          },
          latencyMs: 0,
        };
      case 'evidence':
        return {
          success: true,
          data: {
            evidenceId: `ev_${Date.now()}`,
            hash: Array.from({ length: 64 }, () => 
              '0123456789abcdef'[Math.floor(Math.random() * 16)]
            ).join(''),
            captured: true,
          },
          latencyMs: 0,
        };
      case 'notification':
        return {
          success: true,
          data: { sent: true, recipients: 3 },
          latencyMs: 0,
        };
      default:
        return {
          success: true,
          data: { executed: true, tool: tool.name },
          latencyMs: 0,
        };
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getStats(): {
    totalTools: number;
    activeTools: number;
    byCategory: Record<ToolCategory, number>;
    byProvider: Record<string, number>;
    totalInvocations: number;
    avgLatencyMs: number;
    totalCost: number;
  } {
    const tools = Array.from(this.tools.values());
    const activeTools = tools.filter(t => t.status === 'active');

    const byCategory: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    let totalInvocations = 0;
    let totalLatency = 0;
    let totalCost = 0;

    for (const tool of tools) {
      byCategory[tool.category] = (byCategory[tool.category] || 0) + 1;
      byProvider[tool.provider] = (byProvider[tool.provider] || 0) + 1;
      totalInvocations += tool.usageCount;
      totalLatency += tool.avgLatencyMs * tool.usageCount;
      totalCost += (tool.costPerCall || 0) * tool.usageCount;
    }

    return {
      totalTools: tools.length,
      activeTools: activeTools.length,
      byCategory: byCategory as Record<ToolCategory, number>,
      byProvider,
      totalInvocations,
      avgLatencyMs: totalInvocations > 0 ? totalLatency / totalInvocations : 0,
      totalCost,
    };
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  subscribe(callback: (event: RegistryEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: RegistryEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[MCPRegistry] Event listener error:', e);
      }
    });
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

type RegistryEvent =
  | { type: 'registry_initialized'; toolCount: number }
  | { type: 'tool_registered'; tool: MCPTool }
  | { type: 'tool_unregistered'; toolId: string }
  | { type: 'tool_invoked'; toolId: string; agentId: string; result: ToolResult };

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const mcpToolRegistry = new MCPToolRegistryService();

// ============================================================================
// REACT HOOK
// ============================================================================

export function useMCPTools(query?: ToolQuery) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [stats, setStats] = useState(mcpToolRegistry.getStats());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await mcpToolRegistry.initialize();
      setIsInitialized(true);
      setTools(query ? mcpToolRegistry.discoverTools(query) : mcpToolRegistry.getAllTools());
      setStats(mcpToolRegistry.getStats());
    };

    init();

    const unsubscribe = mcpToolRegistry.subscribe(() => {
      setTools(query ? mcpToolRegistry.discoverTools(query) : mcpToolRegistry.getAllTools());
      setStats(mcpToolRegistry.getStats());
    });

    return () => {
      unsubscribe();
    };
  }, [query?.category, query?.permission, query?.provider]);

  const invokeTool = useCallback(async (
    toolId: string,
    input: unknown,
    agentId: string = 'user'
  ) => {
    return mcpToolRegistry.invoke(toolId, input, agentId);
  }, []);

  const registerTool = useCallback(async (
    tool: Omit<MCPTool, 'registeredAt' | 'lastUsedAt' | 'usageCount' | 'avgLatencyMs'>,
    handler?: ToolHandler
  ) => {
    return mcpToolRegistry.registerTool(tool, handler);
  }, []);

  const discoverTools = useCallback((q: ToolQuery) => {
    return mcpToolRegistry.discoverTools(q);
  }, []);

  return {
    tools,
    stats,
    isInitialized,
    invokeTool,
    registerTool,
    discoverTools,
    getTool: mcpToolRegistry.getTool.bind(mcpToolRegistry),
    getToolByName: mcpToolRegistry.getToolByName.bind(mcpToolRegistry),
  };
}
