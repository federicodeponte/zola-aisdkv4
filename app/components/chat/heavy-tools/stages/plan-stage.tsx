"use client"

import type { PlanStage } from "@/lib/tools/heavy-tool/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"

interface PlanStageProps {
  stage: PlanStage
  onExecute: (mode: "sample" | "full") => void
  onRefine: () => void
  isExecuting?: boolean
}

export function PlanStage({ stage, onExecute, onRefine, isExecuting = false }: PlanStageProps) {
  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-3">
        <div className="prose dark:prose-invert max-w-none text-sm">
          <ReactMarkdown>{stage.markdown}</ReactMarkdown>
        </div>

        {stage.csvPreview && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Preview of first {stage.csvPreview.sampleRows.length} rows
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b text-left">
                    {stage.csvPreview.headers.map((header) => (
                      <th key={header} className="border-r px-2 py-1 last:border-r-0">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stage.csvPreview.sampleRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b last:border-b-0">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${rowIndex}-${cellIndex}`}
                          className="border-r px-2 py-1 text-muted-foreground last:border-r-0"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid gap-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Estimated rows:</span>{" "}
            {stage.estimates.rowsToProcess}
          </div>
          <div>
            <span className="font-medium text-foreground">Estimated cost:</span>{" "}
            ${stage.estimates.cost.toFixed(2)}
          </div>
          <div>
            <span className="font-medium text-foreground">Estimated time:</span>{" "}
            {stage.estimates.time}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefine}
          disabled={isExecuting}
        >
          Refine Plan
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onExecute("sample")}
          disabled={isExecuting}
        >
          Run Sample (3 rows)
        </Button>
        <Button
          size="sm"
          onClick={() => onExecute("full")}
          disabled={isExecuting}
        >
          {isExecuting ? "Running..." : "Run Full"} (
          {stage.estimates.rowsToProcess} rows)
        </Button>
      </div>
      {isExecuting && (
        <div className="rounded-md border border-dashed border-muted bg-muted/30 p-2 text-xs text-muted-foreground">
          Execution in progress...
        </div>
      )}
    </Card>
  )
}

