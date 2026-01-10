/**
 * AI Immune System
 * 
 * Implements self-healing patterns from TWIML Episode #746 (PlayerZero):
 * - Automatic failure detection and recovery
 * - Cascading failure prevention
 * - Adaptive thresholds based on system load
 * - Health scoring and degradation modes
 * - Circuit breaker coordination across agents
 * 
 * Key insight: System should get stronger under stress, not weaker.
 * Each failure teaches the system to be more resilient.
 * 
 * @module aiImmuneSystem
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ComponentType = 
  | 'agent'
  | 'worker'
  | 'service'
  | 'database'
  | 'api'
  | 'ui';

export type HealthStatus = 
  | 'healthy'      // All systems nominal
  | 'degraded'     // Partial functionality
  | 'recovering'   // Self-healing in progress
  | 'critical'     // Major issues, intervention needed
  | 'offline';     // Component unavailable

export interface ComponentHealth {
  id: string;
  type: ComponentType;
  name: string;
  status: HealthStatus;
  healthScore: number; // 0-100
  lastHeartbeat: Date;
  errorCount: number;
  recoveryAttempts: number;
  lastError?: string;
  metadata: Record<string, unknown>;
}

export interface HealthEvent {
  id: string;
  componentId: string;
  eventType: 'error' | 'recovery' | 'degradation' | 'healing' | 'threshold_breach';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  data?: unknown;
  resolved: boolean;
  resolvedAt?: Date;
  resolutionAction?: string;
}

export interface HealingAction {
  id: string;
  componentId: string;
  actionType: HealingActionType;
  triggeredAt: Date;
  status: 'pending' | 'executing' | 'success' | 'failed';
  completedAt?: Date;
  result?: string;
}

export type HealingActionType =
  | 'restart_component'
  | 'clear_cache'
  | 'reduce_load'
  | 'failover'
  | 'circuit_break'
  | 'rate_limit'
  | 'graceful_degradation'
  | 'alert_human';

export interface ImmuneConfig {
  enabled: boolean;
  autoHealEnabled: boolean;
  healthCheckIntervalMs: number;
  heartbeatTimeoutMs: number;
  maxRecoveryAttempts: number;
  recoveryBackoffMs: number;
  degradationThreshold: number; // Health score below this triggers degradation
  criticalThreshold: number;    // Health score below this triggers critical
  cascadePreventionEnabled: boolean;
  learningEnabled: boolean;     // Learn from past failures
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ImmuneConfig = {
  enabled: true,
  autoHealEnabled: true,
  healthCheckIntervalMs: 10000,
  heartbeatTimeoutMs: 30000,
  maxRecoveryAttempts: 3,
  recoveryBackoffMs: 5000,
  degradationThreshold: 60,
  criticalThreshold: 30,
  cascadePreventionEnabled: true,
  learningEnabled: true,
};

// ============================================================================
// AI IMMUNE SYSTEM
// ============================================================================

class AIImmuneSystemService {
  private components = new Map<string, ComponentHealth>();
  private events: HealthEvent[] = [];
  private healingActions = new Map<string, HealingAction>();
  private config: ImmuneConfig = DEFAULT_CONFIG;
  private listeners = new Set<(event: ImmuneEvent) => void>();
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private isActive = false;
  
  // Learning system
  private failurePatterns = new Map<string, {
    pattern: string;
    count: number;
    successfulHealings: HealingActionType[];
    lastOccurrence: Date;
  }>();

  // Circuit breakers per component
  private circuitBreakers = new Map<string, {
    isOpen: boolean;
    failureCount: number;
    lastFailure: Date | null;
    openedAt: Date | null;
    cooldownMs: number;
  }>();

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  start(): void {
    if (this.isActive) return;

    this.isActive = true;

    // Start periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);

    console.log('🛡️ AI Immune System activated');
    this.emit({ type: 'system_activated' });
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.isActive = false;
    console.log('🛡️ AI Immune System deactivated');
    this.emit({ type: 'system_deactivated' });
  }

  // ============================================================================
  // COMPONENT REGISTRATION
  // ============================================================================

  registerComponent(
    id: string,
    type: ComponentType,
    name: string,
    metadata: Record<string, unknown> = {}
  ): ComponentHealth {
    const health: ComponentHealth = {
      id,
      type,
      name,
      status: 'healthy',
      healthScore: 100,
      lastHeartbeat: new Date(),
      errorCount: 0,
      recoveryAttempts: 0,
      metadata,
    };

    this.components.set(id, health);
    
    // Initialize circuit breaker
    this.circuitBreakers.set(id, {
      isOpen: false,
      failureCount: 0,
      lastFailure: null,
      openedAt: null,
      cooldownMs: 60000,
    });

    console.log(`[ImmuneSystem] Registered component: ${name} (${type})`);
    this.emit({ type: 'component_registered', component: health });

    return health;
  }

  unregisterComponent(id: string): void {
    this.components.delete(id);
    this.circuitBreakers.delete(id);
    console.log(`[ImmuneSystem] Unregistered component: ${id}`);
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  /**
   * Receive heartbeat from a component
   */
  heartbeat(componentId: string, metadata?: Record<string, unknown>): void {
    const component = this.components.get(componentId);
    if (!component) return;

    component.lastHeartbeat = new Date();
    
    if (metadata) {
      component.metadata = { ...component.metadata, ...metadata };
    }

    // Improve health score on successful heartbeat
    if (component.healthScore < 100) {
      component.healthScore = Math.min(100, component.healthScore + 2);
    }

    // Check if was in recovery
    if (component.status === 'recovering' && component.healthScore > this.config.degradationThreshold) {
      this.updateComponentStatus(component, 'healthy');
      this.recordEvent(componentId, 'recovery', 'info', `Component ${component.name} recovered`);
    }
  }

  /**
   * Report an error from a component
   */
  reportError(
    componentId: string,
    error: string,
    severity: 'warning' | 'error' | 'critical' = 'error'
  ): void {
    const component = this.components.get(componentId);
    if (!component) return;

    component.errorCount++;
    component.lastError = error;

    // Decrease health score based on severity
    const healthPenalty = severity === 'critical' ? 30 : severity === 'error' ? 15 : 5;
    component.healthScore = Math.max(0, component.healthScore - healthPenalty);

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(componentId);
    if (breaker) {
      breaker.failureCount++;
      breaker.lastFailure = new Date();

      // Open circuit breaker after threshold
      if (breaker.failureCount >= 5 && !breaker.isOpen) {
        this.openCircuitBreaker(componentId);
      }
    }

    // Record event
    this.recordEvent(componentId, 'error', severity, error);

    // Update status based on health score
    this.evaluateComponentHealth(component);

    // Learn from error pattern
    if (this.config.learningEnabled) {
      this.learnFromError(componentId, error);
    }

    // Trigger healing if enabled
    if (this.config.autoHealEnabled && component.status !== 'healthy') {
      this.triggerHealing(component);
    }
  }

  /**
   * Perform periodic health check
   */
  private performHealthCheck(): void {
    const now = Date.now();

    for (const [id, component] of this.components) {
      // Check heartbeat timeout
      const timeSinceHeartbeat = now - component.lastHeartbeat.getTime();
      
      if (timeSinceHeartbeat > this.config.heartbeatTimeoutMs) {
        component.healthScore = Math.max(0, component.healthScore - 10);
        this.recordEvent(id, 'threshold_breach', 'warning', 
          `Heartbeat timeout for ${component.name}: ${Math.round(timeSinceHeartbeat / 1000)}s`);
      }

      // Evaluate health
      this.evaluateComponentHealth(component);

      // Check circuit breakers for reset
      this.checkCircuitBreakerReset(id);
    }

    // Check for cascade risk
    if (this.config.cascadePreventionEnabled) {
      this.checkCascadeRisk();
    }

    // Emit overall health status
    this.emit({ type: 'health_check_complete', systemHealth: this.getSystemHealth() });
  }

  private evaluateComponentHealth(component: ComponentHealth): void {
    const prevStatus = component.status;
    
    if (component.healthScore >= 80) {
      component.status = 'healthy';
    } else if (component.healthScore >= this.config.degradationThreshold) {
      component.status = 'degraded';
    } else if (component.healthScore >= this.config.criticalThreshold) {
      component.status = 'recovering';
    } else if (component.healthScore > 0) {
      component.status = 'critical';
    } else {
      component.status = 'offline';
    }

    if (prevStatus !== component.status) {
      this.updateComponentStatus(component, component.status);
    }
  }

  private updateComponentStatus(component: ComponentHealth, newStatus: HealthStatus): void {
    const prevStatus = component.status;
    component.status = newStatus;

    this.emit({ 
      type: 'status_changed', 
      componentId: component.id, 
      prevStatus, 
      newStatus 
    });

    if (newStatus === 'critical' || newStatus === 'offline') {
      this.recordEvent(
        component.id,
        'degradation',
        'critical',
        `Component ${component.name} is now ${newStatus}`
      );
    }
  }

  // ============================================================================
  // CIRCUIT BREAKER
  // ============================================================================

  private openCircuitBreaker(componentId: string): void {
    const breaker = this.circuitBreakers.get(componentId);
    if (!breaker) return;

    breaker.isOpen = true;
    breaker.openedAt = new Date();

    const component = this.components.get(componentId);
    this.recordEvent(
      componentId,
      'threshold_breach',
      'warning',
      `Circuit breaker opened for ${component?.name || componentId}`
    );

    this.emit({ type: 'circuit_breaker_opened', componentId });
  }

  private checkCircuitBreakerReset(componentId: string): void {
    const breaker = this.circuitBreakers.get(componentId);
    if (!breaker || !breaker.isOpen || !breaker.openedAt) return;

    const now = Date.now();
    if (now - breaker.openedAt.getTime() > breaker.cooldownMs) {
      // Reset to half-open state
      breaker.isOpen = false;
      breaker.failureCount = Math.floor(breaker.failureCount / 2);
      
      this.emit({ type: 'circuit_breaker_reset', componentId });
    }
  }

  isCircuitBreakerOpen(componentId: string): boolean {
    return this.circuitBreakers.get(componentId)?.isOpen ?? false;
  }

  // ============================================================================
  // SELF-HEALING
  // ============================================================================

  private async triggerHealing(component: ComponentHealth): Promise<void> {
    if (component.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      this.recordEvent(
        component.id,
        'healing',
        'critical',
        `Max recovery attempts (${this.config.maxRecoveryAttempts}) reached for ${component.name}`
      );
      this.emit({ type: 'healing_exhausted', componentId: component.id });
      return;
    }

    // Determine best healing action
    const healingAction = this.determineHealingAction(component);

    // Create healing action record
    const action: HealingAction = {
      id: `heal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      componentId: component.id,
      actionType: healingAction,
      triggeredAt: new Date(),
      status: 'pending',
    };

    this.healingActions.set(action.id, action);
    component.recoveryAttempts++;

    // Execute healing
    try {
      action.status = 'executing';
      this.emit({ type: 'healing_started', action });

      await this.executeHealingAction(component, action);

      action.status = 'success';
      action.completedAt = new Date();
      action.result = 'Healing action completed successfully';

      this.recordEvent(
        component.id,
        'healing',
        'info',
        `Successfully executed ${healingAction} for ${component.name}`
      );

      // Learn from successful healing
      if (this.config.learningEnabled) {
        this.learnFromHealing(component.id, component.lastError || 'unknown', healingAction);
      }

    } catch (error) {
      action.status = 'failed';
      action.completedAt = new Date();
      action.result = error instanceof Error ? error.message : 'Unknown error';

      this.recordEvent(
        component.id,
        'healing',
        'error',
        `Healing action ${healingAction} failed for ${component.name}: ${action.result}`
      );
    }

    this.emit({ type: 'healing_completed', action });
  }

  private determineHealingAction(component: ComponentHealth): HealingActionType {
    // Check learned patterns first
    const pattern = this.failurePatterns.get(component.lastError || '');
    if (pattern && pattern.successfulHealings.length > 0) {
      return pattern.successfulHealings[0];
    }

    // Default healing strategy based on component type and health
    if (component.healthScore < this.config.criticalThreshold) {
      if (component.type === 'agent' || component.type === 'worker') {
        return 'restart_component';
      }
      return 'graceful_degradation';
    }

    if (component.errorCount > 10) {
      return 'rate_limit';
    }

    if (component.type === 'api') {
      return 'circuit_break';
    }

    return 'reduce_load';
  }

  private async executeHealingAction(
    component: ComponentHealth,
    action: HealingAction
  ): Promise<void> {
    // Backoff before healing
    await new Promise(resolve => 
      setTimeout(resolve, this.config.recoveryBackoffMs * component.recoveryAttempts)
    );

    switch (action.actionType) {
      case 'restart_component':
        // Signal restart via event - actual restart handled by component manager
        this.emit({ type: 'restart_requested', componentId: component.id });
        break;

      case 'clear_cache':
        // Clear component-specific cache
        this.emit({ type: 'cache_clear_requested', componentId: component.id });
        break;

      case 'reduce_load':
        // Signal load reduction
        this.emit({ type: 'load_reduction_requested', componentId: component.id });
        break;

      case 'circuit_break':
        this.openCircuitBreaker(component.id);
        break;

      case 'rate_limit':
        // Apply rate limiting
        this.emit({ type: 'rate_limit_applied', componentId: component.id });
        break;

      case 'graceful_degradation':
        component.status = 'degraded';
        this.emit({ type: 'degradation_mode_entered', componentId: component.id });
        break;

      case 'failover':
        this.emit({ type: 'failover_requested', componentId: component.id });
        break;

      case 'alert_human':
        this.emit({ 
          type: 'human_intervention_needed', 
          componentId: component.id,
          reason: component.lastError || 'Automated healing failed'
        });
        break;
    }

    // Give action time to take effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Bump health score slightly after healing attempt
    component.healthScore = Math.min(100, component.healthScore + 10);
  }

  // ============================================================================
  // CASCADE PREVENTION
  // ============================================================================

  private checkCascadeRisk(): void {
    const unhealthyCount = Array.from(this.components.values())
      .filter(c => c.status !== 'healthy').length;
    
    const totalComponents = this.components.size;
    const unhealthyRatio = totalComponents > 0 ? unhealthyCount / totalComponents : 0;

    // If more than 50% of components are unhealthy, prevent cascade
    if (unhealthyRatio > 0.5) {
      this.recordEvent(
        'system',
        'threshold_breach',
        'critical',
        `Cascade risk detected: ${unhealthyCount}/${totalComponents} components unhealthy`
      );

      // Enter defensive mode - stop aggressive healing
      this.emit({ type: 'cascade_risk_detected', unhealthyRatio });

      // Prioritize critical components
      this.prioritizeRecovery();
    }
  }

  private prioritizeRecovery(): void {
    // Priority order: database > api > service > agent > worker > ui
    const priority: ComponentType[] = ['database', 'api', 'service', 'agent', 'worker', 'ui'];
    
    const sortedComponents = Array.from(this.components.values())
      .filter(c => c.status !== 'healthy')
      .sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type));

    // Only heal top priority component
    if (sortedComponents.length > 0 && this.config.autoHealEnabled) {
      this.triggerHealing(sortedComponents[0]);
    }
  }

  // ============================================================================
  // LEARNING
  // ============================================================================

  private learnFromError(componentId: string, error: string): void {
    // Simplify error to pattern
    const pattern = this.extractErrorPattern(error);
    
    const existing = this.failurePatterns.get(pattern);
    if (existing) {
      existing.count++;
      existing.lastOccurrence = new Date();
    } else {
      this.failurePatterns.set(pattern, {
        pattern,
        count: 1,
        successfulHealings: [],
        lastOccurrence: new Date(),
      });
    }
  }

  private learnFromHealing(
    componentId: string,
    error: string,
    healingAction: HealingActionType
  ): void {
    const pattern = this.extractErrorPattern(error);
    const patternData = this.failurePatterns.get(pattern);
    
    if (patternData) {
      // Add to successful healings if not already present
      if (!patternData.successfulHealings.includes(healingAction)) {
        patternData.successfulHealings.unshift(healingAction);
        // Keep only top 3 most recent successful healings
        patternData.successfulHealings = patternData.successfulHealings.slice(0, 3);
      }
    }
  }

  private extractErrorPattern(error: string): string {
    // Simplify error message to a pattern
    return error
      .toLowerCase()
      .replace(/\d+/g, 'N')           // Replace numbers with N
      .replace(/[a-f0-9]{8,}/g, 'ID')  // Replace hashes/IDs with ID
      .substring(0, 100);              // Limit length
  }

  // ============================================================================
  // EVENT RECORDING
  // ============================================================================

  private recordEvent(
    componentId: string,
    eventType: HealthEvent['eventType'],
    severity: HealthEvent['severity'],
    message: string,
    data?: unknown
  ): void {
    const event: HealthEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      componentId,
      eventType,
      severity,
      message,
      timestamp: new Date(),
      data,
      resolved: false,
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }

    this.emit({ type: 'event_recorded', event });
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getSystemHealth(): {
    status: HealthStatus;
    healthScore: number;
    componentCount: number;
    healthyCount: number;
    degradedCount: number;
    criticalCount: number;
    offlineCount: number;
  } {
    const components = Array.from(this.components.values());
    const healthyCount = components.filter(c => c.status === 'healthy').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;
    const criticalCount = components.filter(c => c.status === 'critical').length;
    const offlineCount = components.filter(c => c.status === 'offline').length;

    const avgScore = components.length > 0
      ? components.reduce((sum, c) => sum + c.healthScore, 0) / components.length
      : 100;

    let systemStatus: HealthStatus = 'healthy';
    if (offlineCount > 0 || criticalCount > components.length * 0.3) {
      systemStatus = 'critical';
    } else if (criticalCount > 0 || degradedCount > components.length * 0.5) {
      systemStatus = 'degraded';
    }

    return {
      status: systemStatus,
      healthScore: Math.round(avgScore),
      componentCount: components.length,
      healthyCount,
      degradedCount,
      criticalCount,
      offlineCount,
    };
  }

  getComponent(id: string): ComponentHealth | undefined {
    return this.components.get(id);
  }

  getAllComponents(): ComponentHealth[] {
    return Array.from(this.components.values());
  }

  getRecentEvents(limit = 50): HealthEvent[] {
    return this.events.slice(-limit).reverse();
  }

  getHealingHistory(limit = 20): HealingAction[] {
    return Array.from(this.healingActions.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  getLearnedPatterns(): Array<{
    pattern: string;
    count: number;
    successfulHealings: HealingActionType[];
  }> {
    return Array.from(this.failurePatterns.values())
      .sort((a, b) => b.count - a.count);
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  updateConfig(updates: Partial<ImmuneConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[ImmuneSystem] Configuration updated');
  }

  getConfig(): ImmuneConfig {
    return { ...this.config };
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  subscribe(callback: (event: ImmuneEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: ImmuneEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[ImmuneSystem] Event listener error:', e);
      }
    });
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

type ImmuneEvent =
  | { type: 'system_activated' }
  | { type: 'system_deactivated' }
  | { type: 'component_registered'; component: ComponentHealth }
  | { type: 'status_changed'; componentId: string; prevStatus: HealthStatus; newStatus: HealthStatus }
  | { type: 'circuit_breaker_opened'; componentId: string }
  | { type: 'circuit_breaker_reset'; componentId: string }
  | { type: 'healing_started'; action: HealingAction }
  | { type: 'healing_completed'; action: HealingAction }
  | { type: 'healing_exhausted'; componentId: string }
  | { type: 'cascade_risk_detected'; unhealthyRatio: number }
  | { type: 'health_check_complete'; systemHealth: ReturnType<AIImmuneSystemService['getSystemHealth']> }
  | { type: 'event_recorded'; event: HealthEvent }
  | { type: 'restart_requested'; componentId: string }
  | { type: 'cache_clear_requested'; componentId: string }
  | { type: 'load_reduction_requested'; componentId: string }
  | { type: 'rate_limit_applied'; componentId: string }
  | { type: 'degradation_mode_entered'; componentId: string }
  | { type: 'failover_requested'; componentId: string }
  | { type: 'human_intervention_needed'; componentId: string; reason: string };

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const aiImmuneSystem = new AIImmuneSystemService();

// ============================================================================
// REACT HOOK
// ============================================================================

export function useAIImmuneSystem() {
  const [systemHealth, setSystemHealth] = useState(aiImmuneSystem.getSystemHealth());
  const [components, setComponents] = useState<ComponentHealth[]>([]);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Start immune system
    aiImmuneSystem.start();
    setIsActive(true);

    // Subscribe to events
    const unsubscribe = aiImmuneSystem.subscribe((event) => {
      setSystemHealth(aiImmuneSystem.getSystemHealth());
      setComponents(aiImmuneSystem.getAllComponents());
      setEvents(aiImmuneSystem.getRecentEvents());
    });

    // Initial state
    setComponents(aiImmuneSystem.getAllComponents());
    setEvents(aiImmuneSystem.getRecentEvents());

    return () => {
      unsubscribe();
    };
  }, []);

  const registerComponent = useCallback((
    id: string,
    type: ComponentType,
    name: string,
    metadata?: Record<string, unknown>
  ) => {
    return aiImmuneSystem.registerComponent(id, type, name, metadata);
  }, []);

  const heartbeat = useCallback((componentId: string, metadata?: Record<string, unknown>) => {
    aiImmuneSystem.heartbeat(componentId, metadata);
  }, []);

  const reportError = useCallback((
    componentId: string,
    error: string,
    severity?: 'warning' | 'error' | 'critical'
  ) => {
    aiImmuneSystem.reportError(componentId, error, severity);
  }, []);

  return {
    systemHealth,
    components,
    events,
    isActive,
    config: aiImmuneSystem.getConfig(),
    registerComponent,
    heartbeat,
    reportError,
    updateConfig: aiImmuneSystem.updateConfig.bind(aiImmuneSystem),
    isCircuitBreakerOpen: aiImmuneSystem.isCircuitBreakerOpen.bind(aiImmuneSystem),
    getHealingHistory: () => aiImmuneSystem.getHealingHistory(),
    getLearnedPatterns: () => aiImmuneSystem.getLearnedPatterns(),
  };
}
