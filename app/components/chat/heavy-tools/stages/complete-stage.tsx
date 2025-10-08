"use client"

import type { CompleteStage } from "@/lib/tools/heavy-tool/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download } from "lucide-react"

interface CompleteStageProps {
  stage: CompleteStage
}

export function CompleteStage({ stage }: CompleteStageProps) {
  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-2 text-sm">
        <div className="font-medium text-foreground">Processing complete</div>
        <div className="grid gap-1 text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Processed rows:</span>{" "}
            {stage.summary.totalProcessed}
          </div>
          <div>
            <span className="font-medium text-foreground">Successful:</span>{" "}
            {stage.summary.successful}
          </div>
          {stage.summary.failed > 0 && (
            <div>
              <span className="font-medium text-foreground">Failed:</span>{" "}
              {stage.summary.failed}
            </div>
          )}
          <div>
            <span className="font-medium text-foreground">Total cost:</span>{" "}
            ${stage.summary.totalCost.toFixed(2)}
          </div>
        </div>
      </div>

      <Button asChild size="sm">
        <a href={stage.downloadUrl} download>
          <Download className="mr-2 h-4 w-4" /> Download enriched CSV
        </a>
      </Button>
    </Card>
  )
}

