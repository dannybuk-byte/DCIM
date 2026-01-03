# Cloudflare Pages Deployment Fix

## 🔴 Current Issue
The site at `https://dcim.pages.dev` is showing raw JSON instead of your React app.

**Error**: `Failed to load resource: 404` for `/favicon.ico`

## 🎯 Root Cause
Cloudflare Pages is not serving the `index.html` file correctly. The build succeeded, but the deployment configuration needs adjustment.

## 🔧 Solution: Add `_redirects` File

Cloudflare Pages needs a `_redirects` file to properly serve your Single Page Application (SPA).

### Step 1: Create the `_redirects` file

Create a file at:
```
DCIM Compliance App/public/_redirects
```

With this content:
```
/*    /index.html   200
```

This tells Cloudflare to serve `index.html` for ALL routes (required for React Router).

### Step 2: Rebuild

The `public/` folder contents are automatically copied to `dist/` during build, so this file will be included.

---

## 📋 Quick Fix Commands

Run these in Terminal:

```bash
cd "/Users/danielbuk/Desktop/DCIM/DCIM Compliance App"

# Create the _redirects file
echo "/*    /index.html   200" > public/_redirects

# Commit and push
cd ..
git add "DCIM Compliance App/public/_redirects"
git commit -m "fix: Add _redirects for Cloudflare Pages SPA routing"
```

Then push via GitHub Desktop.

Cloudflare will automatically rebuild and deploy!

---

## ✅ Expected Result

After this fix, `https://dcim.pages.dev` will show your full React app with:
- ✅ Evidence Integrity Layer
- ✅ 5 Autonomous AI Agents
- ✅ FlexSearch integration
- ✅ OSINT Data Sources
- ✅ All facilities loaded from IndexedDB

---

## 🔍 Alternative: Check Cloudflare Pages Settings

If the above doesn't work, verify in Cloudflare Dashboard:

1. Go to **Workers & Pages** → **dcim** (Pages)
2. Click **Settings** tab
3. Under **Build & deployments** → **Build configuration**:
   - **Build command**: `npm install --legacy-peer-deps && npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `DCIM Compliance App`

All should be set correctly already.

