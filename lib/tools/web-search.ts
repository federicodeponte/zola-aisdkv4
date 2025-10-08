import { tool } from "ai"
import { z } from "zod"

export const webSearchTool = tool({
  description: `Search the web for current information, news, articles, and data. 
  Use this when you need up-to-date information, research on current topics, or when the user asks about recent events.
  Returns search results with titles, URLs, and relevant content excerpts with citations.`,
  parameters: z.object({
    query: z.string().describe("The search query to find relevant information"),
    numResults: z
      .number()
      .optional()
      .default(5)
      .describe("Number of results to return (1-10)"),
    category: z
      .enum(["company", "research paper", "news", "github", "tweet", "pdf"])
      .optional()
      .describe("Optional category filter for more specific results"),
  }),
  execute: async ({ query, numResults = 5, category }) => {
    try {
      return {
        success: false,
        message:
          "Gemini native search grounding handles real-time web lookups. Trigger it by asking the model for up-to-date information.",
        results: [],
      }
    } catch (error: any) {
      console.error("Web search error:", error)
      return {
        success: false,
        message: `Search failed: ${error.message || "Unknown error"}`,
        results: [],
      }
    }
  },
})

export type WebSearchResult = Awaited<ReturnType<typeof webSearchTool.execute>>


