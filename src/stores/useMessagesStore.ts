import { create } from 'zustand';
import { Message, Conversation, Note, Reminder, LedgerEntry, SharedObject, SharedObjectType, ScheduledMessage, DisappearingDuration, Channel, ConversationMetadata, ConversationEvent, Poll } from '../types';
import { messagesRepository } from '../services';
import { CreateNoteInput, UpdateNoteInput, CreateReminderInput, UpdateReminderInput, CreateLedgerEntryInput, UpdateLedgerEntryInput } from '../services/types';
import { supabase } from '../lib/supabase';
import { config } from '../config/env';
import { adaptMessage } from '../services/supabase/adapters';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getCurrentUserId, getUserById } from './helpers';

const PAGE_SIZE = 50;

// Helper to update metadata on either conversation-level or channel-level
const updateConvMetadata = (
  conversations: Conversation[],
  conversationId: string,
  channelId: string | null | undefined,
  updater: (metadata: ConversationMetadata) => ConversationMetadata,
): Conversation[] => {
  return conversations.map((c) => {
    if (c.id !== conversationId) return c;
    if (channelId && c.channels) {
      return {
        ...c,
        channels: c.channels.map((ch) =>
          ch.id === channelId ? { ...ch, metadata: updater(ch.metadata) } : ch,
        ),
      };
    }
    if (!c.metadata) return c;
    return { ...c, metadata: updater(c.metadata) };
  });
};

