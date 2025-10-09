# Agentic Integrations Architecture

This document outlines the target architecture for multi-source data ingestion and tenant-aware analytics chat inside Zola. It is intentionally modular to satisfy SOLID and DRY goals.

## High-Level Goals

1. **Secure tenant data ingestion** from HubSpot, Instantly, and PhantomBuster into BigQuery.
2. **Expose connector management UX** in the existing Zola settings integrations page.
3. **Proxy chat requests** to the Data Engineering (DE) agent hosted on Modal, using the same Supabase session for authorization.
4. **Keep responsibilities isolated** (service/repository/presentation) so new sources or agents can plug in with minimal churn.

## System Context

```
User → Zola Web App → Next.js API Routes → Integration Services (Cloud Run)
                                         ↘ BigQuery (per-tenant datasets)
                                         ↘ Supabase (auth + metadata)
User → Chat UI → /api/chat/de-agent → Modal DE Agent → BigQuery
```

- **Supabase** supplies authentication and stores connector metadata, run history, and token usage stats.
- **API Gateway & Integration Services** (HubSpot/Instantly/PhantomBuster) remain external but are invoked via signed Supabase JWTs.
- **BigQuery** holds tenant datasets; ingestion services create/extend tables as needed.
- **Modal DE Agent** executes SQL over BigQuery using the caller’s Supabase context.

## Module Responsibilities

| Layer | Responsibility | Key Modules |
| --- | --- | --- |
| **Domain Models** | Typed contracts for tenants, connectors, runs, agent responses | `lib/types/agentic.ts` |
| **Repositories** | Supabase + BigQuery access with dependency injection | `lib/supabase/repositories/*`, `lib/bigquery/*` |
| **Services** | Business logic for each integration (validation, orchestrating ingestion) | `lib/integrations/{provider}` |
| **API Controllers** | Next.js API routes performing auth, calling services, normalizing envelopes | `app/api/integrations/*` |
| **UI** | Settings connections page, credential dialogs, status indicators | `app/components/layout/settings/connections/*` |
| **Chat Proxy** | Modal DE agent forwarding, session persistence | `app/api/chat/de-agent/route.ts`, chat hooks |

Each service keeps I/O dependencies (Supabase client, BigQuery client, fetch adapters) injected via constructors to comply with the Dependency Inversion Principle.

## Data Flows

### Connector Enrollment

1. User navigates to Settings → Integrations.
2. React component fetches connector status via `/api/integrations/status` (new route).
3. User opens modal → submits credentials (e.g., HubSpot token + property selections).
4. API route authenticates Supabase session, ensures tenant dataset via API gateway, forwards payload to integration service.
5. Service updates Supabase tables (`connectors`, `connector_runs`), triggers ingestion via Cloud Run service.
6. BigQuery tables are created/extended. Status is stored and reflected back in UI.

### Scheduled Syncs / Manual Re-run

Reuse the same POST endpoint with `run_async` flag; webhook or polling updates Supabase run status. BigQuery load jobs emit structured logs for observability.

### Chat DE Agent

1. Chat UI creates a session via existing chat store.
2. Conversation designated as “Agentic Data” routes to `/api/chat/de-agent` instead of standard chat route.
3. API handler validates Supabase session, extracts bearer token, forwards prompt to Modal endpoint with session ID.
4. Response is streamed back to UI; dataset and tenant IDs logged for audit.

## Database Additions (Supabase)

New tables (simplified):

- `tenant_datasets` – maps `user_id` to BigQuery dataset IDs and metadata.
- `connectors` – one row per provider + tenant, with connection state, masked identifiers.
- `connector_runs` – ingestion runs with status, counts, error messages.
- `connector_properties` – optional for HubSpot dynamic fields.

RLS ensures rows are scoped to the owning user (or tenant). Service role key is required for server-side jobs.

## BigQuery Strategy

- Dataset naming convention: `tenant_{sha}`.
- Common tables: `hubspot_contacts`, `hubspot_companies`, `instantly_campaigns`, `phantombuster_campaigns`.
- Use schema patching to add columns idempotently.
- Store raw payloads (`*_raw` JSON) to preserve full fidelity.

## Testing Approach

- **Unit Tests:** Services with mocked repositories/fetch.
- **Integration Tests:** Supabase test client hitting new tables; BigQuery client mocked via emulator or fake interface.
- **E2E Tests:** Playwright scripts exercising settings UI with mocked fetch.

## Observability

- Structured logging via shared logger utility (`lib/utils/logger.ts`, planned).
- Supabase `connector_runs` table acts as audit trail.
- Optional Sentry instrumentation toggled via env.

## Open Questions / Assumptions

- Integration services remain deployed and stable; mocking strategy needed for local dev.
- Modal agent expects Supabase JWT; ensure key rotation policy documented.
- BigQuery billing vs. project quota to be coordinated with infra team.

---

Document updated: {DATE}

