# GrowthGPT Setup Guide

Welcome to GrowthGPT! This guide will help you set up your GTM-focused AI assistant.

## Quick Start

### 1. Database Setup

Run the SQL migrations in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-migrations.sql`
4. Execute the SQL

This will create:
- `token_usage` - Track API usage and costs
- `website_contexts` - Store analyzed website data
- `scheduled_prompts` - Queue for recurring AI tasks
- Additional columns on `users` table for web search tracking

### 2. Environment Configuration

Your `.env.local` file is already configured with:

✅ Supabase credentials
✅ OpenAI API key
✅ Google Gemini API key (AIzaSyAIbr-zhTFp8r9n3r0Q2ZGf3fspMJLYDoE)
✅ Security keys (CSRF, Encryption)

**Still needed:**
- `EXA_API_KEY` - Get from [exa.ai](https://exa.ai) for web search functionality
- `CRON_SECRET` - Change from default in production

### 3. Install Dependencies

```bash
npm install
```

All required packages are already in package.json:
- `exa-js` - Web search
- `jsdom` - Website parsing
- `ai` - Vercel AI SDK
- `@ai-sdk/google` - Gemini integration

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features Overview

### Core AI Tools (Auto-enabled with Search Toggle)

1. **Web Search** (`web_search`)
   - Real-time Google search via Exa
   - Returns results with citations
   - Rate limited by user tier (10-1000/day)

2. **GTM Expert** (`gtm_expert`)
   - Strategic GTM analysis
   - Pulls context from analyzed websites
   - Attribution models, tech stack recommendations
   - Revenue operations insights

3. **Analyze Website** (`analyze_website`)
   - Extract business context from any URL
   - Company info, industry, value proposition
   - Stores in database for future GTM analysis

4. **Deep Research** (handled automatically via Gemini native search grounding)

### Bulk CSV Processing

API: `POST /api/bulk-process`

**Flow:**
1. Upload CSV with company/prospect data
2. Create prompt template with variables: `{{company_name}}`, `{{industry}}`
3. Generate execution plan (shows sample outputs)
4. Run sample (first 3 rows) or full batch
5. Download enriched CSV with AI analysis

**Example use case:** Analyze 200 companies for GTM fit

### Scheduled Prompts

API: `/api/scheduled-prompts` (CRUD operations)

**Schedule types:**
- `once` - Specific date/time
- `daily` - Every day at specified time
- `weekly` - Once per week
- `monthly` - Once per month

**Delivery methods:**
- `chat` - Creates new chat with result
- `email` - Email notification (TODO)
- `webhook` - POST to custom URL

**Cron:** Vercel Cron runs every 15 minutes (`vercel.json`)

### Token Usage Tracking

API: `GET /api/token-usage?period=month`

Tracks:
- Prompt and completion tokens per request
- Cost per model (Gemini Flash, Pro, etc.)
- Breakdown by action type (message, web_search, bulk_process)
- Monthly/weekly/daily aggregates

## Configuration

### Rate Limits (`lib/config.ts`)

```typescript
WEB_SEARCH_LIMITS = {
  BETA: 50,        // Beta users
  FREE: 10,        // Free tier
  STARTER: 20,     // Starter plan
  PROFESSIONAL: 100, // Pro plan
  ENTERPRISE: 1000  // Enterprise
}
```

### Default Model

Currently set to: `gemini-2.5-flash`

Change in `lib/config.ts`:
```typescript
export const MODEL_DEFAULT = "gemini-2.5-flash"
```

### System Prompt

GrowthGPT personality defined in `lib/config.ts`:
- GTM strategy expert
- Revenue operations focus
- Attribution modeling
- Tech stack optimization

## API Endpoints

### Chat
- `POST /api/chat` - Main chat with AI tools

### Bulk Processing
- `POST /api/bulk-process` - Execute bulk CSV processing
  - Action: `plan` - Generate execution plan
  - Action: `execute` - Process rows (mode: sample|full)

### Scheduled Prompts
- `GET /api/scheduled-prompts` - List user's scheduled prompts
- `POST /api/scheduled-prompts` - Create new scheduled prompt
- `PATCH /api/scheduled-prompts` - Update scheduled prompt
- `DELETE /api/scheduled-prompts?id=xxx` - Delete scheduled prompt

### Token Usage
- `GET /api/token-usage?period=month` - Get usage stats

### Cron (Internal)
- `GET /api/cron/process-scheduled-prompts` - Process due prompts
  - Requires `Authorization: Bearer {CRON_SECRET}` header

## Database Schema

### New Tables

**token_usage**
- Tracks every AI request's token usage and cost
- Fields: user_id, chat_id, model, prompt_tokens, completion_tokens, cost_usd, action_type

**website_contexts**
- Stores analyzed website business context
- Fields: user_id, domain, company_name, industry, value_proposition, analysis (JSONB)

**scheduled_prompts**
- Queue for recurring AI tasks
- Fields: user_id, prompt, schedule_type, schedule_time, delivery_method, next_run_at

### Updated Tables

**users**
- Added: `web_searches_today` (INTEGER)
- Added: `web_search_reset` (TIMESTAMP)

## Production Deployment

### Vercel

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

**Important:** Update `CRON_SECRET` in production!

### Vercel Cron Setup

Already configured in `vercel.json`:
- Runs every 15 minutes
- Calls `/api/cron/process-scheduled-prompts`
- Processes due scheduled prompts

### Environment Variables Checklist

Required in Vercel:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE`
- ✅ `OPENAI_API_KEY`
- ✅ `GOOGLE_API_KEY`
- ✅ `ENCRYPTION_KEY`
- ✅ `CSRF_SECRET`
- ⚠️ `EXA_API_KEY` (for web search)
- ⚠️ `CRON_SECRET` (change from default!)
- ✅ `DISABLE_OLLAMA=true`

