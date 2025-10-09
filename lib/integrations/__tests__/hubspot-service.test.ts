import { describe, expect, it, beforeEach, vi } from "vitest"

import { HubspotIntegrationService } from "../hubspot-service"
import { BigQueryClient } from "@/lib/bigquery/client"

const mockEnsureDataset = vi.fn(() => Promise.resolve({}))
const mockEnsureTable = vi.fn(() => Promise.resolve({}))

vi.mock("@/lib/bigquery/client", () => {
  return {
    BigQueryClient: vi.fn(() => ({
      ensureDataset: mockEnsureDataset,
      ensureTable: mockEnsureTable,
    })),
  }
})

vi.mock("@/lib/supabase/repositories/connector-repository", () => {
  return {
    ConnectorRepository: vi.fn(() => ({
      getTenantDataset: vi.fn(() => Promise.resolve({ dataset_id: "tenant_dataset" })),
      getConnector: vi.fn(() => Promise.resolve(null)),
      upsertConnector: vi.fn(() => Promise.resolve({ id: "connector-id", user_id: "user", provider: "hubspot" })),
      saveHubspotProperties: vi.fn(),
    })),
  }
})

const supabaseMock = {
  auth: { getUser: vi.fn() },
} as any

describe("HubspotIntegrationService", () => {
  let service: HubspotIntegrationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new HubspotIntegrationService({
      supabase: supabaseMock,
      bigquery: new BigQueryClient({ projectId: "test" }),
      provider: "hubspot",
    })
  })

  it("validates payload", async () => {
    await expect(service.connect("user", { hubspotPrivateAppToken: "token" })).resolves.toBeDefined()
  })

  it("throws when token missing", async () => {
    await expect(service.connect("user", { hubspotPrivateAppToken: "" })).rejects.toThrow(
      "HubSpot private app token required"
    )
  })
})


