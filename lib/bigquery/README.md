# BigQuery Integration Helpers

This folder houses the lightweight adapter code that lets GrowthGPT talk to Google BigQuery when the feature is enabled. The implementation mirrors the approach used in the private `GTM-app-stripe-supabase-integration` codebase, but trimmed down so it can live in this monorepo without pulling the entire connector stack.

## Files

- `client.ts` – Lazy loader around `@google-cloud/bigquery`. It throws clear errors when BigQuery support is disabled or the dependency is missing. Integrations (HubSpot, Instantly, PhantomBuster) call this through `resolveBigQueryClient()` in their base service.
- `env.ts` – Single `isBigQueryEnabled()` helper that checks the `BIGQUERY_ENABLED` flag. We re-export it wherever we need to decide whether to spin up BigQuery (e.g., `app/api/integrations/*`).
- `__tests__/client.test.ts` – Jest tests covering the lazy-loading and guard logic.

## How it is used

- `lib/integrations/base-service.ts` resolves BigQuery lazily via `resolveBigQueryClient()`. If the flag is off or the dependency is missing, the services fall back to a noop path instead of crashing.
- `lib/integrations/*-service.ts` only call dataset/table helpers after the guard has passed. When BigQuery is disabled, the integrations still provision connectors but skip analytics storage.
- Related API routes (`app/api/integrations/hubspot|instantly|phantombuster`) gate the client creation behind `isBigQueryEnabled()` so production builds can omit the Google library entirely.

If you need the full reference implementation, check the private `gtm-stripe` repository — search for the `bigquery/` helpers there. The codepaths here are derived from that project but reworked to be flag-friendly and optional.

## Enabling BigQuery locally

1. Install the dependency if you haven’t already:
   ```bash
   pnpm add @google-cloud/bigquery
   ```
2. Populate the required environment variables (usually in `.env.local`):
   ```bash
   BIGQUERY_ENABLED=true
   GOOGLE_PROJECT_ID=<your-gcp-project>
   BIGQUERY_DEFAULT_LOCATION=<optional-region>
   SUPABASE_SERVICE_ROLE=<service-role-key>
   ```
3. Authenticate the Google SDK (`gcloud auth application-default login`) or provide a service-account key if you’re running serverside.

With the flag off (default), none of the Google SDK code is imported, so the build works without the dependency.

## Disabling BigQuery

Set `BIGQUERY_ENABLED=false` or remove the variable. All integrations will skip dataset/table provisioning, and the optional dependency can be omitted from installs.

## Gotchas

- Make sure Supabase has the `tenant_datasets` table populated (see the migrations in `supabase/migrations/20251009141500_create_prompt_queue.sql` and the `GTM-app-stripe-supabase-integration` provisioning scripts).
- The integration services assume the service role key has permissions to read/write to BigQuery. If you are copying this setup into another repo, double-check IAM and credentials.
