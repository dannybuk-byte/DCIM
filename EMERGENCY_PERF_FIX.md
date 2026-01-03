# 🚨 Emergency Performance Fix

## Problems Identified:

1. ✅ **Badge position conflict** - Fixed (moved to top-right)
2. ⚠️ **Scroll-smooth causing lag** - Multiple scroll containers with `scroll-smooth`
3. ⚠️ **Large bundle size** - 500KB+ chunks

## Quick Fixes Applied:

### 1. Badge Repositioned
- **Was:** `bottom-4 right-4` (conflicting with Evidence Panel)
- **Now:** `top-4 right-4` (clear space)

### 2. Scroll Performance (To Fix Next)
Remove `scroll-smooth` from performance-critical areas:
- Main facility lists (11,992 items)
- Nested expandable sections
- Filter panels

### 3. Bundle Size (Monitor)
Current large dependencies:
- deck.gl (3D globe)
- echarts (visualizations)
- TensorFlow.js (ML features)
- Langchain (AI features)

## Next Actions:

**Option A: Quick Performance Win**
Remove `scroll-smooth` from large lists → instant performance boost

**Option B: Validate Badge First**
Deploy current change, see if badge appears top-right

**Option C: Both**
Remove scroll-smooth AND deploy

## Recommendation:

**Deploy the badge position fix NOW**, then assess scrolling separately.

Current change is minimal risk and should make badge visible.

