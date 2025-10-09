import { describe, expect, it, vi, beforeEach } from "vitest"

import { BigQueryClient } from "../client"

vi.mock("@google-cloud/bigquery", () => {
  const ensureMock = vi.fn()
  const tableMock = vi.fn(() => ({
    get: vi.fn(() => Promise.resolve([{}])),
  }))
  const datasetMock = vi.fn(() => ({
    get: vi.fn(() => Promise.resolve([{}])),
    table: tableMock,
  }))
  const createQueryJobMock = vi.fn(() =>
    Promise.resolve([
      {
        getQueryResults: vi.fn(() => Promise.resolve([[{ id: 1 }]])),
      },
    ])
  )
  return {
    BigQuery: vi.fn(() => ({
      dataset: datasetMock,
      createQueryJob: createQueryJobMock,
    })),
    Job: vi.fn(),
    ensureMock,
  }
})

describe("BigQueryClient", () => {
  let client: BigQueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new BigQueryClient({ projectId: "test-project" })
  })

  it("ensures dataset", async () => {
    await expect(client.ensureDataset("tenant_dataset")).resolves.toBeDefined()
  })

  it("ensures table", async () => {
    await expect(
      client.ensureTable("tenant_dataset", "hubspot_contacts", { fields: [] })
    ).resolves.toBeDefined()
  })

  it("runs query", async () => {
    const result = await client.runQuery("SELECT 1")
    expect(result.rows).toEqual([{ id: 1 }])
  })
})


