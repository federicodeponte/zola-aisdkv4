# Chat Backend v2 - Architecture Overview
---

## Core Components

### 1. Main Chat Agent
- Single unified AI agent (Gemini 2.5 Flash Preview via AI SDK v4)
- Has access to multiple tools - Gemini autonomously decides which to call
- Streams responses in real-time (SSE or similar)
- Maintains conversation history (last 20 messages)
- Integrates business context from `website_contexts` table
- System prompt: GrowthGPT GTM expert personality

### 2. Tools Available to Main Agent
The main agent can call these tools autonomously based on user query:

#### a) Web Search
- Searches Google in real-time for current information
- Returns search results with citations
- Gemini decides when to use (e.g., "what's happening in the news today?")
- Tracks usage in `user_usage.web_searches_today`

#### b) GTM Expert
- Deep GTM/RevOps analysis tool
- Pulls business context from `website_contexts` table
- Specialized prompting for go-to-market strategy
- Attribution modeling, tool stack recommendations, systems thinking

#### c) Deep Research
- Multi-step research workflow
- Performs iterative web searches, builds comprehensive report
- May require user confirmation before executing (expensive operation)
- Streams progress updates

#### d) Analyze Website
- Analyzes a given URL for business context
- Extracts company info, industry, value proposition
- Stores in `website_contexts` table for future reference

#### e) Database/SQL Analyst (future)
- Queries connected integrations (HubSpot, Salesforce)
- Executes SQL on user's connected databases

---

## Features

### 3. Bulk Processing
**NOT a separate agent** - it's a loop orchestrator that calls the main agent per row

**Flow:**
1. User uploads CSV (e.g., list of companies with columns: `company_name`, `industry`, `website`)
2. User defines prompt template: "Analyze {{company_name}} in {{industry}} and suggest GTM strategy"
3. **Chat suggests execution plan:**
   - Shows how template will be applied to rows
   - Provides sample output for first row
   - Estimates cost/time
4. **User confirms approach:**
   - **Run Sample** - Process 3-5 rows to verify output quality
   - **Refine Prompt** - Adjust template based on suggestion
   - **Run Full** - Process all rows
5. System loops through each row:
   - Replaces template variables with row data
   - Calls main agent (with ALL its tools: web search, GTM expert, etc.)
   - Collects response
   - **Frontend shows live progress:** "Processing row 47 of 200..."
6. Generates enriched CSV: original columns + new column(s) with AI results
7. User downloads CSV with all results

**Key points:** 
- Each row gets full main agent treatment, including tool access
- User approves plan before execution
- Real-time progress visible in frontend

---

### 4. Prompt Queue (Scheduled Prompts)
**Background job system for recurring/scheduled AI tasks**

**Use cases:**
- Daily market report
- Weekly competitor analysis
- Monthly performance summary

**Flow:**
1. User creates scheduled prompt:
   - Prompt text: "Give me a summary of today's GTM news"
   - Schedule: Daily at 9 AM, or specific date/time
   - Delivery: Store in chat, send email, or webhook
2. Background processor (cron job or similar):
   - Checks `scheduled_prompts` table for due prompts
   - Calls main agent with prompt (full tool access)
   - Stores result or sends notification
3. Results appear in user's chat or inbox

**Key point:** Uses same main agent, so scheduled prompts can use web search, GTM expert, etc.

---

### 5. File Uploads
**Users can attach files to messages**

**Supported formats:**
- PDFs (extract text or use Gemini File API for native parsing)
- CSV/Excel (parse and include as structured data)
- Images (OCR or vision analysis via Gemini)
- Word docs, text files

**Flow:**
1. User uploads file → stored in Supabase Storage (`chat-files` bucket)
2. File parsed (text extraction or Gemini File API)
3. File content included in message context
4. Main agent analyzes file + answers user's question

---

### 6. Authentication & Multi-User
- Supabase Auth (email/password, OAuth, magic links)
- Row Level Security (RLS) ensures users only see their own data
- Each user has isolated:
  - Chat sessions (`chats` table)
  - Messages
  - Files
  - Usage tracking

---

