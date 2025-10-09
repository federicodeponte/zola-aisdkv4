import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/app/types/database.types"
import type { BigQueryClient } from "@/lib/bigquery/client"
import { isBigQueryEnabled } from "@/lib/bigquery/env"
import type {
  Connector,
  ConnectorProvider,
  TenantDataset,
} from "@/lib/types/agentic"
import { ConnectorRepository } from "@/lib/supabase/repositories/connector-repository"

type Supabase = SupabaseClient<Database>

export interface IntegrationContext {
  supabase: Supabase
  provider: ConnectorProvider
  bigquery?: BigQueryClient | null
}

export type IntegrationDependencies = Omit<IntegrationContext, "provider">

export abstract class IntegrationService<TPayload> {
  protected repository: ConnectorRepository
  constructor(protected readonly ctx: IntegrationContext) {
    this.repository = new ConnectorRepository(ctx.supabase)
  }

  abstract validatePayload(payload: TPayload): void
  protected abstract ensureRemoteResources(
    dataset: TenantDataset,
    payload: TPayload
  ): Promise<void>

  async connect(userId: string, payload: TPayload) {
    this.validatePayload(payload)

    const dataset = await this.ensureTenantDataset(userId)
    const existingConnector = await this.repository.getConnector(
      userId,
      this.ctx.provider
    )

    const connector = await this.repository.upsertConnector({
      id: existingConnector?.id,
      user_id: userId,
      provider: this.ctx.provider,
      status: "pending",
      last_synced_at: existingConnector?.last_synced_at ?? null,
    })

    try {
      await this.ensureRemoteResources(dataset, payload)
      await this.repository.upsertConnector({
        id: connector.id,
        user_id: connector.user_id,
        provider: connector.provider,
        status: "connected",
        masked_identifier: connector.masked_identifier,
        last_synced_at: new Date().toISOString(),
      })
    } catch (error) {
      await this.repository.upsertConnector({
        id: connector.id,
        user_id: connector.user_id,
        provider: connector.provider,
        status: "error",
      })
      throw error
    }

    return connector
  }

  private async ensureTenantDataset(userId: string) {
    const dataset = await this.repository.getTenantDataset(userId)
    if (!dataset) {
      throw new Error("Tenant dataset not provisioned")
    }

    const bigquery = await this.resolveBigQueryClient()
    if (bigquery) {
      await bigquery.ensureDataset(dataset.dataset_id)
    }

    return dataset
  }

  protected async resolveBigQueryClient(): Promise<BigQueryClient | null> {
    if (this.ctx.bigquery) {
      return this.ctx.bigquery
    }

    if (!isBigQueryEnabled()) {
      return null
    }

    const projectId = process.env.GOOGLE_PROJECT_ID
    if (!projectId) {
      return null
    }

    const { BigQueryClient } = await import("@/lib/bigquery/client")
    const client = new BigQueryClient({
      projectId,
      location: process.env.BIGQUERY_DEFAULT_LOCATION ?? "US",
    })
    this.ctx.bigquery = client
    return client
  }
}


