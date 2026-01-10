/**
 * Multi-Agent Orchestrator
 * 
 * Implements browser-based multi-agent coordination using Web Workers
 * and BroadcastChannel. Inspired by:
 * - Episode #746: PlayerZero's semantic graphs and AI immune system
 * - Episode #718: AutoGen's actor model patterns
 * - Episode #756: Yutori's Scouts multi-agent architecture
 * 
 * Key Features:
 * - BroadcastChannel coordination between specialized agents
 * - Human-in-the-loop approval workflow
 * - Confidence thresholds for autonomous vs supervised actions
 * - Cost tracking ($0.35/task target from Scouts)
 * 
 * @module multiAgentOrchestrator
 */

// ============================================================================
// TYPES
// ============================================================================

export type AgentType = 
  | 'anomaly'      // Detects anomalies in data patterns
  | 'compliance'   // Monitors regulatory compliance
  | 'subsidy'      // Tracks subsidy promises vs reality
  | 'network'      // BGP/CT monitoring
  | 'ownership'    // Corporate ownership chain analysis
  | 'orchestrator'; // Coordinates other agents

export type AgentStatus = 'idle' | 'running' | 'awaiting_approval' | 'error' | 'terminated';

export interface AgentConfig {
  id: string;
  type: AgentType;
  approvalThreshold: number;  // Actions below this confidence require human approval
  tools: string[];            // MCP-style tool names this agent can use
  maxConcurrentTasks: number;
  costBudget: number;         // Max cost per task in dollars
}

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string | 'broadcast';
  type: MessageType;
  payload: unknown;
  timestamp: number;
  requiresResponse: boolean;
}

export type MessageType =
  | 'TASK_REQUEST'
  | 'TASK_RESULT'
  | 'APPROVAL_REQUEST'
  | 'APPROVAL_RESPONSE'
  | 'EVIDENCE_FOUND'
  | 'CORROBORATE'
  | 'CORROBORATION_RESULT'
  | 'STATUS_UPDATE'
  | 'ERROR'
  | 'HEARTBEAT';

export interface ApprovalRequest {
  id: string;
  agentId: string;
  agentType: AgentType;
  action: string;
  parameters: Record<string, unknown>;
  confidence: number;
  reasoning: string;
  evidence: string[];
  potentialImpact: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  expiresAt: Date;
}

export interface AgentTask {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  payload: unknown;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  result?: unknown;
  cost?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AgentState {
  id: string;
  type: AgentType;
  status: AgentStatus;
  currentTask?: AgentTask;
  messageHistory: AgentMessage[];
  tasksCompleted: number;
  totalCost: number;
  lastHeartbeat: Date;
}

// ============================================================================
// APPROVAL THRESHOLDS
// ============================================================================

export const APPROVAL_THRESHOLDS: Record<string, number> = {
  // Actions that can be highly automated
  'data_capture': 0.70,
  'pattern_detection': 0.75,
  'cross_reference': 0.80,
  
  // Actions requiring more confidence
  'anomaly_flag': 0.85,
  'compliance_alert': 0.85,
  'evidence_creation': 0.90,
  
  // High-stakes actions almost always need approval
  'report_generation': 0.95,
  'coalition_notification': 0.98,
  'legal_evidence_export': 0.99,
};

// ============================================================================
// MULTI-AGENT ORCHESTRATOR
// ============================================================================

class MultiAgentOrchestratorService {
  private channel: BroadcastChannel | null = null;
  private agents: Map<string, AgentState> = new Map();
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private taskQueue: AgentTask[] = [];
  private listeners: Set<(event: OrchestratorEvent) => void> = new Set();
  private heartbeatInterval?: ReturnType<typeof setInterval>;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the orchestrator and message bus
   */
  initialize(): void {
    if (this.channel) {
      console.warn('[Orchestrator] Already initialized');
      return;
    }

    // Create BroadcastChannel for agent coordination
    this.channel = new BroadcastChannel('dcim-agent-bus');
    
    this.channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    // Initialize default agents
    this.initializeDefaultAgents();

    // Start heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.checkAgentHealth();
    }, 10000);

