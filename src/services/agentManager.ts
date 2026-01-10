/**
 * Agent Manager Service
 * 
 * Coordinates AI agents, manages workers, and provides a clean interface
 * for the UI to interact with the multi-agent system.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export type AgentType = 'anomaly' | 'compliance' | 'subsidy' | 'network' | 'ownership';

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  status: 'idle' | 'active' | 'processing' | 'error' | 'offline';
  lastHeartbeat: number;
  tasksCompleted: number;
  tasksFailed: number;
  totalCost: number;
  currentTask?: string;
  capabilities: string[];
}

export interface AgentTask {
  id: string;
  agentType: AgentType;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'failed' | 'cancelled';
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  assignedTo?: string;
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  agentType: AgentType;
  action: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  reasoning: string;
  parameters: Record<string, unknown>;
  evidence: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: number;
  decidedAt?: number;
  decidedBy?: string;
  feedback?: string;
}

export interface AgentMessage {
  type: 'task' | 'result' | 'heartbeat' | 'approval_request' | 'approval_response' | 'status' | 'error';
  agentId: string;
  agentType: string;
  payload: unknown;
  timestamp: number;
  correlationId?: string;
}

// ============================================================================
// AGENT DEFINITIONS
// ============================================================================

const AGENT_DEFINITIONS: Record<AgentType, { name: string; capabilities: string[] }> = {
  anomaly: {
    name: 'Anomaly Detector',
    capabilities: ['BGP monitoring', 'CT log analysis', 'Power pattern detection', 'Workforce change detection'],
  },
  compliance: {
    name: 'Compliance Monitor',
    capabilities: ['Subsidy tracking', 'Job creation audit', 'Clawback calculation', 'Deadline monitoring'],
  },
  subsidy: {
    name: 'Subsidy Analyst',
    capabilities: ['Good Jobs First data', 'Tax incentive analysis', 'Cost-per-job calculation', 'ROI assessment'],
  },
  network: {
    name: 'Network Intelligence',
    capabilities: ['ASN mapping', 'Peering analysis', 'Traffic engineering', 'Infrastructure mapping'],
  },
  ownership: {
    name: 'Ownership Tracker',
    capabilities: ['Corporate structure analysis', 'Shell company detection', 'Officer network mapping', 'SEC filing analysis'],
  },
};

// ============================================================================
// AGENT MANAGER CLASS
// ============================================================================

class AgentManagerService {
  private agents = new Map<string, Agent>();
  private tasks = new Map<string, AgentTask>();
  private approvals = new Map<string, ApprovalRequest>();
  private broadcastChannel: BroadcastChannel;
  private listeners = new Set<(event: string, data: unknown) => void>();
  private initialized = false;

  constructor() {
    this.broadcastChannel = new BroadcastChannel('dcim-agent-network');
    this.setupMessageHandler();
  }

  private setupMessageHandler(): void {
    this.broadcastChannel.onmessage = (event: MessageEvent<AgentMessage>) => {
      const message = event.data;
      this.handleMessage(message);
    };
  }

  private handleMessage(message: AgentMessage): void {
    switch (message.type) {
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      case 'result':
        this.handleResult(message);
        break;
      case 'approval_request':
        this.handleApprovalRequest(message);
        break;
      case 'status':
        this.handleStatusUpdate(message);
        break;
      case 'error':
        this.handleError(message);
        break;
    }
  }

  private handleHeartbeat(message: AgentMessage): void {
    const { agentId, agentType, payload } = message;
    const agentData = payload as { status: string; stats: Record<string, number> };
    
    let agent = this.agents.get(agentId);
    if (!agent) {
      // New agent registration
      const definition = AGENT_DEFINITIONS[agentType as AgentType] || { name: 'Unknown', capabilities: [] };
      agent = {
        id: agentId,
        type: agentType as AgentType,
        name: definition.name,
        status: 'idle',
        lastHeartbeat: Date.now(),
        tasksCompleted: 0,
        tasksFailed: 0,
        totalCost: 0,
        capabilities: definition.capabilities,
      };
      this.agents.set(agentId, agent);
    }

    agent.lastHeartbeat = Date.now();
    agent.status = agentData.status === 'active' ? 'active' : 'idle';
    if (agentData.stats) {
      agent.tasksCompleted = agentData.stats.tasksCompleted || agent.tasksCompleted;
      agent.tasksFailed = agentData.stats.tasksFailed || agent.tasksFailed;
      agent.totalCost = agentData.stats.totalCost || agent.totalCost;
    }

    this.emit('agent_update', agent);
    this.persistAgentState(agent);
  }

  private handleResult(message: AgentMessage): void {
    const { agentId, payload } = message;
    const result = payload as { taskId: string; success: boolean; data?: unknown; error?: string; duration: number };
    
    const task = this.tasks.get(result.taskId);
    if (task) {
      task.status = result.success ? 'completed' : 'failed';
      task.result = result.data;
      task.error = result.error;
      task.completedAt = Date.now();
      
      this.emit('task_complete', { task, result });
      this.persistTask(task);
    }

    const agent = this.agents.get(agentId);
    if (agent) {
      agent.currentTask = undefined;
      agent.status = 'idle';
      if (result.success) {
        agent.tasksCompleted++;
      } else {
        agent.tasksFailed++;
      }
      this.emit('agent_update', agent);
    }
  }

  private handleApprovalRequest(message: AgentMessage): void {
    const { agentId, agentType, payload, correlationId } = message;
    const request = payload as Omit<ApprovalRequest, 'id' | 'agentId' | 'agentType' | 'status' | 'createdAt'>;
    
    const approval: ApprovalRequest = {
      id: correlationId || `approval-${Date.now()}`,
      agentId,
      agentType: agentType as AgentType,
      ...request,
      evidence: request.evidence || [],
      status: 'pending',
      createdAt: Date.now(),
    };

    this.approvals.set(approval.id, approval);
    this.emit('approval_request', approval);
    this.persistApproval(approval);
  }

  private handleStatusUpdate(message: AgentMessage): void {
    const { agentId, payload } = message;
    const status = payload as { status: string; taskId?: string };
    
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status.status as Agent['status'];
      agent.currentTask = status.taskId;
      this.emit('agent_update', agent);
    }
  }

  private handleError(message: AgentMessage): void {
    const { agentId, payload } = message;
    console.error(`[AgentManager] Error from agent ${agentId}:`, payload);
    
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'error';
      this.emit('agent_error', { agent, error: payload });
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load persisted state
    await this.loadPersistedState();

    // Always ensure demo data exists for demonstration
    if (this.agents.size === 0) {
      // No agents - create both agents and approvals
      await this.startDemoAgents();
    } else {
      // Agents exist - always create fresh demo approvals (they're not persisted fully)
      await this.createDemoApprovals();
    }

    this.initialized = true;
  }

  private async loadPersistedState(): Promise<void> {
    try {
      // Load agents
      const agentStates = await db.agentStates.toArray();
      for (const state of agentStates) {
        const definition = AGENT_DEFINITIONS[state.type as AgentType];
        if (definition) {
          this.agents.set(state.id, {
            id: state.id,
            type: state.type as AgentType,
            name: definition.name,
            status: state.status as Agent['status'],
            lastHeartbeat: state.lastHeartbeat,
            tasksCompleted: 0,
            tasksFailed: 0,
            totalCost: 0,
            capabilities: definition.capabilities,
          });
        }
      }

      // Note: We don't load persisted approvals because the schema only stores minimal fields.
      // Demo approvals are created fresh each session for demonstration purposes.
      
      // Load recent tasks
      const recentTasks = await db.agentTasks.where('status').anyOf(['pending', 'assigned', 'processing']).toArray();
      for (const task of recentTasks) {
        this.tasks.set(task.id, task as AgentTask);
      }
    } catch (error) {
      console.error('[AgentManager] Failed to load persisted state:', error);
    }
  }

  private async startDemoAgents(): Promise<void> {
    // Create demo agents for demonstration
    const demoAgents: Agent[] = [
      {
        id: 'anomaly-demo-001',
        type: 'anomaly',
        name: 'Anomaly Detector',
        status: 'active',
        lastHeartbeat: Date.now(),
        tasksCompleted: 47,
        tasksFailed: 2,
        totalCost: 1.23,
        capabilities: AGENT_DEFINITIONS.anomaly.capabilities,
      },
      {
        id: 'compliance-demo-001',
        type: 'compliance',
        name: 'Compliance Monitor',
        status: 'active',
        lastHeartbeat: Date.now(),
        tasksCompleted: 156,
        tasksFailed: 5,
        totalCost: 4.56,
        capabilities: AGENT_DEFINITIONS.compliance.capabilities,
      },
      {
        id: 'subsidy-demo-001',
        type: 'subsidy',
        name: 'Subsidy Analyst',
        status: 'idle',
        lastHeartbeat: Date.now() - 60000,
        tasksCompleted: 89,
        tasksFailed: 1,
        totalCost: 2.34,
        capabilities: AGENT_DEFINITIONS.subsidy.capabilities,
      },
      {
        id: 'ownership-demo-001',
        type: 'ownership',
        name: 'Ownership Tracker',
        status: 'processing',
        lastHeartbeat: Date.now(),
        tasksCompleted: 34,
        tasksFailed: 0,
        totalCost: 0.89,
        currentTask: 'Analyzing shell company network for Switch Inc',
        capabilities: AGENT_DEFINITIONS.ownership.capabilities,
      },
    ];

    for (const agent of demoAgents) {
      this.agents.set(agent.id, agent);
      await this.persistAgentState(agent);
    }

    // Create demo approvals too
    await this.createDemoApprovals();
  }

  private async createDemoApprovals(): Promise<void> {
    // Create demo approval requests
    const demoApprovals: ApprovalRequest[] = [
      {
        id: 'approval-demo-001',
        agentId: 'anomaly-demo-001',
        agentType: 'anomaly',
        action: 'Send coalition alert about AWS Richmond workforce reduction',
        impact: 'high',
        confidence: 0.87,
        reasoning: 'Detected 12% workforce reduction at AWS Richmond facility (US-East-1). LinkedIn profiles down 47, Glassdoor reviews mention layoffs. Cross-referenced with Q3 earnings call mentioning "efficiency improvements".',
        parameters: { facilityId: 2847, reduction: 0.12, affectedJobs: 47 },
        evidence: [
          'LinkedIn employee count: 347 → 300 (last 30 days)',
          'Glassdoor reviews: 3 mentions of layoffs',
          'Q3 2025 earnings call: "operational efficiency" language',
          'Local news: No coverage yet',
        ],
        status: 'pending',
        createdAt: Date.now() - 1800000, // 30 min ago
      },
      {
        id: 'approval-demo-002',
        agentId: 'compliance-demo-001',
        agentType: 'compliance',
        action: 'Generate public accountability report for Meta Prineville',
        impact: 'critical',
        confidence: 0.94,
        reasoning: 'Meta Prineville facility has failed to meet job creation commitments. Only 234 of 500 promised jobs created (46.8%). Subsidy agreement deadline is in 45 days. Clawback of $23.4M eligible.',
        parameters: { facilityId: 1523, jobsPromised: 500, jobsActual: 234, clawbackAmount: 23400000 },
        evidence: [
          'Oregon EDA subsidy agreement: 500 jobs by 2026-02-15',
          'BLS QCEW data: 234 employees (Q3 2025)',
          'Subsidy received: $45.2M in tax abatements',
          'Per-job cost: $193,162 (vs $90,400 promised)',
        ],
        status: 'pending',
        createdAt: Date.now() - 3600000, // 1 hour ago
      },
      {
        id: 'approval-demo-003',
        agentId: 'ownership-demo-001',
        agentType: 'ownership',
        action: 'Flag potential shell company network for investigation',
        impact: 'medium',
        confidence: 0.72,
        reasoning: 'Detected cluster of 7 LLCs with shared registered agent and overlapping officers. Pattern matches known shell company structures used for subsidy arbitrage.',
        parameters: { companyCount: 7, sharedAgent: 'CT Corporation', pattern: 'subsidy_arbitrage' },
        evidence: [
          'Delaware SOS: 7 LLCs registered same day',
          'Shared registered agent: CT Corporation',
          '3 overlapping officers across entities',
          'Similar naming pattern: "Data Solutions [State] LLC"',
        ],
        status: 'pending',
        createdAt: Date.now() - 7200000, // 2 hours ago
      },
    ];

    for (const approval of demoApprovals) {
      this.approvals.set(approval.id, approval);
      await this.persistApproval(approval);
    }
  }

  submitTask(task: Omit<AgentTask, 'id' | 'status' | 'createdAt'>): string {
    const fullTask: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...task,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.tasks.set(fullTask.id, fullTask);
    this.persistTask(fullTask);

    // Broadcast task to agents
    this.broadcastChannel.postMessage({
      type: 'task',
      agentId: '', // Broadcast to all agents of the type
      agentType: task.agentType,
      payload: fullTask,
      timestamp: Date.now(),
    });

    this.emit('task_submitted', fullTask);
    return fullTask.id;
  }

  async approveRequest(approvalId: string, approvedBy: string, feedback?: string): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) throw new Error(`Approval ${approvalId} not found`);

    approval.status = 'approved';
    approval.decidedAt = Date.now();
    approval.decidedBy = approvedBy;
    approval.feedback = feedback;

    // Send approval response to agent
    this.broadcastChannel.postMessage({
      type: 'approval_response',
      agentId: approval.agentId,
      agentType: approval.agentType,
      payload: { approved: true, feedback },
      timestamp: Date.now(),
      correlationId: approval.id,
    });

    await this.persistApproval(approval);
    this.emit('approval_decided', approval);
  }

  async rejectRequest(approvalId: string, rejectedBy: string, reason: string): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) throw new Error(`Approval ${approvalId} not found`);

    approval.status = 'rejected';
    approval.decidedAt = Date.now();
    approval.decidedBy = rejectedBy;
    approval.feedback = reason;

    // Send rejection response to agent
    this.broadcastChannel.postMessage({
      type: 'approval_response',
      agentId: approval.agentId,
      agentType: approval.agentType,
      payload: { approved: false, feedback: reason },
      timestamp: Date.now(),
      correlationId: approval.id,
    });

    await this.persistApproval(approval);
    this.emit('approval_decided', approval);
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.approvals.values()).filter(a => a.status === 'pending');
  }

  getTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  getStats(): {
    totalAgents: number;
    activeAgents: number;
    pendingApprovals: number;
    tasksCompleted: number;
    totalCost: number;
    avgCostPerTask: number;
  } {
    const agents = this.getAgents();
    const tasksCompleted = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
    const totalCost = agents.reduce((sum, a) => sum + a.totalCost, 0);

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active' || a.status === 'processing').length,
      pendingApprovals: this.getPendingApprovals().length,
      tasksCompleted,
      totalCost,
      avgCostPerTask: tasksCompleted > 0 ? totalCost / tasksCompleted : 0,
    };
  }

  // Event handling
  subscribe(listener: (event: string, data: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: string, data: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[AgentManager] Listener error:', error);
      }
    }
  }

  // Persistence
  private async persistAgentState(agent: Agent): Promise<void> {
    try {
      await db.agentStates.put({
        id: agent.id,
        type: agent.type,
        status: agent.status,
        lastHeartbeat: agent.lastHeartbeat,
      });
    } catch (error) {
      console.error('[AgentManager] Failed to persist agent state:', error);
    }
  }

  private async persistTask(task: AgentTask): Promise<void> {
    try {
      await db.agentTasks.put({
        id: task.id,
        type: task.type,
        priority: task.priority,
        status: task.status,
        assignedTo: task.assignedTo,
        startedAt: task.startedAt,
      });
    } catch (error) {
      console.error('[AgentManager] Failed to persist task:', error);
    }
  }

  private async persistApproval(approval: ApprovalRequest): Promise<void> {
    try {
      await db.agentApprovals.put({
        id: approval.id,
        agentId: approval.agentId,
        action: approval.action,
        status: approval.status,
        timestamp: approval.createdAt,
        expiresAt: approval.createdAt + 24 * 60 * 60 * 1000, // 24h expiry
      });
    } catch (error) {
      console.error('[AgentManager] Failed to persist approval:', error);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const agentManager = new AgentManagerService();

// ============================================================================
// REACT HOOK
// ============================================================================

export function useAgentManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [stats, setStats] = useState(agentManager.getStats());
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setLoading(true);
      agentManager.initialize().then(() => {
        setAgents(agentManager.getAgents());
        setApprovals(agentManager.getPendingApprovals());
        setStats(agentManager.getStats());
        setLoading(false);
      }).catch((error) => {
        console.error('[useAgentManager] Initialization failed:', error);
        setLoading(false);
      });
    }

    const unsubscribe = agentManager.subscribe((event, _data) => {
      if (event === 'agent_update' || event === 'agent_error') {
        setAgents(agentManager.getAgents());
        setStats(agentManager.getStats());
      }
      if (event === 'approval_request' || event === 'approval_decided') {
        setApprovals(agentManager.getPendingApprovals());
        setStats(agentManager.getStats());
      }
      if (event === 'task_complete' || event === 'task_submitted') {
        setStats(agentManager.getStats());
      }
    });

    return unsubscribe;
  }, []);

  const approve = useCallback(async (approvalId: string, approvedBy: string, feedback?: string) => {
    await agentManager.approveRequest(approvalId, approvedBy, feedback);
  }, []);

  const reject = useCallback(async (approvalId: string, rejectedBy: string, reason: string) => {
    await agentManager.rejectRequest(approvalId, rejectedBy, reason);
  }, []);

  const submitTask = useCallback((task: Omit<AgentTask, 'id' | 'status' | 'createdAt'>) => {
    return agentManager.submitTask(task);
  }, []);

  return {
    agents,
    approvals,
    stats,
    loading,
    approve,
    reject,
    submitTask,
  };
}
