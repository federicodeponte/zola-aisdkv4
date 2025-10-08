"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils"
import { useChat } from "ai/react"
import { BulkPlanView } from "./bulk-process/bulk-plan-view"
import { BulkExecutingView } from "./bulk-process/bulk-executing-view"
import { BulkCompleteView } from "./bulk-process/bulk-complete-view"
import { BulkErrorView } from "./bulk-process/bulk-error-view"
import type {
  CompleteStage,
  ErrorStage,
  ExecutingStage,
  PlanStage,
} from "@/lib/tools/heavy-tool/types"
type BulkStages = PlanStage | ExecutingStage | CompleteStage | ErrorStage

interface HeavyToolContainerProps {
  toolData: ToolInvocationUIPart
}

export function HeavyToolContainer({ toolData }: HeavyToolContainerProps) {
  const { append } = useChat()
  const [isExecuting, setIsExecuting] = useState(false)
  const [planMetadata, setPlanMetadata] = useState<Record<string, unknown>>({})
  const [progress, setProgress] = useState<{
    current: number
    total: number
    currentRow?: string
  } | null>(null)


  const stage = useMemo(() => {
    if (toolData.toolInvocation.state !== "result") {
      return null
    }

    const content = toolData.toolInvocation.result?.content
    if (!Array.isArray(content)) {
      return null
    }

    const payloadText = content.find(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" &&
        part !== null &&
        part.type === "text" &&
        typeof part.text === "string" &&
        part.text.trim().startsWith("{\"stage\":")
    )?.text

    if (!payloadText) {
      return null
    }

    try {
      const parsed = JSON.parse(payloadText) as { stage?: unknown }
      if (!parsed || typeof parsed.stage !== "object" || parsed.stage === null) {
        return null
      }

      const stageCandidate = parsed.stage as { type?: unknown }
      if (
        stageCandidate.type === "plan" ||
        stageCandidate.type === "executing" ||
        stageCandidate.type === "complete" ||
        stageCandidate.type === "error"
      ) {
        return stageCandidate as BulkStages
      }
    } catch (error) {
      console.error("Failed to parse heavy tool payload", error)
      return null
    }

    return null
  }, [toolData.toolInvocation])

  useEffect(() => {
    if (stage?.type === "plan") {
      setPlanMetadata(stage.metadata ?? {})
    }

    if (stage?.type === "executing") {
      setIsExecuting(true)
      setProgress(stage.progress)
    }

    if (stage?.type === "complete" || stage?.type === "error") {
      setIsExecuting(false)
      setProgress(null)
    }
  }, [stage])

  const handleExecute = useCallback(
    async (mode: "sample" | "full") => {
      const execution = planMetadata.execution as
        | {
            payload?: {
              endpoint?: string
              action?: string
              mode?: string
            }
          }
        | undefined

      const endpoint = execution?.payload?.endpoint ?? "/api/bulk-process/run"

      const payload = {
        action: execution?.payload?.action ?? "execute",
        mode,
        ...execution?.payload,
      }

      try {
        setIsExecuting(true)
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`Execution failed (${response.status})`)
        }

        const data = await response.json()

        append({
          role: "assistant",
          content: JSON.stringify({ command: "bulk_execute_result", data }),
        })
      } catch (error) {
        console.error("Bulk execution error", error)
        append({
          role: "assistant",
          content: "Bulk execution failed. Please try again later.",
        })
      } finally {
        setIsExecuting(false)
      }
    },
    [append, planMetadata]
  )

  const handleRefine = useCallback(() => {
    append({
      role: "user",
      content: "Refine the bulk processing plan with these adjustments:",
    })
  }, [append])

  const handleRetry = useCallback(() => {
    append({
      role: "user",
      content: "Retry the bulk processing execution",
    })
  }, [append])

  if (!stage) {
    return null
  }

  switch (stage.type) {
    case "plan":
      return (
        <BulkPlanView
          stage={stage}
          onExecute={handleExecute}
          onRefine={handleRefine}
          isExecuting={isExecuting}
        />
      )
    case "executing":
      return <BulkExecutingView stage={stage} progress={progress ?? undefined} />
    case "complete":
      return <BulkCompleteView stage={stage} />
    case "error":
      return <BulkErrorView stage={stage} onRetry={handleRetry} />
    default:
      return null
  }
}

