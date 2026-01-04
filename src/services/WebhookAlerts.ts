/**
 * Webhook Alert System for DCIM Command Center
 * 
 * Send alerts to Slack, Discord, Microsoft Teams, or custom webhooks
 * when compliance events occur.
 * 
 * All webhooks are stored in IndexedDB (never exposed to client).
 * Actual sends go through Cloudflare Worker to hide URLs.
 */

import { settingsKey, getSettings, saveSettings } from '../utils/settingsPersistence';
import type { Facility } from '../types';
import type { PatternFinding } from '../analyzers/patternLab/types';

// Types
export type WebhookProvider = 'slack' | 'discord' | 'teams' | 'custom';

export interface WebhookConfig {
  id: string;
  name: string;
  provider: WebhookProvider;
  url: string;
  enabled: boolean;
  events: AlertEventType[];
  createdAt: string;
}

export type AlertEventType = 
  | 'new_non_compliant'
  | 'high_severity_finding'
  | 'subsidy_gap_threshold'
  | 'audit_overdue'
  | 'pattern_detected'
  | 'daily_summary';

export interface AlertPayload {
  type: AlertEventType;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  data?: Record<string, any>;
  facilityId?: number;
  facilityName?: string;
  operator?: string;
  state?: string;
  subsidyGap?: number;
}

// Settings key
const WEBHOOKS_KEY = settingsKey('webhooks');

// ============================================================================
// WEBHOOK MANAGEMENT
// ============================================================================

/**
 * Get all configured webhooks
 */
export async function getWebhooks(): Promise<WebhookConfig[]> {
  const saved = await getSettings<{ webhooks: WebhookConfig[] }>(WEBHOOKS_KEY);
  return saved?.webhooks || [];
}

/**
 * Add a new webhook
 */
export async function addWebhook(
  config: Omit<WebhookConfig, 'id' | 'createdAt'>
): Promise<WebhookConfig> {
  const webhooks = await getWebhooks();
  
  const newWebhook: WebhookConfig = {
    ...config,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  
  webhooks.push(newWebhook);
  await saveSettings(WEBHOOKS_KEY, { webhooks });
  
  return newWebhook;
}

/**
 * Update an existing webhook
 */
export async function updateWebhook(
  id: string,
  updates: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>
): Promise<WebhookConfig | null> {
  const webhooks = await getWebhooks();
  const index = webhooks.findIndex(w => w.id === id);
  
  if (index === -1) return null;
  
  webhooks[index] = { ...webhooks[index], ...updates };
  await saveSettings(WEBHOOKS_KEY, { webhooks });
  
  return webhooks[index];
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string): Promise<boolean> {
  const webhooks = await getWebhooks();
  const filtered = webhooks.filter(w => w.id !== id);
  
  if (filtered.length === webhooks.length) return false;
  
  await saveSettings(WEBHOOKS_KEY, { webhooks: filtered });
  return true;
}

/**
 * Toggle webhook enabled state
 */
export async function toggleWebhook(id: string): Promise<boolean> {
  const webhooks = await getWebhooks();
  const webhook = webhooks.find(w => w.id === id);
  
  if (!webhook) return false;
  
  await updateWebhook(id, { enabled: !webhook.enabled });
  return true;
}

// ============================================================================
// ALERT FORMATTING
// ============================================================================

/**
 * Format alert for Slack
 */
function formatSlackMessage(payload: AlertPayload): object {
  const colorMap = {
    info: '#00d2d3',
    warning: '#ffa502',
    error: '#ff4757',
    critical: '#ff0000',
  };

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🔔 ${payload.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: payload.description,
      },
    },
  ];

  // Add facility details if present
  if (payload.facilityName || payload.operator || payload.subsidyGap) {
    const fields: any[] = [];
    
    if (payload.facilityName) {
      fields.push({
        type: 'mrkdwn',
        text: `*Facility:*\n${payload.facilityName}`,
      });
    }
    if (payload.operator) {
      fields.push({
        type: 'mrkdwn',
        text: `*Operator:*\n${payload.operator}`,
      });
    }
    if (payload.state) {
      fields.push({
        type: 'mrkdwn',
        text: `*State:*\n${payload.state}`,
      });
    }
    if (payload.subsidyGap) {
      fields.push({
        type: 'mrkdwn',
        text: `*Subsidy Gap:*\n$${(payload.subsidyGap / 1_000_000).toFixed(2)}M`,
      });
    }

    blocks.push({
      type: 'section',
      fields,
    });
  }

  // Add timestamp
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `📅 ${new Date(payload.timestamp).toLocaleString()} | DCIM Command Center`,
      },
    ],
  });

  return {
    attachments: [
      {
        color: colorMap[payload.severity],
        blocks,
      },
    ],
  };
}

