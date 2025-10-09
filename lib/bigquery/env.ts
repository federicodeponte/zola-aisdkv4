// export a simple helper for feature gating BigQuery dependencies
export function isBigQueryEnabled() {
  return process.env.BIGQUERY_ENABLED === "true"
}
