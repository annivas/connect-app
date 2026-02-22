import { supabase } from '../../lib/supabase';
import { Conversation, Message } from '../../types';
import { IMessagesRepository } from '../types';
import {
  adaptMessage,
  adaptSharedObject,
  adaptNote,
  adaptReminder,
  adaptLedgerEntry,
  adaptConversation,
} from './adapters';
import { getCurrentUserId } from './helpers';

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
      const existing = remindersByConv.get(rem.conversation_id) ?? [];
      existing.push(rem);
      remindersByConv.set(rem.conversation_id, existing);
    }

    const ledgerByConv = new Map<string, typeof ledgerResult.data>();
    for (const entry of ledgerResult.data) {
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

  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('context_type', 'conversation')
      .eq('context_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    return data.map(adaptMessage);
  },

  async sendMessage(conversationId: string, content: string, senderId: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        context_type: 'conversation',
        context_id: conversationId,
        sender_id: senderId,
        content,
        type: 'text',
        is_read: true,
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
};
