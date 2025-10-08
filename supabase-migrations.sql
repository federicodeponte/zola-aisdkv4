-- GrowthGPT Database Migrations
-- Run these in your Supabase SQL Editor

-- 1. Add web_searches_today to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS web_searches_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS web_search_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create token_usage table for tracking API usage and costs
CREATE TABLE IF NOT EXISTS token_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  action_type TEXT, -- 'message', 'web_search', 'bulk_process'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for token_usage
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_chat_id ON token_usage(chat_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);

-- RLS for token_usage
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token usage"
  ON token_usage FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Create website_contexts table for storing analyzed websites
CREATE TABLE IF NOT EXISTS website_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  company_name TEXT,
  industry TEXT,
  value_proposition TEXT,
  analysis JSONB, -- Stores full analysis data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- Create indexes for website_contexts
CREATE INDEX IF NOT EXISTS idx_website_contexts_user_id ON website_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_website_contexts_domain ON website_contexts(domain);

-- RLS for website_contexts
ALTER TABLE website_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own website contexts"
  ON website_contexts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own website contexts"
  ON website_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own website contexts"
  ON website_contexts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own website contexts"
  ON website_contexts FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create scheduled_prompts table for recurring/scheduled AI tasks
CREATE TABLE IF NOT EXISTS scheduled_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  schedule_type TEXT NOT NULL, -- 'once', 'daily', 'weekly', 'monthly'
  schedule_time TIME, -- Time of day for recurring tasks
  schedule_date TIMESTAMP WITH TIME ZONE, -- Specific date/time for one-time tasks
  delivery_method TEXT NOT NULL DEFAULT 'chat', -- 'chat', 'email', 'webhook'
  delivery_config JSONB, -- Additional config (email address, webhook URL, etc.)
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for scheduled_prompts
CREATE INDEX IF NOT EXISTS idx_scheduled_prompts_user_id ON scheduled_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_prompts_next_run_at ON scheduled_prompts(next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_prompts_is_active ON scheduled_prompts(is_active);

-- RLS for scheduled_prompts
ALTER TABLE scheduled_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled prompts"
  ON scheduled_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled prompts"
  ON scheduled_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled prompts"
  ON scheduled_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled prompts"
  ON scheduled_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Function to calculate next_run_at for scheduled prompts
CREATE OR REPLACE FUNCTION calculate_next_run_at(
  schedule_type TEXT,
  schedule_time TIME,
  schedule_date TIMESTAMP WITH TIME ZONE,
  last_run TIMESTAMP WITH TIME ZONE
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  IF schedule_type = 'once' THEN
    RETURN schedule_date;
  ELSIF schedule_type = 'daily' THEN
    IF last_run IS NULL THEN
      RETURN (CURRENT_DATE + schedule_time)::TIMESTAMP WITH TIME ZONE;
    ELSE
      RETURN (DATE(last_run) + INTERVAL '1 day' + schedule_time)::TIMESTAMP WITH TIME ZONE;
    END IF;
  ELSIF schedule_type = 'weekly' THEN
    IF last_run IS NULL THEN
      RETURN (CURRENT_DATE + schedule_time)::TIMESTAMP WITH TIME ZONE;
    ELSE
      RETURN (DATE(last_run) + INTERVAL '7 days' + schedule_time)::TIMESTAMP WITH TIME ZONE;
    END IF;
  ELSIF schedule_type = 'monthly' THEN
    IF last_run IS NULL THEN
      RETURN (CURRENT_DATE + schedule_time)::TIMESTAMP WITH TIME ZONE;
    ELSE
      RETURN (DATE(last_run) + INTERVAL '1 month' + schedule_time)::TIMESTAMP WITH TIME ZONE;
    END IF;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto-update next_run_at
CREATE OR REPLACE FUNCTION update_scheduled_prompt_next_run()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_run_at := calculate_next_run_at(
    NEW.schedule_type,
    NEW.schedule_time,
    NEW.schedule_date,
    NEW.last_run_at
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scheduled_prompt_next_run
  BEFORE INSERT OR UPDATE ON scheduled_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_prompt_next_run();

-- 7. Function to reset daily web search counters
CREATE OR REPLACE FUNCTION reset_daily_web_searches()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET web_searches_today = 0,
      web_search_reset = NOW()
  WHERE web_search_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- You can set up a cron job in Supabase to call this function daily
-- Or call it from your application before checking limits

-- 8. Function to atomically increment web search count
CREATE OR REPLACE FUNCTION increment_web_search_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET web_searches_today = COALESCE(web_searches_today, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

