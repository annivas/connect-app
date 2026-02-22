import { create } from 'zustand';
import { Message, Conversation, Note, Reminder, LedgerEntry } from '../types';
import { messagesRepository } from '../services';
import { CreateNoteInput, CreateReminderInput, CreateLedgerEntryInput } from '../services/types';
import { supabase } from '../lib/supabase';
import { config } from '../config/env';
import { adaptMessage } from '../services/supabase/adapters';
import type { RealtimeChannel } from '@supabase/supabase-js';

const PAGE_SIZE = 50;

interface MessagesState {
  conversations: Conversation[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Pagination
  hasMoreMessages: Record<string, boolean>;
  loadingMessages: Set<string>;

  // Realtime
  _channel: RealtimeChannel | null;

  init: () => Promise<void>;
  subscribe: () => void;
  unsubscribe: () => void;
  getConversationById: (id: string) => Conversation | undefined;
  getMessagesByConversationId: (conversationId: string) => Message[];
  getUnreadCount: () => number;

  // Pagination
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: (conversationId: string) => Promise<void>;

  sendMessage: (conversationId: string, content: string, senderId: string) => void;
  retryMessage: (messageId: string) => void;
  markAsRead: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  toggleMute: (conversationId: string) => void;

  // Write operations
  createNote: (conversationId: string, input: CreateNoteInput) => Promise<Note>;
  createReminder: (conversationId: string, input: CreateReminderInput) => Promise<Reminder>;
  toggleReminderComplete: (conversationId: string, reminderId: string) => void;
  createLedgerEntry: (conversationId: string, input: CreateLedgerEntryInput) => Promise<LedgerEntry>;
  settleLedgerEntry: (conversationId: string, entryId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: [],
  isLoading: false,
  error: null,
  hasMoreMessages: {},
  loadingMessages: new Set(),
  _channel: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await messagesRepository.getConversations();
      set({ conversations, isLoading: false });

      // Start realtime subscriptions after data is loaded
      get().subscribe();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load conversations',
        isLoading: false,
      });
    }
  },

  subscribe: () => {
    // Only subscribe in Supabase mode
    if (config.useMocks) return;

    // Clean up existing subscription
    const existing = get()._channel;
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'context_type=eq.conversation',
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const incomingMessage = adaptMessage(newRow as any);
          const state = get();

          // Dedup: check if this is an echo of an optimistic message we already added
          const isDuplicate = state.messages.some((m) => {
            // Match by content + sender + context within a 10-second window
            if (
              m.content === incomingMessage.content &&
              m.senderId === incomingMessage.senderId &&
              m.conversationId === incomingMessage.conversationId
            ) {
              const timeDiff = Math.abs(
                m.timestamp.getTime() - incomingMessage.timestamp.getTime()
              );
              return timeDiff < 10_000;
            }
            return false;
          });

          if (isDuplicate) {
            // Replace the optimistic message with the canonical one (proper UUID)
            set((s) => ({
              messages: s.messages.map((m) => {
                if (
                  m.content === incomingMessage.content &&
                  m.senderId === incomingMessage.senderId &&
                  m.conversationId === incomingMessage.conversationId &&
                  m.id.startsWith('msg-')
                ) {
                  return incomingMessage;
                }
                return m;
              }),
            }));
          } else {
            // New message from another user — append
            set((s) => ({
              messages: [...s.messages, incomingMessage],
              conversations: s.conversations.map((c) =>
                c.id === incomingMessage.conversationId
                  ? {
                      ...c,
                      lastMessage: incomingMessage,
                      unreadCount: c.unreadCount + 1,
                      updatedAt: new Date(),
                    }
                  : c
              ),
            }));
          }
        }
      )
      .subscribe();

    set({ _channel: channel });
  },

  unsubscribe: () => {
    const channel = get()._channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ _channel: null });
    }
  },

  getConversationById: (id) => get().conversations.find((c) => c.id === id),

  getMessagesByConversationId: (conversationId) =>
    get().messages.filter((m) => m.conversationId === conversationId),

  getUnreadCount: () =>
    get().conversations.reduce((acc, conv) => acc + conv.unreadCount, 0),

  loadMessages: async (conversationId) => {
    const state = get();
    if (state.loadingMessages.has(conversationId)) return;

    const nextLoading = new Set(state.loadingMessages);
    nextLoading.add(conversationId);
    set({ loadingMessages: nextLoading });

    try {
      const msgs = await messagesRepository.getMessages(conversationId, { limit: PAGE_SIZE });
      // Remove any existing messages for this conversation, replace with fresh page
      const otherMessages = get().messages.filter((m) => m.conversationId !== conversationId);
      set({
        messages: [...otherMessages, ...msgs],
        hasMoreMessages: { ...get().hasMoreMessages, [conversationId]: msgs.length >= PAGE_SIZE },
      });
    } finally {
      const done = new Set(get().loadingMessages);
      done.delete(conversationId);
      set({ loadingMessages: done });
    }
  },

  loadMoreMessages: async (conversationId) => {
    const state = get();
    if (state.loadingMessages.has(conversationId)) return;
    if (!state.hasMoreMessages[conversationId]) return;

    const existing = state.messages.filter((m) => m.conversationId === conversationId);
    if (existing.length === 0) return;

    // Oldest loaded message as cursor
    const oldest = existing.reduce((a, b) => (a.timestamp < b.timestamp ? a : b));

    const nextLoading = new Set(state.loadingMessages);
    nextLoading.add(conversationId);
    set({ loadingMessages: nextLoading });

    try {
      const older = await messagesRepository.getMessages(conversationId, {
        limit: PAGE_SIZE,
        before: oldest.timestamp.toISOString(),
      });
      set({
        messages: [...older, ...get().messages],
        hasMoreMessages: { ...get().hasMoreMessages, [conversationId]: older.length >= PAGE_SIZE },
      });
    } finally {
      const done = new Set(get().loadingMessages);
      done.delete(conversationId);
      set({ loadingMessages: done });
    }
  },

  sendMessage: (conversationId, content, senderId) => {
    const messageId = `msg-${Date.now()}`;
    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId,
      content,
      timestamp: new Date(),
      type: 'text',
      isRead: true,
      sendStatus: 'sending',
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: newMessage, updatedAt: new Date() }
          : c,
      ),
    }));

    messagesRepository
      .sendMessage(conversationId, content, senderId)
      .then((savedMessage) => {
        // Replace optimistic message with the saved one
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...savedMessage, sendStatus: 'sent' as const } : m,
          ),
        }));
      })
      .catch(() => {
        // Mark as failed
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, sendStatus: 'failed' as const } : m,
          ),
        }));
      });
  },

  retryMessage: (messageId) => {
    const message = get().messages.find((m) => m.id === messageId);
    if (!message || message.sendStatus !== 'failed') return;

    // Reset to sending
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, sendStatus: 'sending' as const } : m,
      ),
    }));

    messagesRepository
      .sendMessage(message.conversationId, message.content, message.senderId)
      .then((savedMessage) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...savedMessage, sendStatus: 'sent' as const } : m,
          ),
        }));
      })
      .catch(() => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, sendStatus: 'failed' as const } : m,
          ),
        }));
      });
  },

  markAsRead: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    }));
    messagesRepository.markAsRead(conversationId).catch(() => {});
  },

  togglePin: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isPinned: !c.isPinned } : c,
      ),
    }));
    messagesRepository.togglePin(conversationId).catch(() => {});
  },

  toggleMute: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isMuted: !c.isMuted } : c,
      ),
    }));
    messagesRepository.toggleMute(conversationId).catch(() => {});
  },

  // ─── Write Operations ──────────────────────────

  createNote: async (conversationId, input) => {
    const note = await messagesRepository.createNote(conversationId, input);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId && c.metadata
          ? { ...c, metadata: { ...c.metadata, notes: [note, ...c.metadata.notes] } }
          : c,
      ),
    }));
    return note;
  },

  createReminder: async (conversationId, input) => {
    const reminder = await messagesRepository.createReminder(conversationId, input);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId && c.metadata
          ? { ...c, metadata: { ...c.metadata, reminders: [reminder, ...c.metadata.reminders] } }
          : c,
      ),
    }));
    return reminder;
  },

  toggleReminderComplete: (conversationId, reminderId) => {
    // Optimistic toggle
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId && c.metadata
          ? {
              ...c,
              metadata: {
                ...c.metadata,
                reminders: c.metadata.reminders.map((r) =>
                  r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r,
                ),
              },
            }
          : c,
      ),
    }));

    messagesRepository.toggleReminderComplete(reminderId).catch(() => {
      // Revert on failure
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId && c.metadata
            ? {
                ...c,
                metadata: {
                  ...c.metadata,
                  reminders: c.metadata.reminders.map((r) =>
                    r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r,
                  ),
                },
              }
            : c,
        ),
      }));
    });
  },

  createLedgerEntry: async (conversationId, input) => {
    const entry = await messagesRepository.createLedgerEntry(conversationId, input);
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId || !c.metadata) return c;
        const newEntries = [entry, ...c.metadata.ledgerEntries];
        const newBalance = newEntries.reduce(
          (sum, e) => (e.isSettled ? sum : sum + e.amount),
          0,
        );
        return {
          ...c,
          metadata: { ...c.metadata, ledgerEntries: newEntries, ledgerBalance: newBalance },
        };
      }),
    }));
    return entry;
  },

  settleLedgerEntry: (conversationId, entryId) => {
    // Optimistic settle
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId || !c.metadata) return c;
        const updatedEntries = c.metadata.ledgerEntries.map((e) =>
          e.id === entryId ? { ...e, isSettled: true } : e,
        );
        const newBalance = updatedEntries.reduce(
          (sum, e) => (e.isSettled ? sum : sum + e.amount),
          0,
        );
        return {
          ...c,
          metadata: { ...c.metadata, ledgerEntries: updatedEntries, ledgerBalance: newBalance },
        };
      }),
    }));

    messagesRepository.settleLedgerEntry(entryId).catch(() => {
      // Revert on failure
      set((state) => ({
        conversations: state.conversations.map((c) => {
          if (c.id !== conversationId || !c.metadata) return c;
          const revertedEntries = c.metadata.ledgerEntries.map((e) =>
            e.id === entryId ? { ...e, isSettled: false } : e,
          );
          const newBalance = revertedEntries.reduce(
            (sum, e) => (e.isSettled ? sum : sum + e.amount),
            0,
          );
          return {
            ...c,
            metadata: { ...c.metadata, ledgerEntries: revertedEntries, ledgerBalance: newBalance },
          };
        }),
      }));
    });
  },
}));
