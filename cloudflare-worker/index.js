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
  ROUTEVIEWS: { requests: 60, window: 60 },  // 60 req/min (per IP)
  EIA: { requests: 60, window: 60 },         // 60 req/min (per IP)
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
// CACHE HELPERS (Cache API, no KV required)
// ============================================================================

async function getCachedJson(env, cacheKeyUrl) {
  void env;
  const cache = caches.default;
  const cached = await cache.match(cacheKeyUrl.toString());
  if (!cached) return null;
  try {
    return await cached.json();
  } catch {
    return null;
  }
}

async function putCachedJson(env, cacheKeyUrl, json, ttlSeconds) {
  void env;
  const cache = caches.default;
  const res = corsResponse(json, 200, {
    'Cache-Control': `public, max-age=${ttlSeconds}`,
    'CF-Cache-Status': 'MISS',
  });
  await cache.put(cacheKeyUrl.toString(), res.clone());
  return res;
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

/**
 * OpenCorporates API Proxy (to avoid CORS)
 * GET /api/opencorporates/*
 */
async function handleOpenCorporatesProxy(request, path) {
  const ocPath = path.replace('/api/opencorporates/', '');
  const url = new URL(request.url);
  const searchParams = url.search;
  const fullUrl = `https://api.opencorporates.com/v0.4/${ocPath}${searchParams}`;
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'DCIM-CommandCenter/1.0',
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    return corsResponse(data, response.status);
  } catch (error) {
    return corsResponse({ error: error.message }, 500);
  }
}

/**
 * PeeringDB API Proxy (to avoid CORS)
 * GET /api/peeringdb/*
 */
async function handlePeeringDbProxy(request, path) {
  const pdbPath = path.replace('/api/peeringdb/', '');
  const url = new URL(request.url);
  const searchParams = url.search;
  const fullUrl = `https://www.peeringdb.com/api/${pdbPath}${searchParams}`;
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'DCIM-CommandCenter/1.0',
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    return corsResponse(data, response.status);
  } catch (error) {
    return corsResponse({ error: error.message }, 500);
  }
}

/**
 * RouteViews API Proxy (to avoid CORS + stabilize short caching)
 * GET /api/routeviews/prefix/:prefix
 *
 * Note: the upstream API does not consistently include Access-Control-Allow-Origin.
 * This proxy normalizes it and adds short caching to reduce load.
 */
async function handleRouteViewsProxy(request, env, path) {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateCheck = await checkRateLimit(env, `routeviews:${clientIP}`, RATE_LIMIT.ROUTEVIEWS);
  if (!rateCheck.allowed) return corsResponse({ error: 'Rate limit exceeded' }, 429);

  const raw = path.replace('/api/routeviews/prefix/', '');
  const decoded = decodeURIComponent(raw || '');
  const prefix = decoded.trim();

  // Minimal validation: allow IPv4/IPv6 CIDR-ish strings only
  if (!/^[0-9a-fA-F:.]+\/\d{1,3}$/.test(prefix)) {
    return corsResponse({ error: 'Invalid prefix format' }, 400);
  }

  const cacheKeyUrl = new URL(request.url);
  cacheKeyUrl.pathname = '/__cache/routeviews_prefix';
  cacheKeyUrl.search = `?prefix=${encodeURIComponent(prefix)}`;

  const cached = await getCachedJson(env, cacheKeyUrl);
  if (cached) {
    return corsResponse(cached, 200, { 'CF-Cache-Status': 'HIT' });
  }

  const upstreamUrl = `https://api.routeviews.org/prefix/${encodeURIComponent(prefix)}`;
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DCIM-CommandCenter/1.0',
      },
    });

    const text = await upstream.text();
    const json = text ? JSON.parse(text) : null;

    if (!upstream.ok) {
      return corsResponse(
        { error: `RouteViews upstream error: ${upstream.status}`, upstream: { url: upstreamUrl } },
        upstream.status,
      );
    }

    // Cache 30 seconds (fits corroboration window)
    return await putCachedJson(env, cacheKeyUrl, json, 30);
  } catch (error) {
    return corsResponse({ error: error.message }, 500);
  }
}

/**
 * EIA API Proxy (hide API key from browser)
 * GET /api/eia/v2/* (mirrors api.eia.gov/v2/*)
 *
 * Requires secret:
 * - wrangler secret put EIA_API_KEY
 */
async function handleEiaProxy(request, env, path) {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateCheck = await checkRateLimit(env, `eia:${clientIP}`, RATE_LIMIT.EIA);
  if (!rateCheck.allowed) return corsResponse({ error: 'Rate limit exceeded' }, 429);

  if (!env.EIA_API_KEY) {
    return corsResponse({ error: 'EIA API key not configured on worker' }, 501);
  }

  const rest = path.replace('/api/eia/', '');
  if (!rest.startsWith('v2/')) {
    return corsResponse({ error: 'Invalid EIA path (expected /api/eia/v2/...)' }, 400);
  }

  const url = new URL(request.url);
  // Strip any client-provided api_key and replace with server secret.
  url.searchParams.delete('api_key');

  const upstream = new URL(`https://api.eia.gov/${rest}`);
  url.searchParams.forEach((value, key) => upstream.searchParams.append(key, value));
  upstream.searchParams.set('api_key', env.EIA_API_KEY);

  const cacheKeyUrl = new URL(request.url);
  cacheKeyUrl.pathname = '/__cache/eia';
  cacheKeyUrl.search = `?u=${encodeURIComponent(upstream.pathname + '?' + upstream.searchParams.toString())}`;

  const cached = await getCachedJson(env, cacheKeyUrl);
  if (cached) {
    return corsResponse(cached, 200, { 'CF-Cache-Status': 'HIT' });
  }

  try {
    const res = await fetch(upstream.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DCIM-CommandCenter/1.0',
      },
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;

    if (!res.ok) {
      return corsResponse(
        { error: `EIA upstream error: ${res.status}`, upstream: { path: upstream.pathname } },
        res.status,
      );
    }

    // Cache 60 seconds (safe default for hourly feeds + reduces key abuse)
    return await putCachedJson(env, cacheKeyUrl, json, 60);
  } catch (error) {
    return corsResponse({ error: error.message }, 500);
  }
}

/**
 * USASpending API Proxy (to avoid CORS)
 * POST /api/usaspending/*
 */
async function handleUsaSpendingProxy(request, path) {
  const usPath = path.replace('/api/usaspending/', '');
  const fullUrl = `https://api.usaspending.gov/api/v2/${usPath}`;
  
  try {
    const body = await request.json();
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DCIM-CommandCenter/1.0',
      },
      body: JSON.stringify(body),
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

      // OpenCorporates proxy
      if (path.startsWith('/api/opencorporates/')) {
        return handleOpenCorporatesProxy(request, path);
      }

      // PeeringDB proxy
      if (path.startsWith('/api/peeringdb/')) {
        return handlePeeringDbProxy(request, path);
      }

      // USASpending proxy
      if (path.startsWith('/api/usaspending/') && request.method === 'POST') {
        return handleUsaSpendingProxy(request, path);
      }

      // RouteViews proxy (prefix corroboration)
      if (path.startsWith('/api/routeviews/prefix/') && request.method === 'GET') {
        return handleRouteViewsProxy(request, env, path);
      }

      // EIA proxy (hide API key)
      if (path.startsWith('/api/eia/') && request.method === 'GET') {
        return handleEiaProxy(request, env, path);
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
