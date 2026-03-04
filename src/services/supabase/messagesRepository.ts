import { supabase } from '../../lib/supabase';
import { Conversation, Message, MessageType, Note, Reminder, LedgerEntry, SharedObject, SharedObjectType, DisappearingDuration } from '../../types';
import { IMessagesRepository, PaginationParams, CreateNoteInput, CreateReminderInput, CreateLedgerEntryInput } from '../types';
import {
  adaptMessage,
  adaptSharedObject,
  adaptNote,
  adaptReminder,
  adaptLedgerEntry,
  adaptConversation,
} from './adapters';
import { getCurrentUserId, generateUUID } from './helpers';

export const supabaseMessagesRepository: IMessagesRepository = {
  async getConversations(): Promise<Conversation[]> {
    const userId = getCurrentUserId();

    // Step 1: Get all conversations the user participates in
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, is_pinned, is_muted, unread_count')
      .eq('user_id', userId);

    if (partError) throw new Error(`Failed to fetch participations: ${partError.message}`);
    if (!participations.length) return [];

    const conversationIds = participations.map((p) => p.conversation_id);

    // Step 2: Parallel-fetch all related data
    const [
      conversationsResult,
      allParticipantsResult,
      messagesResult,
      sharedObjectsResult,
      notesResult,
      remindersResult,
      ledgerResult,
    ] = await Promise.all([
      supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false }),
      supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds),
      supabase
        .from('messages')
        .select('*')
        .eq('context_type', 'conversation')
        .in('context_id', conversationIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('shared_objects')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('shared_at', { ascending: false }),
      supabase
        .from('notes')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('updated_at', { ascending: false }),
      supabase
        .from('reminders')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('due_date', { ascending: true }),
      supabase
        .from('ledger_entries')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('date', { ascending: false }),
    ]);

    if (conversationsResult.error) throw new Error(`Failed to fetch conversations: ${conversationsResult.error.message}`);
    if (allParticipantsResult.error) throw new Error(`Failed to fetch participants: ${allParticipantsResult.error.message}`);
    if (messagesResult.error) throw new Error(`Failed to fetch messages: ${messagesResult.error.message}`);
    if (sharedObjectsResult.error) throw new Error(`Failed to fetch shared objects: ${sharedObjectsResult.error.message}`);
    if (notesResult.error) throw new Error(`Failed to fetch notes: ${notesResult.error.message}`);
    if (remindersResult.error) throw new Error(`Failed to fetch reminders: ${remindersResult.error.message}`);
    if (ledgerResult.error) throw new Error(`Failed to fetch ledger: ${ledgerResult.error.message}`);

    // Step 3: Group data by conversation_id
    const participantsByConv = new Map<string, string[]>();
    for (const p of allParticipantsResult.data) {
      const existing = participantsByConv.get(p.conversation_id) ?? [];
      existing.push(p.user_id);
      participantsByConv.set(p.conversation_id, existing);
    }

    // Last message per conversation (messages are ordered by created_at DESC)
    const lastMessageByConv = new Map<string, Message>();
    for (const row of messagesResult.data) {
      if (!lastMessageByConv.has(row.context_id)) {
        lastMessageByConv.set(row.context_id, adaptMessage(row));
      }
    }

    const sharedByConv = new Map<string, typeof sharedObjectsResult.data>();
    for (const obj of sharedObjectsResult.data) {
      if (!obj.conversation_id) continue;
      const existing = sharedByConv.get(obj.conversation_id) ?? [];
      existing.push(obj);
      sharedByConv.set(obj.conversation_id, existing);
    }

    const notesByConv = new Map<string, typeof notesResult.data>();
    for (const note of notesResult.data) {
      if (!note.conversation_id) continue;
      const existing = notesByConv.get(note.conversation_id) ?? [];
      existing.push(note);
      notesByConv.set(note.conversation_id, existing);
    }

    const remindersByConv = new Map<string, typeof remindersResult.data>();
    for (const rem of remindersResult.data) {
      if (!rem.conversation_id) continue;
      const existing = remindersByConv.get(rem.conversation_id) ?? [];
      existing.push(rem);
      remindersByConv.set(rem.conversation_id, existing);
    }

    const ledgerByConv = new Map<string, typeof ledgerResult.data>();
    for (const entry of ledgerResult.data) {
      if (!entry.conversation_id) continue;
      const existing = ledgerByConv.get(entry.conversation_id) ?? [];
      existing.push(entry);
      ledgerByConv.set(entry.conversation_id, existing);
    }

    // User's participation metadata (pinned, muted, unread)
    const userPartByConv = new Map<string, (typeof participations)[0]>();
    for (const p of participations) {
      userPartByConv.set(p.conversation_id, p);
    }

    // Step 4: Assemble
    return conversationsResult.data.map((conv) => {
      const userPart = userPartByConv.get(conv.id)!;
      return adaptConversation({
        conversation: conv,
        participantIds: participantsByConv.get(conv.id) ?? [],
        isPinned: userPart.is_pinned,
        isMuted: userPart.is_muted,
        unreadCount: userPart.unread_count,
        lastMessage: lastMessageByConv.get(conv.id),
        sharedObjects: (sharedByConv.get(conv.id) ?? []).map(adaptSharedObject),
        notes: (notesByConv.get(conv.id) ?? []).map(adaptNote),
        reminders: (remindersByConv.get(conv.id) ?? []).map(adaptReminder),
        ledgerEntries: (ledgerByConv.get(conv.id) ?? []).map(adaptLedgerEntry),
      });
    });
  },

  async getMessages(conversationId: string, pagination?: PaginationParams): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('context_type', 'conversation')
      .eq('context_id', conversationId)
      .order('created_at', { ascending: false });

    if (pagination?.before) {
      query = query.lt('created_at', pagination.before);
    }

    const limit = pagination?.limit ?? 50;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    // Reverse to chronological order for display
    return data.reverse().map(adaptMessage);
  },

  async sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    options?: { type?: MessageType; metadata?: Record<string, unknown>; isPrivate?: boolean },
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        context_type: 'conversation',
        context_id: conversationId,
        sender_id: senderId,
        content,
        type: options?.type ?? 'text',
        metadata: (options?.metadata as any) ?? null,
        is_read: true,
        is_private: options?.isPrivate ?? false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to send message: ${error.message}`);

    // Update conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return adaptMessage(data);
  },

  async createConversation(participantIds: string[]): Promise<Conversation> {
    const userId = getCurrentUserId();

    // Generate UUID client-side so we can INSERT without .select().
    // The SELECT policy requires the user to be a participant, but
    // participants aren't added until the next step — a chicken-and-egg
    // problem with RLS. By generating the ID here, we skip RETURNING
    // entirely and avoid triggering the SELECT policy.
    const conversationId = generateUUID();
    const now = new Date().toISOString();

    const { error: convError } = await supabase
      .from('conversations')
      .insert({ id: conversationId, type: 'individual', created_at: now, updated_at: now });

    if (convError) throw new Error(`Failed to create conversation: ${convError.message}`);

    // Add participants
    const participantRows = participantIds.map((uid) => ({
      conversation_id: conversationId,
      user_id: uid,
      is_pinned: false,
      is_muted: false,
      unread_count: 0,
    }));

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participantRows);

    if (partError) throw new Error(`Failed to add participants: ${partError.message}`);

    return adaptConversation({
      conversation: { id: conversationId, type: 'individual', created_at: now, updated_at: now },
      participantIds,
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      lastMessage: undefined,
      sharedObjects: [],
      notes: [],
      reminders: [],
      ledgerEntries: [],
    });
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw new Error(`Failed to delete message: ${error.message}`);
  },

  async toggleReaction(messageId: string, emoji: string): Promise<void> {
    const userId = getCurrentUserId();

    // Read current reactions
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

  async editMessage(messageId: string, newContent: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        metadata: { edited: true },
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw new Error(`Failed to edit message: ${error.message}`);
    return adaptMessage(data);
  },

  async markAsRead(conversationId: string): Promise<void> {
    const userId = getCurrentUserId();
    const { error } = await supabase
      .from('conversation_participants')
      .update({ unread_count: 0 })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to mark as read: ${error.message}`);
  },

  async togglePin(conversationId: string): Promise<void> {
    const userId = getCurrentUserId();

    // Read current value
    const { data, error: readError } = await supabase
      .from('conversation_participants')
      .select('is_pinned')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (readError) throw new Error(`Failed to read pin state: ${readError.message}`);

    // Toggle
    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_pinned: !data.is_pinned })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to toggle pin: ${error.message}`);
  },

  async toggleMute(conversationId: string): Promise<void> {
    const userId = getCurrentUserId();

    const { data, error: readError } = await supabase
      .from('conversation_participants')
      .select('is_muted')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (readError) throw new Error(`Failed to read mute state: ${readError.message}`);

    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_muted: !data.is_muted })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to toggle mute: ${error.message}`);
  },

  async createNote(conversationId: string, input: CreateNoteInput): Promise<Note> {
    const userId = getCurrentUserId();

    const { data, error } = await supabase
      .from('notes')
      .insert({
        conversation_id: conversationId,
        title: input.title,
        content: input.content,
        color: input.color,
        is_private: input.isPrivate,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create note: ${error.message}`);
    return adaptNote(data);
  },

  async createReminder(conversationId: string, input: CreateReminderInput): Promise<Reminder> {
    const userId = getCurrentUserId();

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        conversation_id: conversationId,
        title: input.title,
        description: input.description ?? null,
        due_date: input.dueDate,
        priority: input.priority,
        created_by: userId,
        is_completed: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create reminder: ${error.message}`);
    return adaptReminder(data);
  },

  async toggleReminderComplete(reminderId: string): Promise<void> {
    // Read current value
    const { data, error: readError } = await supabase
      .from('reminders')
      .select('is_completed')
      .eq('id', reminderId)
      .single();

    if (readError) throw new Error(`Failed to read reminder state: ${readError.message}`);

    // Toggle
    const { error } = await supabase
      .from('reminders')
      .update({ is_completed: !data.is_completed })
      .eq('id', reminderId);

    if (error) throw new Error(`Failed to toggle reminder: ${error.message}`);
  },

  async createLedgerEntry(conversationId: string, input: CreateLedgerEntryInput): Promise<LedgerEntry> {
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert({
        conversation_id: conversationId,
        description: input.description,
        amount: input.amount,
        paid_by: input.paidBy,
        split_between: input.splitBetween,
        category: input.category ?? null,
        is_settled: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create ledger entry: ${error.message}`);
    return adaptLedgerEntry(data);
  },

  async settleLedgerEntry(entryId: string): Promise<void> {
    const { error } = await supabase
      .from('ledger_entries')
      .update({ is_settled: true })
      .eq('id', entryId);

    if (error) throw new Error(`Failed to settle ledger entry: ${error.message}`);
  },

  async searchMessages(conversationId: string, query: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('context_type', 'conversation')
      .eq('context_id', conversationId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to search messages: ${error.message}`);
    return data.reverse().map(adaptMessage);
  },

  async toggleStarMessage(messageId: string, isStarred: boolean): Promise<void> {
    // Store star state in message metadata JSONB
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

  async togglePinMessage(messageId: string, isPinned: boolean): Promise<void> {
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

  async forwardMessage(
    targetConvId: string,
    content: string,
    senderId: string,
    type: MessageType,
    metadata: Record<string, unknown> | undefined,
    forwardedFrom: Record<string, unknown>,
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        context_type: 'conversation',
        context_id: targetConvId,
        sender_id: senderId,
        content,
        type,
        metadata: { ...metadata, forwardedFrom } as any,
        is_read: true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to forward message: ${error.message}`);

    // Update conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', targetConvId);

    return adaptMessage(data);
  },

  async toggleArchive(conversationId: string): Promise<void> {
    const userId = getCurrentUserId();

    const { data, error: readError } = await supabase
      .from('conversation_participants')
      .select('is_archived')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (readError) throw new Error(`Failed to read archive state: ${readError.message}`);

    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_archived: !data.is_archived })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to toggle archive: ${error.message}`);
  },

  async markAsUnread(conversationId: string): Promise<void> {
    const userId = getCurrentUserId();

    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_marked_unread: true, unread_count: 1 })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to mark as unread: ${error.message}`);
  },

  async setDisappearingDuration(conversationId: string, duration: DisappearingDuration): Promise<void> {
    const userId = getCurrentUserId();

    const { error } = await supabase
      .from('conversation_participants')
      .update({ disappearing_duration: duration })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to set disappearing duration: ${error.message}`);
  },

  async addSharedObject(conversationId: string, data: { type: SharedObjectType; title: string; description?: string; url?: string }): Promise<SharedObject> {
    const userId = getCurrentUserId();

    const { data: row, error } = await supabase
      .from('shared_objects')
      .insert({
        conversation_id: conversationId,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        url: data.url ?? null,
        shared_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add shared object: ${error.message}`);
    return adaptSharedObject(row);
  },
};
