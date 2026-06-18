# Tool Profiles

- `curated`: best default for agents. High-level workflows and confirmation queues.
- `stable`: best for production. Hides deprecated and private/unstable surfaces.
- `full`: all tools.
- `official`: official OpenAPI and live-docs supplemental tools.
- `raw`: endpoint-level tools only.

Metricool social analytics and scheduler-read tools are exposed by `stable`, `full`, and `raw`. They are not part of `curated`, which is reserved for high-level CRM workflows.

Examples:

```bash
GHL_TOOL_PROFILE=curated npm run tools:list
GHL_TOOL_PROFILE=stable npm run start:stdio
node scripts/ghl-mcp.mjs configure codex --profile curated
node scripts/ghl-mcp.mjs configure codex --profile stable
```

Use `curated` until you know you need raw endpoint access.

