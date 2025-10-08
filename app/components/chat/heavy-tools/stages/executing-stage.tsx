"use client"

import type { ExecutingStage } from "@/lib/tools/heavy-tool/types"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ExecutingStageProps {
  stage: ExecutingStage
  progress?: {
    current: number
    total: number
    currentRow?: string
  }
}

export function ExecutingStage({ stage, progress }: ExecutingStageProps) {
  const current = progress?.current ?? stage.progress.current
  const total = progress?.total ?? stage.progress.total
  const percentage = total === 0 ? 0 : Math.round((current / total) * 100)

  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">
          Processing {stage.mode === "sample" ? "sample" : "full"} run
        </div>
        <div className="text-xs text-muted-foreground">
          {current} of {total} rows completed
        </div>
        <Progress value={percentage} className="h-2" />
        {progress?.currentRow && (
          <div className="rounded-md border border-dashed border-muted bg-muted/30 p-2 text-xs text-muted-foreground">
            Current row: {progress.currentRow}
          </div>
        )}
      </div>
    </Card>
  )
}

