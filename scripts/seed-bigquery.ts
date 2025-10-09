import { BigQueryClient } from "@/lib/bigquery/client"

const datasetId = process.env.BIGQUERY_SEED_DATASET

if (!datasetId) {
  throw new Error("BIGQUERY_SEED_DATASET environment variable is required")
}

const client = new BigQueryClient({
  projectId: process.env.GOOGLE_PROJECT_ID!,
  location: process.env.BIGQUERY_DEFAULT_LOCATION,
})

async function seed() {
  await client.ensureDataset(datasetId)
  await client.ensureTable(datasetId, "hubspot_contacts", {
    fields: [
      { name: "id", type: "STRING" },
      { name: "email", type: "STRING" },
      { name: "created_at", type: "TIMESTAMP" },
    ],
  })
  console.log("Seeded dataset", datasetId)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})


