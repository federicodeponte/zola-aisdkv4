import type { BigQueryClient } from "@/lib/bigquery/client"
import {
  type HubspotConnectPayload,
  type HubspotFieldMetadata,
  type TenantDataset,
} from "@/lib/types/agentic"
import { IntegrationService, type IntegrationDependencies } from "./base-service"

const HUBSPOT_TABLES = {
  contacts: "hubspot_contacts",
  companies: "hubspot_companies",
}

export class HubspotIntegrationService extends IntegrationService<HubspotConnectPayload> {
  constructor(ctx: IntegrationDependencies) {
    super({ ...ctx, provider: "hubspot" })
  }

  validatePayload(payload: HubspotConnectPayload) {
    if (!payload.hubspotPrivateAppToken) {
      throw new Error("HubSpot private app token required")
    }
  }

  protected async ensureRemoteResources(dataset: TenantDataset, payload: HubspotConnectPayload) {
    if (!this.ctx.bigquery) {
      throw new Error("BigQuery integration is not configured")
    }
    await Promise.all([
      this.ensureTable(dataset.dataset_id, HUBSPOT_TABLES.contacts, payload.contactsProperties),
      this.ensureTable(dataset.dataset_id, HUBSPOT_TABLES.companies, payload.companiesProperties),
    ])
  }

  private async ensureTable(
    datasetId: string,
    tableName: string,
    properties?: string[]
  ) {
    const schema = {
      fields: [
        { name: "id", type: "STRING" },
        { name: "created_at", type: "TIMESTAMP" },
        { name: "updated_at", type: "TIMESTAMP" },
        { name: "properties_raw", type: "JSON" },
        ...(properties?.map((prop) => ({ name: prop, type: "STRING" })) ?? []),
      ],
    }
    if (!this.ctx.bigquery) {
      throw new Error("BigQuery integration is not configured")
    }
    await this.ctx.bigquery.ensureTable(datasetId, tableName, schema)
  }

  async saveSelectedFields(connectorId: string, fields: HubspotFieldMetadata[]) {
    await this.repository.saveHubspotProperties(
      connectorId,
      fields.map((field) => ({
        object_type: field.group ?? "contacts",
        property_name: field.name,
        label: field.label,
        data_type: field.type,
      }))
    )
  }
}