### 7. Rate Limiting & Usage Tracking
**Tier-based limits per user:**
- BETA: Generous limits for testing
- STARTER: X messages/day, Y web searches/day
- PROFESSIONAL: Higher limits
- ENTERPRISE: Custom limits

**Tracked in `user_usage` table:**
- Daily counters: messages, web searches, bulk processing, file uploads
- Monthly counters: total tokens, cost calculation
- Model-specific token tracking (Gemini Flash vs Pro)

**Enforcement:**
- Before processing request, check user's usage
- If limit exceeded, return 429 error with upgrade prompt
- Counters reset daily/monthly via cron or function

---

### 8. Conversation Management
- **Chat sessions** (`chats` table): Each conversation has unique ID
- **Messages** (`messages` table): User and assistant messages with metadata
- **History loading**: Last 20 messages loaded for context
- **Dynamic titles**: Generate chat title based on first message
- **Delete/archive**: Users can manage their chat history

---

### 9. Token Usage & Cost Tracking
- Every AI call logs to `token_usage` table:
  - Prompt tokens, completion tokens, total tokens
  - Model used (Gemini Flash, Pro, etc.)
  - Action type (message, web search, bulk process)
- Cost calculation function in database:
  - Model-specific pricing (Flash: $0.075/1M input, $0.30/1M output)
  - Monthly cost rollup per user
- Used for billing and analytics

---

## Database Schema (Zola-compatible)

**Tables:**
- `users` - User profiles
- `chats` - Chat sessions (Zola naming convention)
- `messages` - Individual messages with role, content, tool_calls
- `files` - File uploads metadata
- `user_usage` - Current usage counters (for rate limiting)
- `token_usage` - Historical token tracking (for billing)
- `website_contexts` - Analyzed business contexts
- `scheduled_prompts` - Queued/recurring prompts

**Storage:**
- `chat-files` bucket - User uploaded files

---

## Request/Response Flow

**Example: User asks "What's the GTM landscape in 2025?"**

1. Zola.chat frontend sends POST to `/api/chat`:
   ```json
   {
     "chatSessionId": "uuid",
     "message": "What's the GTM landscape in 2025?",
     "webSearchEnabled": true
   }
   ```

2. API route:
   - Validates request
   - Checks rate limits
   - Loads conversation history
   - Calls AI SDK `streamText` with Gemini model
   - Provides tools: web_search, gtm_expert, deep_research, etc.

3. Gemini decides autonomously:
   - "This needs current info" → calls `web_search` tool
   - Searches Google for "GTM landscape 2025"
   - Processes results
   - Generates response with citations

4. Response streams back:
   - SSE stream of tokens
   - Tool call indicators
   - Citations with sources

5. After completion:
   - Save assistant message to `messages` table
   - Log token usage to `token_usage` table
   - Update user's daily usage counter

---

## Key Design Decisions

1. **Single main agent** - No routing, Gemini decides which tools to use
2. **Tools not separate agents** - All tools callable by main agent
3. **Bulk processing = loop** - Not a separate agent, just orchestration
4. **Prompt queue = scheduled main agent** - Same capabilities, just triggered by time
5. **Zola-compatible schema** - Uses `chats` not `chat_sessions`, etc.
6. **AI SDK v5** - Modern tool calling, streaming, proper type safety
7. **Supabase for everything** - Auth, database, storage, RLS

---

## Technology Stack

- **Frontend**: Zola.chat (React-based chat UI)
- **Backend**: Next.js 15 API routes
- **AI Framework**: Vercel AI SDK v4
- **AI Model**: Google Gemini 2.5 Flash Preview
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Validation**: Zod
- **Language**: TypeScript (strict mode)

---

## Implementation Principles

- **SOLID**: Single responsibility, dependency injection, clean interfaces
- **DRY**: Reusable functions, no duplication
- **Modular**: Clear separation of concerns (tools, parsers, API, UI)
- **Type-safe**: Full TypeScript coverage with Zod validation
- **Production-grade**: Error handling, logging, rate limiting from start
- **Root cause fixes**: No temporary solutions, address issues at their source
