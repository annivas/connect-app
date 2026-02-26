-- ═══════════════════════════════════════════════════════════════════
-- Fix infinite recursion in RLS policies for conversation_participants
-- and group_members. These tables had SELECT policies that queried
-- themselves, causing Postgres to loop infinitely when evaluating RLS.
--
-- Solution: SECURITY DEFINER helper functions bypass RLS internally,
-- breaking the recursion cycle.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Step 1: Helper functions (SECURITY DEFINER) ─────────────────

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(g_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = g_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(g_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = g_id AND user_id = auth.uid() AND is_admin = true
  );
$$;

-- ─── Step 2: Fix conversation_participants (self-referencing) ────

DROP POLICY IF EXISTS "See participants of own conversations" ON public.conversation_participants;
CREATE POLICY "See participants of own conversations" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));

-- ─── Step 3: Fix group_members (self-referencing) ───────────────

DROP POLICY IF EXISTS "See members of own groups" ON public.group_members;
CREATE POLICY "See members of own groups" ON public.group_members
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS "Admins update member roles" ON public.group_members;
CREATE POLICY "Admins update member roles" ON public.group_members
  FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id));

DROP POLICY IF EXISTS "Admins remove members" ON public.group_members;
CREATE POLICY "Admins remove members" ON public.group_members
  FOR DELETE TO authenticated
  USING (public.is_group_admin(group_id));

-- ─── Step 4: Update cross-table policies for consistency ────────
-- These aren't strictly recursive, but using the helper functions
-- makes them consistent and prevents future issues.

-- conversations
DROP POLICY IF EXISTS "See own conversations" ON public.conversations;
CREATE POLICY "See own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id));

DROP POLICY IF EXISTS "Update own conversations" ON public.conversations;
CREATE POLICY "Update own conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(id));

-- messages
DROP POLICY IF EXISTS "See messages in own contexts" ON public.messages;
CREATE POLICY "See messages in own contexts" ON public.messages
  FOR SELECT TO authenticated
  USING (
    (context_type = 'conversation' AND public.is_conversation_participant(context_id))
    OR
    (context_type = 'group' AND public.is_group_member(context_id))
  );

DROP POLICY IF EXISTS "Insert messages in own contexts" ON public.messages;
CREATE POLICY "Insert messages in own contexts" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      (context_type = 'conversation' AND public.is_conversation_participant(context_id))
      OR
      (context_type = 'group' AND public.is_group_member(context_id))
    )
  );