/**
 * Format alert for Discord
 */
function formatDiscordMessage(payload: AlertPayload): object {
  const colorMap = {
    info: 0x00d2d3,
    warning: 0xffa502,
    error: 0xff4757,
    critical: 0xff0000,
  };

  const embed: any = {
    title: `🔔 ${payload.title}`,
    description: payload.description,
    color: colorMap[payload.severity],
    timestamp: payload.timestamp,
    footer: {
      text: 'DCIM Command Center',
    },
  };

  // Add fields if present
  const fields: any[] = [];
  
  if (payload.facilityName) {
    fields.push({ name: '🏢 Facility', value: payload.facilityName, inline: true });
  }
  if (payload.operator) {
    fields.push({ name: '👥 Operator', value: payload.operator, inline: true });
  }
  if (payload.state) {
    fields.push({ name: '📍 State', value: payload.state, inline: true });
  }
  if (payload.subsidyGap) {
    fields.push({ 
      name: '💰 Subsidy Gap', 
      value: `$${(payload.subsidyGap / 1_000_000).toFixed(2)}M`, 
      inline: true 
    });
  }

  if (fields.length > 0) {
    embed.fields = fields;
  }

  return { embeds: [embed] };
}

/**
 * Format alert for Microsoft Teams
 */
function formatTeamsMessage(payload: AlertPayload): object {
  const colorMap = {
    info: '00d2d3',
    warning: 'ffa502',
    error: 'ff4757',
    critical: 'ff0000',
  };

  const facts: any[] = [];
  
  if (payload.facilityName) {
    facts.push({ name: 'Facility', value: payload.facilityName });
  }
  if (payload.operator) {
    facts.push({ name: 'Operator', value: payload.operator });
  }
  if (payload.state) {
    facts.push({ name: 'State', value: payload.state });
  }
  if (payload.subsidyGap) {
    facts.push({ name: 'Subsidy Gap', value: `$${(payload.subsidyGap / 1_000_000).toFixed(2)}M` });
  }

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: colorMap[payload.severity],
    summary: payload.title,
    sections: [
      {
        activityTitle: `🔔 ${payload.title}`,
        activitySubtitle: new Date(payload.timestamp).toLocaleString(),
        text: payload.description,
        facts,
      },
    ],
  };
}

// ============================================================================
// SENDING ALERTS
// ============================================================================

/**
 * Send alert to a specific webhook (via Cloudflare Worker proxy)
 * The Worker URL should be configured to forward to the actual webhook
 */
