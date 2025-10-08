import { tool } from "ai"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import type { Database } from "@/app/types/database.types"
import { fetchCsvContent } from "@/lib/bulk-processing/fetch-csv"
import {
  parseCSV,
  generateExecutionPlan,
} from "@/lib/bulk-processing/processor"
import { FEATURE_FLAGS, MODEL_DEFAULT } from "@/lib/config"
import type { PlanStage, ErrorStage } from "./heavy-tool/types"

const ToolParamsSchema = z.object({
  stage: z.enum(["plan", "execute"]).default("plan"),
  csvUrl: z
    .string()
    .url()
    .describe("Public URL of the CSV to process."),
  promptTemplate: z
    .string()
    .min(1)
    .describe("Prompt template with {{variable}} placeholders."),
  model: z.string().default(MODEL_DEFAULT),
  mode: z.enum(["sample", "full"]).optional(),
  refinements: z.string().optional(),
})

export const createBulkProcessTool = (
  supabase: SupabaseClient<Database>,
  userId: string
) => {
  return tool({
    description:
      "Generate and execute a bulk processing plan against a CSV file. Produces a plan with validation, sample prompts, and execution estimates.",
    parameters: ToolParamsSchema,
    execute: async ({ stage, csvUrl, promptTemplate, model, mode, refinements }) => {
      if (!FEATURE_FLAGS.HEAVY_TOOLS) {
        const disabledStage: ErrorStage = {
          type: "error",
          toolName: "bulk_process",
          timestamp: new Date().toISOString(),
          error: "Bulk processing tools are disabled in this environment.",
          canRetry: false,
        }

        return { stage: disabledStage }
      }

      if (stage === "plan") {
        try {
          const csvContent = await fetchCsvContent(csvUrl)
          const csvData = parseCSV(csvContent)

          if (!csvData.length) {
            const errorStage: ErrorStage = {
              type: "error",
              toolName: "bulk_process",
              timestamp: new Date().toISOString(),
              error: "The provided CSV is empty. Please upload a file with at least one data row.",
              canRetry: false,
            }
            return { stage: errorStage }
          }

          const planPreview = generateExecutionPlan(csvData, promptTemplate, model)

          if (!planPreview.valid) {
            const errorStage: ErrorStage = {
              type: "error",
              toolName: "bulk_process",
              timestamp: new Date().toISOString(),
              error: planPreview.errors.join("\n"),
              canRetry: false,
            }
            return { stage: errorStage }
          }

          const headers = Object.keys(csvData[0] ?? {})
          const previewRows = csvData
            .slice(0, 3)
            .map((row) => headers.map((header) => row[header] ?? ""))

          const planStage: PlanStage = {
            type: "plan",
            toolName: "bulk_process",
            timestamp: new Date().toISOString(),
            markdown: [
              "## Bulk Processing Plan",
              `- **Rows detected:** ${planPreview.preview.totalRows}`,
              `- **Estimated tokens:** ${planPreview.preview.estimatedTokens.toLocaleString()}`,
              `- **Estimated cost:** $${planPreview.preview.estimatedCost.toFixed(2)}`,
              refinements
                ? `### Refinements\n\n${refinements}`
                : "",
              "### Sample prompts",
              planPreview.preview.samplePrompts
                .map((prompt, index) => `**Row ${index + 1}:**\n\n${prompt}`)
                .join("\n\n---\n\n"),
            ]
              .filter(Boolean)
              .join("\n\n"),
            csvPreview: {
              headers,
              sampleRows: previewRows,
              totalRows: csvData.length,
            },
            estimates: {
              cost: planPreview.preview.estimatedCost,
              time: planPreview.preview.totalRows
                ? `~${Math.max(1, Math.ceil(planPreview.preview.totalRows / 2))} min`
                : "~1 min",
              rowsToProcess: planPreview.preview.totalRows,
            },
            metadata: {
              model,
              promptTemplate,
              csvUrl,
              csvString: csvContent,
            },
          }

          return {
            stage: {
              ...planStage,
              metadata: {
                ...planStage.metadata,
                plan: planPreview,
                execution: {
                  payload: {
                    endpoint: "/api/bulk-process/run",
                    action: "execute",
                    mode: mode ?? "full",
                    promptTemplate,
                    model,
                  },
                },
              },
            },
          }
        } catch (error) {
          const errorStage: ErrorStage = {
            type: "error",
            toolName: "bulk_process",
            timestamp: new Date().toISOString(),
            error:
              error instanceof Error
                ? error.message
                : "Failed to analyze CSV file.",
            canRetry: false,
          }
          return { stage: errorStage }
        }
      }

      return {
        stage: {
          type: "error",
          toolName: "bulk_process",
          timestamp: new Date().toISOString(),
          error: "Use /api/bulk-process with action=execute to run this plan.",
          canRetry: false,
          metadata: {
            mode: mode ?? "full",
          },
        },
      }
    },
  })
}

