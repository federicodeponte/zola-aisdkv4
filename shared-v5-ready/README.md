# Shared V5-Ready Modules

Drop-in utilities for giving the `zola-aisdkv5` repo the same agent/tool stack we built for `aisdkv4`—without touching v5 code. Everything here is import-only; the v5 repo stays unchanged.

## Contents

- `chat/agent-context.ts`
  - Wraps v5’s Supabase client + config
  - Exposes `resolveSystemPrompt`, `resolveServerSupabase`, `buildAgentTools`
- `chat/tools.ts`
  - Composes cross-repo tools (`gtm_expert`, `analyze_website`, `deep_research`, optional `bulk_process`)
  - Exposes `buildBaseTools` so you can extend or override before returning a `ToolSet`
- `auth-bypass/README.md`
  - How to enable the Supabase service-role bypass for E2E tests
  - Required env vars + optional Supabase tweaks
- `integrations/bigquery`
  - Drop-in BigQuery client guard + helpers (optional)
- `chat/agentic`
  - Shared agent context + tool builder built specifically for v5 imports
- `agentic-data-integrations/`
  - Exposes agent context, tool builders, and BigQuery helpers ready for aisdkv5

All TypeScript imports use relative paths into the v4 repo (`