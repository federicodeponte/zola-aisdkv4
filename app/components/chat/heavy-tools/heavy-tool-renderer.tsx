"use client"

import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils"
import { useMemo } from "react"
import { HeavyToolContainer } from "./heavy-tool-container"

export function HeavyToolRenderer({
  toolData,
}: {
  toolData: ToolInvocationUIPart
}) {
  return <HeavyToolContainer toolData={toolData} />
}

