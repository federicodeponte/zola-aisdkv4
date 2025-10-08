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
              csvString?: string
              promptTemplate?: string
              model?: string
              chatId?: string
            }
          }
        | undefined

      const endpoint = execution?.payload?.endpoint ?? "/api/bulk-process/run"
      const csvString = (planMetadata.csvString as string) || ""

      const payload = {
        csvString,
        promptTemplate: execution?.payload?.promptTemplate,
        model: execution?.payload?.model,
        chatId: toolData.toolInvocation.toolCallId,
        mode,
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

        if (!response.body) {
          throw new Error("No response stream")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.stage) {
                  // Update UI with new stage
                  if (data.stage.type === "executing") {
                    setProgress(data.stage.progress)
                  } else if (data.stage.type === "complete" || data.stage.type === "error") {
                    // Let the parent component know execution is complete
                    append({
                      role: "assistant",
                      content: JSON.stringify({ 
                        type: "tool",
                        toolInvocation: {
                          ...toolData.toolInvocation,
                          state: "result",
                          result: {
                            content: [{
                              type: "text",
                              text: JSON.stringify({ stage: data.stage })
                            }]
                          }
                        }
                      }),
                    })
                    setIsExecuting(false)
                    break
                  }
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e)
              }
            }
          }
        }
      } catch (error) {
        console.error("Bulk execution error", error)
        const errorStage = {
          type: "error",
          toolName: "bulk_process",
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
          canRetry: true,
        }
        append({
          role: "assistant",
          content: JSON.stringify({ 
            type: "tool",
            toolInvocation: {
              ...toolData.toolInvocation,
              state: "result",
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify({ stage: errorStage })
                }]
              }
            }
          }),
        })
      } finally {
        setIsExecuting(false)
      }
    },
    [append, planMetadata, toolData]
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

