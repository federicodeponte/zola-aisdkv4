import { BigQuery, type JobResponse } from "@google-cloud/bigquery"
import { isBigQueryEnabled } from "./env"

export interface BigQueryClientOptions {
  projectId: string
  location?: string
  keyFilename?: string
}

export interface BigQueryQueryResult {
  rows: Record<string, unknown>[]
  job: JobResponse
}

const missingModuleError = new Error(
  "@google-cloud/bigquery is not installed. Install the dependency or disable BigQuery integrations by setting BIGQUERY_ENABLED=false."
)

const disabledError = new Error("BigQuery integration is disabled")

let BigQueryCtor:
  | (new (
      options: BigQueryClientOptions
    ) => import("@google-cloud/bigquery").BigQuery)
  | null = null

function resolveBigQueryCtor(): typeof import("@google-cloud/bigquery").BigQuery {
  if (BigQueryCtor) {
    return BigQueryCtor
  }

  if (!isBigQueryEnabled()) {
    throw disabledError
  }

  try {
    const { BigQuery } = require("@google-cloud/bigquery") as typeof import("@google-cloud/bigquery")
    BigQueryCtor = BigQuery as typeof import("@google-cloud/bigquery").BigQuery
    return BigQueryCtor
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
      throw missingModuleError
    }
    throw error
  }
}

export class BigQueryClient {
  private readonly options: BigQueryClientOptions
  private instance: import("@google-cloud/bigquery").BigQuery | null = null

  constructor(options: BigQueryClientOptions) {
    this.client = new BigQuery({
      projectId: options.projectId,
      location: options.location,
      keyFilename: options.keyFilename,
    })
    this.location = options.location
  }

  async ensureDataset(datasetId: string) {
    const [dataset] = await this.client.dataset(datasetId).get({
      autoCreate: true,
    })
    return dataset
  }

  async ensureTable(datasetId: string, tableId: string, schema: object) {
    const dataset = this.client.dataset(datasetId)
    const [table] = await dataset.table(tableId).get({
      autoCreate: true,
      schema,
    })
    return table
  }

  async runQuery(query: string, params?: Record<string, unknown>) {
    const [job] = await this.client.createQueryJob({
      query,
      location: this.location,
      params,
    })
    const [rows] = await job.getQueryResults()
    return { rows, job } satisfies BigQueryQueryResult
  }
}


