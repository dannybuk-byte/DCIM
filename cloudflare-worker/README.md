# Cloudflare Worker - Claude API Proxy

This Cloudflare Worker acts as a proxy between your browser application and Anthropic's Claude API, keeping your API key secure on the server side.

## Setup

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Set your Anthropic API key as a secret:
```bash
wrangler secret put ANTHROPIC_API_KEY
```
Enter your API key when prompted.

4. (Stage-1 hardening) Set the shared auth token and create the rate-limit KV namespace:
```bash
wrangler secret put WORKER_API_TOKEN
wrangler kv:namespace create "RATE_LIMITS"
```
Then replace the placeholder `id` / `preview_id` under `[[kv_namespaces]]` in
`wrangler.toml` with the ids printed by the create command. Until
`WORKER_API_TOKEN` is set, protected routes (`/api/claude`, `/`,
`/api/webhook/*`) serve without auth (rollout escape hatch); once set, callers
must send `Authorization: Bearer <token>`. Rate limiting fails closed in
production if the KV binding is missing. CORS is restricted to the allowlist
in `ALLOWED_ORIGINS` (index.js).

5. Deploy the worker:
```bash
wrangler deploy
```

## Usage

Once deployed, you'll get a URL like `https://claude-api-proxy.your-subdomain.workers.dev`

Make POST requests to this URL with the following structure:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Your question here"
    }
  ],
  "system": "Optional system prompt",
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4096
}
```

The worker will forward the request to Anthropic's API and return the response with CORS headers enabled.

## Integration with React App

To use this in your React app, update `ChatInterface.tsx` to call your worker URL instead of using the SDK directly:

```typescript
const response = await fetch('https://your-worker-url.workers.dev', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: conversationMessages,
    system: systemPrompt,
    model: 'claude-3-5-sonnet-20241022',
  }),
});
```


