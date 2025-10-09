# GrowthGPT Quick Start Checklist

## ✅ Already Done
- ✅ All code implemented (5 phases complete)
- ✅ Environment variables configured (`.env.local`)
- ✅ Gemini API key added
- ✅ Database schema prepared (`supabase-migrations.sql`)
- ✅ Vercel cron configured (`vercel.json`)

## 🚀 3 Steps to Launch

### Step 1: Run Database Migrations (5 minutes)

1. Open [your Supabase dashboard](https://app.supabase.com/project/alrgmurlngilnerypjfv)
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Copy ALL contents from `supabase-migrations.sql`
5. Paste into SQL editor
6. Click "Run" or press Cmd/Ctrl + Enter
7. Wait for "Success. No rows returned"

**Verify:** Check that these tables now exist in "Table Editor":
- ✅ token_usage
- ✅ website_contexts
- ✅ scheduled_prompts

### Step 2: Get Exa API Key (Optional but Recommended)

**For Web Search functionality:**

1. Go to [exa.ai](https://exa.ai)
2. Sign up for free account
3. Get your API key from dashboard
4. Open `.env.local` file
5. Find the line with `# EXA_API_KEY=your_exa_api_key_here`
6. Replace with: `EXA_API_KEY=your_actual_key`
7. Save file

**Skip this:** Tools will work without web search (GTM Expert, Website Analysis still function)

### Step 3: Start Development Server

```bash
# Install dependencies (if not already done)
npm install

# Start server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🧪 Test It!

### Test 1: Basic Chat (No tools needed)
```
"Explain the difference between MQL and SQL in B2B SaaS"
```
✅ Should get GTM-focused response from Gemini

### Test 2: Website Analysis
1. Toggle "Search" ON in the chat interface
2. Ask: `"Analyze stripe.com and provide GTM insights"`
3. Watch for tool calls:
   - ✅ `analyze_website` - Scrapes and analyzes Stripe
   - ✅ `gtm_expert` - Provides strategic analysis

### Test 3: Web Search (requires Exa API key)
1. Search toggle ON
2. Ask: `"What are the latest trends in RevOps for 2025?"`
3. Should see:
   - ✅ `web_search` tool called
   - ✅ Results with citations [1], [2], etc.

### Test 4: Deep Research (requires Exa API key)
1. Search toggle ON
2. Ask: `"Do deep research on the marketing automation landscape"`
3. Should see:
   - ✅ Multiple search iterations
   - ✅ Comprehensive report with many sources

## 📋 API Testing (Optional)

### Test Bulk Processing API
```bash
curl -X POST http://localhost:3000/api/bulk-process \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat .auth-cookie)" \
  -d '{
    "action": "plan",
    "csvString": "company_name,website\nStripe,stripe.com\nHubSpot,hubspot.com",
    "promptTemplate": "Analyze {{company_name}} and rate their GTM maturity (1-10)",
    "model": "gemini-2.5-flash"
  }'
```

### Test Token Usage API
```bash
curl http://localhost:3000/api/token-usage?period=month \
  -H "Cookie: $(cat .auth-cookie)"
```

## ❗ Troubleshooting

### "Model not found" error
- ✅ Check that Gemini API key is set in `.env.local`
- ✅ Verify: `GOOGLE_API_KEY=AIzaSyAIbr-zhTFp8r9n3r0Q2ZGf3fspMJLYDoE`

### Tools not being called
- ✅ Make sure "Search" toggle is ON in UI
- ✅ Check you're logged in (tools require authentication)
- ✅ Look for tool call indicators in chat response

### "EXA_API_KEY not configured" error
- ✅ Get key from exa.ai
- ✅ Add to `.env.local`
- ✅ Restart dev server (`npm run dev`)

### Database errors
- ✅ Verify migrations ran successfully in Supabase
- ✅ Check RLS policies are enabled
- ✅ Ensure user is authenticated

### Scheduled prompts not running (in production)
- ✅ Deploy to Vercel first
- ✅ Vercel Cron only works in production
- ✅ Check Vercel dashboard > Cron jobs
- ✅ Verify `CRON_SECRET` is set

## 📚 What's Included

### Backend Features (All Implemented)
- ✅ Gemini 2.0 Flash AI agent
- ✅ 4 AI tools (Web Search, GTM Expert, Website Analysis, Deep Research)
- ✅ Bulk CSV processing with template variables
- ✅ Scheduled prompts with Vercel Cron
- ✅ Token usage tracking and cost calculation
- ✅ Rate limiting by user tier (10-1000 searches/day)
- ✅ GrowthGPT branding and GTM-focused prompts

### API Endpoints
- ✅ `POST /api/chat` - Main chat with AI tools
- ✅ `POST /api/bulk-process` - Bulk CSV processing
- ✅ `GET/POST/PATCH/DELETE /api/scheduled-prompts` - Manage scheduled prompts
- ✅ `GET /api/token-usage` - Usage statistics
- ✅ `GET /api/cron/process-scheduled-prompts` - Cron job (internal)

### Database Tables (3 new + 1 updated)
- ✅ `token_usage` - API cost tracking
- ✅ `website_contexts` - Analyzed business data
- ✅ `scheduled_prompts` - Recurring task queue
- ✅ `users` - Extended with web search counters

## 🎯 Next Steps

**Immediate:**
1. [ ] Run database migrations (Step 1 above)
2. [ ] Test basic chat functionality
3. [ ] Get Exa API key for web search
4. [ ] Test all 4 AI tools

**Soon:**
- [ ] Deploy to Vercel for production
- [ ] Update `CRON_SECRET` in production
- [ ] Build frontend UI for bulk processing
- [ ] Create scheduled prompts management page
- [ ] Add token usage dashboard

**Optional:**
- [ ] Customize GTM suggestions in `lib/config.ts`
- [ ] Adjust rate limits for your users
- [ ] Add more AI tools as needed
- [ ] Set up monitoring and alerts

## 📖 Documentation

- 📘 **GROWTHGPT_SETUP.md** - Comprehensive setup guide
- 📗 **IMPLEMENTATION_COMPLETE.md** - Full implementation details
- 📙 **ARCHITECTURE.md** - Original architecture spec
- 📕 **QUICKSTART.md** - This file

## 💬 Example Conversations

### GTM Strategy
```
User: "Help me build a GTM plan for launching a new B2B SaaS product"
AI: [Uses gtm_expert tool to provide comprehensive GTM framework]
```

### Market Research
```
User: "Research the top CRM platforms and their GTM strategies"
AI: [Uses Gemini's native search grounding to compile detailed report]
```

### Lead Enrichment
```
User: "I have a CSV of 100 companies. Analyze each for ICP fit"
API: POST /api/bulk-process with CSV + template
Result: Enriched CSV with AI analysis per row
```

### Recurring Insights
```
User: "Send me a daily summary of GTM news every morning at 9 AM"
API: POST /api/scheduled-prompts
Cron: Runs daily, delivers to chat
```

---

## ✨ You're Ready!

Everything is implemented and ready to test. Just run the 3 steps above and you'll have a fully functional GrowthGPT instance!

**Questions?** Check the troubleshooting section or review the setup guide.

🚀 **Happy GTM strategizing with GrowthGPT!**


