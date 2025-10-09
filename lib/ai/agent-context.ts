import type { Database } from "@/app/types/database.types"
import { FEATURE_FLAGS, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { createAnalyzeWebsiteTool } from "@/lib/tools/analyze-website"
import { createBulkProcessTool } from "@/lib/tools/bulk-process-tool"
import { createDeepResearchTool } from "@/lib/tools/deep-research"
import { createGtmExpertTool } from "@/lib/tools/gtm-expert"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ToolSet } from "ai"
import { createClient } from "@/lib/supabase/server"

type BuildAgentToolsOptions = {
  supabase?: SupabaseClient<Database> | null
  userId?: string | null
  includeBulkTool?: boolean
}

export function resolveSystemPrompt(systemPrompt?: string | null): string {
  if (systemPrompt && systemPrompt.trim().length > 0) {
    return systemPrompt
  }

  return SYSTEM_PROMPT_DEFAULT
}

export function buildAgentTools(options: BuildAgentToolsOptions): ToolSet {
  const { supabase, userId, includeBulkTool = true } = options

  const tools: ToolSet = {}

  if (!supabase || !userId) {
    return tools
  }

  tools.gtm_expert = createGtmExpertTool(supabase, userId)
  tools.analyze_website = createAnalyzeWebsiteTool(supabase, userId)
  tools.deep_research = createDeepResearchTool()

  if (includeBulkTool && FEATURE_FLAGS.HEAVY_TOOLS) {
    tools.bulk_process = createBulkProcessTool(supabase, userId)
  }

  return tools
}

export async function resolveServerSupabase() {
  try {
    return await createClient()
  } catch (error) {
    console.error("Failed to create Supabase server client:", error)
    return null
  }
}
