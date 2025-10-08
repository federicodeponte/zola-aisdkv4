export type HeavyToolStageType = "plan" | "executing" | "complete" | "error"

export interface HeavyToolStageBase {
  type: HeavyToolStageType
  toolName: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface PlanStage extends HeavyToolStageBase {
  type: "plan"
  markdown: string
  csvPreview?: {
    headers: string[]
    sampleRows: string[][]
    totalRows: number
  }
  estimates: {
    cost: number
    time: string
    rowsToProcess: number
  }
}

export interface ExecutingStage extends HeavyToolStageBase {
  type: "executing"
  executionId: string
  mode: "sample" | "full"
  progress: {
    current: number
    total: number
    currentRow?: string
  }
}

export interface CompleteStage extends HeavyToolStageBase {
  type: "complete"
  executionId: string
  summary: {
    totalProcessed: number
    successful: number
    failed: number
    totalCost: number
  }
  downloadUrl: string
}

export interface ErrorStage extends HeavyToolStageBase {
  type: "error"
  error: string
  canRetry: boolean
  metadata?: Record<string, unknown>
}

export type HeavyToolStage = PlanStage | ExecutingStage | CompleteStage | ErrorStage

export interface HeavyToolPlanResult {
  stage: PlanStage
}

export interface HeavyToolExecutionStart {
  stage: ExecutingStage
}

export interface HeavyToolCompletionResult {
  stage: CompleteStage
}

export interface HeavyToolErrorResult {
  stage: ErrorStage
}

export type HeavyToolResult =
  | HeavyToolPlanResult
  | HeavyToolExecutionStart
  | HeavyToolCompletionResult
  | HeavyToolErrorResult

