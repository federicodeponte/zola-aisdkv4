"use client"

import type { CompleteStage } from "@/lib/tools/heavy-tool/types"
import { CompleteStage as BaseCompleteStage } from "../stages/complete-stage"

interface BulkCompleteViewProps {
  stage: CompleteStage
}

export function BulkCompleteView({ stage }: BulkCompleteViewProps) {
  return <BaseCompleteStage stage={stage} />
}