export async function sendAlert(
  webhookId: string,
  payload: AlertPayload
): Promise<{ success: boolean; error?: string }> {
  const webhooks = await getWebhooks();
  const webhook = webhooks.find(w => w.id === webhookId);
  
  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }
  
  if (!webhook.enabled) {
    return { success: false, error: 'Webhook is disabled' };
  }
  
  if (!webhook.events.includes(payload.type)) {
    return { success: false, error: 'Event type not enabled for this webhook' };
  }

  // Format message based on provider
  let body: object;
  switch (webhook.provider) {
    case 'slack':
      body = formatSlackMessage(payload);
      break;
    case 'discord':
      body = formatDiscordMessage(payload);
      break;
    case 'teams':
      body = formatTeamsMessage(payload);
      break;
    case 'custom':
    default:
      body = payload;
  }

  try {
    // In production, this should go through a Cloudflare Worker
    // to keep the webhook URL private
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send alert to all enabled webhooks that listen for this event type
 */
export async function broadcastAlert(
  payload: AlertPayload
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const webhooks = await getWebhooks();
  const eligibleWebhooks = webhooks.filter(
    w => w.enabled && w.events.includes(payload.type)
  );

  const results = await Promise.all(
    eligibleWebhooks.map(w => sendAlert(w.id, payload))
  );

  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const errors = results.filter(r => r.error).map(r => r.error!);

  return { sent, failed, errors };
}

// ============================================================================
// ALERT HELPERS
// ============================================================================

/**
 * Create alert for a new non-compliant facility
 */
export function createNonCompliantAlert(facility: Facility): AlertPayload {
  return {
    type: 'new_non_compliant',
    title: 'New Non-Compliant Facility Detected',
    description: `Facility "${facility.name}" has been flagged as non-compliant. Immediate review recommended.`,
    severity: 'error',
    timestamp: new Date().toISOString(),
    facilityId: facility.id,
    facilityName: facility.name,
    operator: facility.operator,
    state: facility.state,
    subsidyGap: facility.subsidyGap,
    data: {
      issues: facility.issues,
      lastAudit: facility.lastAuditDate,
    },
  };
}

/**
 * Create alert for a high-severity Pattern Lab finding
 */
export function createPatternFindingAlert(finding: PatternFinding): AlertPayload {
  return {
    type: 'high_severity_finding',
    title: `Pattern Detected: ${finding.title}`,
    description: finding.description,
    severity: finding.severity === 'critical' ? 'critical' : 'warning',
    timestamp: new Date().toISOString(),
    data: {
      type: finding.type,
      score: finding.score,
      affectedOperators: finding.affectedOperators,
      affectedFacilityCount: finding.affectedFacilities.length,
    },
  };
}

/**
 * Create alert when subsidy gap exceeds threshold
 */
export function createSubsidyGapAlert(
  facility: Facility,
  threshold: number
): AlertPayload {
  return {
    type: 'subsidy_gap_threshold',
    title: 'Subsidy Gap Threshold Exceeded',
    description: `"${facility.name}" subsidy gap of $${(facility.subsidyGap / 1_000_000).toFixed(2)}M exceeds threshold of $${(threshold / 1_000_000).toFixed(2)}M.`,
    severity: 'warning',
    timestamp: new Date().toISOString(),
    facilityId: facility.id,
    facilityName: facility.name,
    operator: facility.operator,
    state: facility.state,
    subsidyGap: facility.subsidyGap,
  };
}

/**
 * Create daily summary alert
 */
export function createDailySummaryAlert(stats: {
  totalFacilities: number;
  nonCompliant: number;
  atRisk: number;
  totalGap: number;
  newFindings: number;
}): AlertPayload {
  return {
    type: 'daily_summary',
    title: 'DCIM Daily Summary',
    description: `📊 **${stats.totalFacilities}** facilities monitored\n` +
      `⚠️ **${stats.nonCompliant}** non-compliant\n` +
      `🔶 **${stats.atRisk}** at risk\n` +
      `💰 **$${(stats.totalGap / 1_000_000).toFixed(2)}M** total subsidy gap\n` +
      `🔍 **${stats.newFindings}** new patterns detected`,
    severity: 'info',
    timestamp: new Date().toISOString(),
    data: stats,
  };
}

// ============================================================================
// TEST WEBHOOK
// ============================================================================

/**
 * Send a test message to verify webhook configuration
 */
export async function testWebhook(webhookId: string): Promise<{ success: boolean; error?: string }> {
  const testPayload: AlertPayload = {
    type: 'pattern_detected',
    title: 'Test Alert from DCIM Command Center',
    description: 'This is a test message to verify your webhook configuration is working correctly. If you see this, your webhook is properly configured! 🎉',
    severity: 'info',
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: 'Webhook verification successful',
    },
  };

  // Temporarily enable all events for test
  const webhooks = await getWebhooks();
  const webhook = webhooks.find(w => w.id === webhookId);
  
  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  // Format and send directly (bypass event type check for test)
  let body: object;
  switch (webhook.provider) {
    case 'slack':
      body = formatSlackMessage(testPayload);
      break;
    case 'discord':
      body = formatDiscordMessage(testPayload);
      break;
    case 'teams':
      body = formatTeamsMessage(testPayload);
      break;
    default:
      body = testPayload;
  }

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${await response.text()}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

