import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  parseCSV,
  processBulkCSV,
  resultsToCSV,
} from "@/lib/bulk-processing/processor"
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
        const supabase = await createClient()
        if (!supabase) {
          throw new Error("Supabase not configured")
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error("Unauthorized")
        }

        const body = await req.json()
        const { csvString, promptTemplate, model, chatId, mode } = body

        if (!csvString || !promptTemplate || !model || !chatId) {
          throw new Error("Missing required parameters")
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

        const csvData = parseCSV(csvString)
        const provider = getProviderForModel(model)
        const apiKey =
          (await getEffectiveApiKey(user.id, provider as ProviderWithoutOllama)) || undefined

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
          userId: user.id,
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
          .upload(`bulk-results/${executionId}.csv`, outputCSV, {
            contentType: "text/csv",
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Failed to upload results: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(`bulk-results/${executionId}.csv`)

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