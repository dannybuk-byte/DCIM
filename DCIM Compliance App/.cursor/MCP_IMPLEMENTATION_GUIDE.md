# MCP Integration Implementation Guide for DCIM Compliance App

Based on the December 2025 best practices, here's a tailored implementation path for this project.

## Recommended Implementation Path

### Phase 1: Essential Tools (Start Here)
These are the most immediately useful MCP servers for development workflow.

### Phase 2: Project-Specific Tools
Tools that enhance your OSINT and compliance workflow.

### Phase 3: Advanced Integration
Optional enhancements for deeper capabilities.

---

## Phase 1: Essential Tools Setup

### Step 1: Create Global MCP Configuration

Create `~/.cursor/mcp.json` (global config for tools you'll use across projects):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/danielbuk/DCIM Compliance App"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Setup Steps:**
1. Open terminal and run: `mkdir -p ~/.cursor && touch ~/.cursor/mcp.json`
2. Copy the JSON above into the file
3. Get GitHub token: https://github.com/settings/tokens (classic, repo scope)
4. Replace `your_token_here` with your actual token
5. Restart Cursor completely (not just reload window)

**Why these first?**
- **filesystem**: Allows MCP to read/write project files, documentation, configs
- **github**: If you push code to GitHub, enables PR creation, issue management, code search

### Step 2: Verify Installation

1. Open Cursor Settings: `Cmd/Ctrl + Shift + P` → "Cursor Settings"
2. Navigate to: **Features → Model Context Protocol**
3. You should see both servers with green status dots
4. Test in Agent Mode (`Cmd/Ctrl + I`): Ask "What files are in the src/components directory?"

---

## Phase 2: Project-Specific Tools

### Option A: Browser-based Testing (via Puppeteer/Playwright MCP)

If you want MCP to interact with your running dev server:

```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

**Use Case**: Automated testing, screenshot analysis, UI debugging

### Option B: Database Tools (if you migrate to external DB)

If you move from IndexedDB to PostgreSQL/MySQL:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://user:pass@localhost/dbname"
      }
    }
  }
}
```

### Option C: Web Search for OSINT Enhancement

Enhance your OSINT data fetching capabilities:

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your_brave_api_key"
      }
    }
  }
}
```

**Alternative**: Use the `web-search` MCP server for general search without API keys.

---

## Phase 3: Advanced Integration

### Option A: Slack/Discord Integration (if you use team chat)

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token",
        "SLACK_TEAM_ID": "T1234567890"
      }
    }
  }
}
```

### Option B: Linear/Jira for Compliance Tracking

If you track compliance issues in project management:

```json
{
  "mcpServers": {
    "linear": {
      "url": "https://mcp.linear.app/sse"
    }
  }
}
```

Note: Linear uses SSE (Server-Sent Events), not a command-based server.

---

## Recommended Configuration for Your Project

**Best fit for DCIM Compliance App development:**

Create `.cursor/mcp.json` in your project root (project-specific config):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/danielbuk/DCIM Compliance App"]
    }
  }
}
```

And keep global config (`~/.cursor/mcp.json`) for cross-project tools:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token"
      }
    }
  }
}
```

---

## Testing Your Setup

### Test 1: Filesystem Access
In Agent Mode (`Cmd/Ctrl + I`), try:
```
Read the package.json file and tell me what dependencies are installed
```

### Test 2: Code Navigation
```
Show me the structure of the src/components/tabs directory
```

### Test 3: Multi-file Analysis
```
Analyze the DCIMCommandCenter.tsx component and list all the tabs it uses
```

---

## Common Issues & Solutions

### Issue: MCP tools not appearing
**Solution**: Make sure you're in Agent Mode (`Cmd/Ctrl + I`), not regular chat

### Issue: "Connection closed" errors
**Solution**: 
1. Run the command manually in terminal first: `npx -y @modelcontextprotocol/server-filesystem /path/to/project`
2. Check the actual error output
3. Common causes: missing dependencies, path issues, permission problems

### Issue: Project-level config not detected
**Solution**: 
1. Ensure file is at `.cursor/mcp.json` (not `.cursor/mcp.json.json`)
2. Try using global config instead as a workaround
3. Restart Cursor completely (quit and reopen)

### Issue: GitHub token not working
**Solution**:
1. Verify token has correct scopes (repo, read:org, etc.)
2. Check token hasn't expired
3. Test token manually: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

---

## MCP Servers Discovery

To find more servers:
- **Smithery.ai**: Searchable registry with Cursor installation commands
- **Glama.ai**: Another registry with curated servers
- **PulseMCP**: Indexes 970+ MCP servers with installation guides

---

## Integration with Your Current Workflow

### Current State Analysis
Your project already has:
- Cloudflare Worker for Claude API proxy ✅
- Complex React component structure
- OSINT integrations (EPA, SEC, Census APIs)
- IndexedDB for local storage

### How MCP Enhances This

1. **During Development**
   - MCP can read your documentation files (README.md, API_INTEGRATION_PLAN.md)
   - Understand project structure without you explaining it
   - Navigate between related components

2. **Code Generation**
   - Generate components following your existing patterns
   - Read existing code to match style
   - Understand your type definitions

3. **Debugging**
   - Read error logs and stack traces
   - Analyze component relationships
   - Review recent changes

### Limitations to Be Aware Of

- **IndexedDB**: MCP cannot directly access browser IndexedDB. Your data stays in the browser.
- **Browser DevTools**: MCP cannot interact with running browser instances (unless you add Puppeteer MCP)
- **Cloudflare Worker**: MCP cannot deploy or modify your worker (would need separate MCP server for Wrangler)

---

## Next Steps

1. **Start with Phase 1** (filesystem + GitHub)
2. **Test thoroughly** with Agent Mode queries
3. **Add Phase 2 tools** as needed for your workflow
4. **Monitor tool count** - stay under 40 tools total
5. **Use GUI for monitoring** - Settings panel shows server status

---

## Quick Reference Commands

```bash
# Test filesystem server manually
npx -y @modelcontextprotocol/server-filesystem "/Users/danielbuk/DCIM Compliance App"

# Test GitHub server manually  
npx -y @modelcontextprotocol/server-github

# Check MCP config location
ls -la ~/.cursor/mcp.json
ls -la .cursor/mcp.json

# View current Cursor version (should be 2.3+)
# Help → About Cursor
```

---

## Recommended Workflow

1. **Setup**: Create global `~/.cursor/mcp.json` with filesystem + GitHub
2. **Test**: Verify in Settings → Features → Model Context Protocol
3. **Use**: Switch to Agent Mode (`Cmd/Ctrl + I`) for MCP-powered assistance
4. **Expand**: Add project-specific tools to `.cursor/mcp.json` as needed
5. **Monitor**: Use Settings GUI to toggle servers on/off based on current task

