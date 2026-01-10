## Environment setup (local-only)

Do **not** paste secrets into chat. Keep them local (Cloudflare secrets, GitHub auth, etc.).

### Frontend → Cloudflare Worker base URL

Set this in a local env file (recommended: `.env.local`, not committed) or your shell:

- **`VITE_API_BASE_URL`**:
  - empty / unset → same-origin `/api/*`
  - `http://127.0.0.1:8787` → `wrangler dev` (typical default)
  - `https://<your-worker>.workers.dev` → deployed worker

Example (shell):

```bash
export VITE_API_BASE_URL="http://127.0.0.1:8787"
```

Example (`.env.local`):

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

### Cloudflare Worker secrets (server-side)

These should be stored as **Worker secrets**, not in the frontend:

- **`EIA_API_KEY`**:

```bash
cd cloudflare-worker
wrangler secret put EIA_API_KEY
```

