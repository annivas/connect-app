-- Enable Realtime for tables that need live updates.
-- Note: messages may already be in the publication — these are idempotent-safe
-- if the table is already present, Supabase will skip it.

-- Run this check first:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Then add any missing tables:
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
