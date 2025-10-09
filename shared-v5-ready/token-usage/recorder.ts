import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../app/types/database.types"
import { trackTokenUsage } from "../../lib/tools/token-tracking"

export type TokenUsageMetrics = {
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
}

export type TokenUsageRecorderOptions = {
  supabase?: SupabaseClient<Database> | null
  userId?: string | null
  chatId?: string | null
  model: string
  actionType?: string
}

export type TokenUsageRecorder = (usage?: TokenUsageMetrics | null) => Promise<void>

export function createTokenUsageRecorder(
  options: TokenUsageRecorderOptions
): TokenUsageRecorder {
  const {
    supabase,
    userId,
    chatId,
    model,
    actionType = "message",
  } = options

  if (!supabase || !userId || !chatId) {
    return async () => {}
  }

  return async (usage?: TokenUsageMetrics | null) => {
    if (!usage) {
      return
    }

    const promptTokens =
      typeof usage.promptTokens === "number" && !Number.isNaN(usage.promptTokens)
        ? usage.promptTokens
        : 0
    const completionTokens =
      typeof usage.completionTokens === "number" &&
      !Number.isNaN(usage.completionTokens)
        ? usage.completionTokens
        : 0

    if (promptTokens === 0 && completionTokens === 0) {
      return
    }

    await trackTokenUsage(supabase, {
      userId,
      chatId,
      model,
      promptTokens,
      completionTokens,
      actionType,
    })
  }
}


