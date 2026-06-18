# Metricool Read Tools

This server includes read-only Metricool tools for brand discovery, scheduled post reads, timeline analytics, and guarded endpoint exploration.

## Required Environment

Keep these values in `.env`, Railway variables, or your MCP client environment. Do not commit real tokens.

```bash
METRICOOL_USER_TOKEN=your_metricool_api_token
METRICOOL_USER_ID=your_metricool_user_id
METRICOOL_BLOG_ID=your_default_metricool_brand_blog_id
METRICOOL_BASE_URL=https://app.metricool.com/api
```

- `METRICOOL_USER_TOKEN`: Metricool API token from Metricool account settings. `METRICOOL_API_TOKEN` is also accepted as an alias.
- `METRICOOL_USER_ID`: Metricool user ID from the Metricool URL or account context.
- `METRICOOL_BLOG_ID`: Metricool brand/blog ID from the Metricool URL or `get_metricool_brands`.
- `METRICOOL_BASE_URL`: Optional; defaults to `https://app.metricool.com/api`.

The server still requires `GHL_API_KEY` and `GHL_LOCATION_ID` to start because this is a GoHighLevel MCP server with optional Metricool tools.

## Tools

- `get_metricool_config_status` - Checks whether Metricool env is present without exposing secrets.
- `get_metricool_brands` - Calls `/admin/simpleProfiles` to list brands for the configured user.
- `get_metricool_scheduled_posts` - Calls `/v2/scheduler/posts` for a date range.
- `get_metricool_timeline_analytics` - Calls `/stats/timeling/{metric}`, for example `igFollowers`.
- `get_metricool_read_endpoint` - GET-only escape hatch for allowed read prefixes:
  - `/admin/simpleProfiles`
  - `/stats/`
  - `/v2/analytics/`
  - `/v2/scheduler/posts`

## Local Verification

Build first:

```bash
npm ci
npm run build
```

Check that the tools are registered:

```bash
npm run tools:list -- --search metricool
```

Check Metricool config without making a Metricool API call:

```bash
GHL_API_KEY=dummy GHL_LOCATION_ID=dummy node scripts/ghl-mcp.mjs test-tool get_metricool_config_status
```

Run a live brand read after adding real Metricool values:

```bash
GHL_API_KEY=dummy \
GHL_LOCATION_ID=dummy \
METRICOOL_USER_TOKEN=... \
METRICOOL_USER_ID=... \
node scripts/ghl-mcp.mjs test-tool get_metricool_brands
```

Run a live scheduled-post read:

```bash
GHL_API_KEY=dummy \
GHL_LOCATION_ID=dummy \
METRICOOL_USER_TOKEN=... \
METRICOOL_USER_ID=... \
METRICOOL_BLOG_ID=... \
node scripts/ghl-mcp.mjs test-tool get_metricool_scheduled_posts \
'{"start":"2026-06-18","end":"2026-06-25","timezone":"UTC","extendedRange":false}'
```

Run a live timeline analytics read:

```bash
GHL_API_KEY=dummy \
GHL_LOCATION_ID=dummy \
METRICOOL_USER_TOKEN=... \
METRICOOL_USER_ID=... \
METRICOOL_BLOG_ID=... \
node scripts/ghl-mcp.mjs test-tool get_metricool_timeline_analytics \
'{"metric":"igFollowers","start":"2026-06-01","end":"2026-06-18"}'
```

## Railway Deployment

Add these variables in Railway for the deployed service:

```bash
METRICOOL_USER_TOKEN=...
METRICOOL_USER_ID=...
METRICOOL_BLOG_ID=...
METRICOOL_BASE_URL=https://app.metricool.com/api
```

Redeploy after setting variables. Then use your MCP client or the service's tool-call route to run `get_metricool_config_status`, followed by `get_metricool_brands`.

## Safety Notes

- Metricool tools added here are read-only and use GET requests only.
- The implementation logs the Metricool path, not the token or full query string.
- Use `get_metricool_read_endpoint` only for known read endpoints under the allowed prefixes.
