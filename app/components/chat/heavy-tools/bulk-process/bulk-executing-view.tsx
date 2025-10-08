"use client"

import type { ExecutingStage } from "@/lib/tools/heavy-tool/types"
import { ExecutingStage as BaseExecutingStage } from "../stages/executing-stage"

interface BulkExecutingViewProps {
  stage: ExecutingStage
  progress?: {
    current: number
    total: number
    currentRow?: string
  }
}

export function BulkExecutingView({ stage, progress }: BulkExecutingViewProps) {
  return <BaseExecutingStage stage={stage} progress={progress} />
}

