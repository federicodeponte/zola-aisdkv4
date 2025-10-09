import { NextRequest, NextResponse } from "next/server"
import {
  parseCSV,
  processBulkCSV,
  resultsToCSV,
} from "@/lib/bulk-processing/processor"
import { validateUserIdentity } from "@/lib/server/api"
import { getEffectiveApiKey } from "@/lib/user-keys"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import type { ProviderWithoutOllama } from "@/lib/user-keys"
import type {
  ExecutingStage,
  CompleteStage,
  ErrorStage,
} from "@/lib/tools/heavy-tool/types"
import { v4 as uuidv4 } from "uuid"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json()
        const { csvString, csvUrl, promptTemplate, model, chatId, mode, userId, isAuthenticated } = body

        if ((!csvString && !csvUrl) || !promptTemplate || !model || !chatId) {
          throw new Error("Missing required parameters")
        }

        const supabase = await validateUserIdentity(
          userId,
          Boolean(isAuthenticated),
          req
        )

        if (!supabase) {
          throw new Error("Supabase not configured")
        }

        const effectiveUserId = userId ?? (await supabase.auth.getUser()).data.user?.id

        if (!effectiveUserId) {
          throw new Error("Unauthorized")
        }

        const executionId = uuidv4()

        // Send initial executing stage
        const initialStage: ExecutingStage = {
          type: "executing",
          toolName: "bulk_process",
          timestamp: new Date().toISOString(),
          executionId,
          mode: mode ?? "full",
          progress: {
            current: 0,
            total: 0,
          },
        }
        controller.enqueue(
          encoder.encode(`event: stage\ndata: ${JSON.stringify({ stage: initialStage })}\n\n`)
        )

        let csvData
        if (csvString) {
          csvData = parseCSV(csvString)
        } else if (csvUrl) {
          const response = await fetch(csvUrl)
          if (!response.ok) {
            throw new Error(`Failed to download CSV (${response.status})`)
          }
          csvData = parseCSV(await response.text())
        } else {
          throw new Error("No CSV data provided")
        }
        const provider = getProviderForModel(model)
        const apiKey =
          (await getEffectiveApiKey(effectiveUserId, provider as ProviderWithoutOllama)) || undefined

        // Update with total count
        const progressStage: ExecutingStage = {
          ...initialStage,
          progress: {
            current: 0,
            total: mode === "sample" ? Math.min(3, csvData.length) : csvData.length,
          },
        }
        controller.enqueue(
          encoder.encode(`event: stage\ndata: ${JSON.stringify({ stage: progressStage })}\n\n`)
        )

        const result = await processBulkCSV({
          csvData,
          promptTemplate,
          model,
          userId: effectiveUserId,
          chatId,
          supabase,
          apiKey,
          mode: mode ?? "full",
          onProgress: (current, total, output) => {
            const updateStage: ExecutingStage = {
              type: "executing",
              toolName: "bulk_process",
              timestamp: new Date().toISOString(),
              executionId,
              mode: mode ?? "full",
              progress: {
                current,
                total,
                currentRow: output,
              },
            }
            controller.enqueue(
              encoder.encode(`event: stage\ndata: ${JSON.stringify({ stage: updateStage })}\n\n`)
            )
          },
        })

        const outputCSV = resultsToCSV(csvData, result.results)

        // Upload results to storage
        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(`${effectiveUserId}/bulk-results/${executionId}.csv`, outputCSV, {
            contentType: "text/csv",
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Failed to upload results: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(`${effectiveUserId}/bulk-results/${executionId}.csv`)

        // Send complete stage
        const completeStage: CompleteStage = {
          type: "complete",
          toolName: "bulk_process",
          timestamp: new Date().toISOString(),
          executionId,
          summary: {
            totalProcessed: result.processedRows,
            successful: result.results.filter((r) => !r.error).length,
            failed: result.results.filter((r) => r.error).length,
            totalCost: result.totalCost,
          },
          downloadUrl: publicUrlData.publicUrl,
        }
        controller.enqueue(
          encoder.encode(`event: stage\ndata: ${JSON.stringify({ stage: completeStage })}\n\n`)
        )
      } catch (error: unknown) {
        console.error("Bulk execution error:", error)
        const message = error instanceof Error ? error.message : "Unknown error"
        const errorStage: ErrorStage = {
          type: "error",
          toolName: "bulk_process",
          timestamp: new Date().toISOString(),
          error: message,
          canRetry: true,
        }
        controller.enqueue(
          encoder.encode(`event: stage\ndata: ${JSON.stringify({ stage: errorStage })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}