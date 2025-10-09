-- Prompt queue schema and helper function

CREATE TABLE IF NOT EXISTS prompt_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  system_prompt TEXT,
  enable_search BOOLEAN NOT NULL DEFAULT TRUE,
  is_authenticated BOOLEAN NOT NULL DEFAULT FALSE,
  messages JSONB NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  message_group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_prompt_queue_status_priority_created
  ON prompt_queue(status, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_prompt_queue_user ON prompt_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_queue_chat ON prompt_queue(chat_id);

ALTER TABLE prompt_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION prompt_queue_acquire()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  chat_id UUID,
  model TEXT,
  system_prompt TEXT,
  enable_search BOOLEAN,
  is_authenticated BOOLEAN,
  messages JSONB,
  attachments JSONB,
  attempt_count INTEGER,
  metadata JSONB,
  message_group_id UUID
) AS $$
DECLARE
  job RECORD;
BEGIN
  SELECT * INTO job
  FROM prompt_queue
  WHERE status = 'pending'
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE prompt_queue
  SET status = 'processing',
      started_at = NOW(),
      attempt_count = job.attempt_count + 1
  WHERE id = job.id
  RETURNING * INTO job;

  RETURN QUERY SELECT
    job.id,
    job.user_id,
    job.chat_id,
    job.model,
    job.system_prompt,
    job.enable_search,
    job.is_authenticated,
    job.messages,
    job.attachments,
    job.attempt_count,
    job.metadata,
    job.message_group_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prompt_queue_acquire IS 'Locks and returns the next pending prompt queue item for processing.';

