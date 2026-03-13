-- Expand message type CHECK constraint to include all rich message types
ALTER TABLE public.messages DROP CONSTRAINT messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check
  CHECK (type = ANY (ARRAY[
    'text', 'image', 'video', 'audio', 'file', 'location',
    'contact', 'song', 'note', 'reminder', 'expense', 'poll', 'event'
  ]));
