import type { PhantomBusterConnectPayload } from "@/lib/types/agentic"
import { IntegrationService, type IntegrationDependencies } from "./base-service"

export class PhantomBusterIntegrationService extends IntegrationService<PhantomBusterConnectPayload> {
  constructor(ctx: IntegrationDependencies) {
    super({ ...ctx, provider: "phantombuster" })
  }

  validatePayload(payload: PhantomBusterConnectPayload) {
    if (!payload.apiKey) {
      throw new Error("PhantomBuster API key required")
    }
  }

  protected async ensureRemoteResources(dataset: { dataset_id: string }) {
    const bigquery = await this.resolveBigQueryClient()
    if (!bigquery) {
      return
    }
    await bigquery.ensureTable(dataset.dataset_id, "phantombuster_automations", {
      fields: [
        { name: "id", type: "STRING" },
        { name: "name", type: "STRING" },
        { name: "status", type: "STRING" },
        { name: "runs", type: "INTEGER" },
        { name: "last_run_at", type: "TIMESTAMP" },
        { name: "raw_payload", type: "JSON" },
      ],
    })
  }
}


