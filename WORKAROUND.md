# Quick Workaround: Disable Guest Mode

## Problem
Anonymous user creation is failing due to a Supabase database trigger or constraint issue.

## Option 1: Use Authenticated Users Only (Quick)

### Step 1: Sign Up a Test User
1. Go to http://localhost:3002
2. Click "Sign In" (or go to `/auth/login`)
3. Create a test account with email/password

### Step 2: Test GrowthGPT
Once signed in, all features will work:
- ✅ Chat with Gemini 2.5 Flash
- ✅ All 4 AI tools (when Search is ON)
- ✅ Full functionality

## Option 2: Debug the Trigger (5 minutes)

The 500 error suggests there's a database trigger failing. Run this diagnostic:

### In Supabase SQL Editor:
1. Open: https://app.supabase.com/project/alrgmurlngilnerypjfv/sql/new
2. Copy/paste: `check-triggers.sql`
3. Run it
4. Send me the output - it will show:
   - What triggers exist on auth.users
   - What columns public.users needs
   - Whether we can manually create a user

## Option 3: Manual Trigger Fix

If there's a trigger creating public.users from auth.users, it might be missing the new columns. Run this:

\`\`\`sql
-- Fix the user creation trigger (if it exists)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    anonymous,
    message_count,
    premium,
    created_at,
    web_searches_today,
    web_search_reset
  )
  VALUES (
    new.id,
    COALESCE(new.email, new.id || '@anonymous.example'),
    COALESCE(new.is_anonymous, false),
    0,
    false,
    new.created_at,
    0,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
\`\`\`

## Recommended: Just Sign Up for Now

**Fastest path:**
1. Sign up with a test email at http://localhost:3002/auth/login
2. Use GrowthGPT with full auth
3. We can fix guest mode later if needed

Guest mode is nice-to-have, but authenticated mode has all the features working! ✨

