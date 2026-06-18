# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single product: the **GoHighLevel MCP server** (TypeScript/Node, `>=20`). It exposes GHL API operations as MCP tools over stdio, Streamable HTTP, legacy SSE, plus an optional MCP Apps browser preview. Standard commands live in `README.md`, `QUICKSTART.md`, `docs/DEVELOPMENT.md`, and `package.json` scripts; only non-obvious caveats are captured below.

### Running services (dev)
- `npm run start:http` — Streamable HTTP server on port `8000` (`/mcp`, `/sse`, `/health`, `/tools`, `POST /execute`, `POST /tools/call`). The startup GHL connection test is **non-fatal**, so this starts even with placeholder credentials. Prefer this for local dev without live GHL access.
- `npm run start:stdio` — stdio server (`dist/server.js`) for desktop MCP clients. It runs a **blocking** GHL connection test at startup and **exits** if credentials are missing/invalid, so it cannot run without real `GHL_API_KEY` + `GHL_LOCATION_ID`.
- `npm run apps:preview` — MCP Apps browser UI at `http://localhost:3001/preview`. Works with no credentials (demo/preview data).
- All servers read config from `.env`; `GHL_API_KEY` and `GHL_LOCATION_ID` must be non-empty (placeholders from `.env.example` are accepted by the HTTP server). `dist/` must be built first (`npm run build`, and `npm run apps:build` for the apps UI).

### Gotcha: `.env` breaks the full test suite
`npm test` (jest) **fails 3 tests** in `tests/scripts/ghl-mcp-cli.test.ts` whenever a credential-bearing `.env` exists (including the placeholder one created via `cp .env.example .env`). `loadDotEnv` in `scripts/ghl-mcp.mjs` treats any non-empty value as real credentials, so the onboarding tests that expect a "needs-credentials" state instead see "ready-no-live-auth". Run the full suite with no `.env` present (e.g. temporarily move it aside), then restore `.env` to run the servers. With `.env` absent all 149 tests pass.

### Build/lint are transpile-only
`npm run build` and `npm run lint` use a custom transpiler (`scripts/build-server.mjs`) that strips types **without type-checking** (`lint` = `--check`, a syntax/transpile check only). Real `tsc` type-checking only runs for the apps UI via `npm run apps:build` / `npm run apps:typecheck`.

### Do not run the API scanner casually
`npm run scan:ghl-api` (and `ci:ghl-api-drift`) hit the network and regenerate committed coverage artifacts under `docs/` and `src/tools/official-spec-*`. Only run it when intentionally refreshing API coverage.
