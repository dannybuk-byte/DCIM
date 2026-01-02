# Mission Control Grid - Troubleshooting Guide

## Issue: "I don't see the Mission Control Grid"

### Quick Diagnostics

1. **Open Browser Console** (F12 or Right-click → Inspect → Console tab)
2. **Look for these messages:**
   - ✅ `"✅ Rendering Mission Control Grid"` - Component is trying to render
   - ✅ `"🚀 Mission Control Grid mounted!"` - Component successfully mounted
   - ❌ Any red error messages - Component crashed

### Solution 1: Check Dev Server is Running

```bash
# In your terminal:
cd "/Users/danielbuk/DCIM Compliance App"
npm run dev
```

You should see:
```
VITE v5.x.x  ready in Xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Open http://localhost:5173 in your browser.

### Solution 2: Use Test Version

If the full component isn't loading, try the test version:

**Edit `/Users/danielbuk/DCIM Compliance App/src/App.tsx` line 19:**

```typescript
// Change this:
const [useTestVersion, setUseTestVersion] = useState(false);

// To this:
const [useTestVersion, setUseTestVersion] = useState(true);
```

Save the file. You should see a big "🚀 Mission Control Grid" message if the component system is working.

### Solution 3: Revert to Old Dashboard

If you want to go back to the old dashboard temporarily:

**Edit `/Users/danielbuk/DCIM Compliance App/src/App.tsx` line 18:**

```typescript
// Change this:
const [useNewArchitecture, setUseNewArchitecture] = useState(true);

// To this:
const [useNewArchitecture, setUseNewArchitecture] = useState(false);
```

### Solution 4: Check for TypeScript Errors

```bash
cd "/Users/danielbuk/DCIM Compliance App"
npx tsc --noEmit
```

If there are errors, the component might not compile. Look for errors in `MissionControlGrid.tsx` or `App.tsx`.

### Solution 5: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

Or just use Incognito/Private mode.

### Solution 6: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Look for any failed requests (red)
5. Check if `MissionControlGrid.tsx` loads successfully

### What to Check in Console

**Good messages (component working):**
```
✅ Rendering Mission Control Grid
🚀 Mission Control Grid mounted!
Facilities loaded: 0
```

**Bad messages (component broken):**
```
❌ Uncaught TypeError: ...
❌ Module not found: ...
❌ Cannot read property '...' of undefined
```

### Common Issues

#### 1. "White/Black screen, no errors"
- Component might be rendering but with no data
- Check if `facilities` array is empty
- Try adding mock data to test

#### 2. "Component renders but looks broken"
- CSS might not be loading
- Check Tailwind CSS is configured
- Verify `index.css` is imported

#### 3. "Console shows errors about missing modules"
- Run `npm install` again
- Check all imports in `MissionControlGrid.tsx`

#### 4. "Dev server won't start"
```bash
# Kill any existing processes
pkill -f "vite"

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try again
npm run dev
```

### Toggle Flags

You have 3 toggle flags in `App.tsx`:

```typescript
// Line 18: Choose old or new dashboard
const [useNewArchitecture, setUseNewArchitecture] = useState(true);

// Line 19: Use test version for debugging
const [useTestVersion, setUseTestVersion] = useState(false);
```

**To see old dashboard:** Set `useNewArchitecture = false`  
**To see test version:** Set `useTestVersion = true`  
**To see full Mission Control Grid:** Both should be `false` and `true` respectively

### Debug Checklist

- [ ] Dev server running on http://localhost:5173
- [ ] Browser console open (F12)
- [ ] Console shows `"✅ Rendering Mission Control Grid"`
- [ ] Console shows `"🚀 Mission Control Grid mounted!"`
- [ ] No red errors in console
- [ ] Network tab shows all files loading (200 status)
- [ ] `useNewArchitecture = true` in App.tsx
- [ ] `useTestVersion = false` in App.tsx

### Still Not Working?

**Try this diagnostic sequence:**

1. **Set test version to true:**
   ```typescript
   const [useTestVersion, setUseTestVersion] = useState(true);
   ```
   - If you see the test message → Component system works, issue is in main component
   - If you see nothing → Check console for errors

2. **Check the old dashboard works:**
   ```typescript
   const [useNewArchitecture, setUseNewArchitecture] = useState(false);
   ```
   - If old dashboard works → Issue is specific to new component
   - If old dashboard doesn't work → General app issue

3. **Look at the actual error:**
   - Open browser console
   - Copy the full error message
   - Check the file and line number mentioned

### Get More Help

**If you're still stuck, please provide:**

1. What you see in the browser (screenshot)
2. Full console output (copy all messages)
3. Network tab status (any red/failed requests?)
4. Which toggle flags you have set
5. Dev server output (terminal messages)

---

## Current State

**Files Modified:**
- `src/App.tsx` - Added test version and debug logs
- `src/components/MissionControlGrid.tsx` - Added mount debug log
- `src/components/MissionControlGridTest.tsx` - New simple test component

**Current Toggles:**
- `useNewArchitecture = true` (Mission Control Grid)
- `useTestVersion = false` (Full version, not test)

**To switch:**
- Test version: Change `useTestVersion` to `true`
- Old dashboard: Change `useNewArchitecture` to `false`

---

**The component SHOULD be rendering. Check your browser console for clues!** 🔍

