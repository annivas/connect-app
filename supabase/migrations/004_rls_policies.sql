-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security policies for all tables.
-- Principle: users see only data in conversations/groups they belong to.
-- ═══════════════════════════════════════════════════════════════════

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CONVERSATIONS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  ));
CREATE POLICY "Create conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update own conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  ));

-- CONVERSATION_PARTICIPANTS
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See participants of own conversations" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid()
  ));
CREATE POLICY "Insert participants" ON public.conversation_participants
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update own participant row" ON public.conversation_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See messages in own contexts" ON public.messages
  FOR SELECT TO authenticated
  USING (
    (context_type = 'conversation' AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = context_id AND cp.user_id = auth.uid()
    ))
    OR
    (context_type = 'group' AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = context_id AND gm.user_id = auth.uid()
    ))
  );
CREATE POLICY "Insert messages in own contexts" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      (context_type = 'conversation' AND EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = context_id AND cp.user_id = auth.uid()
      ))
      OR
      (context_type = 'group' AND EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = context_id AND gm.user_id = auth.uid()
      ))
    )
  );
CREATE POLICY "Update own messages" ON public.messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "Delete own messages" ON public.messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- GROUPS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own groups" ON public.groups
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Create groups" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins update groups" ON public.groups
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.is_admin = true
  ));

-- GROUP_MEMBERS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See members of own groups" ON public.group_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm2
    WHERE gm2.group_id = group_id AND gm2.user_id = auth.uid()
  ));
CREATE POLICY "Insert group members" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update own membership" ON public.group_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins update member roles" ON public.group_members
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.is_admin = true
  ));
CREATE POLICY "Leave group" ON public.group_members
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins remove members" ON public.group_members
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.is_admin = true
  ));

-- GROUP_EVENTS
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see events" ON public.group_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Members create events" ON public.group_events
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Creator or admins update events" ON public.group_events
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.is_admin = true
  ));

-- EVENT_ATTENDEES
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see attendees" ON public.event_attendees
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_events ge
    JOIN public.group_members gm ON gm.group_id = ge.group_id
    WHERE ge.id = event_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Manage own attendance" ON public.event_attendees
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- NOTES
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See notes in own contexts" ON public.notes
  FOR SELECT TO authenticated
  USING (
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = notes.conversation_id AND cp.user_id = auth.uid()
    ))
    OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid()
    ))
  );
CREATE POLICY "Create notes" ON public.notes
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Update own notes" ON public.notes
  FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Delete own notes" ON public.notes
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- REMINDERS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See reminders in own contexts" ON public.reminders
  FOR SELECT TO authenticated
  USING (
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = reminders.conversation_id AND cp.user_id = auth.uid()
    ))
    OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = reminders.group_id AND gm.user_id = auth.uid()
    ))
  );
CREATE POLICY "Create reminders" ON public.reminders
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Update reminders" ON public.reminders
  FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- LEDGER_ENTRIES
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See ledger in own contexts" ON public.ledger_entries
  FOR SELECT TO authenticated
  USING (
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = ledger_entries.conversation_id AND cp.user_id = auth.uid()
    ))
    OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = ledger_entries.group_id AND gm.user_id = auth.uid()
    ))
  );
CREATE POLICY "Create ledger entries" ON public.ledger_entries
  FOR INSERT TO authenticated WITH CHECK (paid_by = auth.uid());
CREATE POLICY "Payer updates entries" ON public.ledger_entries
  FOR UPDATE TO authenticated USING (paid_by = auth.uid());

-- SHARED_OBJECTS
ALTER TABLE public.shared_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See shared objects in own contexts" ON public.shared_objects
  FOR SELECT TO authenticated
  USING (
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = shared_objects.conversation_id AND cp.user_id = auth.uid()
    ))
    OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = shared_objects.group_id AND gm.user_id = auth.uid()
    ))
    OR collection_id IS NOT NULL
  );
CREATE POLICY "Create shared objects" ON public.shared_objects
  FOR INSERT TO authenticated WITH CHECK (shared_by = auth.uid());

-- TRIPS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see trips" ON public.trips
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = trips.group_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Members manage trips" ON public.trips
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = trips.group_id AND gm.user_id = auth.uid()
  ));

-- ITINERARY_ITEMS
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see itinerary" ON public.itinerary_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    JOIN public.group_members gm ON gm.group_id = t.group_id
    WHERE t.id = trip_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Members manage itinerary" ON public.itinerary_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    JOIN public.group_members gm ON gm.group_id = t.group_id
    WHERE t.id = trip_id AND gm.user_id = auth.uid()
  ));

-- POLLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see polls" ON public.polls
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = polls.group_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Members create polls" ON public.polls
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = polls.group_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Members update polls" ON public.polls
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = polls.group_id AND gm.user_id = auth.uid()
  ));

-- COLLECTIONS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own and public collections" ON public.collections
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR is_public = true
    OR EXISTS (
      SELECT 1 FROM public.collection_collaborators cc
      WHERE cc.collection_id = id AND cc.user_id = auth.uid()
    )
  );
CREATE POLICY "Create collections" ON public.collections
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- COLLECTION_COLLABORATORS
ALTER TABLE public.collection_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See collaborators" ON public.collection_collaborators
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.created_by = auth.uid()
    )
  );
