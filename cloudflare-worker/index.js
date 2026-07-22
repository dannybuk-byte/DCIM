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
 * - WORKER_API_TOKEN (Stage-1 hardening: bearer token for /api/claude, /, /api/webhook/*;
 *   until it is set, protected routes serve unauthenticated — rollout escape hatch)
 * - SLACK_WEBHOOK_URL (optional)
 * - DISCORD_WEBHOOK_URL (optional)
 */

// ============================================================================
// RATE LIMITING (using Cloudflare KV)
// ============================================================================

const RATE_LIMIT = {
  CLAUDE_API: { requests: 20, window: 60 }, // 20 req/min
  WEBHOOK: { requests: 10, window: 60 },     // 10 req/min
  PROXY: { requests: 60, window: 60 },       // 60 req/min (EPA/SEC read-only proxies)
};

async function checkRateLimit(env, key, limit) {
  if (!env.RATE_LIMITS) {
    // Fail closed in production: without the KV binding there is no way to
    // count requests, so production refuses rather than serving unlimited.
    // Non-production environments stay permissive for local dev/preview.
    return { allowed: env.ENVIRONMENT !== 'production', remaining: 0 };
  }
  
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
// CORS HELPERS (Stage 1 hardening: allowlist instead of *)
// ============================================================================

const ALLOWED_ORIGINS = [
  'https://dcim-compliance.pages.dev',
  'http://localhost:5173',
];

/** CORS headers for an allowlisted Origin, or null (no CORS) otherwise. */
function corsHeadersFor(origin) {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/** Apply per-request CORS headers to a finished response (no-op if origin not allowlisted). */
function withCors(response, corsHeaders) {
  if (!corsHeaders) return response;
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(corsHeaders)) r.headers.set(k, v);
  return r;
}

function corsResponse(body, status = 200, headers = {}) {
  return new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

// ============================================================================
// AUTH (Stage 1 hardening: shared secret on money/notification routes)
// ============================================================================

/** Constant-time comparison via SHA-256 digests (equal-length XOR fold). */
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i += 1) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/**
 * Require `Authorization: Bearer <WORKER_API_TOKEN>` on protected routes.
 * Returns null when the request may proceed, or a 401 Response.
 *
 * Stage-1 rollout escape hatch: if WORKER_API_TOKEN is not configured,
 * requests are allowed (with a log line) so deploying this code before the
 * secret exists cannot break the live UI. Remove in Stage 2.
 */
async function requireAuth(request, env) {
  if (!env.WORKER_API_TOKEN) {
    console.log(
      'AUTH WARNING: WORKER_API_TOKEN unset — protected route served without auth (Stage-1 escape hatch)',
    );
    return null;
  }
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token && (await timingSafeEqual(token, env.WORKER_API_TOKEN))) {
    return null;
  }
  return corsResponse({ error: 'Unauthorized' }, 401);
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
  // Stage 1 hardening: no per-secret feature disclosure to anonymous callers.
  return corsResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
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

const SEC_EDGAR_UA =
  'DCIM-ComplianceDashboard/1.0 (https://github.com/dannybuk-byte/DCIM; labor-infrastructure-research)';

/**
 * SEC EDGAR API Proxy (data.sec.gov — JSON bulk data)
 * GET /api/sec/*
 */
async function handleSecProxy(request, path) {
  const secPath = path.replace('/api/sec/', '');
  const url = `https://data.sec.gov/${secPath}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': SEC_EDGAR_UA,
        Accept: 'application/json',
      },
    });

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await response.json();
      return corsResponse(data, response.status);
    }

    const text = await response.text();
    return corsResponse(
      {
        _sec_proxy_non_json: true,
        content_type: ct,
        body: text,
      },
      response.status,
    );
  } catch (error) {
    return corsResponse({ error: error.message }, 500);
  }
}

/**
 * SEC www.sec.gov/files/* proxy (e.g. company_tickers.json)
 * GET /api/sec/files/{path} → https://www.sec.gov/files/{path}
 * Same SEC_EDGAR_UA and non-JSON defensive wrapping as handleSecProxy.
 */
async function handleSecFilesProxy(request, path) {
  const rest = path.replace(/^\/api\/sec\/files\/?/, '');
  if (!rest || rest.includes('..')) {
    return corsResponse({ error: 'Invalid files path' }, 400);
  }
  const url = `https://www.sec.gov/files/${rest}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': SEC_EDGAR_UA,
        Accept: 'application/json',
      },
    });

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await response.json();
      return corsResponse(data, response.status);
    }

    const text = await response.text();
    return corsResponse(
      {
        _sec_proxy_non_json: true,
        content_type: ct,
        body: text,
      },
      response.status,
    );
  } catch (error) {
    return corsResponse({ error: error.message }, 500);
  }
}

