import Exa from "exa-js"
import { tool } from "ai"
import { z } from "zod"

// Initialize Exa client (optional - gracefully degrades if not available)
const getExaClient = () => {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) {
    return null
  }
  return new Exa(apiKey)
}

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
      const exa = getExaClient()
      
      // If Exa is not configured, return a helpful message
      if (!exa) {
        return {
          success: false,
          message: "Web search is not configured. Using Gemini's built-in knowledge instead. To enable real-time web search, add EXA_API_KEY to environment variables.",
          results: [],
        }
      }

      // Perform search with Exa
      const searchOptions: any = {
        numResults: Math.min(Math.max(numResults, 1), 10),
        useAutoprompt: true, // Exa will optimize the query
        contents: {
          text: { maxCharacters: 1000 }, // Get text excerpts
        },
      }

      if (category) {
        searchOptions.category = category
      }

      const results = await exa.searchAndContents(query, searchOptions)

      if (!results.results || results.results.length === 0) {
        return {
          success: false,
          message: "No results found for the query.",
          results: [],
        }
      }

      // Format results with citations
      const formattedResults = results.results.map((result: any, index: number) => ({
        id: result.id,
        title: result.title,
        url: result.url,
        excerpt: result.text || "No excerpt available",
        publishedDate: result.publishedDate,
        author: result.author,
        score: result.score,
        citation: `[${index + 1}]`,
      }))

      // Create a summary for the assistant
      const summary = formattedResults
        .map(
          (r: any, i: number) =>
            `${r.citation} ${r.title}\n${r.excerpt}\nSource: ${r.url}\n`
        )
        .join("\n")

      return {
        success: true,
        query,
        numResults: formattedResults.length,
        results: formattedResults,
        summary,
        citations: formattedResults.map((r: any) => ({
          number: r.citation,
          title: r.title,
          url: r.url,
        })),
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


