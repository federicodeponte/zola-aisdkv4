-- Add ALL missing columns to public.users table
-- Run this in Supabase SQL Editor

-- Add missing columns one by one
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_message_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS profile_image TEXT,
  ADD COLUMN IF NOT EXISTS favorite_models TEXT[],
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS daily_pro_message_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_pro_reset TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- Make email nullable for anonymous users
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- Verify all columns exist now
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ All user columns added! Anonymous auth should work now.' as status;

