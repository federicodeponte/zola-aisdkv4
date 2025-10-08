# 🚀 Setup GrowthGPT - 2 Quick Steps

## Issue Found
Your Supabase project has some tables partially created. I've prepared a fixed migration that will clean up and properly set up everything.

---

## ⚡ Step 1: Run Database Migrations (2 minutes)

### OptionA: Via Supabase Dashboard (Easiest)

1. **Open Supabase SQL Editor**
   - Go to: https://app.supabase.com/project/alrgmurlngilnerypjfv/sql/new

2. **Copy & Paste Migration**
   - Open file: `supabase-migrations-fixed.sql`
   - Copy ALL contents (Cmd+A, Cmd+C)
   - Paste into SQL Editor

3. **Run It**
   - Click "Run" or press Cmd+Enter
   - Wait for "Success: GrowthGPT schema migration complete!"

### Option B: Via CLI (If you prefer)

```bash
# In your terminal
cd /Users/federicodeponte/Downloads/zola-x-aisdkv4

# Use supabase CLI with the fixed migration
supabase db reset --linked --no-backup
```

---

## ⚡ Step 2: Enable Anonymous Sign-ins (1 minute)

1. **Go to Auth Providers**
   - URL: https://app.supabase.com/project/alrgmurlngilnerypjfv/auth/providers

2. **Find "Anonymous Sign-ins"**
   - Scroll down to find the "Anonymous Sign-ins" section
   - Toggle it **ON** (enable)

3. **Save**
   - Click Save if there's a button
   - Otherwise it's auto-saved

---

## ✅ Verify Setup

After completing both steps, restart your dev server:

```bash
# Stop current server (Ctrl+C if running)
cd /Users/federicodeponte/Downloads/zola-x-aisdkv4
npm run dev
```

Then test:
1. Open http://localhost:3002 (or whatever port it shows)
2. The anonymous sign-in error should be gone
3. You should be able to chat as a guest user

---

## 📊 What Got Created

### New Tables:
- ✅ `token_usage` - Tracks API usage and costs
- ✅ `website_contexts` - Stores analyzed website data
- ✅ `scheduled_prompts` - Queue for recurring AI tasks

### New Columns on `users`:
- ✅ `web_searches_today` - Daily web search counter
- ✅ `web_search_reset` - Last reset timestamp

### Functions:
- ✅ `increment_web_search_count()` - Atomic counter increment
- ✅ `reset_daily_web_searches()` - Daily reset function
- ✅ `calculate_next_run_at()` - Schedule calculator
- ✅ `update_scheduled_prompt_next_run()` - Auto-schedule trigger

---

## 🧪 Test the Tools

Once setup is complete, try these in the chat:

**1. Basic GTM Question (no tools)**
```
"Explain the Rule of 40 for SaaS companies"
```

**2. Website Analysis (requires Search toggle ON)**
```
"Analyze stripe.com and provide GTM insights"
```

**3. Web Search (requires Exa API key + Search ON)**
```
"What are the latest trends in RevOps?"
```

**4. Deep Research (requires Exa API key + Search ON)**
```
"Do deep research on marketing automation platforms"
```

---

## 🔧 If You Hit Issues

### Migration fails with "already exists"
- That's OK - it means those parts are already done
- Look for the final message: "GrowthGPT schema migration complete!"

### Still see anonymous auth error
- Make sure you enabled it in Step 2
- Restart your dev server after enabling
- Clear browser cache/cookies

### Tools not being called
- Toggle "Search" ON in the chat UI
- Make sure you're authenticated (or as guest)
- Check console for any errors

---

## 📝 Quick Reference

**Your Supabase Project:**
- Dashboard: https://app.supabase.com/project/alrgmurlngilnerypjfv
- SQL Editor: https://app.supabase.com/project/alrgmurlngilnerypjfv/sql
- Auth Settings: https://app.supabase.com/project/alrgmurlngilnerypjfv/auth/providers

**Your Files:**
- Migration: `supabase-migrations-fixed.sql`
- Docs: `GROWTHGPT_SETUP.md` (comprehensive guide)
- Quick Start: `QUICKSTART.md` (3-step guide)

---

## ✨ After Setup

You'll have a fully functional GrowthGPT with:
- ✅ Gemini 2.5 Flash as main AI
- ✅ 4 AI tools (Web Search, GTM Expert, Website Analysis, Deep Research)
- ✅ Bulk CSV processing API
- ✅ Scheduled prompts with Vercel Cron
- ✅ Token usage tracking
- ✅ Rate limiting by user tier

**Total setup time: ~3 minutes** 🎉

---

Need help? Check the error logs in:
- Browser console (F12)
- Terminal where npm run dev is running
- Supabase logs dashboard

