import { tool } from "ai"
import { z } from "zod"
import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/app/types/database.types"

export const createGtmExpertTool = (supabase: SupabaseClient<Database>, userId: string) => {
  return tool({
    description: `Expert analysis for Go-To-Market strategy, revenue operations, and growth marketing.
    Use this tool when the user asks about:
    - GTM strategy and execution
    - Attribution modeling and revenue analytics
    - Marketing and sales tech stack recommendations
    - Customer acquisition and retention strategies
    - Product-market fit analysis
    - Channel strategy and performance optimization
    - RevOps best practices and systems thinking
    
    This tool will pull relevant business context from previously analyzed websites and provide deep strategic insights.`,
    parameters: z.object({
      question: z
        .string()
        .describe(
          "The GTM/RevOps question or topic to analyze (e.g., 'How to optimize our lead-to-customer funnel?')"
        ),
      context: z
        .string()
        .optional()
        .describe(
          "Additional context about the company, industry, or situation (e.g., 'B2B SaaS, Series A, $2M ARR')"
        ),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe(
          "Specific domains to pull business context from (e.g., ['example.com', 'competitor.com'])"
        ),
    }),
    execute: async ({ question, context, includeDomains }) => {
      try {
        // Fetch relevant website contexts if available
        let websiteContexts: any[] = []
        if (supabase && userId) {
          try {
            let query = supabase
              .from("website_contexts")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })

            if (includeDomains && includeDomains.length > 0) {
              query = query.in("domain", includeDomains)
            } else {
              // Get most recent 5 if no specific domains
              query = query.limit(5)
            }

            const { data, error } = await query

            if (error) {
              console.error("Error fetching website contexts:", error)
            } else if (data) {
              websiteContexts = data
            }
          } catch (error) {
            console.error("Supabase query error:", error)
          }
        }

        // Build analysis prompt with business context
        let analysisPrompt = `GTM Expert Analysis Request:\n\n`
        analysisPrompt += `Question: ${question}\n\n`

        if (context) {
          analysisPrompt += `Additional Context: ${context}\n\n`
        }

        if (websiteContexts.length > 0) {
          analysisPrompt += `Relevant Business Context:\n`
          websiteContexts.forEach((ctx) => {
            analysisPrompt += `\n- ${ctx.company_name || ctx.domain}:`
            if (ctx.industry) analysisPrompt += `\n  Industry: ${ctx.industry}`
            if (ctx.value_proposition)
              analysisPrompt += `\n  Value Prop: ${ctx.value_proposition}`
            if (ctx.analysis?.business_model)
              analysisPrompt += `\n  Model: ${ctx.analysis.business_model}`
          })
          analysisPrompt += `\n\n`
        }

        // GTM Expert Framework
        const gtmFramework = {
          attribution_models: {
            first_touch: "Identifies initial marketing touchpoint",
            last_touch: "Credits final conversion touchpoint",
            multi_touch: "Distributes credit across journey",
            time_decay: "More recent touches get more credit",
            u_shaped: "40% first, 40% last, 20% middle",
            w_shaped: "30% first, 30% opportunity, 30% close, 10% middle",
          },
          gtm_motions: {
            sales_led: "Direct sales team, higher ACV, longer cycles",
            product_led: "Self-serve, viral growth, product as channel",
            marketing_led: "Content, paid, demand gen drives pipeline",
            partner_led: "Channel partners, integrations, ecosystem",
            community_led: "User community, advocacy, network effects",
          },
          key_metrics: {
            acquisition: ["CAC", "LTV", "Payback Period", "MQL/SQL Velocity"],
            activation: ["Time to Value", "Onboarding Completion", "Aha Moment"],
            retention: ["Churn Rate", "NRR", "GRR", "Cohort Analysis"],
            revenue: ["ARR/MRR", "ACV", "Expansion Revenue", "Rule of 40"],
          },
          tech_stack_categories: {
            data_foundation: ["CDP", "Data Warehouse", "Reverse ETL"],
            marketing: ["MAP", "ABM Platform", "Content", "SEO", "Social"],
            sales: ["CRM", "Sales Engagement", "Conversation Intelligence"],
            analytics: ["Attribution", "BI Tools", "Product Analytics"],
            automation: ["Workflow Tools", "Integration Platform", "AI/ML"],
          },
        }

        return {
          success: true,
          question,
          context: context || null,
          websiteContextsFound: websiteContexts.length,
          analysisPrompt,
          gtmFramework,
          recommendations: {
            message:
              "This tool provides the framework and context. Use this information to provide a detailed, actionable GTM analysis addressing the user's question.",
            useWebSearch: websiteContexts.length === 0,
            suggestedApproach: [
              "1. Understand current state and goals",
              "2. Apply relevant GTM frameworks",
              "3. Provide specific, actionable recommendations",
              "4. Include metrics to track success",
              "5. Consider tech stack and process implications",
            ],
          },
        }
      } catch (error: any) {
        console.error("GTM Expert tool error:", error)
        return {
          success: false,
          message: `GTM analysis failed: ${error.message || "Unknown error"}`,
        }
      }
    },
  })
}

export type GtmExpertResult = Awaited<
  ReturnType<ReturnType<typeof createGtmExpertTool>["execute"]>
>


