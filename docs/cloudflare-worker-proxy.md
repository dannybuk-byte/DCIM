# Cloudflare Worker CORS Proxy Setup

This guide explains how to deploy your own CORS proxy using Cloudflare Workers for accessing government APIs that block browser requests.

## Why Do You Need This?

Many government APIs (EPA, OSHA, SEC) don't include CORS headers, which means browsers block direct requests. A CORS proxy adds the necessary headers.

## Quick Setup (5 minutes)

### 1. Create a Cloudflare Account
Go to https://dash.cloudflare.com and sign up (free tier is sufficient)

### 2. Create a Worker
1. Go to **Workers & Pages** > **Create Application** > **Create Worker**
2. Name it `dcim-cors-proxy`
3. Click **Deploy**
4. Click **Edit Code** and paste the following:

```javascript
/**
 * DCIM CORS Proxy Worker
 * 
 * Allows browser requests to government APIs that block CORS.
 * Whitelists only specific government domains for security.
 */

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://dcim-compliance.pages.dev',
  // Add your production domain here
];

const ALLOWED_API_DOMAINS = [
  'echo.epa.gov',
  'enforcedata.dol.gov',
  'data.sec.gov',
  'api.census.gov',
  'api.bls.gov',
  'www.nlrb.gov',
  'olmsapps.dol.gov',
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    
    // Get the origin
    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Validate target domain
    try {
      const target = new URL(targetUrl);
      const isAllowedDomain = ALLOWED_API_DOMAINS.some(d => 
        target.hostname === d || target.hostname.endsWith('.' + d)
      );
      
      if (!isAllowedDomain) {
        return new Response(
          JSON.stringify({ error: 'Domain not allowed' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Forward the request
    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'DCIM-Compliance-App/1.0',
          'Accept': 'application/json',
        },
      });
      
      // Create response with CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      
      return newResponse;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Proxy fetch failed', details: error.message }),
        { 
          status: 502,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '*',
          }
        }
      );
    }
  },
};
```

### 3. Deploy and Get URL
1. Click **Save and Deploy**
2. Your worker URL will be: `https://dcim-cors-proxy.<your-subdomain>.workers.dev`

### 4. Configure Your App
Add to your `.env` file:

```bash
VITE_CORS_PROXY_URL=https://dcim-cors-proxy.<your-subdomain>.workers.dev
```

## Usage in Code

```typescript
import { CORSProxy } from '../services/corsProxy';

// EPA Environmental Data
const epaData = await CORSProxy.searchEPAFacilities('VA', 'Ashburn');

// OSHA Safety Violations  
const oshaData = await CORSProxy.searchOSHAInspections('Amazon', 'VA');

// SEC Financial Filings
const secData = await CORSProxy.getSECCompanyFilings('1018724'); // Amazon CIK
```

## Rate Limits

- Cloudflare Workers free tier: 100,000 requests/day
- This is more than enough for development and moderate production use
- If you need more, upgrade to the $5/month plan (10 million requests)

## Security Notes

1. **Domain Whitelist**: Only allows requests to approved government domains
2. **Origin Whitelist**: Only allows requests from your app domains
3. **No Credentials**: Doesn't forward any credentials or cookies
4. **Logging**: Consider adding logging for debugging

## Troubleshooting

### "Domain not allowed" Error
Add the domain to `ALLOWED_API_DOMAINS` in the worker code.

### "CORS error" in Browser
Add your domain to `ALLOWED_ORIGINS` in the worker code.

### Worker Not Responding
Check the Cloudflare dashboard for error logs under **Workers** > **dcim-cors-proxy** > **Logs**.

## Alternative: Use Public Proxies (Development Only)

For quick testing, the app falls back to public CORS proxies:
- `https://corsproxy.io/`
- `https://api.allorigins.win/raw?url=`

⚠️ **Warning**: Public proxies are rate-limited and should NOT be used in production.

