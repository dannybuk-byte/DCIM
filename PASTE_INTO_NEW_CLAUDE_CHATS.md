# 🚀 PASTE THIS INTO NEW CLAUDE CHATS

Copy/paste this EXACT text into any new Claude conversation:

---

```
I'm continuing work on the DCIM Compliance App. Please read the current status:

1. Read /Users/danielbuk/Desktop/DCIM/AGENT_STATUS.md (this is auto-updated with every commit)
2. Then read /Users/danielbuk/Desktop/DCIM/PROJECT_STATUS.md (auto-generated snapshot)
3. Then read /Users/danielbuk/Desktop/DCIM/DCIM Compliance App/.cursorrules (critical constraints)
3. Continue from where the last agent left off

The project enforces these constraints:
- NO localStorage (use IndexedDB via Dexie.js)
- NO dynamic Tailwind classes
- NO files > 50KB
- Pre-commit hooks enforce these automatically

Tech stack: React 18 + TypeScript + Tailwind + IndexedDB + Cloudflare Pages
```

---

## 📋 Alternative Short Version

```
Continue DCIM app work. Read /Users/danielbuk/Desktop/DCIM/AGENT_STATUS.md and PROJECT_STATUS.md first.
```

---

## 🎯 Why This Works

1. **AGENT_STATUS.md** is auto-updated by pre-commit hook
2. Contains:
   - Current issue being worked on
   - Last update timestamp
   - Completed features
   - Known issues
   - Next steps
3. New agents can pick up **exactly** where previous agent left off
4. No need to explain context manually

---

## 🔄 The Workflow

```
You → Start new Claude chat
You → Paste template above
Claude → Reads AGENT_STATUS.md
Claude → Sees exactly what last agent was doing
Claude → Continues from there
Claude → Makes changes
Claude → Commits (pre-commit hook auto-updates AGENT_STATUS.md)
You → Start another new Claude chat
You → Paste template again
New Claude → Reads updated AGENT_STATUS.md
... cycle repeats ...
```

---

## 🎁 Bonus: Quick Reference

If Claude needs more context:
- **Project overview:** `/Users/danielbuk/Desktop/DCIM/README.md`
- **Rules:** `/Users/danielbuk/Desktop/DCIM/.cursorrules`
- **Antifragility:** `/Users/danielbuk/Desktop/DCIM/DCIM Compliance App/ANTIFRAGILITY_IMPLEMENTATION_SUMMARY.md`
- **Features:** `/Users/danielbuk/Desktop/DCIM/DCIM Compliance App/FEATURE_IMPLEMENTATION_SUMMARY.md`

---

**Save this file to your desktop or bookmark it!**

