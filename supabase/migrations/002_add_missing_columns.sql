-- conversation_participants: archive, unread marker, disappearing
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_marked_unread BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disappearing_duration TEXT DEFAULT 'off';

-- group_members: archive, unread marker, disappearing, unread count
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_marked_unread BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disappearing_duration TEXT DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0;

-- reminders: add group_id support (can belong to conversation OR group)
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.reminders ALTER COLUMN conversation_id DROP NOT NULL;

-- ledger_entries: add group_id support (can belong to conversation OR group)
ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.ledger_entries ALTER COLUMN conversation_id DROP NOT NULL;
