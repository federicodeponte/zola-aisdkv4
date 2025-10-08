import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/app/types/database.types"
import { WEB_SEARCH_LIMITS } from "@/lib/config"

export type UserTier = "BETA" | "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"

// Get user's tier based on their account
export function getUserTier(user: {
  premium?: boolean | null
  anonymous?: boolean | null
}): UserTier {
  if (user.anonymous) return "FREE"
  if (user.premium) return "PROFESSIONAL"
  // Default to BETA for authenticated users during beta period
  return "BETA"
}

// Check if user has exceeded web search limit
export async function checkWebSearchLimit(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ allowed: boolean; remaining: number; limit: number; resetAt: Date }> {
  try {
    // Get user data
    const { data: user, error } = await supabase
      .from("users")
      .select("web_searches_today, web_search_reset, premium, anonymous")
      .eq("id", userId)
      .single()

    if (error || !user) {
      throw new Error("User not found")
    }

    // Check if we need to reset daily counter
    const now = new Date()
    const resetDate = user.web_search_reset ? new Date(user.web_search_reset) : new Date(0)
    const needsReset =
      !user.web_search_reset ||
      resetDate.getDate() !== now.getDate() ||
      resetDate.getMonth() !== now.getMonth() ||
      resetDate.getFullYear() !== now.getFullYear()

    let currentCount = user.web_searches_today || 0

    if (needsReset) {
      // Reset counter
      currentCount = 0
      await supabase
        .from("users")
        .update({
          web_searches_today: 0,
          web_search_reset: now.toISOString(),
        })
        .eq("id", userId)
    }

    // Get user's tier and limit
    const tier = getUserTier(user)
    const limit = WEB_SEARCH_LIMITS[tier]
    const remaining = Math.max(0, limit - currentCount)
    const allowed = currentCount < limit

    // Calculate reset time (midnight tonight)
    const resetAt = new Date()
    resetAt.setHours(24, 0, 0, 0)

    return {
      allowed,
      remaining,
      limit,
      resetAt,
    }
  } catch (error) {
    console.error("Error checking web search limit:", error)
    // Fail open - allow the search but log the error
    return {
      allowed: true,
      remaining: 0,
      limit: 0,
      resetAt: new Date(),
    }
  }
}

// Increment web search counter
export async function incrementWebSearchCount(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  try {
    // Increment counter
    const { error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: unknown }>) (
      "increment_web_search_count",
      { user_id: userId }
    )

    if (error) {
      // If function doesn't exist, do a manual update
      const { data: user } = await supabase
        .from("users")
        .select("web_searches_today")
        .eq("id", userId)
        .single()

      if (user) {
        await supabase
          .from("users")
          .update({
            web_searches_today: (user.web_searches_today || 0) + 1,
          })
          .eq("id", userId)
      }
    }
  } catch (error) {
    console.error("Error incrementing web search count:", error)
  }
}


