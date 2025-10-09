# Agentic Integrations Testing Checklist

## Connector Services

- [ ] Run `npx vitest run lib/integrations/__tests__/*.test.ts` and ensure all unit tests pass.
- [ ] Verify Supabase migrations apply cleanly (`supabase/migrations/20251009150000_agentic_sources.sql`).
- [ ] Hit `/api/integrations/status` with a valid Supabase session and confirm connector rows return.
- [ ] Connect HubSpot/Instantly/PhantomBuster using test tokens; observe Supabase `connectors` and `connector_runs` entries updating.
- [ ] Confirm BigQuery tables (`hubspot_contacts`, `instantly_campaigns`, `phantombuster_automations`) exist in tenant dataset.
- [ ] Run `scripts/seed-bigquery.ts` with `BIGQUERY_SEED_DATASET` set; verify dataset and tables are seeded without error.

## UI / UX

- [ ] Open Settings → Integrations panel; ensure connector card grid renders with existing Zola styling.
- [ ] Submit a connector credential; modal closes and connector status updates after success.
- [ ] Invalid credential returns inline error in dialog.

## Chat DE Agent

- [ ] Select the `agentic-data` model in chat input and send a prompt; response is proxied via `/api/chat/de-agent`.
- [ ] Toggle to another model; chat routes to `/api/chat` as before.
- [ ] Unauthorized request to `/api/chat/de-agent` returns 401.

## Regressions

- [ ] `npm run lint` (acknowledge existing baseline warnings).
- [ ] `npx vitest` overall.
- [ ] Manual smoke test: send messages, upload files, and ensure multi-model chat still functions.


