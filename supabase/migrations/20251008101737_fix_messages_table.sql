BEGIN;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Service role can insert messages'
  ) THEN
    CREATE POLICY "Service role can insert messages"
      ON public.messages FOR INSERT
      WITH CHECK (
        auth.role() = 'service_role' OR auth.role() = 'supabase_auth_admin'
      );
  END IF;
END;
$$;

ALTER POLICY "Users can insert messages in their chats" ON public.messages
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE public.chats.id = public.messages.chat_id
        AND public.chats.user_id = auth.uid()
    )
  );

COMMIT;
