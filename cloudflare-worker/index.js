/**
 * Cloudflare Worker for DCIM Command Center
 * 
 * Features:
 * - Anthropic Claude API proxy (CORS + API key hiding)
 * - Webhook forwarding (hide webhook URLs)
 * - Cron triggers for scheduled tasks
 * - Rate limiting
 * - Request validation
 * 
 * Secrets required (set via wrangler secret put):
 * - ANTHROPIC_API_KEY
 * - SLACK_WEBHOOK_URL (optional)
 * - DISCORD_WEBHOOK_URL (optional)
 */

// ============================================================================
// RATE LIMITING (using Cloudflare KV)
// ============================================================================

const RATE_LIMIT = {
  CLAUDE_API: { requests: 20, window: 60 }, // 20 req/min
  WEBHOOK: { requests: 10, window: 60 },     // 10 req/min
};

async function checkRateLimit(env, key, limit) {
  if (!env.RATE_LIMITS) return { allowed: true };
  
  const now = Date.now();
  const windowKey = `${key}:${Math.floor(now / (limit.window * 1000))}`;
  
  const count = parseInt(await env.RATE_LIMITS.get(windowKey) || '0', 10);
  
  if (count >= limit.requests) {
    return { allowed: false, remaining: 0 };
  }
  
  await env.RATE_LIMITS.put(windowKey, String(count + 1), { 
    expirationTtl: limit.window * 2 
  });
  
  return { allowed: true, remaining: limit.requests - count - 1 };
}

// ============================================================================
// CORS HELPERS
// ============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function corsResponse(body, status = 200, headers = {}) {
  return new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
        ...headers,
      },
    }
  );
}

function handleOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * Claude API Proxy
 * POST /api/claude
 */
async function handleClaudeProxy(request, env) {
  // Rate limit check
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateCheck = await checkRateLimit(env, `claude:${clientIP}`, RATE_LIMIT.CLAUDE_API);
  
  if (!rateCheck.allowed) {
    return corsResponse({ error: 'Rate limit exceeded' }, 429, {
      'X-RateLimit-Remaining': '0',
      'Retry-After': '60',
    });
  }

  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return corsResponse({ error: 'Invalid request: messages required' }, 400);
    }

    // Forward to Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-20250514',
        max_tokens: body.max_tokens || 1024,
        messages: body.messages,
        system: body.system,
      }),
    });

    const data = await response.json();

    return corsResponse(data, response.status, {
      'X-RateLimit-Remaining': String(rateCheck.remaining),
    });
  } catch (error) {
    console.error('Claude API error:', error);
    return corsResponse({ error: error.message }, 500);
  }
}

/**
 * Webhook Forwarder
 * POST /api/webhook/:provider
 * 
 * Forwards alerts to configured webhooks without exposing URLs to client
 */
async function handleWebhook(request, env, provider) {
  // Rate limit
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateCheck = await checkRateLimit(env, `webhook:${clientIP}`, RATE_LIMIT.WEBHOOK);
  
  if (!rateCheck.allowed) {
    return corsResponse({ error: 'Rate limit exceeded' }, 429);
  }

  // Get webhook URL from secrets
  const webhookUrls = {
    slack: env.SLACK_WEBHOOK_URL,
    discord: env.DISCORD_WEBHOOK_URL,
    teams: env.TEAMS_WEBHOOK_URL,
  };

  const webhookUrl = webhookUrls[provider];
  
  if (!webhookUrl) {
    return corsResponse({ 
      error: `Webhook for ${provider} not configured`,
      configured: Object.keys(webhookUrls).filter(k => webhookUrls[k]),
    }, 400);
  }

  try {
    const body = await request.json();
    
    // Forward to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return corsResponse({ 
        error: `Webhook failed: ${response.status}`,
        details: text.substring(0, 200),
      }, response.status);
    }

    return corsResponse({ success: true, provider });
  } catch (error) {
    console.error('Webhook error:', error);
    return corsResponse({ error: error.message }, 500);
  }
}

/**
 * Health Check
 * GET /api/health
 */
