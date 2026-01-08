/**
 * Base AI Agent Worker
 * 
 * Foundation for all specialized agents. Handles:
 * - BroadcastChannel communication
 * - Heartbeat/health monitoring
 * - Task queue processing
 * - Approval request workflow
 */

// Message types for agent communication
export interface AgentMessage {
  type: 'task' | 'result' | 'heartbeat' | 'approval_request' | 'approval_response' | 'status' | 'error';
  agentId: string;
  agentType: string;
  payload: unknown;
  timestamp: number;
  correlationId?: string;
}

export interface AgentTask {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  parameters: Record<string, unknown>;
  deadline?: number;
}

export interface AgentResult {
  taskId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
  cost?: number;
}

export interface ApprovalRequest {
  id: string;
  action: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  reasoning: string;
  parameters: Record<string, unknown>;
  evidence?: string[];
}

// Base agent class that workers extend
export abstract class BaseAgentWorker {
  protected agentId: string;
  protected agentType: string;
  protected broadcastChannel: BroadcastChannel;
  protected isRunning = false;
  protected taskQueue: AgentTask[] = [];
  protected pendingApprovals = new Map<string, (approved: boolean, feedback?: string) => void>();
  protected heartbeatInterval: number | null = null;
  protected stats = {
    tasksCompleted: 0,
    tasksFailed: 0,
    totalCost: 0,
    avgDuration: 0,
    lastActivity: Date.now(),
  };

  constructor(agentId: string, agentType: string) {
    this.agentId = agentId;
    this.agentType = agentType;
    this.broadcastChannel = new BroadcastChannel('dcim-agent-network');
    this.setupMessageHandler();
  }

  private setupMessageHandler(): void {
    this.broadcastChannel.onmessage = (event: MessageEvent<AgentMessage>) => {
      const message = event.data;
      
      // Only process messages meant for this agent or broadcasts
      if (message.agentId && message.agentId !== this.agentId) {
        return;
      }

      switch (message.type) {
        case 'task':
          this.handleTask(message.payload as AgentTask);
          break;
        case 'approval_response':
          this.handleApprovalResponse(message);
          break;
        case 'status':
          this.sendStatus();
          break;
        default:
          // Subclasses can handle other message types
          this.handleCustomMessage(message);
      }
    };
  }

  protected async handleTask(task: AgentTask): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.sendMessage('status', { status: 'processing', taskId: task.id });
      
      const result = await this.processTask(task);
      
      const duration = Date.now() - startTime;
      this.stats.tasksCompleted++;
      this.stats.avgDuration = (this.stats.avgDuration * (this.stats.tasksCompleted - 1) + duration) / this.stats.tasksCompleted;
      this.stats.lastActivity = Date.now();
      
      this.sendMessage('result', {
        taskId: task.id,
        success: true,
        data: result,
        duration,
      } as AgentResult);
      
    } catch (error) {
      this.stats.tasksFailed++;
      this.sendMessage('result', {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      } as AgentResult);
    }
  }

  private handleApprovalResponse(message: AgentMessage): void {
    const { correlationId, payload } = message;
    if (!correlationId) return;
    
    const resolver = this.pendingApprovals.get(correlationId);
    if (resolver) {
      const { approved, feedback } = payload as { approved: boolean; feedback?: string };
      resolver(approved, feedback);
      this.pendingApprovals.delete(correlationId);
    }
  }

  protected async requestApproval(request: ApprovalRequest): Promise<{ approved: boolean; feedback?: string }> {
    return new Promise((resolve) => {
      const correlationId = `${this.agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      this.pendingApprovals.set(correlationId, (approved, feedback) => {
        resolve({ approved, feedback });
      });
      
      this.sendMessage('approval_request', request, correlationId);
      
      // Auto-reject after 5 minutes if no response
      setTimeout(() => {
        if (this.pendingApprovals.has(correlationId)) {
          this.pendingApprovals.delete(correlationId);
          resolve({ approved: false, feedback: 'Approval timeout' });
        }
      }, 5 * 60 * 1000);
    });
  }

  protected sendMessage(type: AgentMessage['type'], payload: unknown, correlationId?: string): void {
    const message: AgentMessage = {
      type,
      agentId: this.agentId,
      agentType: this.agentType,
      payload,
      timestamp: Date.now(),
      correlationId,
    };
    this.broadcastChannel.postMessage(message);
  }

  protected sendStatus(): void {
    this.sendMessage('status', {
      agentId: this.agentId,
      agentType: this.agentType,
      isRunning: this.isRunning,
      stats: this.stats,
      queueLength: this.taskQueue.length,
    });
  }

  protected startHeartbeat(intervalMs = 30000): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage('heartbeat', {
        agentId: this.agentId,
        status: this.isRunning ? 'active' : 'idle',
        stats: this.stats,
      });
    }, intervalMs) as unknown as number;
  }

  public start(): void {
    this.isRunning = true;
    this.startHeartbeat();
    this.sendStatus();
    console.log(`[${this.agentType}] Agent ${this.agentId} started`);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.sendStatus();
    console.log(`[${this.agentType}] Agent ${this.agentId} stopped`);
  }

  // Abstract methods for subclasses
  protected abstract processTask(task: AgentTask): Promise<unknown>;
  protected handleCustomMessage(_message: AgentMessage): void {
    // Override in subclasses for custom message handling
  }
}

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
