const DEFAULT_TIMEOUT_MS = 15_000

export async function fetchCsvContent(
  csvUrl: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(csvUrl, {
      signal: controller.signal,
      headers: {
        Accept: "text/csv, text/plain",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to download CSV (${response.status})`)
    }

    return await response.text()
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Timed out while downloading CSV file")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}


