# GrowthGPT Configuration Guide

## 🎯 Main Prompt & Configuration

### **`lib/config.ts`** - Main Configuration File
**Location:** `/Users/federicodeponte/Downloads/zola-x-aisdkv4/lib/config.ts`

This is THE most important file for customization:

```typescript
// App name
export const APP_NAME = "GrowthGPT"

// Default model
export const MODEL_DEFAULT = "gemini-2.5-flash"

// Main system prompt (lines 50-88)
export const SYSTEM_PROMPT_DEFAULT = `You are GrowthGPT, an expert AI assistant...`

// Suggestion buttons on homepage (lines 90-115)
export const SUGGESTIONS = [
  { label: "GTM Strategy", icon: Target, prompt: "..." },
  { label: "Market Research", icon: ChartLine, prompt: "..." },
  // ... more suggestions
]

// Rate limits
export const NON_AUTH_DAILY_MESSAGE_LIMIT = 5
export const FREE_MODELS_IDS = ["gemini-2.5-flash", ...]
```

**To customize:**
- Edit `SYSTEM_PROMPT_DEFAULT` to change AI personality/expertise
- Edit `SUGGESTIONS` to change the quick-start buttons
- Edit `APP_NAME` to rebrand

---

## 🛠️ AI Tools (Capabilities)

### Tool Definitions

**1. `lib/tools/web-search.ts`** - Web Search Tool
- Uses Exa API for real-time web search
- Gracefully degrades if Exa not configured
- Called when user asks about current events/trends

**2. `lib/tools/gtm-expert.ts`** - GTM Expert Tool
- Specialized GTM strategy guidance
- Interactive expert system
- Called for ICP, positioning, GTM planning

**3. `lib/tools/analyze-website.ts`** - Website Analysis Tool
- Analyzes competitor websites
- Extracts GTM insights from URLs
- Called when user provides URLs to analyze

**4. `lib/tools/deep-research.ts`** - Deep Research Tool
- Multi-step research capability
- Comprehensive market analysis
- Called for in-depth research requests

**5. `lib/tools/rate-limiter.ts`** - Rate Limiting
- Controls tool usage per user tier
- Prevents abuse

**6. `lib/tools/token-tracking.ts`** - Token Usage Tracking
- Logs all AI API usage
- Tracks costs per model

---

## 🔗 Tool Integration

### **`app/api/chat/route.ts`** - Main Chat Endpoint
**Location:** `/Users/federicodeponte/Downloads/zola-x-aisdkv4/app/api/chat/route.ts`

This is where tools are integrated into the chat:

```typescript
// Import tools (lines 14-17)
import { webSearchTool } from "@/lib/tools/web-search"
import { createGtmExpertTool } from "@/lib/tools/gtm-expert"
import { createAnalyzeWebsiteTool } from "@/lib/tools/analyze-website"
import { deepResearchTool } from "@/lib/tools/deep-research"

// Tool registration (lines 70-77)
const tools: ToolSet = {}
if (enableSearch && supabase && userId) {
  tools.web_search = webSearchTool
  tools.gtm_expert = createGtmExpertTool(supabase, userId)
  tools.analyze_website = createAnalyzeWebsiteTool(supabase, userId)
}

// Pass tools to AI (line 80)
const result = streamText({
  model: modelConfig.apiSdk(apiKey, { enableSearch }),
  system: effectiveSystemPrompt,
  messages: messages,
  tools, // <-- Tools integrated here
  // ...
})
```

**To add a new tool:**
1. Create tool file in `lib/tools/your-tool.ts`
2. Import it in `app/api/chat/route.ts`
3. Add to the `tools` object

---

## 🤖 Model Configuration

### **`lib/models/data/gemini.ts`** - Gemini Models
**Location:** `/Users/federicodeponte/Downloads/zola-x-aisdkv4/lib/models/data/gemini.ts`

Defines all available Gemini models:

```typescript
{
  id: "gemini-2.5-flash",
  name: "Gemini 2.5 Flash",
  provider: "Google",
  description: "Next-gen Gemini Flash with advanced reasoning...",
  contextWindow: 1048576,
  inputCost: 0.075,
  outputCost: 0.3,
  tools: true, // <-- Enables tool calling
  // ...
}
```

---

## 📁 File Structure Overview

```
zola-x-aisdkv4/
├── lib/
│   ├── config.ts                 ⭐ Main configuration & system prompt
│   ├── models/
│   │   └── data/
│   │       └── gemini.ts         🤖 Model definitions
│   └── tools/                    🛠️ All AI tools
│       ├── web-search.ts
│       ├── gtm-expert.ts
│       ├── analyze-website.ts
│       ├── deep-research.ts
│       ├── rate-limiter.ts
│       └── token-tracking.ts
│
├── app/
│   └── api/
│       └── chat/
│           └── route.ts          🔗 Tool integration & chat logic
│
├── .env.local                    🔑 API keys
│   ├── GOOGLE_GENERATIVE_AI_API_KEY
│   ├── EXA_API_KEY (optional)
│   └── SUPABASE_* keys
│
└── components/
    └── ui/
        └── button.tsx            🎨 UI components
```

---

## 🎨 Quick Customization Checklist

### Change AI Personality/Expertise
1. Edit `lib/config.ts` → `SYSTEM_PROMPT_DEFAULT`

### Change App Name/Branding
1. Edit `lib/config.ts` → `APP_NAME`
2. Edit `lib/config.ts` → `APP_DOMAIN`

### Add/Remove Suggestion Buttons
1. Edit `lib/config.ts` → `SUGGESTIONS` array

### Add a New Tool
1. Create `lib/tools/your-tool.ts`
2. Add to `app/api/chat/route.ts` → `tools` object

### Change Rate Limits
1. Edit `lib/config.ts` → `NON_AUTH_DAILY_MESSAGE_LIMIT`
2. Edit `lib/config.ts` → `WEB_SEARCH_LIMITS`

### Change Model
1. Edit `lib/config.ts` → `MODEL_DEFAULT`
2. Make sure it's in `FREE_MODELS_IDS` for guest access

---

## 🔥 Most Important Files (Top 5)

1. **`lib/config.ts`** - System prompt, app name, suggestions, limits
2. **`app/api/chat/route.ts`** - Tool integration & chat endpoint
3. **`lib/tools/*.ts`** - Individual tool definitions
4. **`.env.local`** - API keys (create if missing)
5. **`lib/models/data/gemini.ts`** - Model configuration

---

## 📝 Example: Changing the System Prompt

```bash
# Open the config file
code lib/config.ts

# Find line ~50 and edit:
export const SYSTEM_PROMPT_DEFAULT = `
You are MyCustomGPT, an expert in [your domain].

Your key strengths:
- [Strength 1]
- [Strength 2]

Always:
- [Guideline 1]
- [Guideline 2]
`
```

Then restart: `npm run dev`

---

## 🧪 Testing Your Changes

After modifying:
1. Restart server: `npm run dev`
2. Test manually: http://localhost:3000
3. Run test suite: `node test-growthgpt.js`

---

Need help with any specific file? Let me know!

