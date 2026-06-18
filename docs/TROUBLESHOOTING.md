# Troubleshooting

## Missing GHL_API_KEY

Run:

```bash
cp .env.example .env
```

Then add `GHL_API_KEY` to `.env`.

## Missing GHL_LOCATION_ID

Add the HighLevel sub-account Location ID to `.env`.

## Wrong API Version

Keep:

```bash
GHL_API_VERSION=2023-02-21
```

This is the HighLevel API `Version` header, not the project year.

## Build Output Missing

```bash
npm run build
```

## Client Does Not Show Tools

- Confirm MCP config uses an absolute path to `dist/server.js`.
- Confirm `npm run build` passes.
- Start with `GHL_TOOL_PROFILE=curated`.
- Restart the MCP client after changing config.

## Bad Token Or Location

```bash
npm run auth-check
```

If it fails, verify the token has access to the target location.

## Metricool Tools Say Credentials Are Incomplete

Run:

```bash
GHL_API_KEY=dummy GHL_LOCATION_ID=dummy node scripts/ghl-mcp.mjs test-tool get_metricool_config_status
```

Then add missing values to `.env`, Railway, or your MCP client environment:

```bash
METRICOOL_USER_TOKEN=...
METRICOOL_USER_ID=...
METRICOOL_BLOG_ID=...
```

`METRICOOL_BLOG_ID` is required for brand-scoped reads such as scheduled posts and analytics. Use `get_metricool_brands` to list available brand IDs once `METRICOOL_USER_TOKEN` and `METRICOOL_USER_ID` are configured.

## Metricool API Returns 401 Or 403

- Confirm the token is copied from Metricool account settings.
- Confirm the Metricool plan includes API access.
- Confirm `METRICOOL_USER_ID` matches the token owner.
- Confirm `METRICOOL_BLOG_ID` belongs to that user or is shared with that user.

## Port Conflict

Set:

```bash
MCP_SERVER_PORT=8010
GHL_MCP_APPS_PORT=3002
```

## Repo Path With Spaces

Generated MCP config uses absolute paths. If manually running shell commands, quote paths.

