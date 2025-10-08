import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  parseCSV,
  processBulkCSV,
  resultsToCSV,
} from "@/lib/bulk-processing/processor"
import { getEffectiveApiKey } from "@/lib/user-keys"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import type { ProviderWithoutOllama } from "@/lib/user-keys"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!supabase) {
    return new Response("Supabase not configured", { status: 500 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const { csvString, promptTemplate, model, chatId, mode } = body

  if (!csvString) {
    return new Response("Missing CSV payload", { status: 400 })
  }

  if (!promptTemplate) {
    return new Response("Prompt template required", { status: 400 })
  }

  if (!model) {
    return new Response("Model required", { status: 400 })
  }

  if (!chatId) {
    return new Response("Chat ID required", { status: 400 })
  }

  const csvData = parseCSV(csvString)
  const provider = getProviderForModel(model)
  const apiKey =
    (await getEffectiveApiKey(user.id, provider as ProviderWithoutOllama)) || undefined

  const result = await processBulkCSV({
    csvData,
    promptTemplate,
    model,
    userId: user.id,
    chatId,
    supabase,
    apiKey,
    mode: mode ?? "full",
  })

  const outputCSV = resultsToCSV(csvData, result.results)

  return new Response(
    JSON.stringify({
      success: result.success,
      result,
      outputCSV,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  )
}