## Usage Examples

### Example 1: GTM Analysis

**User:** "Analyze the GTM strategy for HubSpot"

**AI will:**
1. Use `analyze_website` to scrape hubspot.com
2. Extract business context (CRM, Marketing Platform, B2B SaaS)
3. Use `gtm_expert` to provide strategic analysis
4. Reference stored context for deeper insights

### Example 2: Market Research

**User:** "Research the marketing automation landscape for 2025"

**AI will:**
1. Leverage Gemini native search grounding when deeper research is requested
2. Perform 3-5 iterative web searches
3. Compile comprehensive report with citations
4. Provide trends, leaders, and recommendations

### Example 3: Bulk Lead Scoring

**CSV:**
```csv
company_name,website,industry
Acme Corp,acme.com,SaaS
Beta Inc,beta.io,Fintech
```

**Prompt Template:**
```
Analyze {{company_name}} ({{website}}) in the {{industry}} space.
Provide ICP fit score (1-10) and GTM recommendation.
```

**Result:** Enriched CSV with AI analysis column

## Troubleshooting

### Tools not being called?

1. Make sure `enableSearch` toggle is ON in UI
2. Check user is authenticated
3. Verify Gemini API key is valid

### Web search rate limit exceeded?

- Check user tier: `WEB_SEARCH_LIMITS` in config
- Reset happens daily at midnight
- Upgrade user to higher tier

### Scheduled prompts not running?

1. Verify Vercel Cron is enabled
2. Check `CRON_SECRET` is set correctly
3. Review logs in Vercel dashboard
4. Ensure `next_run_at` is set correctly in database

### High token costs?

1. Check token usage: `GET /api/token-usage`
2. Consider rate limiting or tier adjustments
3. Limit `maxSteps` in chat API for bulk operations

## Next Steps

**Recommended:**
1. Get EXA_API_KEY from [exa.ai](https://exa.ai)
2. Run database migrations in Supabase
3. Test tools by asking GTM questions
4. Set up a scheduled prompt (e.g., "Daily GTM news summary")
5. Try bulk processing with sample CSV

**Optional Enhancements:**
- Build frontend UI for bulk processing
- Create scheduled prompts management page
- Add token usage dashboard
- Implement email delivery for scheduled prompts
- Add webhook integrations

## Support

For issues or questions:
1. Check database migrations ran successfully
2. Verify environment variables are set
3. Review Vercel logs for errors
4. Check Supabase logs for database issues

---

**GrowthGPT** - Your AI-powered GTM strategy assistant 🚀