/**
 * SEC EDGAR Archives proxy (www.sec.gov — filing HTML/XML)
 * GET /api/sec/archives/* → https://www.sec.gov/Archives/edgar/*
 * Used by offline Python pipelines; same fair-access User-Agent as data.sec.gov.
 */
async function handleSecArchivesProxy(request, path) {
  const rest = path.replace(/^\/api\/sec\/archives\/?/, '');
  if (!rest || rest.includes('..')) {
    return corsResponse({ error: 'Invalid archives path' }, 400);
  }
  const url = `https://www.sec.gov/Archives/edgar/${rest}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': SEC_EDGAR_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
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

async function routeRequest(request, env, path) {
  // Health check
  if (path === '/api/health' || path === '/health') {
    return handleHealth(env);
  }

  // Claude API proxy (legacy route for backwards compatibility) — auth required
  if (path === '/' && request.method === 'POST') {
    const denied = await requireAuth(request, env);
    if (denied) return denied;
    return handleClaudeProxy(request, env);
  }

  // Claude API proxy (new route) — auth required
  if (path === '/api/claude' && request.method === 'POST') {
    const denied = await requireAuth(request, env);
    if (denied) return denied;
    return handleClaudeProxy(request, env);
  }

  // Webhook forwarding — auth required
  if (path.startsWith('/api/webhook/') && request.method === 'POST') {
    const denied = await requireAuth(request, env);
    if (denied) return denied;
    const provider = path.split('/')[3];
    return handleWebhook(request, env, provider);
  }

  // EPA / SEC read-only proxies: unauthenticated but rate limited (Stage 1)
  if (path.startsWith('/api/epa/') || path.startsWith('/api/sec/')) {
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateCheck = await checkRateLimit(env, `proxy:${clientIP}`, RATE_LIMIT.PROXY);
    if (!rateCheck.allowed) {
      return corsResponse({ error: 'Rate limit exceeded' }, 429, { 'Retry-After': '60' });
    }

    // EPA ECHO proxy
    if (path.startsWith('/api/epa/')) {
      return handleEpaProxy(request, path);
    }

    // SEC EDGAR filing archives (HTML) — must be registered before /api/sec/ prefix match
    if (path.startsWith('/api/sec/archives/')) {
      return handleSecArchivesProxy(request, path);
    }

    // SEC www.sec.gov/files/* (e.g. company_tickers.json) — before data.sec.gov /api/sec/ catch-all
    if (path.startsWith('/api/sec/files/')) {
      return handleSecFilesProxy(request, path);
    }

    // SEC EDGAR data.sec.gov JSON
    return handleSecProxy(request, path);
  }

  // 404 for unknown routes
  return corsResponse({ error: 'Not found', path }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeadersFor(request.headers.get('Origin'));

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors ?? {} });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    let response;
    try {
      response = await routeRequest(request, env, path);
    } catch (error) {
      console.error('Worker error:', error);
      response = corsResponse({ error: 'Internal server error' }, 500);
    }
    return withCors(response, cors);
  },

  // Cron trigger handler
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(event, env));
  },
};
