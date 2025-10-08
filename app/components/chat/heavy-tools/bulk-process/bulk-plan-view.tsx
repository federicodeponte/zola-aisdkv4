"use client"

import { useMemo } from "react"
import type { PlanStage } from "@/lib/tools/heavy-tool/types"
import { PlanStage as BasePlanStage } from "../stages/plan-stage"

interface BulkPlanViewProps {
  stage: PlanStage
  onExecute: (mode: "sample" | "full") => void
  onRefine: () => void
  isExecuting?: boolean
}

export function BulkPlanView({ stage, onExecute, onRefine, isExecuting = false }: BulkPlanViewProps) {
  const downloadUrl = useMemo(() => stage.metadata?.csvUrl as string | undefined, [stage.metadata])

  const executionConfig = stage.metadata?.execution as
    | {
        payload?: {
          endpoint?: string
          action?: string
          mode?: string
        }
      }
    | undefined

  return (
    <div className="space-y-4">
      <BasePlanStage
        stage={stage}
        onExecute={onExecute}
        onRefine={onRefine}
        isExecuting={isExecuting}
      />
      {downloadUrl ? (
        <div className="flex justify-end text-xs text-muted-foreground">
          <a
            href={downloadUrl}
            rel="noopener noreferrer"
            target="_blank"
            className="underline"
          >
            View Source CSV
          </a>
        </div>
      ) : null}
      {executionConfig?.payload ? (
        <div className="rounded-md border border-dashed border-muted bg-muted/30 p-2 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Execution Details</div>
          <div>Endpoint: {executionConfig.payload.endpoint ?? "n/a"}</div>
          <div>Action: {executionConfig.payload.action ?? "n/a"}</div>
          <div>Mode: {executionConfig.payload.mode ?? "n/a"}</div>
        </div>
      ) : null}
    </div>
  )
}