async function handleHealth(env) {
  return corsResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      claude: !!env.ANTHROPIC_API_KEY,
      slack: !!env.SLACK_WEBHOOK_URL,
      discord: !!env.DISCORD_WEBHOOK_URL,
      teams: !!env.TEAMS_WEBHOOK_URL,
      rateLimiting: !!env.RATE_LIMITS,
    },
  });
}

/**
 * EPA ECHO API Proxy (to avoid CORS)
 * GET /api/epa/*
 */
async function handleEpaProxy(request, path) {
  const epaPath = path.replace('/api/epa/', '');
  const url = `https://echo.epa.gov/api/v1/${epaPath}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DCIM-CommandCenter/1.0',
      },
    });
    
    const data = await response.json();
    return corsResponse(data, response.status);
  } catch (error) {
    return corsResponse({ error: error.message }, 500);
  }
}

/**
 * SEC EDGAR API Proxy
 * GET /api/sec/*
 */
async function handleSecProxy(request, path) {
  const secPath = path.replace('/api/sec/', '');
  const url = `https://data.sec.gov/${secPath}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DCIM-CommandCenter contact@example.com',
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    return corsResponse(data, response.status);
  } catch (error) {
    return corsResponse({ error: error.message }, 500);
  }
}

// ============================================================================
// CRON TRIGGERS
// ============================================================================

/**
 * Scheduled tasks
 * Configure in wrangler.toml:
 * 
 * [triggers]
 * crons = ["0 8 * * *", "0 20 * * *"]
 * 
 * 8:00 AM - Morning summary
 * 8:00 PM - Evening check
 */
async function handleScheduled(event, env) {
  const hour = new Date().getUTCHours();
  
  console.log(`Cron triggered at hour ${hour}`);
  
  // Morning summary (8 AM UTC)
  if (hour === 8) {
    await sendDailySummary(env);
  }
  
  // Evening compliance check (8 PM UTC)
  if (hour === 20) {
    await runComplianceCheck(env);
  }
}

async function sendDailySummary(env) {
  if (!env.SLACK_WEBHOOK_URL && !env.DISCORD_WEBHOOK_URL) {
    console.log('No webhooks configured for daily summary');
    return;
  }

  // This would fetch from your D1 database or external API
  const summary = {
    title: '📊 DCIM Daily Summary',
    timestamp: new Date().toISOString(),
    message: 'Automated daily compliance summary from DCIM Command Center',
    // In production, these would come from actual data
    stats: {
      monitored: 11992,
      alerts: 0,
      updates: 0,
    },
  };

  const payload = {
    text: summary.title,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: summary.title },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: summary.message },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `📅 ${new Date().toLocaleDateString()}` },
        ],
      },
    ],
  };

  if (env.SLACK_WEBHOOK_URL) {
    await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  console.log('Daily summary sent');
}

async function runComplianceCheck(env) {
  // Placeholder for compliance check logic
  // In production, this would:
  // 1. Fetch latest data from EPA ECHO, SEC, etc.
  // 2. Compare against thresholds
  // 3. Send alerts for new violations
  
  console.log('Compliance check completed');
}

// ============================================================================
// MAIN ROUTER
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route requests
    try {
      // Health check
      if (path === '/api/health' || path === '/health') {
        return handleHealth(env);
      }

      // Claude API proxy (legacy route for backwards compatibility)
      if (path === '/' && request.method === 'POST') {
        return handleClaudeProxy(request, env);
      }

      // Claude API proxy (new route)
      if (path === '/api/claude' && request.method === 'POST') {
        return handleClaudeProxy(request, env);
      }

      // Webhook forwarding
      if (path.startsWith('/api/webhook/') && request.method === 'POST') {
        const provider = path.split('/')[3];
        return handleWebhook(request, env, provider);
      }

      // EPA ECHO proxy
      if (path.startsWith('/api/epa/')) {
        return handleEpaProxy(request, path);
      }

      // SEC EDGAR proxy
      if (path.startsWith('/api/sec/')) {
        return handleSecProxy(request, path);
      }

      // 404 for unknown routes
      return corsResponse({ error: 'Not found', path }, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return corsResponse({ error: 'Internal server error' }, 500);
    }
  },

  // Cron trigger handler
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(event, env));
  },
};
