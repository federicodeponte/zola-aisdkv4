import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  Connector,
  ConnectorPayload,
  ConnectorProvider,
  ConnectorRun,
  TenantDataset,
} from "@/lib/types/agentic"
import type { Database } from "@/app/types/database.types"

type Supabase = SupabaseClient<Database>

export class ConnectorRepository {
  constructor(private readonly supabase: Supabase) {}

  async getTenantDataset(userId: string) {
    const { data, error } = await this.supabase
      .from("tenant_datasets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
    if (error) throw error
    return data as TenantDataset | null
  }

  async upsertTenantDataset(dataset: Omit<TenantDataset, "id">) {
    const { data, error } = await this.supabase
      .from("tenant_datasets")
      .upsert(dataset)
      .select("*")
      .single()
    if (error) throw error
    return data as TenantDataset
  }

  async getConnector(userId: string, provider: ConnectorProvider) {
    const { data, error } = await this.supabase
      .from("connectors")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle()
    if (error) throw error
    return data as Connector | null
  }

  async upsertConnector(connector: Partial<Connector> & {
    user_id: string
    provider: ConnectorProvider
  }) {
    const { data, error } = await this.supabase
      .from("connectors")
      .upsert(connector)
      .select("*")
      .single()
    if (error) throw error
    return data as Connector
  }

  async logConnectorRun(run: Omit<ConnectorRun, "id" | "created_at">) {
    const { data, error } = await this.supabase
      .from("connector_runs")
      .insert(run)
      .select("*")
      .single()
    if (error) throw error
    return data as ConnectorRun
  }

  async saveHubspotProperties(
    connectorId: string,
    properties: Array<{ object_type: string; property_name: string; label?: string; data_type?: string }>
  ) {
    if (properties.length === 0) return
    const { error } = await this.supabase
      .from("connector_properties")
      .upsert(
        properties.map((p) => ({
          connector_id: connectorId,
          object_type: p.object_type,
          property_name: p.property_name,
          label: p.label,
          data_type: p.data_type,
        }))
      )
    if (error) throw error
  }
}


