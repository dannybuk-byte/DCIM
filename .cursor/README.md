## Cursor project configuration (repo-local)

This repo contains **optional** Cursor configuration files under `.cursor/`.

### Rules

- **Location**: `.cursor/rules/*.mdc`
- **Goal**: encode this project’s non-negotiables (mission, TypeScript safety, antifragility patterns) so the assistant stays consistent across sessions.

### MCP (Model Context Protocol)

This repo ships an **example** MCP config only:

- **Template**: `.cursor/mcp.example.json`
- **To enable**: copy it to `.cursor/mcp.json` and fill in real paths/URLs + environment variables.

Notes:
- Keep secrets out of the repo. Use `${env:VAR_NAME}` references.
- Prefer read-only DB connections unless you explicitly want write access.

