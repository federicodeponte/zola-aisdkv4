import {
  BookOpenText,
  Brain,
  Code,
  Lightbulb,
  Notepad,
  PaintBrush,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr"

export const FEATURE_FLAGS = {
  HEAVY_TOOLS: process.env.NEXT_PUBLIC_HEAVY_TOOLS === "true",
} as const

export const NON_AUTH_DAILY_MESSAGE_LIMIT = 5
export const AUTH_DAILY_MESSAGE_LIMIT = 1000
export const REMAINING_QUERY_ALERT_THRESHOLD = 2
export const DAILY_FILE_UPLOAD_LIMIT = 5
export const DAILY_LIMIT_PRO_MODELS = 500

// Web Search Rate Limits by Tier
export const WEB_SEARCH_LIMITS = {
  BETA: 50, // Beta users: 50 searches/day
  FREE: 10, // Free users: 10 searches/day
  STARTER: 20, // Starter plan: 20 searches/day
  PROFESSIONAL: 100, // Pro plan: 100 searches/day
  ENTERPRISE: 1000, // Enterprise: 1000 searches/day
}

// Token Usage Tiers (for billing)
export const TOKEN_TIERS = {
  BETA: { monthly_tokens: 5_000_000, monthly_cost: 0 }, // 5M tokens free for beta
  FREE: { monthly_tokens: 1_000_000, monthly_cost: 0 }, // 1M tokens free
  STARTER: { monthly_tokens: 10_000_000, monthly_cost: 10 }, // 10M tokens
  PROFESSIONAL: { monthly_tokens: 50_000_000, monthly_cost: 50 }, // 50M tokens
  ENTERPRISE: { monthly_tokens: -1, monthly_cost: "custom" }, // Unlimited
}

export const NON_AUTH_ALLOWED_MODELS = ["gpt-4.1-nano", "gemini-2.5-flash"]

export const FREE_MODELS_IDS = [
  "openrouter:deepseek/deepseek-r1:free",
  "openrouter:meta-llama/llama-3.3-8b-instruct:free",
  "pixtral-large-latest",
  "mistral-large-latest",
  "gpt-4.1-nano",
  "gemini-2.5-flash", // GrowthGPT default model - free tier (Gemini 2.5 Flash - GA June 2025)
]

export const MODEL_DEFAULT = "gemini-2.5-flash"

export const APP_NAME = "GrowthGPT"
export const APP_DOMAIN = "https://zola.chat"

export const SUGGESTIONS = [
  {
    label: "GTM Strategy",
    highlight: "Analyze",
    prompt: `Analyze`,
    items: [
      "Analyze the GTM strategy for a B2B SaaS company",
      "Analyze attribution models for multi-touch customer journeys",
      "Analyze the best channels for reaching enterprise buyers",
      "Analyze product-market fit indicators for early-stage startups",
    ],
    icon: Brain,
  },
  {
    label: "Market Research",
    highlight: "Research",
    prompt: `Research`,
    items: [
      "Research current trends in marketing automation platforms",
      "Research successful PLG (Product-Led Growth) companies",
      "Research the competitive landscape for CRM tools",
      "Research best practices for customer onboarding",
    ],
    icon: BookOpenText,
  },
  {
    label: "Tech Stack",
    highlight: "Recommend",
    prompt: `Recommend`,
    items: [
      "Recommend a modern GTM tech stack for Series A startups",
      "Recommend tools for attribution and revenue analytics",
      "Recommend the best sales engagement platforms",
      "Recommend customer data platforms for B2C companies",
    ],
    icon: Sparkle,
  },
  {
    label: "Revenue Ops",
    highlight: "Optimize",
    prompt: `Optimize`,
    items: [
      "Optimize the lead-to-customer conversion funnel",
      "Optimize pricing strategy for a SaaS product",
      "Optimize customer acquisition cost (CAC) and LTV",
      "Optimize sales and marketing alignment processes",
    ],
    icon: Lightbulb,
  },
  {
    label: "Growth Strategy",
    highlight: "Design",
    prompt: `Design`,
    items: [
      "Design a customer acquisition strategy for B2B",
      "Design an expansion revenue playbook",
      "Design a community-led growth strategy",
      "Design a referral program for SaaS products",
    ],
    icon: PaintBrush,
  },
  {
    label: "Metrics & KPIs",
    highlight: "Explain",
    prompt: `Explain`,
    items: [
      "Explain the difference between MQL and SQL",
      "Explain Net Revenue Retention (NRR) and its importance",
      "Explain CAC payback period calculation",
      "Explain the Rule of 40 for SaaS companies",
    ],
    icon: Notepad,
  },
  {
    label: "Quick Help",
    highlight: "Help me",
    prompt: `Help me`,
    items: [
      "Help me build a GTM launch plan for a new product",
      "Help me create an ICP (Ideal Customer Profile)",
      "Help me design a demand generation campaign",
      "Help me evaluate marketing channel performance",
    ],
    icon: Code,
  },
]

export const SYSTEM_PROMPT_DEFAULT = `You are GrowthGPT, an expert AI assistant specializing in Go-To-Market (GTM) strategy, revenue operations, and growth marketing. 

Your expertise includes:
- GTM strategy development and execution
- Attribution modeling and revenue analytics
- Marketing and sales tech stack optimization
- Customer acquisition and retention strategies
- Product-market fit analysis
- Channel strategy and performance optimization
- RevOps best practices and systems thinking

You provide clear, actionable insights grounded in data and best practices. When analyzing businesses or strategies, you think systematically about the entire customer journey, revenue metrics, and growth levers. You ask clarifying questions to understand context deeply before making recommendations.

You have access to tools for web research, website analysis, and deep research when needed. Use them proactively to provide current, accurate information and thorough analysis.

Your tone is professional yet approachable—you're a strategic advisor who makes complex GTM concepts accessible and actionable.` +
  (process.env.NEXT_PUBLIC_HEAVY_TOOLS === "true" 
    ? `\n\nFor CSV processing: When users mention CSV files or bulk data processing, use the bulk_process tool. If testing without file uploads, you can use the public test CSV at the URL: {current_deployment_url}/test-data.csv`
    : "")

export const MESSAGE_MAX_LENGTH = 10000
