# macOS Extended Attributes Fix for Echarts

## Problem
macOS adds extended attributes (`com.apple.provenance`) to files downloaded via npm, which can cause permission errors when Vite tries to read certain echarts modules, specifically:
```
EPERM: operation not permitted, open '/Users/danielbuk/Desktop/DCIM/node_modules/echarts/lib/chart/sankey/install.js'
```

## Solution Implemented
A stub file has been created to replace the problematic `sankey/install.js` module. Since this application doesn't use Sankey charts, this has no functional impact.

### What was done:
1. **Created a stub module** at `node_modules/echarts/lib/chart/sankey/install.js` with a no-op install function
2. **Added a postinstall script** in `package.json` that automatically recreates this stub after every `npm install`
3. **Updated vite.config.ts** to:
   - Exclude echarts from optimization dependencies
   - Relax file system restrictions (`server.fs.strict: false`)

## Alternative Solutions (if needed)

### Option 1: Remove extended attributes manually
```bash
xattr -cr node_modules/echarts
```

### Option 2: Disable Gatekeeper for the project directory (not recommended)
```bash
sudo spctl --master-disable
```

### Option 3: Use a different version of echarts
The issue appears to be related to how npm packages are quarantined by macOS. Older versions might not have this issue.

## Testing
The fix is working if:
- ✅ Dev server starts without errors: `npm run dev`
- ✅ Application loads at http://localhost:5173
- ✅ No EPERM errors in browser console
- ✅ Echarts visualizations (excluding Sankey) work normally

## Notes
- The stub file will be recreated automatically after every `npm install` via the postinstall script
- If you ever need Sankey charts, you'll need to find an alternative solution to the macOS permission issue
- This is a known issue with macOS Big Sur and later versions