interface MessagesState {
  conversations: Conversation[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Pagination
  hasMoreMessages: Record<string, boolean>;
  loadingMessages: Set<string>;

  // Reply state (per conversation)
  replyingTo: Record<string, Message | null>;

  // Typing indicators (per conversation → user IDs currently typing)
  typingUsers: Record<string, string[]>;

  // Draft messages per conversation
  drafts: Record<string, string>;

  // Active channel per conversation
  activeChannel: Record<string, string | null>;

  // Realtime
  _channel: RealtimeChannel | null;

  init: () => Promise<void>;
  subscribe: () => void;
  unsubscribe: () => void;
  getConversationById: (id: string) => Conversation | undefined;
  getMessagesByConversationId: (conversationId: string, isPrivate?: boolean, channelId?: string | null) => Message[];
  getUnreadCount: () => number;

  // Channel operations
  createChannel: (conversationId: string, name: string, emoji?: string, color?: string) => void;
  deleteChannel: (conversationId: string, channelId: string) => void;
  updateChannel: (conversationId: string, channelId: string, updates: Partial<Pick<Channel, 'name' | 'emoji' | 'color'>>) => void;
  setActiveChannel: (conversationId: string, channelId: string | null) => void;
  getActiveChannel: (conversationId: string) => string | null;

  // Pagination
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: (conversationId: string) => Promise<void>;

  sendMessage: (conversationId: string, content: string, senderId: string, options?: { type?: import('../types').MessageType; metadata?: Record<string, unknown>; isPrivate?: boolean; channelId?: string | null }) => void;
  retryMessage: (messageId: string) => void;
  createConversation: (participantIds: string[]) => Promise<string>;
  deleteMessage: (conversationId: string, messageId: string) => void;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => void;
  setReplyTo: (conversationId: string, message: Message | null) => void;
  editMessage: (conversationId: string, messageId: string, newContent: string) => void;
  markAsRead: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  toggleMute: (conversationId: string) => void;

  // Write operations (all accept optional channelId for channel-scoped metadata)
  createNote: (conversationId: string, input: CreateNoteInput, channelId?: string | null) => Promise<Note>;
  updateNote: (conversationId: string, noteId: string, input: UpdateNoteInput, channelId?: string | null) => void;
  deleteNote: (conversationId: string, noteId: string, channelId?: string | null) => void;
  toggleNotePin: (conversationId: string, noteId: string, channelId?: string | null) => void;
  createReminder: (conversationId: string, input: CreateReminderInput, channelId?: string | null) => Promise<Reminder>;
  updateReminder: (conversationId: string, reminderId: string, input: UpdateReminderInput, channelId?: string | null) => void;
  toggleReminderComplete: (conversationId: string, reminderId: string, channelId?: string | null) => void;
  deleteReminder: (conversationId: string, reminderId: string, channelId?: string | null) => void;
  createLedgerEntry: (conversationId: string, input: CreateLedgerEntryInput, channelId?: string | null) => Promise<LedgerEntry>;
  updateLedgerEntry: (conversationId: string, entryId: string, input: UpdateLedgerEntryInput, channelId?: string | null) => void;
  settleLedgerEntry: (conversationId: string, entryId: string, channelId?: string | null) => void;
  deleteLedgerEntry: (conversationId: string, entryId: string, channelId?: string | null) => void;
  addSharedObject: (
    conversationId: string,
    data: { type: SharedObjectType; title: string; description?: string; url?: string },
    channelId?: string | null,
  ) => void;
  deleteSharedObject: (conversationId: string, objectId: string, channelId?: string | null) => void;

  // Events
  createEvent: (conversationId: string, event: Omit<ConversationEvent, 'id'>, channelId?: string | null) => void;
  updateEvent: (conversationId: string, eventId: string, updates: Partial<Pick<ConversationEvent, 'title' | 'description' | 'startDate' | 'endDate' | 'location'>>, channelId?: string | null) => void;
  deleteEvent: (conversationId: string, eventId: string, channelId?: string | null) => void;

  // Polls
  createPoll: (conversationId: string, question: string, options: string[], isMultipleChoice: boolean, channelId?: string | null) => import('../types').Poll;
  votePoll: (conversationId: string, pollId: string, optionId: string, channelId?: string | null) => void;

  // ─── New: Star, Pin, Forward, Archive, Search ──────
  scheduledMessages: ScheduledMessage[];
  toggleStarMessage: (conversationId: string, messageId: string) => void;
  togglePinMessage: (conversationId: string, messageId: string) => void;
  forwardMessage: (sourceConvId: string, messageId: string, targetConvIds: string[], senderId: string) => void;
  toggleArchive: (conversationId: string) => void;
  markAsUnread: (conversationId: string) => void;
  setDisappearingDuration: (conversationId: string, duration: DisappearingDuration) => void;
  scheduleMessage: (conversationId: string, content: string, senderId: string, scheduledFor: Date) => void;
  cancelScheduledMessage: (messageId: string) => void;
  searchAllConversations: (query: string) => { conversationId: string; messages: Message[] }[];
  setDraft: (conversationId: string, text: string) => void;
  getDraft: (conversationId: string) => string;
  clearDraft: (conversationId: string) => void;
  reset: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: [],
  isLoading: false,
  error: null,
  hasMoreMessages: {},
  loadingMessages: new Set(),
  replyingTo: {},
  typingUsers: {},
  drafts: {},
  activeChannel: {},
  _channel: null,
  scheduledMessages: [],

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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: 'context_type=eq.conversation',
        },
        (payload) => {
          const updatedRow = payload.new as Record<string, unknown>;
          const updatedMessage = adaptMessage(updatedRow as any);
          const state = get();

          // Check if the local version already matches (optimistic dedup)
          const localMsg = state.messages.find((m) => m.id === updatedMessage.id);
          if (
            localMsg &&
            localMsg.content === updatedMessage.content &&
            JSON.stringify(localMsg.reactions) === JSON.stringify(updatedMessage.reactions)
          ) {
            return; // Already up to date (likely our own optimistic update)
          }

          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === updatedMessage.id ? updatedMessage : m,
            ),
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: 'context_type=eq.conversation',
        },
        (payload) => {
          const deletedId = (payload.old as Record<string, unknown>).id as string;
          const state = get();

          // Skip if already removed locally (optimistic dedup)
          if (!state.messages.some((m) => m.id === deletedId)) return;

          const deletedMsg = state.messages.find((m) => m.id === deletedId);
          const conversationId = deletedMsg?.conversationId;
          const remaining = state.messages.filter((m) => m.id !== deletedId);

          if (conversationId) {
            const convMessages = remaining.filter((m) => m.conversationId === conversationId);
            const newLastMessage = convMessages.length > 0
              ? convMessages.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
              : undefined;

            set({
              messages: remaining,
              conversations: state.conversations.map((c) =>
                c.id === conversationId
                  ? { ...c, lastMessage: newLastMessage, updatedAt: new Date() }
                  : c,
              ),
            });
          } else {
            set({ messages: remaining });
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

  getMessagesByConversationId: (conversationId, isPrivate = false, channelId) =>
    get().messages.filter(
      (m) =>
        m.conversationId === conversationId &&
        (isPrivate ? m.isPrivate === true : !m.isPrivate) &&
        (channelId ? m.channelId === channelId : !m.channelId)
    ),

  getUnreadCount: () =>
    get().conversations.reduce((acc, conv) => acc + conv.unreadCount, 0),

  // ─── Channel Operations ──────────────────────────

  createChannel: (conversationId, name, emoji, color = '#D4764E') => {
    const tempId = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newChannel: Channel = {
      id: tempId,
      name,
      emoji,
      color,
      createdBy: getCurrentUserId() || 'unknown',
      createdAt: new Date(),
      metadata: {
        sharedObjects: [],
        notes: [],
        reminders: [],
        ledgerBalance: 0,
        ledgerEntries: [],
        pinnedMessages: [],
        starredMessages: [],
        polls: [],
        callHistory: [],
      },
    };
    // Optimistic update
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, channels: [...(c.channels || []), newChannel] }
          : c,
      ),
    }));
    // Persist to database
    messagesRepository.createChannel(conversationId, name, emoji, color).then((saved) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, channels: (c.channels || []).map((ch) => ch.id === tempId ? saved : ch) }
            : c,
        ),
      }));
    });
  },

  deleteChannel: (conversationId, channelId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, channels: (c.channels || []).filter((ch) => ch.id !== channelId) }
          : c,
      ),
      // Remove all messages belonging to this channel
      messages: state.messages.filter(
        (m) => !(m.conversationId === conversationId && m.channelId === channelId),
      ),
      // Reset active channel if it was the deleted one
      activeChannel: state.activeChannel[conversationId] === channelId
        ? { ...state.activeChannel, [conversationId]: null }
        : state.activeChannel,
    }));
    // Persist to database
    messagesRepository.deleteChannel(channelId);
  },

  updateChannel: (conversationId, channelId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              channels: (c.channels || []).map((ch) =>
                ch.id === channelId ? { ...ch, ...updates } : ch,
              ),
            }
          : c,
      ),
    }));
    // Persist to database
    messagesRepository.updateChannel(channelId, updates);
  },

  setActiveChannel: (conversationId, channelId) => {
    set((state) => ({
      activeChannel: { ...state.activeChannel, [conversationId]: channelId },
    }));
  },

  getActiveChannel: (conversationId) => {
    return get().activeChannel[conversationId] ?? null;
  },

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
      set((state) => ({
        messages: [...older, ...state.messages],
        hasMoreMessages: { ...state.hasMoreMessages, [conversationId]: older.length >= PAGE_SIZE },
      }));
    } finally {
      const done = new Set(get().loadingMessages);
      done.delete(conversationId);
      set({ loadingMessages: done });
    }
  },

  sendMessage: (conversationId, content, senderId, options) => {
    const messageId = `msg-${Date.now()}`;
    const state = get();

    // Attach reply data if replying to a message
    const replyingMsg = state.replyingTo[conversationId];
    let metadata = options?.metadata;
    let replyTo: Message['replyTo'] | undefined;
    if (replyingMsg) {
      const senderUser = getUserById(replyingMsg.senderId);
      replyTo = {
        messageId: replyingMsg.id,
        content: replyingMsg.content,
        senderName: senderUser?.name ?? 'Unknown',
      };
      metadata = { ...metadata, replyTo };
    }

    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId,
      content,
      timestamp: new Date(),
      type: options?.type ?? 'text',
      metadata,
      replyTo,
      isRead: true,
      sendStatus: 'sending',
      isPrivate: options?.isPrivate,
      channelId: options?.channelId,
    };

    set((s) => ({
      messages: [...s.messages, newMessage],
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: newMessage, updatedAt: new Date() }
          : c,
      ),
      // Clear reply state after sending
      replyingTo: { ...s.replyingTo, [conversationId]: null },
    }));

    const sendOptions = metadata ? { ...options, metadata } : options;
    messagesRepository
      .sendMessage(conversationId, content, senderId, sendOptions)
      .then((savedMessage) => {
        // Replace optimistic message with the saved one, preserving channelId/isPrivate
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId
              ? { ...savedMessage, sendStatus: 'sent' as const, channelId: savedMessage.channelId ?? m.channelId, isPrivate: savedMessage.isPrivate ?? m.isPrivate }
              : m,
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
      .sendMessage(message.conversationId, message.content, message.senderId, {
        type: message.type,
        metadata: message.metadata as Record<string, unknown> | undefined,
        channelId: message.channelId,
        isPrivate: message.isPrivate,
      })
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

  createConversation: async (participantIds) => {
    const conv = await messagesRepository.createConversation(participantIds);
    set((state) => ({
      conversations: [conv, ...state.conversations],
    }));
    return conv.id;
  },

  deleteMessage: (conversationId, messageId) => {
    const state = get();
    const deletedMsg = state.messages.find((m) => m.id === messageId);
    if (!deletedMsg) return;

    // Optimistic removal
    const remaining = state.messages.filter((m) => m.id !== messageId);
    const convMessages = remaining.filter((m) => m.conversationId === conversationId);
    const newLastMessage = convMessages.length > 0
      ? convMessages.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
      : undefined;

    set({
      messages: remaining,
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: newLastMessage, updatedAt: new Date() }
          : c,
      ),
    });

    messagesRepository.deleteMessage(messageId).catch(() => {
      // Revert on failure
      set((s) => ({
        messages: [...s.messages, deletedMsg].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        ),
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: deletedMsg, updatedAt: new Date() }
            : c,
        ),
      }));
    });
  },

  toggleReaction: (conversationId, messageId, emoji) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    // Optimistic update
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = [...(m.reactions ?? [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji && r.userId === userId);
        if (idx >= 0) {
          reactions.splice(idx, 1);
        } else {
          reactions.push({ emoji, userId, timestamp: new Date() });
        }
        return { ...m, reactions };
      }),
    }));

    messagesRepository.toggleReaction(messageId, emoji).catch(() => {
      // Revert on failure by toggling back
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = [...(m.reactions ?? [])];
          const idx = reactions.findIndex((r) => r.emoji === emoji && r.userId === userId);
          if (idx >= 0) {
            reactions.splice(idx, 1);
          } else {
            reactions.push({ emoji, userId, timestamp: new Date() });
          }
          return { ...m, reactions };
        }),
      }));
    });
  },

  setReplyTo: (conversationId, message) => {
    set((state) => ({
      replyingTo: { ...state.replyingTo, [conversationId]: message },
    }));
  },

  editMessage: (conversationId, messageId, newContent) => {
    const original = get().messages.find((m) => m.id === messageId);
    if (!original) return;

    // Optimistic update
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, isEdited: true }
          : m,
      ),
    }));

    messagesRepository.editMessage(messageId, newContent).catch(() => {
      // Revert on failure
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? original : m,
        ),
      }));
    });
  },

  // ─── Write Operations ──────────────────────────

  createNote: async (conversationId, input, channelId) => {
    const note = await messagesRepository.createNote(conversationId, input);
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        notes: [note, ...md.notes],
      })),
    }));
    return note;
  },

  updateNote: (conversationId, noteId, input, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        notes: md.notes.map((n) =>
          n.id === noteId ? { ...n, ...input, updatedAt: new Date() } : n,
        ),
      })),
    }));
    messagesRepository.updateNote(conversationId, noteId, input).catch(() => {});
  },

  deleteNote: (conversationId, noteId, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        notes: md.notes.filter((n) => n.id !== noteId),
      })),
    }));
    messagesRepository.deleteNote(conversationId, noteId).catch(() => {});
  },

  toggleNotePin: (conversationId, noteId, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        notes: md.notes.map((n) =>
          n.id === noteId ? { ...n, isPinned: !n.isPinned } : n,
        ),
      })),
    }));
    messagesRepository.toggleNotePin(conversationId, noteId).catch(() => {});
  },

  createReminder: async (conversationId, input, channelId) => {
    const reminder = await messagesRepository.createReminder(conversationId, input);
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        reminders: [reminder, ...md.reminders],
      })),
    }));
    return reminder;
  },

  updateReminder: (conversationId, reminderId, input, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        reminders: md.reminders.map((r) =>
          r.id === reminderId
            ? { ...r, ...input, dueDate: input.dueDate ? new Date(input.dueDate) : r.dueDate }
            : r,
        ),
      })),
    }));
    messagesRepository.updateReminder(reminderId, input).catch(() => {});
  },

  toggleReminderComplete: (conversationId, reminderId, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        reminders: md.reminders.map((r) =>
          r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r,
        ),
      })),
    }));

    messagesRepository.toggleReminderComplete(reminderId).catch(() => {
      set((state) => ({
        conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
          ...md,
          reminders: md.reminders.map((r) =>
            r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r,
          ),
        })),
      }));
    });
  },

  deleteReminder: (conversationId, reminderId, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        reminders: md.reminders.filter((r) => r.id !== reminderId),
      })),
    }));
  },

  createLedgerEntry: async (conversationId, input, channelId) => {
    const entry = await messagesRepository.createLedgerEntry(conversationId, input);
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => {
        const newEntries = [entry, ...md.ledgerEntries];
        const newBalance = newEntries.reduce((sum, e) => (e.isSettled ? sum : sum + e.amount), 0);
        return { ...md, ledgerEntries: newEntries, ledgerBalance: newBalance };
      }),
    }));
    return entry;
  },

  updateLedgerEntry: (conversationId, entryId, input, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => {
        const updatedEntries = md.ledgerEntries.map((e) =>
          e.id === entryId ? { ...e, ...input } : e,
        );
        const newBalance = updatedEntries.reduce((sum, e) => (e.isSettled ? sum : sum + e.amount), 0);
        return { ...md, ledgerEntries: updatedEntries, ledgerBalance: newBalance };
      }),
    }));
    messagesRepository.updateLedgerEntry(entryId, input).catch(() => {});
  },

  settleLedgerEntry: (conversationId, entryId, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => {
        const updatedEntries = md.ledgerEntries.map((e) =>
          e.id === entryId ? { ...e, isSettled: true } : e,
        );
        const newBalance = updatedEntries.reduce((sum, e) => (e.isSettled ? sum : sum + e.amount), 0);
        return { ...md, ledgerEntries: updatedEntries, ledgerBalance: newBalance };
      }),
    }));

    messagesRepository.settleLedgerEntry(entryId).catch(() => {
      set((state) => ({
        conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => {
          const revertedEntries = md.ledgerEntries.map((e) =>
            e.id === entryId ? { ...e, isSettled: false } : e,
          );
          const newBalance = revertedEntries.reduce((sum, e) => (e.isSettled ? sum : sum + e.amount), 0);
          return { ...md, ledgerEntries: revertedEntries, ledgerBalance: newBalance };
        }),
      }));
    });
  },

  deleteLedgerEntry: (conversationId, entryId, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => {
        const remaining = md.ledgerEntries.filter((e) => e.id !== entryId);
        const newBalance = remaining.reduce((sum, e) => (e.isSettled ? sum : sum + e.amount), 0);
        return { ...md, ledgerEntries: remaining, ledgerBalance: newBalance };
      }),
    }));
  },

  addSharedObject: (conversationId, data, channelId) => {
    const currentUserId = getCurrentUserId() || 'unknown';

    const newObject: SharedObject = {
      id: `shared-${Date.now()}`,
      type: data.type,
      title: data.title,
      description: data.description,
      url: data.url,
      sharedBy: currentUserId,
      sharedAt: new Date(),
      metadata: { url: data.url ?? '' },
    };

    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        sharedObjects: [newObject, ...(md.sharedObjects ?? [])],
      })),
    }));

    messagesRepository.addSharedObject(conversationId, data).catch(() => {
      set((state) => ({
        conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
          ...md,
          sharedObjects: md.sharedObjects.filter((o) => o.id !== newObject.id),
        })),
      }));
    });
  },

  deleteSharedObject: (conversationId, objectId, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        sharedObjects: md.sharedObjects.filter((o) => o.id !== objectId),
      })),
    }));
  },

  // Events
  createEvent: (conversationId, event, channelId) => {
    const newEvent: ConversationEvent = {
      ...event,
      id: `evt-${Date.now()}`,
    };
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        events: [...(md.events ?? []), newEvent],
      })),
    }));
  },

  updateEvent: (conversationId, eventId, updates, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        events: (md.events ?? []).map((e) =>
          e.id === eventId ? { ...e, ...updates } : e,
        ),
      })),
    }));
  },

  deleteEvent: (conversationId, eventId, channelId) => {
    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        events: (md.events ?? []).filter((e) => e.id !== eventId),
      })),
    }));
  },

  // ─── Polls ──────────────────────────────────────

  createPoll: (conversationId, question, options, isMultipleChoice, channelId) => {
    const currentUserId = getCurrentUserId() || 'unknown';
    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      question,
      options: options.map((text, i) => ({
        id: `opt-${Date.now()}-${i}`,
        text,
        voterIds: [],
      })),
      createdBy: currentUserId,
      createdAt: new Date(),
      isMultipleChoice,
      isClosed: false,
    };

    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        polls: [...(md.polls ?? []), newPoll],
      })),
    }));

    return newPoll;
  },

  votePoll: (conversationId, pollId, optionId, channelId) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    set((state) => ({
      conversations: updateConvMetadata(state.conversations, conversationId, channelId, (md) => ({
        ...md,
        polls: (md.polls ?? []).map((poll) => {
          if (poll.id !== pollId || poll.isClosed) return poll;
          return {
            ...poll,
            options: poll.options.map((opt) => {
              if (opt.id === optionId) {
                const hasVoted = opt.voterIds.includes(userId);
                return {
                  ...opt,
                  voterIds: hasVoted
                    ? opt.voterIds.filter((id) => id !== userId)
                    : [...opt.voterIds, userId],
                };
              }
              // For single-choice, remove user from other options
              if (!poll.isMultipleChoice) {
                return {
                  ...opt,
                  voterIds: opt.voterIds.filter((id) => id !== userId),
                };
              }
              return opt;
            }),
          };
        }),
      })),
    }));
  },

  // ─── Star / Pin / Forward / Archive / Search ──────

  toggleStarMessage: (conversationId, messageId) => {
    const msg = get().messages.find((m) => m.id === messageId);
    const newStarred = !msg?.isStarred;

    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, isStarred: newStarred } : m,
      ),
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId || !c.metadata) return c;
        const starred = c.metadata.starredMessages ?? [];
        const isCurrentlyStarred = starred.includes(messageId);
        return {
          ...c,
          metadata: {
            ...c.metadata,
            starredMessages: isCurrentlyStarred
              ? starred.filter((id) => id !== messageId)
              : [...starred, messageId],
          },
        };
      }),
    }));

    messagesRepository.toggleStarMessage(messageId, newStarred).catch(() => {
      // Revert
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, isStarred: !newStarred } : m,
        ),
      }));
    });
  },

  togglePinMessage: (conversationId, messageId) => {
    const msg = get().messages.find((m) => m.id === messageId);
    const newPinned = !msg?.isPinned;

    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, isPinned: newPinned } : m,
      ),
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId || !c.metadata) return c;
        const pinned = c.metadata.pinnedMessages ?? [];
        const isCurrentlyPinned = pinned.includes(messageId);
        return {
          ...c,
          metadata: {
            ...c.metadata,
            pinnedMessages: isCurrentlyPinned
              ? pinned.filter((id) => id !== messageId)
              : [...pinned, messageId],
          },
        };
      }),
    }));

    messagesRepository.togglePinMessage(messageId, newPinned).catch(() => {
      // Revert
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, isPinned: !newPinned } : m,
        ),
      }));
    });
  },

  forwardMessage: (sourceConvId, messageId, targetConvIds, senderId) => {
    const message = get().messages.find((m) => m.id === messageId);
    if (!message) return;

    const senderUser = getUserById(message.senderId);

    for (const targetConvId of targetConvIds) {
      const optimisticId = `msg-fwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const forwardedFrom = {
        originalMessageId: message.id,
        originalSenderId: message.senderId,
        originalSenderName: senderUser?.name ?? 'Unknown',
        originalConversationId: sourceConvId,
        originalTimestamp: message.timestamp,
      };

      const forwardedMessage: Message = {
        id: optimisticId,
        conversationId: targetConvId,
        senderId,
        content: message.content,
        timestamp: new Date(),
        type: message.type,
        metadata: message.metadata,
        isRead: true,
        sendStatus: 'sending',
        forwardedFrom,
      };

      set((state) => ({
        messages: [...state.messages, forwardedMessage],
        conversations: state.conversations.map((c) =>
          c.id === targetConvId
            ? { ...c, lastMessage: forwardedMessage, updatedAt: new Date() }
            : c,
        ),
      }));

      messagesRepository.forwardMessage(
        targetConvId, message.content, senderId, message.type,
        message.metadata as Record<string, unknown> | undefined,
        forwardedFrom as unknown as Record<string, unknown>,
      ).then((saved) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === optimisticId ? { ...saved, sendStatus: 'sent' as const, forwardedFrom } : m,
          ),
        }));
      }).catch(() => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === optimisticId ? { ...m, sendStatus: 'failed' as const } : m,
          ),
        }));
      });
    }
  },

  toggleArchive: (conversationId) => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    const wasArchived = conv?.isArchived ?? false;

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isArchived: !c.isArchived } : c,
      ),
    }));

    messagesRepository.toggleArchive(conversationId).catch(() => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, isArchived: wasArchived } : c,
        ),
      }));
    });
  },

  markAsUnread: (conversationId) => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    const prevUnread = conv?.unreadCount ?? 0;

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, isMarkedUnread: true, unreadCount: Math.max(c.unreadCount, 1) }
          : c,
      ),
    }));

    messagesRepository.markAsUnread(conversationId).catch(() => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, isMarkedUnread: false, unreadCount: prevUnread }
            : c,
        ),
      }));
    });
  },

  setDisappearingDuration: (conversationId, duration) => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    const prevDuration = conv?.disappearingDuration;

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, disappearingDuration: duration } : c,
      ),
    }));

    messagesRepository.setDisappearingDuration(conversationId, duration).catch(() => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, disappearingDuration: prevDuration } : c,
        ),
      }));
    });
  },

  scheduleMessage: (conversationId, content, senderId, scheduledFor) => {
    const scheduled: ScheduledMessage = {
      id: `sched-${Date.now()}`,
      conversationId,
      content,
      scheduledFor,
      createdAt: new Date(),
      status: 'pending',
    };
    set((state) => ({
      scheduledMessages: [...state.scheduledMessages, scheduled],
    }));
  },

  cancelScheduledMessage: (messageId) => {
    set((state) => ({
      scheduledMessages: state.scheduledMessages.map((m) =>
        m.id === messageId ? { ...m, status: 'cancelled' as const } : m,
      ),
    }));
  },

  searchAllConversations: (query) => {
    const lowerQuery = query.toLowerCase();
    const allMessages = get().messages;
    const results: Record<string, Message[]> = {};

    for (const msg of allMessages) {
      if (msg.content.toLowerCase().includes(lowerQuery)) {
        if (!results[msg.conversationId]) {
          results[msg.conversationId] = [];
        }
        results[msg.conversationId].push(msg);
      }
    }

    return Object.entries(results).map(([conversationId, messages]) => ({
      conversationId,
      messages,
    }));
  },

  setDraft: (conversationId, text) => {
    set((state) => ({
      drafts: { ...state.drafts, [conversationId]: text },
    }));
  },

  getDraft: (conversationId) => {
    return get().drafts[conversationId] ?? '';
  },

  clearDraft: (conversationId) => {
    set((state) => {
      const { [conversationId]: _, ...rest } = state.drafts;
      return { drafts: rest };
    });
  },

  reset: () => {
    get().unsubscribe();
    set({
      conversations: [],
      messages: [],
      isLoading: false,
      error: null,
      hasMoreMessages: {},
      loadingMessages: new Set(),
      replyingTo: {},
      typingUsers: {},
      drafts: {},
      activeChannel: {},
      _channel: null,
      scheduledMessages: [],
    });
  },
}));
