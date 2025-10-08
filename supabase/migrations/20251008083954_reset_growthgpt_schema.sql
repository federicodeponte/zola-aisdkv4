-- Reset GrowthGPT schema from scratch
\echo '🚨 WARNING: This migration will drop and recreate all GrowthGPT tables.'

-- Drop tables (if they exist)
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_keys CASCADE;
DROP TABLE IF EXISTS chat_attachments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS scheduled_prompts CASCADE;
DROP TABLE IF EXISTS website_contexts CASCADE;
DROP TABLE IF EXISTS token_usage CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS increment_web_search_count(UUID);
DROP FUNCTION IF EXISTS reset_daily_web_searches();
DROP FUNCTION IF EXISTS update_scheduled_prompt_next_run();

-- USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  anonymous BOOLEAN DEFAULT false,
  message_count INTEGER DEFAULT 0,
  premium BOOLEAN DEFAULT false,
  daily_message_count INTEGER DEFAULT 0,
  daily_reset TIMESTAMP WITH TIME ZONE,
  display_name TEXT,
  profile_image TEXT,
  favorite_models TEXT[],
  last_active_at TIMESTAMP WITH TIME ZONE,
  daily_pro_message_count INTEGER DEFAULT 0,
  daily_pro_reset TIMESTAMP WITH TIME ZONE,
  system_prompt TEXT,
  web_searches_today INTEGER DEFAULT 0,
  web_search_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- CHATS TABLE
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  model TEXT,
  system_prompt TEXT,
  public BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  pinned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id OR public = true);

CREATE POLICY "Users can insert their own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);

-- MESSAGES TABLE
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT,
  parts JSONB,
  experimental_attachments JSONB DEFAULT '[]'::jsonb,
  message_group_id UUID,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user_id = auth.uid() OR chats.public = true)
    )
  );

CREATE POLICY "Users can insert messages in their chats"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- PROJECTS TABLE
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- CHAT_ATTACHMENTS TABLE
CREATE TABLE chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_attachments_chat_id ON chat_attachments(chat_id);
CREATE INDEX idx_chat_attachments_user_id ON chat_attachments(user_id);

ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for their chats"
  ON chat_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attachments"
  ON chat_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- USER_KEYS TABLE
CREATE TABLE user_keys (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);

ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
  ON user_keys FOR ALL
  USING (auth.uid() = user_id);

-- USER_PREFERENCES TABLE
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  layout TEXT,
  prompt_suggestions BOOLEAN DEFAULT true,
  show_tool_invocations BOOLEAN DEFAULT true,
  show_conversation_previews BOOLEAN DEFAULT true,
  multi_model_enabled BOOLEAN DEFAULT false,
  hidden_models TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- FEEDBACK TABLE
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- TOKEN USAGE TABLE
CREATE TABLE token_usage (
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

CREATE INDEX idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX idx_token_usage_created_at ON token_usage(created_at);

ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token usage"
  ON token_usage FOR SELECT
  USING (auth.uid() = user_id);

-- WEBSITE CONTEXTS TABLE
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

CREATE INDEX idx_website_contexts_user_id ON website_contexts(user_id);
CREATE INDEX idx_website_contexts_domain ON website_contexts(domain);

ALTER TABLE website_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own website contexts"
  ON website_contexts FOR ALL
  USING (auth.uid() = user_id);

-- SCHEDULED PROMPTS TABLE
CREATE TABLE scheduled_prompts (
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

CREATE INDEX idx_scheduled_prompts_user_id ON scheduled_prompts(user_id);
CREATE INDEX idx_scheduled_prompts_next_run_at ON scheduled_prompts(next_run_at);

ALTER TABLE scheduled_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheduled prompts"
  ON scheduled_prompts FOR ALL
  USING (auth.uid() = user_id);

-- Helper functions
CREATE OR REPLACE FUNCTION increment_web_search_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET web_searches_today = COALESCE(web_searches_today, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_daily_web_searches()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET web_searches_today = 0,
      web_search_reset = NOW()
  WHERE web_search_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_scheduled_prompt_next_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.schedule_type = 'once' THEN
    NEW.next_run_at := NEW.schedule_date;
  ELSIF NEW.schedule_type = 'daily' THEN
    IF NEW.last_run_at IS NULL THEN
      NEW.next_run_at := (CURRENT_DATE + NEW.schedule_time)::TIMESTAMP WITH TIME ZONE;
    ELSE
      NEW.next_run_at := (DATE(NEW.last_run_at) + INTERVAL '1 day' + NEW.schedule_time)::TIMESTAMP WITH TIME ZONE;
    END IF;
  ELSIF NEW.schedule_type = 'weekly' THEN
    IF NEW.last_run_at IS NULL THEN
      NEW.next_run_at := (CURRENT_DATE + NEW.schedule_time)::TIMESTAMP WITH TIME ZONE;
    ELSE
      NEW.next_run_at := (DATE(NEW.last_run_at) + INTERVAL '7 days' + NEW.schedule_time)::TIMESTAMP WITH TIME ZONE;
    END IF;
  ELSIF NEW.schedule_type = 'monthly' THEN
    IF NEW.last_run_at IS NULL THEN
      NEW.next_run_at := (CURRENT_DATE + NEW.schedule_time)::TIMESTAMP WITH TIME ZONE;
    ELSE
      NEW.next_run_at := (DATE(NEW.last_run_at) + INTERVAL '1 month' + NEW.schedule_time)::TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scheduled_prompt_next_run
  BEFORE INSERT OR UPDATE ON scheduled_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_prompt_next_run();

-- Auth trigger to insert into public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    anonymous,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.is_anonymous, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating public.users record: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_admin;




