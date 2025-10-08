-- ⚠️ DANGER: This will DELETE ALL TABLES AND DATA
-- Run this in Supabase SQL Editor to completely clean your database

-- Drop all tables in order (respecting foreign key dependencies)
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

-- Drop all functions
DROP FUNCTION IF EXISTS increment_web_search_count(UUID);
DROP FUNCTION IF EXISTS reset_daily_web_searches();
DROP FUNCTION IF EXISTS update_scheduled_prompt_next_run();

-- Verify all tables are gone
SELECT 
  '✅ All tables deleted!' as status,
  COUNT(*) as remaining_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

