# Agentic Integrations – Environment Checklist

This document captures all secrets and configuration values required to run the agentic integrations locally or in a preview deployment. Keep values out of git; populate them in `.env.local`, Vercel project settings, or secure secret stores only.

## Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side migrations + background jobs)
- `SUPABASE_JWT_SECRET` (only if the API gateway or Modal agent validates JWTs manually)

## Integration Services

HubSpot, Instantly, and PhantomBuster connectors proxy to dedicated Cloud Run services via the API gateway. Use tenant-scoped Supabase JWTs for auth.

- `NEXT_PUBLIC_API_GATEWAY_BASE_URL` – base URL for tenant provisioning (e.g. `https://api-gateway-xxxxx.a.run.app`)
- `NEXT_PUBLIC_HUBSPOT_API_BASE_URL` – HubSpot integration endpoint (default: `https://integration-hubspot-...a.run.app`)
- `NEXT_PUBLIC_INSTANTLY_API_BASE_URL` – Instantly integration endpoint (default: `https://integration-instantly-...a.run.app`)
- `NEXT_PUBLIC_PHANTOMBUSTER_API_BASE_URL` – PhantomBuster integration endpoint (default: `https://integration-phantombuster-...a.run.app`)
- `HUBSPOT_CONNECT_CALLBACK_URL` (if backend requires explicit redirect URI)

### Local Mocking (Optional)

Use a tool like `wiremock` or `msw` to stand in for the integration services. Document base URLs when running locally, e.g. `http://127.0.0.1:8080`.

## BigQuery

The service layer uses a tenant-aware dataset per Supabase user.

- `GOOGLE_PROJECT_ID`
- `BIGQUERY_DEFAULT_LOCATION` (e.g. `US`)
- `GOOGLE_APPLICATION_CREDENTIALS` (path to service-account JSON with BigQuery + Cloud Storage permissions)
- `BIGQUERY_BILLING_DATASET` (optional – dataset for audit logs / cost reporting)
- `BIGQUERY_DEV_DATASET_PREFIX` (naming convention, e.g. `tenant_`)

For container-based deployments, mount the service account JSON as a secret and point `GOOGLE_APPLICATION_CREDENTIALS` to the mounted path.

## Modal DE Agent

- `DE_AGENT_BASE_URL` (default: `https://scaile--de-agent.modal.run`)
- `DE_AGENT_TIMEOUT_MS` (optional override for proxy timeout)

## Observability & Misc

- `SENTRY_DSN` (optional for logging)
- `LOG_LEVEL` / `LOG_SAMPLING_RATE`
- `NEXT_PUBLIC_HEAVY_TOOLS` (feature flag already present; keep `true` when exposing CSV tooling alongside agentic features)

> **Note:** Lint currently fails in the base branch due to legacy `any` usages. Track and address separately before production deployment, but proceed with agentic work on top of the existing baseline.


