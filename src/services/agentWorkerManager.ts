/**
 * Agent Worker Manager
 * 
 * Manages the lifecycle of AI agent Web Workers and bridges communication
 * between workers and the main thread orchestrator.
 * 
 * Based on TWIML AI Podcast insights:
 * - Episode #718: AutoGen actor patterns
 * - Episode #756: Yutori Scouts multi-agent architecture
 * 
 * @module agentWorkerManager
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type AgentWorkerType = 'anomaly' | 'compliance' | 'subsidy' | 'network' | 'ownership';

export interface WorkerState {
  id: string;
  type: AgentWorkerType;
  status: 'initializing' | 'running' | 'idle' | 'error' | 'terminated';
  worker: Worker | null;
  lastHeartbeat: Date;
  stats: {
    tasksCompleted: number;
    tasksFailed: number;
    avgDuration: number;
    totalCost: number;
  };
  errorCount: number;
  restartCount: number;
}

export interface WorkerMessage {
  type: 'task' | 'result' | 'heartbeat' | 'approval_request' | 'approval_response' | 'status' | 'error';
  agentId: string;
  agentType: string;
  payload: unknown;
  timestamp: number;
  correlationId?: string;
}

export interface WorkerTask {
  id: string;
  workerId: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  parameters: Record<string, unknown>;
  status: 'pending' | 'sent' | 'processing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// WORKER MANAGER CLASS
// ============================================================================

class AgentWorkerManagerService {
  private workers = new Map<string, WorkerState>();
  private tasks = new Map<string, WorkerTask>();
  private mainChannel: BroadcastChannel | null = null;
  private workerChannel: BroadcastChannel | null = null;
  private listeners = new Set<(event: WorkerManagerEvent) => void>();
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private isInitialized = false;

  // AI Immune System settings (Episode #746: PlayerZero)
  private immuneSystemConfig = {
    maxRestarts: 3,
    restartCooldownMs: 5000,
    healthCheckIntervalMs: 10000,
    heartbeatTimeoutMs: 30000,
    autoHealEnabled: true,
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initialize(): void {
    if (this.isInitialized) {
      console.warn('[WorkerManager] Already initialized');
      return;
    }

    // Create dual BroadcastChannels to bridge worker and orchestrator communication
    this.mainChannel = new BroadcastChannel('dcim-agent-bus'); // Orchestrator channel
    this.workerChannel = new BroadcastChannel('dcim-agent-network'); // Worker channel

    // Bridge messages between channels
    this.setupChannelBridge();

    // Start health monitoring (AI Immune System)
    this.startHealthMonitoring();

    // Spawn default workers
    this.spawnDefaultWorkers();

    this.isInitialized = true;
    console.log('🔧 Agent Worker Manager initialized');
    this.emit({ type: 'manager_started' });
  }

  private setupChannelBridge(): void {
    // Forward worker messages to orchestrator
    this.workerChannel?.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      
      // Update worker state
      this.updateWorkerFromMessage(message);
      
      // Forward to orchestrator channel
      this.mainChannel?.postMessage(this.translateToOrchestratorFormat(message));
      
      // Handle locally for tracking
      this.handleWorkerMessage(message);
    });

    // Forward orchestrator messages to workers
    this.mainChannel?.addEventListener('message', (event: MessageEvent) => {
      const message = event.data;
      
      // Translate and forward to workers
      if (message.toAgent && message.toAgent !== 'orchestrator') {
        this.workerChannel?.postMessage(this.translateToWorkerFormat(message));
      }
    });
  }

  private translateToOrchestratorFormat(workerMsg: WorkerMessage): unknown {
    return {
      id: workerMsg.correlationId || crypto.randomUUID(),
      fromAgent: workerMsg.agentId,
      toAgent: 'orchestrator',
      type: this.mapWorkerTypeToOrchestrator(workerMsg.type),
      payload: workerMsg.payload,
      timestamp: workerMsg.timestamp,
      requiresResponse: workerMsg.type === 'approval_request',
    };
  }

  private translateToWorkerFormat(orchestratorMsg: unknown): WorkerMessage {
    const msg = orchestratorMsg as Record<string, unknown>;
    return {
      type: this.mapOrchestratorTypeToWorker(msg.type as string),
      agentId: msg.toAgent as string,
      agentType: 'unknown',
      payload: msg.payload,
      timestamp: msg.timestamp as number || Date.now(),
      correlationId: msg.id as string,
    };
  }

  private mapWorkerTypeToOrchestrator(type: string): string {
    const map: Record<string, string> = {
      'task': 'TASK_REQUEST',
      'result': 'TASK_RESULT',
      'heartbeat': 'HEARTBEAT',
      'approval_request': 'APPROVAL_REQUEST',
      'approval_response': 'APPROVAL_RESPONSE',
      'status': 'STATUS_UPDATE',
      'error': 'ERROR',
    };
    return map[type] || type;
  }

  private mapOrchestratorTypeToWorker(type: string): WorkerMessage['type'] {
    const map: Record<string, WorkerMessage['type']> = {
      'TASK_REQUEST': 'task',
      'TASK_RESULT': 'result',
      'HEARTBEAT': 'heartbeat',
      'APPROVAL_REQUEST': 'approval_request',
      'APPROVAL_RESPONSE': 'approval_response',
      'STATUS_UPDATE': 'status',
      'ERROR': 'error',
    };
    return map[type] || 'status';
  }

  // ============================================================================
  // WORKER LIFECYCLE
  // ============================================================================

  private spawnDefaultWorkers(): void {
    const defaultWorkers: AgentWorkerType[] = ['anomaly', 'compliance'];
    
    for (const type of defaultWorkers) {
      this.spawnWorker(type);
    }
  }

  spawnWorker(type: AgentWorkerType): string | null {
    const workerId = `${type}-worker-${Date.now()}`;

    try {
      // Get the worker URL based on type
      const workerUrl = this.getWorkerUrl(type);
      if (!workerUrl) {
        console.error(`[WorkerManager] No worker implementation for type: ${type}`);
        return null;
      }

      const worker = new Worker(workerUrl, { type: 'module' });

      const state: WorkerState = {
        id: workerId,
        type,
        status: 'initializing',
        worker,
        lastHeartbeat: new Date(),
        stats: {
          tasksCompleted: 0,
          tasksFailed: 0,
          avgDuration: 0,
          totalCost: 0,
        },
        errorCount: 0,
        restartCount: 0,
      };

      // Set up worker event handlers
      worker.onmessage = (event) => {
        this.handleDirectWorkerMessage(workerId, event.data);
      };

      worker.onerror = (error) => {
        this.handleWorkerError(workerId, error);
      };

      this.workers.set(workerId, state);
      
      // Update state to running after short delay
      setTimeout(() => {
        const w = this.workers.get(workerId);
        if (w && w.status === 'initializing') {
          w.status = 'running';
          this.emit({ type: 'worker_started', workerId, workerType: type });
        }
      }, 500);

      console.log(`🤖 Worker spawned: ${workerId} (${type})`);
      return workerId;

    } catch (error) {
      console.error(`[WorkerManager] Failed to spawn ${type} worker:`, error);
      this.emit({ type: 'worker_error', workerId, error: String(error) });
      return null;
    }
  }

  private getWorkerUrl(type: AgentWorkerType): URL | null {
    const urlMap: Record<AgentWorkerType, string> = {
      'anomaly': '../workers/agents/anomalyAgent.worker.ts',
      'compliance': '../workers/agents/complianceAgent.worker.ts',
      'subsidy': '../workers/agents/subsidyAgent.worker.ts',
      'network': '../workers/agents/networkAgent.worker.ts',
      'ownership': '../workers/agents/ownershipAgent.worker.ts',
    };

    const path = urlMap[type];
    if (!path) return null;

    try {
      return new URL(path, import.meta.url);
    } catch {
      return null;
    }
  }

  terminateWorker(workerId: string): void {
    const state = this.workers.get(workerId);
    if (!state) return;

    if (state.worker) {
      state.worker.postMessage({ type: 'shutdown' });
      state.worker.terminate();
    }

    state.status = 'terminated';
    state.worker = null;

    console.log(`🛑 Worker terminated: ${workerId}`);
    this.emit({ type: 'worker_terminated', workerId });
  }

  // ============================================================================
  // AI IMMUNE SYSTEM (Self-Healing - Episode #746)
  // ============================================================================

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.immuneSystemConfig.healthCheckIntervalMs);
  }

  private performHealthCheck(): void {
    const now = Date.now();

    for (const [workerId, state] of this.workers) {
      if (state.status === 'terminated') continue;

      const timeSinceHeartbeat = now - state.lastHeartbeat.getTime();

      // Check for heartbeat timeout
      if (timeSinceHeartbeat > this.immuneSystemConfig.heartbeatTimeoutMs) {
        console.warn(`[WorkerManager] Worker ${workerId} heartbeat timeout`);
        this.handleUnhealthyWorker(workerId, 'heartbeat_timeout');
      }

      // Check for error accumulation
      if (state.errorCount >= 3) {
        console.warn(`[WorkerManager] Worker ${workerId} has accumulated ${state.errorCount} errors`);
        this.handleUnhealthyWorker(workerId, 'error_accumulation');
      }
    }
  }

  private handleUnhealthyWorker(workerId: string, reason: string): void {
    const state = this.workers.get(workerId);
    if (!state || !this.immuneSystemConfig.autoHealEnabled) return;

    this.emit({ type: 'worker_unhealthy', workerId, reason });

    // Attempt self-healing
    if (state.restartCount < this.immuneSystemConfig.maxRestarts) {
      console.log(`[WorkerManager] Attempting to heal worker ${workerId} (attempt ${state.restartCount + 1})`);
      
      // Terminate and respawn
      this.terminateWorker(workerId);
      
      setTimeout(() => {
        const newWorkerId = this.spawnWorker(state.type);
        if (newWorkerId) {
          const newState = this.workers.get(newWorkerId);
          if (newState) {
            newState.restartCount = state.restartCount + 1;
          }
          this.emit({ type: 'worker_healed', oldWorkerId: workerId, newWorkerId });
        }
      }, this.immuneSystemConfig.restartCooldownMs);

    } else {
      console.error(`[WorkerManager] Worker ${workerId} exceeded max restarts, giving up`);
      state.status = 'error';
      this.emit({ type: 'worker_failed_permanently', workerId });
    }
  }

  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    const state = this.workers.get(workerId);
    if (!state) return;

    state.errorCount++;
    state.status = 'error';
    
    console.error(`[WorkerManager] Worker ${workerId} error:`, error.message);
    this.emit({ type: 'worker_error', workerId, error: error.message });

    // AI Immune System will handle recovery in health check
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private handleDirectWorkerMessage(workerId: string, message: unknown): void {
    // Messages coming directly from worker.onmessage
    // Forward to BroadcastChannel for other components
    this.workerChannel?.postMessage(message);
  }

  private handleWorkerMessage(message: WorkerMessage): void {
    // Find worker by agentId
    const worker = Array.from(this.workers.values())
      .find(w => message.agentId.includes(w.type));
    
    if (!worker) return;

    // Update heartbeat
    worker.lastHeartbeat = new Date();

    switch (message.type) {
      case 'heartbeat':
        worker.status = 'running';
        break;
      
      case 'result':
        const result = message.payload as { success: boolean; duration?: number; cost?: number };
        if (result.success) {
          worker.stats.tasksCompleted++;
        } else {
          worker.stats.tasksFailed++;
        }
        if (result.duration) {
          const totalTasks = worker.stats.tasksCompleted + worker.stats.tasksFailed;
          worker.stats.avgDuration = 
            (worker.stats.avgDuration * (totalTasks - 1) + result.duration) / totalTasks;
        }
        if (result.cost) {
          worker.stats.totalCost += result.cost;
        }
        break;

      case 'error':
        worker.errorCount++;
        break;
    }
  }

  private updateWorkerFromMessage(message: WorkerMessage): void {
    // Find and update worker state based on message
    for (const [, state] of this.workers) {
      if (message.agentId.includes(state.type)) {
        state.lastHeartbeat = new Date();
        if (message.type === 'heartbeat' || message.type === 'status') {
          state.status = 'running';
        }
        break;
      }
    }
  }

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================

  submitTask(workerId: string, taskType: string, parameters: Record<string, unknown>, priority: WorkerTask['priority'] = 'medium'): string {
    const task: WorkerTask = {
      id: `task-${crypto.randomUUID()}`,
      workerId,
      type: taskType,
      priority,
      parameters,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(task.id, task);

    // Send to worker via BroadcastChannel
    this.workerChannel?.postMessage({
      type: 'task',
      agentId: workerId,
      agentType: this.workers.get(workerId)?.type || 'unknown',
      payload: {
        id: task.id,
        type: taskType,
        priority,
        parameters,
      },
      timestamp: Date.now(),
    });

    task.status = 'sent';
    this.emit({ type: 'task_submitted', task });

    return task.id;
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getWorkers(): WorkerState[] {
    return Array.from(this.workers.values());
  }

  getWorker(workerId: string): WorkerState | undefined {
    return this.workers.get(workerId);
  }

  getWorkersByType(type: AgentWorkerType): WorkerState[] {
    return Array.from(this.workers.values()).filter(w => w.type === type);
  }

  getTasks(): WorkerTask[] {
    return Array.from(this.tasks.values());
  }

  getStats(): {
    totalWorkers: number;
    runningWorkers: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalCost: number;
    avgTaskDuration: number;
  } {
    const workers = this.getWorkers();
    const tasks = this.getTasks();
    
    const runningWorkers = workers.filter(w => w.status === 'running').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;
    
    const totalCost = workers.reduce((sum, w) => sum + w.stats.totalCost, 0);
    const avgDurations = workers.filter(w => w.stats.avgDuration > 0).map(w => w.stats.avgDuration);
    const avgTaskDuration = avgDurations.length > 0 
      ? avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length 
      : 0;

    return {
      totalWorkers: workers.length,
      runningWorkers,
      totalTasks: tasks.length,
      completedTasks,
      failedTasks,
      totalCost,
      avgTaskDuration,
    };
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  subscribe(callback: (event: WorkerManagerEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: WorkerManagerEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[WorkerManager] Event listener error:', e);
      }
    });
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Terminate all workers
    for (const [workerId] of this.workers) {
      this.terminateWorker(workerId);
    }

    this.mainChannel?.close();
    this.workerChannel?.close();
    this.isInitialized = false;

    console.log('🛑 Agent Worker Manager shutdown');
    this.emit({ type: 'manager_stopped' });
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

type WorkerManagerEvent =
  | { type: 'manager_started' }
  | { type: 'manager_stopped' }
  | { type: 'worker_started'; workerId: string; workerType: AgentWorkerType }
  | { type: 'worker_terminated'; workerId: string }
  | { type: 'worker_error'; workerId: string; error: string }
  | { type: 'worker_unhealthy'; workerId: string; reason: string }
  | { type: 'worker_healed'; oldWorkerId: string; newWorkerId: string }
  | { type: 'worker_failed_permanently'; workerId: string }
  | { type: 'task_submitted'; task: WorkerTask }
  | { type: 'task_completed'; task: WorkerTask }
  | { type: 'task_failed'; task: WorkerTask };

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const agentWorkerManager = new AgentWorkerManagerService();

// ============================================================================
// REACT HOOK
// ============================================================================

export function useAgentWorkers() {
  const [workers, setWorkers] = useState<WorkerState[]>([]);
  const [stats, setStats] = useState(agentWorkerManager.getStats());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize manager
    agentWorkerManager.initialize();
    setIsInitialized(true);

    // Subscribe to events
    const unsubscribe = agentWorkerManager.subscribe(() => {
      setWorkers(agentWorkerManager.getWorkers());
      setStats(agentWorkerManager.getStats());
    });

    // Initial state
    setWorkers(agentWorkerManager.getWorkers());

    return () => {
      unsubscribe();
      // Don't shutdown on unmount - workers persist
    };
  }, []);

  const spawnWorker = useCallback((type: AgentWorkerType) => {
    return agentWorkerManager.spawnWorker(type);
  }, []);

  const terminateWorker = useCallback((workerId: string) => {
    agentWorkerManager.terminateWorker(workerId);
  }, []);

  const submitTask = useCallback((
    workerId: string,
    taskType: string,
    parameters: Record<string, unknown>,
    priority?: WorkerTask['priority']
  ) => {
    return agentWorkerManager.submitTask(workerId, taskType, parameters, priority);
  }, []);

  return {
    workers,
    stats,
    isInitialized,
    spawnWorker,
    terminateWorker,
    submitTask,
  };
}
