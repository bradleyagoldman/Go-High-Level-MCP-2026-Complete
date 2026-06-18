# Setup

Use Node 20+ for both the core server and MCP Apps.

## Standard Setup

```bash
npm install
cp .env.example .env
npm run build
npm run doctor
```

`npm run setup` can create `.env`, build, and print next steps.

## Environment

Required:

```bash
GHL_API_KEY=your_private_integration_api_key
GHL_LOCATION_ID=your_location_id
```

Optional:

```bash
GHL_BASE_URL=https://services.leadconnectorhq.com
GHL_API_VERSION=2023-02-21
MCP_SERVER_PORT=8000
OPENAI_API_KEY=your_openai_key_here_optional
```

`GHL_API_VERSION=2023-02-21` is the HighLevel API `Version` header. It is not the project year.

Metricool social analytics and scheduler-read tools are optional. Add these only when you want the Metricool tools exposed by the `stable`, `full`, or `raw` tool profiles:

```bash
METRICOOL_USER_TOKEN=your_metricool_user_token
METRICOOL_USER_ID=your_metricool_user_id
METRICOOL_BLOG_ID=your_metricool_brand_blog_id
METRICOOL_BASE_URL=https://app.metricool.com/api
```

`METRICOOL_USER_TOKEN` is sent in the `X-Mc-Auth` header. `METRICOOL_USER_ID` and `METRICOOL_BLOG_ID` are passed as query parameters; `METRICOOL_BLOG_ID` can also be supplied per tool call for a specific brand.

## Modes

- No credentials: build, test, list tools, and generate placeholder MCP config.
- Credentials provided: run `npm run auth-check` to verify live GHL access.
- Metricool credentials provided: run `npm run build`, then `node scripts/ghl-mcp.mjs test-tool get_metricool_config_status` and `node scripts/ghl-mcp.mjs test-tool get_metricool_scheduled_posts '{"start":"2026-06-01","end":"2026-06-30"}'`.
- Apps preview: run `npm run apps:setup` and `npm run apps:preview`.
- Production: use `GHL_TOOL_PROFILE=stable` or `curated`.

## Platform Notes

- macOS/Linux: normal npm commands work.
- Windows: use PowerShell or WSL. Quote repo paths that contain spaces.
- Cloud agents: localhost previews may not be visible to the human.

