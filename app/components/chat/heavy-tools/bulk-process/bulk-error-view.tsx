"use client"

import type { ErrorStage } from "@/lib/tools/heavy-tool/types"
import { ErrorStage as BaseErrorStage } from "../stages/error-stage"

interface BulkErrorViewProps {
  stage: ErrorStage
  onRetry?: () => void
}

export function BulkErrorView({ stage, onRetry }: BulkErrorViewProps) {
  return <BaseErrorStage stage={stage} onRetry={onRetry} />
}

