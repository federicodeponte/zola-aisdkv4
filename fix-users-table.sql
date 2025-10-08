-- Quick fix for users table and guest user creation
-- Run this in Supabase SQL Editor

-- 1. Check and add missing columns to users table
DO $$ 
BEGIN
  -- Add web_searches_today if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='web_searches_today'
  ) THEN
    ALTER TABLE users ADD COLUMN web_searches_today INTEGER DEFAULT 0;
  END IF;
  
  -- Add web_search_reset if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='web_search_reset'
  ) THEN
    ALTER TABLE users ADD COLUMN web_search_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 2. Check if token_usage table exists, create if not
CREATE TABLE IF NOT EXISTS token_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  action_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_chat_id ON token_usage(chat_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);

-- Enable RLS
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'token_usage' AND policyname = 'Users can view their own token usage'
  ) THEN
    CREATE POLICY "Users can view their own token usage"
      ON token_usage FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Verify users table can accept guest users
-- Check what columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Success message
SELECT 'Users table fixed! Try guest sign-in again.' as status;

