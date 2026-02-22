import { supabase } from '../../lib/supabase';
import { Group, Message } from '../../types';
import { IGroupsRepository } from '../types';
import {
  adaptMessage,
  adaptSharedObject,
  adaptNote,
  adaptGroupEvent,
  adaptEventAttendee,
  adaptTrip,
  adaptItineraryItem,
  adaptGroup,
} from './adapters';
import { getCurrentUserId } from './helpers';

export const supabaseGroupsRepository: IGroupsRepository = {
  async getGroups(): Promise<Group[]> {
    const userId = getCurrentUserId();

    // Step 1: Get groups the user is a member of
    const { data: memberships, error: memError } = await supabase
      .from('group_members')
      .select('group_id, is_admin, is_pinned, is_muted')
      .eq('user_id', userId);

    if (memError) throw new Error(`Failed to fetch memberships: ${memError.message}`);
    if (!memberships.length) return [];

    const groupIds = memberships.map((m) => m.group_id);

    // Step 2: Parallel-fetch all related data
    const [
      groupsResult,
      allMembersResult,
      eventsResult,
      attendeesResult,
      tripsResult,
      itineraryResult,
      sharedObjectsResult,
      notesResult,
    ] = await Promise.all([
      supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('last_activity', { ascending: false }),
      supabase
        .from('group_members')
        .select('group_id, user_id, is_admin')
        .in('group_id', groupIds),
      supabase
        .from('group_events')
        .select('*')
        .in('group_id', groupIds)
        .order('start_date', { ascending: true }),
      supabase
        .from('event_attendees')
        .select('*'),
      supabase
        .from('trips')
        .select('*')
        .in('group_id', groupIds),
      supabase
        .from('itinerary_items')
        .select('*')
        .order('day', { ascending: true })
        .order('sort_order', { ascending: true }),
      supabase
        .from('shared_objects')
        .select('*')
        .in('group_id', groupIds)
        .order('shared_at', { ascending: false }),
      supabase
        .from('notes')
        .select('*')
        .in('group_id', groupIds)
        .order('updated_at', { ascending: false }),
    ]);

    if (groupsResult.error) throw new Error(`Failed to fetch groups: ${groupsResult.error.message}`);
    if (allMembersResult.error) throw new Error(`Failed to fetch members: ${allMembersResult.error.message}`);
    if (eventsResult.error) throw new Error(`Failed to fetch events: ${eventsResult.error.message}`);
    if (attendeesResult.error) throw new Error(`Failed to fetch attendees: ${attendeesResult.error.message}`);
    if (tripsResult.error) throw new Error(`Failed to fetch trips: ${tripsResult.error.message}`);
    if (itineraryResult.error) throw new Error(`Failed to fetch itinerary: ${itineraryResult.error.message}`);
    if (sharedObjectsResult.error) throw new Error(`Failed to fetch shared objects: ${sharedObjectsResult.error.message}`);
    if (notesResult.error) throw new Error(`Failed to fetch notes: ${notesResult.error.message}`);

    // Step 3: Group data by relevant IDs
    const membersByGroup = new Map<string, string[]>();
    const adminsByGroup = new Map<string, string[]>();
    for (const m of allMembersResult.data) {
      const members = membersByGroup.get(m.group_id) ?? [];
      members.push(m.user_id);
      membersByGroup.set(m.group_id, members);

      if (m.is_admin) {
        const admins = adminsByGroup.get(m.group_id) ?? [];
        admins.push(m.user_id);
        adminsByGroup.set(m.group_id, admins);
      }
    }

    // Attendees by event_id
    const attendeesByEvent = new Map<string, ReturnType<typeof adaptEventAttendee>[]>();
    for (const a of attendeesResult.data) {
      const existing = attendeesByEvent.get(a.event_id) ?? [];
      existing.push(adaptEventAttendee(a));
      attendeesByEvent.set(a.event_id, existing);
    }

    // Events by group_id (with attendees assembled)
    const eventsByGroup = new Map<string, ReturnType<typeof adaptGroupEvent>[]>();
    for (const e of eventsResult.data) {
      const existing = eventsByGroup.get(e.group_id) ?? [];
      existing.push(adaptGroupEvent(e, attendeesByEvent.get(e.id) ?? []));
      eventsByGroup.set(e.group_id, existing);
    }

    // Itinerary items by trip_id
    const itineraryByTrip = new Map<string, ReturnType<typeof adaptItineraryItem>[]>();
    for (const item of itineraryResult.data) {
      const existing = itineraryByTrip.get(item.trip_id) ?? [];
      existing.push(adaptItineraryItem(item));
      itineraryByTrip.set(item.trip_id, existing);
    }

    // Trips by group_id (with itinerary assembled)
    const tripByGroup = new Map<string, ReturnType<typeof adaptTrip>>();
    for (const t of tripsResult.data) {
      tripByGroup.set(t.group_id, adaptTrip(t, itineraryByTrip.get(t.id) ?? []));
    }

    const sharedByGroup = new Map<string, typeof sharedObjectsResult.data>();
    for (const obj of sharedObjectsResult.data) {
      if (!obj.group_id) continue;
      const existing = sharedByGroup.get(obj.group_id) ?? [];
      existing.push(obj);
      sharedByGroup.set(obj.group_id, existing);
    }

    const notesByGroup = new Map<string, typeof notesResult.data>();
    for (const note of notesResult.data) {
      if (!note.group_id) continue;
      const existing = notesByGroup.get(note.group_id) ?? [];
      existing.push(note);
      notesByGroup.set(note.group_id, existing);
    }

    // User's membership metadata
    const userMemByGroup = new Map<string, (typeof memberships)[0]>();
    for (const m of memberships) {
      userMemByGroup.set(m.group_id, m);
    }

    // Step 4: Assemble
    return groupsResult.data.map((group) => {
      const userMem = userMemByGroup.get(group.id)!;
      return adaptGroup({
        group,
        memberIds: membersByGroup.get(group.id) ?? [],
        adminIds: adminsByGroup.get(group.id) ?? [],
        isPinned: userMem.is_pinned,
        isMuted: userMem.is_muted,
        events: eventsByGroup.get(group.id) ?? [],
        trip: tripByGroup.get(group.id),
        sharedObjects: (sharedByGroup.get(group.id) ?? []).map(adaptSharedObject),
        notes: (notesByGroup.get(group.id) ?? []).map(adaptNote),
      });
    });
  },

  async getGroupMessages(groupId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('context_type', 'group')
      .eq('context_id', groupId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch group messages: ${error.message}`);
    return data.map(adaptMessage);
  },

  async sendGroupMessage(groupId: string, content: string, senderId: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        context_type: 'group',
        context_id: groupId,
        sender_id: senderId,
        content,
        type: 'text',
        is_read: true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to send group message: ${error.message}`);

    // Update group's last_activity
    await supabase
      .from('groups')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', groupId);

    return adaptMessage(data);
  },

  async togglePin(groupId: string): Promise<void> {
    const userId = getCurrentUserId();

    const { data, error: readError } = await supabase
      .from('group_members')
      .select('is_pinned')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (readError) throw new Error(`Failed to read pin state: ${readError.message}`);

    const { error } = await supabase
      .from('group_members')
      .update({ is_pinned: !data.is_pinned })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to toggle pin: ${error.message}`);
  },

  async toggleMute(groupId: string): Promise<void> {
    const userId = getCurrentUserId();

    const { data, error: readError } = await supabase
      .from('group_members')
      .select('is_muted')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (readError) throw new Error(`Failed to read mute state: ${readError.message}`);

    const { error } = await supabase
      .from('group_members')
      .update({ is_muted: !data.is_muted })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to toggle mute: ${error.message}`);
  },
};
