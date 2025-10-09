import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../app/types/database.types"
import { isBigQueryEnabled } from "../../lib/bigquery/env"
import type { BigQueryClient } from "../../lib/bigquery/client"

export type BigQueryDependencies = {
  client?: BigQueryClient | null
}

export async function resolveBigQueryClient(
  current: BigQueryClient | null = null
): Promise<BigQueryClient | null> {
  if (current) {
    return current
  }

  if (!isBigQueryEnabled()) {
    return null
  }

  const projectId = process.env.GOOGLE_PROJECT_ID
  if (!projectId) {
    return null
  }

  const { BigQueryClient } = await import("../../lib/bigquery/client")
  return new BigQueryClient({
    projectId,
    location: process.env.BIGQUERY_DEFAULT_LOCATION ?? "US",
  })
}

export async function ensureDataset(
  supabase: SupabaseClient<Database>,
  bigquery: BigQueryClient | null,
  datasetId: string
) {
  if (!bigquery) {
    return
  }

  await bigquery.ensureDataset(datasetId)
}
