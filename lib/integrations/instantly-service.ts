import type { InstantlyConnectPayload } from "@/lib/types/agentic"
import { IntegrationService, type IntegrationDependencies } from "./base-service"

export class InstantlyIntegrationService extends IntegrationService<InstantlyConnectPayload> {
  constructor(ctx: IntegrationDependencies) {
    super({ ...ctx, provider: "instantly" })
  }

  validatePayload(payload: InstantlyConnectPayload) {
    if (!payload.apiKey) {
      throw new Error("Instantly API key required")
    }
  }

  protected async ensureRemoteResources(dataset: { dataset_id: string }) {
    const bigquery = await this.resolveBigQueryClient()
    if (!bigquery) {
      return
    }
    await bigquery.ensureTable(dataset.dataset_id, "instantly_campaigns", {
      fields: [
        { name: "id", type: "STRING" },
        { name: "name", type: "STRING" },
        { name: "status", type: "STRING" },
        { name: "sent", type: "INTEGER" },
        { name: "opened", type: "INTEGER" },
        { name: "replied", type: "INTEGER" },
        { name: "bounced", type: "INTEGER" },
        { name: "raw_payload", type: "JSON" },
      ],
    })
  }
}


