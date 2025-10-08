# Supabase Anonymous Sign-In Fix

Use this checklist whenever anonymous auth starts failing with
`AuthApiError: Database error creating anonymous user`.

---

## 1. Root Cause

- Supabase’s auth hooks call two custom triggers:
  - `public.handle_new_user()` → inserts into `public.users`
  - `public.initialize_user_usage()` → inserts into `public.user_usage`
- After resetting the schema, the `user_usage` table + policies are missing, so the second insert fails (`permission denied for table user_usage`).

## 2. One-Shot SQL Fix

Run the snippet below in **Supabase Dashboard → SQL Editor**:

```sql
-- Rebuild user_usage + helper so Supabase auth hooks can insert rows

BEGIN;

-- Drop in case leftovers exist
DROP TABLE IF EXISTS public.user_usage CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_usage() CASCADE;

-- Core table for rate/usage tracking
CREATE TABLE public.user_usage (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'BETA',
  messages_today INTEGER DEFAULT 0,
  bulk_jobs_today INTEGER DEFAULT 0,
  web_searches_today INTEGER DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their usage"
  ON public.user_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their usage"
  ON public.user_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage rows"
  ON public.user_usage FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.role() = 'supabase_auth_admin'
  );

CREATE OR REPLACE FUNCTION public.initialize_user_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_usage (user_id, tier)
  VALUES (NEW.id, 'BETA')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS initialize_user_usage_trigger ON public.users;

CREATE TRIGGER initialize_user_usage_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_usage();

COMMIT;
```

## 3. Verify Locally

```bash
cd /Users/federicodeponte/Downloads/zola-x-aisdkv4
node test-guest-auth.js
```

Expected output:

```
✅ Success! Anonymous user created: <uuid>
✅ User record found: <uuid>
```

Reload `http://localhost:3002`; the chat loads without the anonymous user error (only the known Radix hydration warning may remain).

## 4. Extra Notes

- The trigger `public.handle_new_user()` + policy “Service role can insert users” already live in `fresh-zola-schema.sql`; do not remove them.
- If the CLI test still fails, check Supabase **Logs → Database → Postgres** for `permission denied` messages—those point to whichever table is missing RLS grants.