    console.log('🤖 Multi-Agent Orchestrator initialized');
    this.emit({ type: 'orchestrator_started' });
  }

  /**
   * Shutdown the orchestrator
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Terminate all agents
    for (const agent of this.agents.values()) {
      agent.status = 'terminated';
    }

    this.channel?.close();
    this.channel = null;
    
    console.log('🛑 Multi-Agent Orchestrator shutdown');
    this.emit({ type: 'orchestrator_stopped' });
  }

  /**
   * Initialize default agent configurations
   */
  private initializeDefaultAgents(): void {
    const defaultConfigs: AgentConfig[] = [
      {
        id: 'anomaly-agent',
        type: 'anomaly',
        approvalThreshold: 0.85,
        tools: ['detect_anomaly', 'analyze_pattern', 'flag_suspicious'],
        maxConcurrentTasks: 3,
        costBudget: 0.10,
      },
      {
        id: 'compliance-agent',
        type: 'compliance',
        approvalThreshold: 0.85,
        tools: ['check_compliance', 'verify_permit', 'generate_alert'],
        maxConcurrentTasks: 2,
        costBudget: 0.15,
      },
      {
        id: 'subsidy-agent',
        type: 'subsidy',
        approvalThreshold: 0.80,
        tools: ['track_subsidy', 'compare_promises', 'calculate_gap'],
        maxConcurrentTasks: 3,
        costBudget: 0.10,
      },
      {
        id: 'network-agent',
        type: 'network',
        approvalThreshold: 0.75,
        tools: ['monitor_bgp', 'watch_ct', 'correlate_network'],
        maxConcurrentTasks: 5,
        costBudget: 0.05,
      },
      {
        id: 'ownership-agent',
        type: 'ownership',
        approvalThreshold: 0.80,
        tools: ['trace_ownership', 'detect_shell', 'map_subsidiaries'],
        maxConcurrentTasks: 2,
        costBudget: 0.15,
      },
    ];

    for (const config of defaultConfigs) {
      this.registerAgent(config);
    }
  }

  // ============================================================================
  // AGENT MANAGEMENT
  // ============================================================================

  /**
   * Register a new agent
   */
  registerAgent(config: AgentConfig): AgentState {
    const state: AgentState = {
      id: config.id,
      type: config.type,
      status: 'idle',
      messageHistory: [],
      tasksCompleted: 0,
      totalCost: 0,
      lastHeartbeat: new Date(),
    };

    this.agents.set(config.id, state);
    console.log(`🤖 Agent registered: ${config.id} (${config.type})`);
    
    return state;
  }

  /**
   * Get all agent states
   */
  getAgents(): AgentState[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get specific agent state
   */
  getAgent(agentId: string): AgentState | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Check agent health via heartbeats
   */
  private checkAgentHealth(): void {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    for (const [id, agent] of this.agents) {
      if (agent.status !== 'terminated') {
        const lastBeat = agent.lastHeartbeat.getTime();
        if (now - lastBeat > timeout) {
          agent.status = 'error';
          this.emit({ type: 'agent_unhealthy', agentId: id });
        }
      }
    }
  }

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================

  /**
   * Submit a task to be processed by appropriate agent
   */
  async submitTask(task: Omit<AgentTask, 'id' | 'status'>): Promise<string> {
    const fullTask: AgentTask = {
      ...task,
      id: `task_${crypto.randomUUID()}`,
      status: 'pending',
    };

    this.taskQueue.push(fullTask);
    this.emit({ type: 'task_submitted', task: fullTask });

    // Try to assign immediately
    await this.assignTasks();

    return fullTask.id;
  }

  /**
   * Assign pending tasks to available agents
   */
  private async assignTasks(): Promise<void> {
    const pendingTasks = this.taskQueue.filter(t => t.status === 'pending');
    
    for (const task of pendingTasks) {
      // Find suitable agent
      const agent = this.findAgentForTask(task);
      
      if (agent) {
        task.assignedTo = agent.id;
        task.status = 'in_progress';
        task.startedAt = new Date();
        
        agent.status = 'running';
        agent.currentTask = task;

        // Send task to agent
        this.broadcast({
          id: crypto.randomUUID(),
          fromAgent: 'orchestrator',
          toAgent: agent.id,
          type: 'TASK_REQUEST',
          payload: task,
          timestamp: Date.now(),
          requiresResponse: true,
        });
      }
    }
  }

  /**
   * Find appropriate agent for a task
   */
  private findAgentForTask(task: AgentTask): AgentState | undefined {
    const typeMap: Record<string, AgentType> = {
      'detect_anomaly': 'anomaly',
      'analyze_pattern': 'anomaly',
      'check_compliance': 'compliance',
      'track_subsidy': 'subsidy',
      'monitor_bgp': 'network',
      'trace_ownership': 'ownership',
    };

    const targetType = typeMap[task.type] || 'anomaly';
    
    return Array.from(this.agents.values())
      .find(a => a.type === targetType && a.status === 'idle');
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, result: unknown, cost?: number): void {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task) return;

    task.status = 'completed';
    task.result = result;
    task.cost = cost;
    task.completedAt = new Date();

    // Update agent state
    if (task.assignedTo) {
      const agent = this.agents.get(task.assignedTo);
      if (agent) {
        agent.status = 'idle';
        agent.currentTask = undefined;
        agent.tasksCompleted++;
        agent.totalCost += cost || 0;
      }
    }

    this.emit({ type: 'task_completed', task });
  }

  // ============================================================================
  // APPROVAL WORKFLOW
  // ============================================================================

  /**
   * Request human approval for an action
   */
  requestApproval(request: Omit<ApprovalRequest, 'id' | 'timestamp' | 'expiresAt'>): string {
    const fullRequest: ApprovalRequest = {
      ...request,
      id: `approval_${crypto.randomUUID()}`,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.pendingApprovals.set(fullRequest.id, fullRequest);
    
    // Update agent status
    const agent = this.agents.get(request.agentId);
    if (agent) {
      agent.status = 'awaiting_approval';
    }

    console.log(`⏳ Approval requested: ${fullRequest.action} (confidence: ${request.confidence})`);
    this.emit({ type: 'approval_requested', request: fullRequest });

    return fullRequest.id;
  }

  /**
   * Approve a pending request
   */
  approve(requestId: string, approver: string, feedback?: string): void {
    const request = this.pendingApprovals.get(requestId);
    if (!request) {
      console.warn(`[Orchestrator] Approval request not found: ${requestId}`);
      return;
    }

    this.pendingApprovals.delete(requestId);

    // Update agent status
    const agent = this.agents.get(request.agentId);
    if (agent) {
      agent.status = 'running';
    }

    // Notify the agent
    this.broadcast({
      id: crypto.randomUUID(),
      fromAgent: 'orchestrator',
      toAgent: request.agentId,
      type: 'APPROVAL_RESPONSE',
      payload: {
        requestId,
        approved: true,
        approver,
        feedback,
      },
      timestamp: Date.now(),
      requiresResponse: false,
    });

    console.log(`✅ Approved: ${request.action} by ${approver}`);
    this.emit({ type: 'approval_granted', requestId, approver });
  }

  /**
   * Reject a pending request
   */
  reject(requestId: string, rejector: string, reason: string): void {
    const request = this.pendingApprovals.get(requestId);
    if (!request) return;

    this.pendingApprovals.delete(requestId);

    // Update agent status
    const agent = this.agents.get(request.agentId);
    if (agent) {
      agent.status = 'idle';
    }

    // Notify the agent
    this.broadcast({
      id: crypto.randomUUID(),
      fromAgent: 'orchestrator',
      toAgent: request.agentId,
      type: 'APPROVAL_RESPONSE',
      payload: {
        requestId,
        approved: false,
        rejector,
        reason,
      },
      timestamp: Date.now(),
      requiresResponse: false,
    });

    console.log(`❌ Rejected: ${request.action} - ${reason}`);
    this.emit({ type: 'approval_rejected', requestId, reason });
  }

  /**
   * Get all pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values())
      .filter(r => r.expiresAt > new Date())
      .sort((a, b) => {
        // Sort by impact then confidence
        const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const impactDiff = impactOrder[a.potentialImpact] - impactOrder[b.potentialImpact];
        if (impactDiff !== 0) return impactDiff;
        return b.confidence - a.confidence;
      });
  }

  /**
   * Check if an action requires approval based on confidence
   */
  requiresApproval(action: string, confidence: number): boolean {
    const threshold = APPROVAL_THRESHOLDS[action] ?? 0.85;
    return confidence < threshold;
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  /**
   * Handle incoming message from BroadcastChannel
   */
  private handleMessage(message: AgentMessage): void {
    // Update agent heartbeat
    const agent = this.agents.get(message.fromAgent);
    if (agent) {
      agent.lastHeartbeat = new Date();
      agent.messageHistory.push(message);
    }

    switch (message.type) {
      case 'TASK_RESULT':
        this.handleTaskResult(message);
        break;
      case 'APPROVAL_REQUEST':
        this.handleApprovalRequest(message);
        break;
      case 'EVIDENCE_FOUND':
        this.handleEvidenceFound(message);
        break;
      case 'ERROR':
        this.handleAgentError(message);
        break;
      case 'HEARTBEAT':
        // Already updated above
        break;
      default:
        console.log(`[Orchestrator] Received: ${message.type} from ${message.fromAgent}`);
    }
  }

  private handleTaskResult(message: AgentMessage): void {
    const { taskId, result, cost } = message.payload as { taskId: string; result: unknown; cost?: number };
    this.completeTask(taskId, result, cost);
  }

  private handleApprovalRequest(message: AgentMessage): void {
    const request = message.payload as Omit<ApprovalRequest, 'id' | 'timestamp' | 'expiresAt'>;
    this.requestApproval(request);
  }

  private handleEvidenceFound(message: AgentMessage): void {
    // Broadcast to all agents for corroboration
    this.broadcast({
      id: crypto.randomUUID(),
      fromAgent: 'orchestrator',
      toAgent: 'broadcast',
      type: 'CORROBORATE',
      payload: message.payload,
      timestamp: Date.now(),
      requiresResponse: true,
    });

    this.emit({ type: 'evidence_found', evidence: message.payload });
  }

  private handleAgentError(message: AgentMessage): void {
    const agent = this.agents.get(message.fromAgent);
    if (agent) {
      agent.status = 'error';
    }
    this.emit({ type: 'agent_error', agentId: message.fromAgent, error: message.payload });
  }

  /**
   * Broadcast message to all agents or specific agent
   */
  broadcast(message: AgentMessage): void {
    this.channel?.postMessage(message);
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  /**
   * Subscribe to orchestrator events
   */
  subscribe(callback: (event: OrchestratorEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: OrchestratorEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[Orchestrator] Event listener error:', e);
      }
    });
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getStats(): {
    totalAgents: number;
    activeAgents: number;
    pendingApprovals: number;
    tasksCompleted: number;
    totalCost: number;
    avgCostPerTask: number;
  } {
    const agents = Array.from(this.agents.values());
    const tasksCompleted = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
    const totalCost = agents.reduce((sum, a) => sum + a.totalCost, 0);

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'running').length,
      pendingApprovals: this.pendingApprovals.size,
      tasksCompleted,
      totalCost,
      avgCostPerTask: tasksCompleted > 0 ? totalCost / tasksCompleted : 0,
    };
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

type OrchestratorEvent =
  | { type: 'orchestrator_started' }
  | { type: 'orchestrator_stopped' }
  | { type: 'agent_unhealthy'; agentId: string }
  | { type: 'agent_error'; agentId: string; error: unknown }
  | { type: 'task_submitted'; task: AgentTask }
  | { type: 'task_completed'; task: AgentTask }
  | { type: 'approval_requested'; request: ApprovalRequest }
  | { type: 'approval_granted'; requestId: string; approver: string }
  | { type: 'approval_rejected'; requestId: string; reason: string }
  | { type: 'evidence_found'; evidence: unknown };

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const agentOrchestrator = new MultiAgentOrchestratorService();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useAgentOrchestrator() {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [stats, setStats] = useState(agentOrchestrator.getStats());

  useEffect(() => {
    // Initialize on mount
    agentOrchestrator.initialize();

    // Subscribe to events
    const unsubscribe = agentOrchestrator.subscribe((event) => {
      setAgents(agentOrchestrator.getAgents());
      setPendingApprovals(agentOrchestrator.getPendingApprovals());
      setStats(agentOrchestrator.getStats());
    });

    // Initial state
    setAgents(agentOrchestrator.getAgents());
    setPendingApprovals(agentOrchestrator.getPendingApprovals());

    return () => {
      unsubscribe();
      agentOrchestrator.shutdown();
    };
  }, []);

  const submitTask = useCallback(async (task: Omit<AgentTask, 'id' | 'status'>) => {
    return await agentOrchestrator.submitTask(task);
  }, []);

  const approve = useCallback((requestId: string, approver: string, feedback?: string) => {
    agentOrchestrator.approve(requestId, approver, feedback);
  }, []);

  const reject = useCallback((requestId: string, rejector: string, reason: string) => {
    agentOrchestrator.reject(requestId, rejector, reason);
  }, []);

  return {
    agents,
    pendingApprovals,
    stats,
    submitTask,
    approve,
    reject,
    isInitialized: agents.length > 0,
  };
}
