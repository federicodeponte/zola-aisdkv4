import type { ToolSet } from "ai"
import type { BuildAgentToolsV5Options } from "../../chat/tools"
import { buildBaseTools } from "../../chat/tools"
import { createGtmExpertTool } from "../../../lib/tools/gtm-expert"

export function buildGrowthTools(options: BuildAgentToolsV5Options): ToolSet {
  const { supabase, userId } = options
  const tools = buildBaseTools(options)

  if (supabase && userId) {
    tools.gtm_expert = createGtmExpertTool(supabase, userId)
  }

  return tools as ToolSet
}
