import { describe, expect, it, beforeEach, vi } from "vitest"

import { InstantlyIntegrationService } from "../instantly-service"
import { BigQueryClient } from "@/lib/bigquery/client"

const mockEnsureDataset = vi.fn(() => Promise.resolve({}))
const mockEnsureTable = vi.fn(() => Promise.resolve({}))

vi.mock("@/lib/bigquery/client", () => ({
  BigQueryClient: vi.fn(() => ({
    ensureDataset: mockEnsureDataset,
    ensureTable: mockEnsureTable,
  })),
}))

vi.mock("@/lib/supabase/repositories/connector-repository", () => ({
  ConnectorRepository: vi.fn(() => ({
    getTenantDataset: vi.fn(() => Promise.resolve({ dataset_id: "tenant_dataset" })),
    getConnector: vi.fn(() => Promise.resolve(null)),
    upsertConnector: vi.fn(() => Promise.resolve({ id: "connector-id", user_id: "user", provider: "instantly" })),
  })),
}))

const supabaseMock = {} as any

describe("InstantlyIntegrationService", () => {
  let service: InstantlyIntegrationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new InstantlyIntegrationService({
      supabase: supabaseMock,
      bigquery: new BigQueryClient({ projectId: "test" }),
      provider: "instantly",
    })
  })

  it("requires api key", async () => {
    await expect(service.connect("user", { apiKey: "" })).rejects.toThrow("Instantly API key required")
  })

  it("creates tables when connecting", async () => {
    await service.connect("user", { apiKey: "instantly" })
    expect(mockEnsureTable).toHaveBeenCalled()
  })
})


