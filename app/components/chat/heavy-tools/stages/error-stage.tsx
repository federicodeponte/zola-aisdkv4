"use client"

import type { ErrorStage } from "@/lib/tools/heavy-tool/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ErrorStageProps {
  stage: ErrorStage
  onRetry?: () => void
}

export function ErrorStage({ stage, onRetry }: ErrorStageProps) {
  return (
    <Card className="space-y-3 border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
      <div className="font-medium">Bulk processing failed</div>
      <div className="text-xs leading-relaxed text-red-800 dark:text-red-200/80">
        {stage.error}
      </div>
      {stage.canRetry && onRetry ? (
        <Button
          size="sm"
          variant="outline"
          className="border-red-300 text-red-900 hover:bg-red-100 dark:border-red-900/40 dark:text-red-200 dark:hover:bg-red-900/30"
          onClick={onRetry}
        >
          Retry
        </Button>
      ) : null}
    </Card>
  )
}

