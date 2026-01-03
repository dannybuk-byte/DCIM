# Cloudflare Pages Build Configuration

This file documents the correct build settings for Cloudflare Pages dashboard.

## 📋 Correct Build Settings

Go to: https://dash.cloudflare.com/ → Workers & Pages → dcim-dashboard → Settings → Builds & deployments

### Build Configuration:

| Setting | Value |
|---------|-------|
| **Framework preset** | Vite |
| **Build command** | `cd "DCIM Compliance App" && npm install && npm run build` |
| **Build output directory** | `DCIM Compliance App/dist` |
| **Root directory** | `/` (leave as default) |
| **Node version** | 20.x |

### Environment Variables:
None required (zero-backend PWA)

### Build Watch Paths:
- `DCIM Compliance App/**/*`

## 🚨 Current Problem

The build is likely configured to run in the root directory, but:
- ❌ ROOT `/package.json` - Wrong location
- ✅ `DCIM Compliance App/package.json` - Correct location!

## ✅ How to Fix in Cloudflare Dashboard

1. Go to https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages** → **dcim-dashboard**
3. Click: **Settings** → **Builds & deployments**
4. Click: **Edit configuration** (or **Configure build**)
5. Set:
   - **Build command**: `cd "DCIM Compliance App" && npm install && npm run build`
   - **Build output directory**: `DCIM Compliance App/dist`
6. Click: **Save**
7. Go to **Deployments** tab
8. Click: **Retry deployment** on the latest failed build

## 🎯 Alternative: Create .nvmrc and buildconfig

Create these files to help Cloudflare auto-detect settings:

```bash
# In DCIM root
echo "20" > .nvmrc
```

Or use a `wrangler.toml` in the root to specify the subdirectory.

## 🔍 Verify Build Success

After fixing the config:
1. Push any change to trigger rebuild
2. Watch build logs in Cloudflare dashboard
3. Look for: "✅ Seeded 11992 facilities" in browser console after deployment

---

**Next Step**: Update Cloudflare Pages build configuration manually in the dashboard!

