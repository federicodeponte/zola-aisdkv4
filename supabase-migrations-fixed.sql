-- GrowthGPT Database Migrations (Fixed for existing tables)
-- Run these in your Supabase SQL Editor

-- 1. Add web_searches_today to users table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='web_searches_today') THEN
    ALTER TABLE users ADD COLUMN web_searches_today INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='web_search_reset') THEN
    ALTER TABLE users ADD COLUMN web_search_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 2. Drop and recreate website_contexts table if it exists with wrong schema
DROP TABLE IF EXISTS website_contexts CASCADE;

CREATE TABLE website_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  company_name TEXT,
  industry TEXT,
  value_proposition TEXT,
  analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- Create indexes for website_contexts
CREATE INDEX IF NOT EXISTS idx_website_contexts_user_id ON website_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_website_contexts_domain ON website_contexts(domain);

-- RLS for website_contexts
ALTER TABLE website_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own website contexts" ON website_contexts;
CREATE POLICY "Users can view their own website contexts"
  ON website_contexts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own website contexts" ON website_contexts;
CREATE POLICY "Users can insert their own website contexts"
  ON website_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own website contexts" ON website_contexts;
CREATE POLICY "Users can update their own website contexts"
  ON website_contexts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own website contexts" ON website_contexts;
CREATE POLICY "Users can delete their own website contexts"
  ON website_contexts FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Create scheduled_prompts table
CREATE TABLE IF NOT EXISTS scheduled_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  schedule_type TEXT NOT NULL,
  schedule_time TIME,
  schedule_date TIMESTAMP WITH TIME ZONE,
  delivery_method TEXT NOT NULL DEFAULT 'chat',
  delivery_config JSONB,
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

DROP POLICY IF EXISTS "Users can view their own scheduled prompts" ON scheduled_prompts;
CREATE POLICY "Users can view their own scheduled prompts"
  ON scheduled_prompts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own scheduled prompts" ON scheduled_prompts;
CREATE POLICY "Users can insert their own scheduled prompts"
  ON scheduled_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scheduled prompts" ON scheduled_prompts;
CREATE POLICY "Users can update their own scheduled prompts"
  ON scheduled_prompts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scheduled prompts" ON scheduled_prompts;
CREATE POLICY "Users can delete their own scheduled prompts"
  ON scheduled_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Function to calculate next_run_at for scheduled prompts
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

-- 5. Trigger to auto-update next_run_at
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

DROP TRIGGER IF EXISTS trigger_update_scheduled_prompt_next_run ON scheduled_prompts;
CREATE TRIGGER trigger_update_scheduled_prompt_next_run
  BEFORE INSERT OR UPDATE ON scheduled_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_prompt_next_run();

-- 6. Function to reset daily web searches
CREATE OR REPLACE FUNCTION reset_daily_web_searches()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET web_searches_today = 0,
      web_search_reset = NOW()
  WHERE web_search_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to atomically increment web search count
CREATE OR REPLACE FUNCTION increment_web_search_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET web_searches_today = COALESCE(web_searches_today, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Done! All tables and functions created.
SELECT 'GrowthGPT schema migration complete!' as status;

