-- ═══════════════════════════════════════════════════════════════════
-- Drop ALL duplicate RLS policies from the second migration set
-- (rls_profiles_conversations_participants, rls_messages_groups_group_members,
--  rls_events_notes_reminders_ledger, rls_shared_trips_itinerary_polls_collections).
--
-- The first migration set (create_rls_policies / 004) + the recursion fix (006)
-- already provides correct policies. These duplicates are redundant and some
-- contain self-referencing subqueries that can cause issues.
-- ═══════════════════════════════════════════════════════════════════

-- profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

-- messages
DROP POLICY IF EXISTS "Users can view messages in their contexts" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their contexts" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

-- groups
DROP POLICY IF EXISTS "Members can view groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Members can update groups" ON public.groups;

-- group_events
DROP POLICY IF EXISTS "Members can view events" ON public.group_events;
DROP POLICY IF EXISTS "Members can create events" ON public.group_events;
DROP POLICY IF EXISTS "Creators can update events" ON public.group_events;

-- event_attendees
DROP POLICY IF EXISTS "Members can view attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can RSVP" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can update own RSVP" ON public.event_attendees;

-- notes
DROP POLICY IF EXISTS "Users can view accessible notes" ON public.notes;
DROP POLICY IF EXISTS "Users can create notes" ON public.notes;
DROP POLICY IF EXISTS "Creators can update notes" ON public.notes;
DROP POLICY IF EXISTS "Creators can delete notes" ON public.notes;

-- reminders
DROP POLICY IF EXISTS "Participants can view reminders" ON public.reminders;
DROP POLICY IF EXISTS "Participants can create reminders" ON public.reminders;
DROP POLICY IF EXISTS "Creators can update reminders" ON public.reminders;

-- ledger_entries
DROP POLICY IF EXISTS "Participants can view ledger" ON public.ledger_entries;
DROP POLICY IF EXISTS "Participants can create ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Creators can update ledger entries" ON public.ledger_entries;

-- shared_objects
DROP POLICY IF EXISTS "Users can view shared objects" ON public.shared_objects;
DROP POLICY IF EXISTS "Users can create shared objects" ON public.shared_objects;

-- trips
DROP POLICY IF EXISTS "Members can view trips" ON public.trips;
DROP POLICY IF EXISTS "Members can create trips" ON public.trips;
DROP POLICY IF EXISTS "Members can update trips" ON public.trips;

-- itinerary_items
DROP POLICY IF EXISTS "Members can view itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can create itinerary items" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can update itinerary items" ON public.itinerary_items;

-- collections
DROP POLICY IF EXISTS "Users can view accessible collections" ON public.collections;
DROP POLICY IF EXISTS "Authenticated users can create collections" ON public.collections;
DROP POLICY IF EXISTS "Creators can update collections" ON public.collections;
DROP POLICY IF EXISTS "Creators can delete collections" ON public.collections;

-- collection_collaborators
DROP POLICY IF EXISTS "Users can view collection collaborators" ON public.collection_collaborators;
DROP POLICY IF EXISTS "Creators can manage collaborators" ON public.collection_collaborators;
DROP POLICY IF EXISTS "Creators can remove collaborators" ON public.collection_collaborators;
