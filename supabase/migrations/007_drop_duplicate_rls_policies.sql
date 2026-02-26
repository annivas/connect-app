-- ═══════════════════════════════════════════════════════════════════
-- Drop duplicate RLS policies that were created by earlier migrations
-- (rls_profiles_conversations_participants, rls_messages_groups_group_members)
-- and still had self-referencing subqueries causing infinite recursion.
-- Migration 006_fix_rls_recursion replaced the policies from 004 but
-- these duplicates with different names were left behind.
-- ═══════════════════════════════════════════════════════════════════

-- conversation_participants: recursive SELECT + redundant INSERT/UPDATE
DROP POLICY IF EXISTS "Users can view participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON public.conversation_participants;

-- group_members: recursive SELECT + redundant INSERT/UPDATE
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Authenticated users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.group_members;
