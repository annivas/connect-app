import { supabase } from '../../lib/supabase';
import { Group, Message, RSVPStatus, Note, Reminder, LedgerEntry, SharedObject, SharedObjectType, Poll, DisappearingDuration, ItineraryItem, GroupEvent, Trip, Channel } from '../../types';
import { IGroupsRepository, PaginationParams, CreateGroupInput, UpdateGroupInput, CreateNoteInput, UpdateNoteInput, CreateReminderInput, CreateLedgerEntryInput } from '../types';
import {
  adaptMessage,
  adaptSharedObject,
  adaptNote,
  adaptReminder,
  adaptLedgerEntry,
  adaptGroupEvent,
  adaptEventAttendee,
  adaptTrip,
  adaptItineraryItem,
  adaptGroup,
  adaptPoll,
  adaptChannel,
  PollRow,
} from './adapters';
import { getCurrentUserId, generateUUID } from './helpers';

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
      remindersResult,
      ledgerResult,
      pollsResult,
      channelsResult,
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
      supabase
        .from('reminders')
        .select('*')
        .in('group_id', groupIds)
        .order('due_date', { ascending: true }),
      supabase
        .from('ledger_entries')
        .select('*')
        .in('group_id', groupIds)
        .order('date', { ascending: false }),
      supabase
        .from('polls')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('channels')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: true }),
    ]);

    if (groupsResult.error) throw new Error(`Failed to fetch groups: ${groupsResult.error.message}`);
    if (allMembersResult.error) throw new Error(`Failed to fetch members: ${allMembersResult.error.message}`);
    if (eventsResult.error) throw new Error(`Failed to fetch events: ${eventsResult.error.message}`);
    if (attendeesResult.error) throw new Error(`Failed to fetch attendees: ${attendeesResult.error.message}`);
    if (tripsResult.error) throw new Error(`Failed to fetch trips: ${tripsResult.error.message}`);
    if (itineraryResult.error) throw new Error(`Failed to fetch itinerary: ${itineraryResult.error.message}`);
    if (sharedObjectsResult.error) throw new Error(`Failed to fetch shared objects: ${sharedObjectsResult.error.message}`);
    if (notesResult.error) throw new Error(`Failed to fetch notes: ${notesResult.error.message}`);
    if (remindersResult.error) throw new Error(`Failed to fetch reminders: ${remindersResult.error.message}`);
    if (ledgerResult.error) throw new Error(`Failed to fetch ledger: ${ledgerResult.error.message}`);
    // polls table may not exist yet — treat error as empty
    const pollsData = pollsResult.error ? [] : pollsResult.data;

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

    const remindersByGroup = new Map<string, typeof remindersResult.data>();
    for (const rem of remindersResult.data) {
      if (!rem.group_id) continue;
      const existing = remindersByGroup.get(rem.group_id) ?? [];
      existing.push(rem);
      remindersByGroup.set(rem.group_id, existing);
    }

    const ledgerByGroup = new Map<string, typeof ledgerResult.data>();
    for (const entry of ledgerResult.data) {
      if (!entry.group_id) continue;
      const existing = ledgerByGroup.get(entry.group_id) ?? [];
      existing.push(entry);
      ledgerByGroup.set(entry.group_id, existing);
    }

    const pollsByGroup = new Map<string, Poll[]>();
    for (const poll of pollsData) {
      const existing = pollsByGroup.get(poll.group_id) ?? [];
      existing.push(adaptPoll(poll as PollRow));
      pollsByGroup.set(poll.group_id, existing);
    }

    const channelsByGroup = new Map<string, typeof channelsResult.data>();
    if (!channelsResult.error) {
      for (const ch of channelsResult.data) {
        if (!ch.group_id) continue;
        const existing = channelsByGroup.get(ch.group_id) ?? [];
        existing.push(ch);
        channelsByGroup.set(ch.group_id, existing);
      }
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
        reminders: (remindersByGroup.get(group.id) ?? []).map(adaptReminder),
        ledgerEntries: (ledgerByGroup.get(group.id) ?? []).map(adaptLedgerEntry),
        polls: pollsByGroup.get(group.id) ?? [],
        channels: (channelsByGroup.get(group.id) ?? []).map(adaptChannel),
      });
    });
  },

  async getGroupMessages(groupId: string, pagination?: PaginationParams): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('context_type', 'group')
      .eq('context_id', groupId)
      .order('created_at', { ascending: false });

    if (pagination?.before) {
      query = query.lt('created_at', pagination.before);
    }

    const limit = pagination?.limit ?? 50;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch group messages: ${error.message}`);
    // Reverse to chronological order for display
    return data.reverse().map(adaptMessage);
  },

  async sendGroupMessage(groupId: string, content: string, senderId: string, options?: { type?: import('../../types').MessageType; metadata?: Record<string, unknown>; isPrivate?: boolean; channelId?: string | null }): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        context_type: 'group',
        context_id: groupId,
        sender_id: senderId,
        content,
        type: options?.type ?? 'text',
        metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
        is_read: true,
        channel_id: options?.channelId ?? null,
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

  async deleteGroupMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw new Error(`Failed to delete group message: ${error.message}`);
  },

  async toggleGroupReaction(messageId: string, emoji: string): Promise<void> {
    const userId = getCurrentUserId();

    const { data, error: readError } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (readError) throw new Error(`Failed to read reactions: ${readError.message}`);

    const reactions = (data.reactions as Array<{ emoji: string; userId: string; timestamp: string }>) ?? [];
    const idx = reactions.findIndex((r) => r.emoji === emoji && r.userId === userId);

    if (idx >= 0) {
      reactions.splice(idx, 1);
    } else {
      reactions.push({ emoji, userId, timestamp: new Date().toISOString() });
    }

    const { error } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId);

    if (error) throw new Error(`Failed to toggle reaction: ${error.message}`);
  },

  async editGroupMessage(messageId: string, newContent: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({ content: newContent, metadata: JSON.stringify({ edited: true }) })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw new Error(`Failed to edit group message: ${error.message}`);
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

  async createGroup(input: CreateGroupInput): Promise<Group> {
    const userId = getCurrentUserId();

    // Generate UUID client-side so we can INSERT without .select().
    // The SELECT policy requires the user to be a group member, but
    // members aren't added until Step 2 — same chicken-and-egg as conversations.
    const groupId = generateUUID();
    const now = new Date().toISOString();

    // Step 1: Insert the group row (no .select() to avoid SELECT policy)
    const groupRow = {
      id: groupId,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      created_by: userId,
      avatar: '',
      last_activity: now,
      created_at: now,
    };

    const { error: groupError } = await supabase
      .from('groups')
      .insert(groupRow);

    if (groupError) throw new Error(`Failed to create group: ${groupError.message}`);

    // Step 2: Insert group_members — creator as admin + other members
    const memberRows = [
      { group_id: groupId, user_id: userId, is_admin: true, is_pinned: false, is_muted: false },
      ...input.memberIds.map((memberId) => ({
        group_id: groupId,
        user_id: memberId,
        is_admin: false,
        is_pinned: false,
        is_muted: false,
      })),
    ];

    const { error: membersError } = await supabase.from('group_members').insert(memberRows);

    if (membersError) throw new Error(`Failed to add group members: ${membersError.message}`);

    // Step 3: Return the fully assembled group
    const allMemberIds = [userId, ...input.memberIds];
    return adaptGroup({
      group: groupRow,
      memberIds: allMemberIds,
      adminIds: [userId],
      isPinned: false,
      isMuted: false,
      events: [],
      trip: undefined,
      sharedObjects: [],
      notes: [],
      channels: [],
    });
  },

  async updateRSVP(eventId: string, status: RSVPStatus): Promise<void> {
    const userId = getCurrentUserId();

    const { error } = await supabase
      .from('event_attendees')
      .upsert(
        {
          event_id: eventId,
          user_id: userId,
          status,
          responded_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,user_id' }
      );

    if (error) throw new Error(`Failed to update RSVP: ${error.message}`);
  },

  async addMembers(groupId: string, memberIds: string[]): Promise<void> {
    const rows = memberIds.map((memberId) => ({
      group_id: groupId,
      user_id: memberId,
      is_admin: false,
      is_pinned: false,
      is_muted: false,
    }));

    const { error } = await supabase.from('group_members').insert(rows);
    if (error) throw new Error(`Failed to add members: ${error.message}`);
  },

  async removeMember(groupId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberId);

    if (error) throw new Error(`Failed to remove member: ${error.message}`);
  },

  async leaveGroup(groupId: string): Promise<void> {
    const userId = getCurrentUserId();

    // Check if current user is the last admin
    const { data: admins, error: adminError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('is_admin', true);

    if (adminError) throw new Error(`Failed to check admins: ${adminError.message}`);

    const isLastAdmin = admins.length === 1 && admins[0].user_id === userId;

    if (isLastAdmin) {
      // Find another member to promote
      const { data: members, error: memError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .neq('user_id', userId)
        .limit(1);

      if (memError) throw new Error(`Failed to find replacement admin: ${memError.message}`);

      if (members.length > 0) {
        await supabase
          .from('group_members')
          .update({ is_admin: true })
          .eq('group_id', groupId)
          .eq('user_id', members[0].user_id);
      }
    }

    // Remove the user from the group
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to leave group: ${error.message}`);
  },

  async updateGroup(groupId: string, updates: UpdateGroupInput): Promise<Group> {
    const userId = getCurrentUserId();

    // Build the update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.type !== undefined) updateData.type = updates.type;

    const { data: groupRow, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update group: ${error.message}`);

    // Fetch current members and admin data to reassemble the group
    const { data: memberRows, error: memError } = await supabase
      .from('group_members')
      .select('user_id, is_admin, is_pinned, is_muted')
      .eq('group_id', groupId);

    if (memError) throw new Error(`Failed to fetch members: ${memError.message}`);

    const memberIds = memberRows.map((m) => m.user_id);
    const adminIds = memberRows.filter((m) => m.is_admin).map((m) => m.user_id);
    const userMem = memberRows.find((m) => m.user_id === userId);

    return adaptGroup({
      group: groupRow,
      memberIds,
      adminIds,
      isPinned: userMem?.is_pinned ?? false,
      isMuted: userMem?.is_muted ?? false,
      events: [],
      trip: undefined,
      sharedObjects: [],
      notes: [],
      channels: [],
    });
  },

  async toggleAdmin(groupId: string, memberId: string): Promise<void> {
    const { data, error: readError } = await supabase
      .from('group_members')
      .select('is_admin')
      .eq('group_id', groupId)
      .eq('user_id', memberId)
      .single();

    if (readError) throw new Error(`Failed to read admin state: ${readError.message}`);

    const { error } = await supabase
      .from('group_members')
      .update({ is_admin: !data.is_admin })
      .eq('group_id', groupId)
      .eq('user_id', memberId);

    if (error) throw new Error(`Failed to toggle admin: ${error.message}`);
  },

  async searchGroupMessages(groupId: string, query: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('context_type', 'group')
      .eq('context_id', groupId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to search group messages: ${error.message}`);
    return data.reverse().map(adaptMessage);
  },

  // ─── Events ──────────────────────────────────────

  async createEvent(groupId: string, event: Omit<GroupEvent, 'id' | 'groupId' | 'createdBy' | 'attendees'>): Promise<GroupEvent> {
    const userId = getCurrentUserId();

    const { data, error } = await supabase
      .from('group_events')
      .insert({
        group_id: groupId,
        title: event.title,
        description: event.description ?? null,
        start_date: event.startDate.toISOString(),
        end_date: event.endDate?.toISOString() ?? null,
        location: event.location ? (event.location as any) : null,
        type: event.type,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create event: ${error.message}`);

    // Auto-attend as creator
    await supabase
      .from('event_attendees')
      .insert({ event_id: data.id, user_id: userId, status: 'going', responded_at: new Date().toISOString() });

    return adaptGroupEvent(data, [{ userId, status: 'going', respondedAt: new Date() }]);
  },

  // ─── Trips ──────────────────────────────────────

  async createTrip(groupId: string, trip: Omit<Trip, 'id' | 'groupId' | 'itinerary' | 'participants'>): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        group_id: groupId,
        destination: trip.destination,
        start_date: trip.startDate.toISOString(),
        end_date: trip.endDate.toISOString(),
        budget: trip.budget ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create trip: ${error.message}`);
    return adaptTrip(data, []);
  },

  // ─── Itinerary ───────────────────────────────────

  async addItineraryItem(tripId: string, item: Omit<ItineraryItem, 'id'>): Promise<ItineraryItem> {
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert({
        trip_id: tripId,
        day: item.day,
        time: item.time ?? null,
        title: item.title,
        description: item.description ?? null,
        location: item.location ? (item.location as any) : null,
        type: item.type,
        cost: item.cost ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add itinerary item: ${error.message}`);
    return adaptItineraryItem(data);
  },

  async editItineraryItem(itemId: string, updates: Partial<ItineraryItem>): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (updates.day !== undefined) updateData.day = updates.day;
    if (updates.time !== undefined) updateData.time = updates.time;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.cost !== undefined) updateData.cost = updates.cost;
    if (updates.location !== undefined) updateData.location = updates.location;

    const { error } = await supabase
      .from('itinerary_items')
      .update(updateData)
      .eq('id', itemId);

    if (error) throw new Error(`Failed to edit itinerary item: ${error.message}`);
  },

  async deleteItineraryItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`Failed to delete itinerary item: ${error.message}`);
  },

  // ─── Notes ───────────────────────────────────────

  async createNote(groupId: string, input: CreateNoteInput): Promise<Note> {
    const userId = getCurrentUserId();

    const { data, error } = await supabase
      .from('notes')
      .insert({
        group_id: groupId,
        title: input.title,
        content: input.content,
        color: input.color,
        is_private: input.isPrivate,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create group note: ${error.message}`);
    return adaptNote(data);
  },

  async updateNote(_groupId: string, noteId: string, input: UpdateNoteInput): Promise<Note> {
    const updates: Record<string, unknown> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.content !== undefined) updates.content = input.content;
    if (input.color !== undefined) updates.color = input.color;
    if (input.isPrivate !== undefined) updates.is_private = input.isPrivate;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update group note: ${error.message}`);
    return adaptNote(data);
  },

  async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) throw new Error(`Failed to delete note: ${error.message}`);
  },

  async toggleNotePin(_groupId: string, _noteId: string): Promise<void> {
    // Pin state is managed client-side for now
  },

  // ─── Reminders ───────────────────────────────────

  async createReminder(groupId: string, input: CreateReminderInput): Promise<Reminder> {
    const userId = getCurrentUserId();

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        group_id: groupId,
        title: input.title,
        description: input.description ?? null,
        due_date: input.dueDate,
        priority: input.priority,
        created_by: userId,
        is_completed: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create group reminder: ${error.message}`);
    return adaptReminder(data);
  },

  async updateReminder(reminderId: string, input: import('../types').UpdateReminderInput): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.dueDate !== undefined) updates.due_date = input.dueDate;
    if (input.priority !== undefined) updates.priority = input.priority;

    const { error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', reminderId);

    if (error) throw new Error(`Failed to update group reminder: ${error.message}`);
  },

  async toggleReminderComplete(reminderId: string): Promise<void> {
    const { data, error: readError } = await supabase
      .from('reminders')
      .select('is_completed')
      .eq('id', reminderId)
      .single();

    if (readError) throw new Error(`Failed to read reminder state: ${readError.message}`);

    const { error } = await supabase
      .from('reminders')
      .update({ is_completed: !data.is_completed })
      .eq('id', reminderId);

    if (error) throw new Error(`Failed to toggle reminder: ${error.message}`);
  },

  // ─── Ledger ──────────────────────────────────────

  async createLedgerEntry(groupId: string, input: CreateLedgerEntryInput): Promise<LedgerEntry> {
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert({
        group_id: groupId,
        description: input.description,
        amount: input.amount,
        paid_by: input.paidBy,
        split_between: input.splitBetween,
        category: input.category ?? null,
        is_settled: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create group ledger entry: ${error.message}`);
    return adaptLedgerEntry(data);
  },

  async updateLedgerEntry(entryId: string, input: import('../types').UpdateLedgerEntryInput): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (input.description !== undefined) updates.description = input.description;
    if (input.amount !== undefined) updates.amount = input.amount;
    if (input.category !== undefined) updates.category = input.category;

    const { error: updateError } = await supabase
      .from('ledger_entries')
      .update(updates)
      .eq('id', entryId);

    if (updateError) throw new Error(`Failed to update group ledger entry: ${updateError.message}`);
  },

  async settleLedgerEntry(entryId: string): Promise<void> {
    const { error } = await supabase
      .from('ledger_entries')
      .update({ is_settled: true })
      .eq('id', entryId);

    if (error) throw new Error(`Failed to settle group ledger entry: ${error.message}`);
  },

  // ─── Shared Objects ──────────────────────────────

  async addSharedObject(groupId: string, data: { type: SharedObjectType; title: string; description?: string; url?: string }): Promise<SharedObject> {
    const userId = getCurrentUserId();

    const { data: row, error } = await supabase
      .from('shared_objects')
      .insert({
        group_id: groupId,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        url: data.url ?? null,
        shared_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add group shared object: ${error.message}`);
    return adaptSharedObject(row);
  },

  // ─── Polls ───────────────────────────────────────

  async createPoll(groupId: string, question: string, options: string[], isMultipleChoice: boolean): Promise<Poll> {
    const userId = getCurrentUserId();

    const pollOptions = options.map((text, i) => ({
      id: `opt-${Date.now()}-${i}`,
      text,
      voterIds: [],
    }));

    const { data, error } = await supabase
      .from('polls')
      .insert({
        group_id: groupId,
        question,
        options: pollOptions as any,
        created_by: userId,
        is_multiple_choice: isMultipleChoice,
        is_closed: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create poll: ${error.message}`);
    return adaptPoll(data as PollRow);
  },

  async votePoll(pollId: string, optionId: string): Promise<void> {
    const userId = getCurrentUserId();

    // Read current poll options
    const { data, error: readError } = await supabase
      .from('polls')
      .select('options, is_multiple_choice')
      .eq('id', pollId)
      .single();

    if (readError) throw new Error(`Failed to read poll: ${readError.message}`);

    const options = data.options as Array<{ id: string; text: string; voterIds: string[] }>;
    const isMultipleChoice = data.is_multiple_choice;

    const updatedOptions = options.map((opt) => {
      if (opt.id === optionId) {
        const hasVoted = opt.voterIds.includes(userId);
        return {
          ...opt,
          voterIds: hasVoted
            ? opt.voterIds.filter((id: string) => id !== userId)
            : [...opt.voterIds, userId],
        };
      }
      // If not multiple choice, remove vote from other options
      if (!isMultipleChoice) {
        return { ...opt, voterIds: opt.voterIds.filter((id: string) => id !== userId) };
      }
      return opt;
    });

    const { error } = await supabase
      .from('polls')
      .update({ options: updatedOptions as any })
      .eq('id', pollId);

    if (error) throw new Error(`Failed to vote on poll: ${error.message}`);
  },

  async closePoll(pollId: string): Promise<void> {
    const { error } = await supabase
      .from('polls')
      .update({ is_closed: true })
      .eq('id', pollId);

    if (error) throw new Error(`Failed to close poll: ${error.message}`);
  },

  async getPolls(groupId: string): Promise<Poll[]> {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch polls: ${error.message}`);
    return data.map((row) => adaptPoll(row as PollRow));
  },

  // ─── Archive / Unread / Disappearing ─────────────

  async toggleArchive(groupId: string): Promise<void> {
    const userId = getCurrentUserId();

    const { data, error: readError } = await supabase
      .from('group_members')
      .select('is_archived')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (readError) throw new Error(`Failed to read archive state: ${readError.message}`);

    const { error } = await supabase
      .from('group_members')
      .update({ is_archived: !data.is_archived })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to toggle group archive: ${error.message}`);
  },

  async markAsUnread(groupId: string): Promise<void> {
    const userId = getCurrentUserId();

    const { error } = await supabase
      .from('group_members')
      .update({ is_marked_unread: true, unread_count: 1 })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to mark group as unread: ${error.message}`);
  },

  async markAsRead(groupId: string): Promise<void> {
    const userId = getCurrentUserId();

    const { error } = await supabase
      .from('group_members')
      .update({ is_marked_unread: false, unread_count: 0 })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to mark group as read: ${error.message}`);
  },

  async setDisappearingDuration(groupId: string, duration: DisappearingDuration): Promise<void> {
    const userId = getCurrentUserId();

    const { error } = await supabase
      .from('group_members')
      .update({ disappearing_duration: duration })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to set disappearing duration: ${error.message}`);
  },

  // ─── Star / Pin for group messages ───────────────

  async toggleStarGroupMessage(messageId: string, isStarred: boolean): Promise<void> {
    const { data, error: readError } = await supabase
      .from('messages')
      .select('metadata')
      .eq('id', messageId)
      .single();

    if (readError) throw new Error(`Failed to read message: ${readError.message}`);

    const meta = (data.metadata as Record<string, unknown>) ?? {};
    const { error } = await supabase
      .from('messages')
      .update({ metadata: { ...meta, starred: isStarred } })
      .eq('id', messageId);

    if (error) throw new Error(`Failed to toggle star: ${error.message}`);
  },

  async togglePinGroupMessage(messageId: string, isPinned: boolean): Promise<void> {
    const { data, error: readError } = await supabase
      .from('messages')
      .select('metadata')
      .eq('id', messageId)
      .single();

    if (readError) throw new Error(`Failed to read message: ${readError.message}`);

    const meta = (data.metadata as Record<string, unknown>) ?? {};
    const { error } = await supabase
      .from('messages')
      .update({ metadata: { ...meta, pinned: isPinned } })
      .eq('id', messageId);

    if (error) throw new Error(`Failed to toggle pin: ${error.message}`);
  },

  async createChannel(groupId: string, name: string, emoji?: string, color = '#D4764E'): Promise<Channel> {
    const userId = getCurrentUserId();
    const { data, error } = await supabase
      .from('channels')
      .insert({
        group_id: groupId,
        name,
        emoji: emoji ?? null,
        color,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create channel: ${error.message}`);
    return adaptChannel(data);
  },

  async updateChannel(channelId: string, updates: Partial<Pick<Channel, 'name' | 'emoji' | 'color'>>): Promise<Channel> {
    const { data, error } = await supabase
      .from('channels')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.emoji !== undefined && { emoji: updates.emoji ?? null }),
        ...(updates.color !== undefined && { color: updates.color }),
      })
      .eq('id', channelId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update channel: ${error.message}`);
    return adaptChannel(data);
  },

  async deleteChannel(channelId: string): Promise<void> {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId);

    if (error) throw new Error(`Failed to delete channel: ${error.message}`);
  },
};
