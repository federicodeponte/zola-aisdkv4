import { tool } from "ai"
import { z } from "zod"
import Exa from "exa-js"

// Initialize Exa client for research
const getExaClient = () => {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) {
    return null
  }
  return new Exa(apiKey)
}

export const deepResearchTool = tool({
  description: `Perform comprehensive, multi-step research on a complex topic.
  Use this for in-depth analysis that requires multiple research iterations and synthesis.
  This is more thorough than a simple web search and suitable for:
  - Market landscape analysis
  - Competitive intelligence
  - Industry trend reports
  - Comprehensive GTM research
  
  NOTE: This is an expensive operation. Confirm with user before executing if not explicitly requested.`,
  parameters: z.object({
    topic: z
      .string()
      .describe(
        "The research topic or question (e.g., 'Marketing automation landscape for SMBs in 2025')"
      ),
    depth: z
      .enum(["basic", "standard", "comprehensive"])
      .optional()
      .default("standard")
      .describe(
        "Research depth: basic (2 iterations), standard (3 iterations), comprehensive (5 iterations)"
      ),
    focus_areas: z
      .array(z.string())
      .optional()
      .describe(
        "Specific focus areas to investigate (e.g., ['pricing', 'features', 'market share'])"
      ),
  }),
  execute: async ({ topic, depth = "standard", focus_areas }) => {
    try {
      const exa = getExaClient()
      
      // If Exa is not configured, return a helpful message
      if (!exa) {
        return {
          success: false,
          message: "Deep research requires EXA_API_KEY to be configured. Gemini can still answer based on its training data. To enable real-time research, add EXA_API_KEY to environment variables.",
          findings: [],
          summary: "Research capability not available without Exa API key.",
        }
      }

      // Determine number of research iterations based on depth
      const iterations = {
        basic: 2,
        standard: 3,
        comprehensive: 5,
      }[depth]

      const researchResults: any[] = []
      const searchQueries: string[] = []

      // Initial broad search
      searchQueries.push(topic)

      // Add focus area searches
      if (focus_areas && focus_areas.length > 0) {
        focus_areas.slice(0, iterations - 1).forEach((area) => {
          searchQueries.push(`${topic} ${area}`)
        })
      } else {
        // Generate follow-up queries
        searchQueries.push(`${topic} trends and analysis`)
        if (iterations >= 3) searchQueries.push(`${topic} best practices`)
        if (iterations >= 4) searchQueries.push(`${topic} market leaders`)
        if (iterations >= 5) searchQueries.push(`${topic} future outlook`)
      }

      // Execute searches iteratively
      for (let i = 0; i < Math.min(iterations, searchQueries.length); i++) {
        const query = searchQueries[i]

        try {
          const results = await exa.searchAndContents(query, {
            numResults: depth === "comprehensive" ? 8 : 5,
            useAutoprompt: true,
            contents: {
              text: { maxCharacters: 2000 },
            },
          })

          if (results.results && results.results.length > 0) {
            researchResults.push({
              iteration: i + 1,
              query,
              results: results.results.map((r: any) => ({
                title: r.title,
                url: r.url,
                excerpt: r.text,
                publishedDate: r.publishedDate,
                score: r.score,
              })),
            })
          }
        } catch (error: any) {
          console.error(`Research iteration ${i + 1} failed:`, error)
          researchResults.push({
            iteration: i + 1,
            query,
            error: error.message,
            results: [],
          })
        }

        // Small delay between requests to be respectful
        if (i < iterations - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      // Compile research summary
      const totalResults = researchResults.reduce(
        (sum, r) => sum + (r.results?.length || 0),
        0
      )

      const allSources = researchResults
        .flatMap((r) => r.results || [])
        .map((r, idx) => ({
          citation: `[${idx + 1}]`,
          title: r.title,
          url: r.url,
        }))

      const researchSummary = researchResults
        .map((iteration) => {
          if (iteration.error) {
            return `\n### Iteration ${iteration.iteration}: ${iteration.query}\nError: ${iteration.error}\n`
          }
          const results = iteration.results || []
          return `\n### Iteration ${iteration.iteration}: ${iteration.query}\nFound ${results.length} sources:\n${results
            .map((r: any, i: number) => `- ${r.title}\n  ${r.excerpt?.substring(0, 200)}...\n  ${r.url}`)
            .join("\n")}\n`
        })
        .join("\n")

      return {
        success: true,
        topic,
        depth,
        iterations: researchResults.length,
        totalResults,
        researchResults,
        summary: researchSummary,
        sources: allSources,
        message: `Deep research completed on "${topic}" with ${depth} depth. Found ${totalResults} sources across ${researchResults.length} research iterations.`,
        synthesisPrompt: `Based on the comprehensive research above, provide a detailed analysis of "${topic}". 
        
Structure your response to cover:
1. Overview and key findings
2. Current state and trends
3. Major players and solutions
4. Best practices and recommendations
5. Future outlook

Use citations [1], [2], etc. to reference sources.`,
      }
    } catch (error: any) {
      console.error("Deep research error:", error)
      return {
        success: false,
        message: `Deep research failed: ${error.message || "Unknown error"}`,
        topic,
      }
    }
  },
})

export type DeepResearchResult = Awaited<ReturnType<typeof deepResearchTool.execute>>


