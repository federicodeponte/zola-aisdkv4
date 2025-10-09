import { describe, expect, it, beforeEach, vi } from "vitest"

import { PhantomBusterIntegrationService } from "../phantombuster-service"
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
    upsertConnector: vi.fn(() => Promise.resolve({ id: "connector-id", user_id: "user", provider: "phantombuster" })),
  })),
}))

const supabaseMock = {} as any

describe("PhantomBusterIntegrationService", () => {
  let service: PhantomBusterIntegrationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PhantomBusterIntegrationService({
      supabase: supabaseMock,
      bigquery: new BigQueryClient({ projectId: "test" }),
      provider: "phantombuster",
    })
  })

  it("requires api key", async () => {
    await expect(service.connect("user", { apiKey: "" })).rejects.toThrow("PhantomBuster API key required")
  })

  it("creates table on connect", async () => {
    await service.connect("user", { apiKey: "pb" })
    expect(mockEnsureTable).toHaveBeenCalled()
  })
})


