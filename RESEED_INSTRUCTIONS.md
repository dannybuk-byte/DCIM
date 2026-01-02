# How to Reseed Database with All US States

If you're seeing issues with missing states (like Oklahoma), the database needs to be reseeded.

## Option 1: Automatic Reseed (Recommended)
Just **refresh your browser**. The app will automatically detect if the database needs reseeding and will reseed it.

## Option 2: Manual Clear via Browser Console
1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the Console tab
3. Run this command:
```javascript
await db.facilities.clear();
location.reload();
```

## Option 3: Clear via Application Storage
1. Open Developer Tools (F12 or Cmd+Option+I)
2. Go to the Application tab (Chrome) or Storage tab (Firefox)
3. Expand IndexedDB
4. Find "ComplianceDatabase"
5. Right-click and select "Delete" or "Clear"
6. Refresh the page

## What Changed
- Database version updated to v3 to trigger automatic reseed
- Seed data now includes all 50 US states + DC
- Improved state distribution logic ensures comprehensive coverage
- Seed function now verifies state coverage and reseeds if needed

After reseeding, you should see in the console:
```
✅ Seeded 11992 facilities globally across X countries (Y US states including OK) with real operator data
```

Where Y should be close to 51 (50 states + DC).

