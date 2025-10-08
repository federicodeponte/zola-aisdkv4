import type { Database } from "@/app/types/database.types"
import type { SupabaseClient } from "@supabase/supabase-js"

// Model pricing per 1M tokens (input/output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Gemini models
  "gemini-2.5-flash": { input: 0.075, output: 0.3 }, // 2.5 Flash (default - GA June 2025)
  "gemini-2.0-flash-001": { input: 0.075, output: 0.3 },
  "gemini-1.5-flash-002": { input: 0.075, output: 0.3 },
  "gemini-1.5-flash-8b": { input: 0.0375, output: 0.15 },
  "gemini-1.5-pro-002": { input: 1.25, output: 5.0 },
  "gemini-2.5-pro-exp-03-25-pro": { input: 2.5, output: 10.0 },
  
  // OpenAI models (for reference)
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  
  // Claude models
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 1.0, output: 5.0 },
  
  // Default fallback
  default: { input: 0.5, output: 1.5 },
}

function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default
  
  const inputCost = (promptTokens / 1_000_000) * pricing.input
  const outputCost = (completionTokens / 1_000_000) * pricing.output
  
  return inputCost + outputCost
}

export async function trackTokenUsage(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string
    chatId: string
    model: string
    promptTokens: number
    completionTokens: number
    actionType?: string
  }
) {
  const { userId, chatId, model, promptTokens, completionTokens, actionType } = params

  const totalTokens = promptTokens + completionTokens
  const cost = calculateCost(model, promptTokens, completionTokens)

  try {
    const { error } = await supabase.from("token_usage").insert({
      user_id: userId,
      chat_id: chatId,
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost_usd: cost,
      action_type: actionType || "message",
    })

    if (error) {
      console.error("Error tracking token usage:", error)
    } else {
      console.log(
        `Tracked usage: ${totalTokens} tokens ($${cost.toFixed(6)}) for ${model}`
      )
    }
  } catch (error) {
    console.error("Failed to track token usage:", error)
  }
}

export async function getUserTokenStats(
  supabase: SupabaseClient<Database>,
  userId: string,
  period: "today" | "week" | "month" | "all" = "month"
): Promise<{
  totalTokens: number
  totalCost: number
  byModel: Record<string, { tokens: number; cost: number }>
  byAction: Record<string, { tokens: number; cost: number }>
}> {
  try {
    let query = supabase
      .from("token_usage")
      .select("*")
      .eq("user_id", userId)

    // Add time filter
    const now = new Date()
    if (period === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      query = query.gte("created_at", todayStart.toISOString())
    } else if (period === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      query = query.gte("created_at", weekAgo.toISOString())
    } else if (period === "month") {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      query = query.gte("created_at", monthAgo.toISOString())
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      totalTokens: 0,
      totalCost: 0,
      byModel: {} as Record<string, { tokens: number; cost: number }>,
      byAction: {} as Record<string, { tokens: number; cost: number }>,
    }

    if (!data) return stats

    data.forEach((record) => {
      stats.totalTokens += record.total_tokens
      stats.totalCost += Number(record.cost_usd)

      // By model
      if (!stats.byModel[record.model]) {
        stats.byModel[record.model] = { tokens: 0, cost: 0 }
      }
      stats.byModel[record.model].tokens += record.total_tokens
      stats.byModel[record.model].cost += Number(record.cost_usd)

      // By action
      const action = record.action_type || "message"
      if (!stats.byAction[action]) {
        stats.byAction[action] = { tokens: 0, cost: 0 }
      }
      stats.byAction[action].tokens += record.total_tokens
      stats.byAction[action].cost += Number(record.cost_usd)
    })

    return stats
  } catch (error) {
    console.error("Error getting token stats:", error)
    return {
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
      byAction: {},
    }
  }
}

