import { create } from 'zustand';
import { Message, Conversation, Note, Reminder, LedgerEntry, SharedObject, SharedObjectType, ScheduledMessage, DisappearingDuration } from '../types';
import { messagesRepository } from '../services';
import { CreateNoteInput, UpdateNoteInput, CreateReminderInput, CreateLedgerEntryInput } from '../services/types';
import { supabase } from '../lib/supabase';
import { config } from '../config/env';
import { adaptMessage } from '../services/supabase/adapters';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getCurrentUserId, getUserById } from './helpers';

const PAGE_SIZE = 50;

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

  sendMessage: (conversationId: string, content: string, senderId: string, options?: { type?: import('../types').MessageType; metadata?: Record<string, unknown> }) => void;
  retryMessage: (messageId: string) => void;
  createConversation: (participantIds: string[]) => Promise<string>;
  deleteMessage: (conversationId: string, messageId: string) => void;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => void;
  setReplyTo: (conversationId: string, message: Message | null) => void;
  editMessage: (conversationId: string, messageId: string, newContent: string) => void;
  markAsRead: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  toggleMute: (conversationId: string) => void;

  // Write operations
  createNote: (conversationId: string, input: CreateNoteInput) => Promise<Note>;
  updateNote: (conversationId: string, noteId: string, input: UpdateNoteInput) => void;
  deleteNote: (conversationId: string, noteId: string) => void;
  toggleNotePin: (conversationId: string, noteId: string) => void;
  createReminder: (conversationId: string, input: CreateReminderInput) => Promise<Reminder>;
  toggleReminderComplete: (conversationId: string, reminderId: string) => void;
  deleteReminder: (conversationId: string, reminderId: string) => void;
  createLedgerEntry: (conversationId: string, input: CreateLedgerEntryInput) => Promise<LedgerEntry>;
  settleLedgerEntry: (conversationId: string, entryId: string) => void;
  deleteLedgerEntry: (conversationId: string, entryId: string) => void;
  addSharedObject: (
    conversationId: string,
    data: { type: SharedObjectType; title: string; description?: string; url?: string },
  ) => void;
  deleteSharedObject: (conversationId: string, objectId: string) => void;

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

  updateNote: (conversationId, noteId, input) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId || !c.metadata) return c;
        return {
          ...c,
          metadata: {
            ...c.metadata,
            notes: c.metadata.notes.map((n) =>
              n.id === noteId ? { ...n, ...input, updatedAt: new Date() } : n,
            ),
          },
        };
      }),
    }));
    messagesRepository.updateNote(conversationId, noteId, input).catch(() => {});
  },

  deleteNote: (conversationId, noteId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId && c.metadata
          ? { ...c, metadata: { ...c.metadata, notes: c.metadata.notes.filter((n) => n.id !== noteId) } }
          : c,
      ),
    }));
    messagesRepository.deleteNote(conversationId, noteId).catch(() => {});
  },

  toggleNotePin: (conversationId, noteId) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId || !c.metadata) return c;
        return {
          ...c,
          metadata: {
            ...c.metadata,
            notes: c.metadata.notes.map((n) =>
              n.id === noteId ? { ...n, isPinned: !n.isPinned } : n,
            ),
          },
        };
      }),
    }));
    messagesRepository.toggleNotePin(conversationId, noteId).catch(() => {});
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

  deleteReminder: (conversationId, reminderId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId && c.metadata
          ? { ...c, metadata: { ...c.metadata, reminders: c.metadata.reminders.filter((r) => r.id !== reminderId) } }
          : c,
      ),
    }));
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

  deleteLedgerEntry: (conversationId, entryId) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId || !c.metadata) return c;
        const remaining = c.metadata.ledgerEntries.filter((e) => e.id !== entryId);
        const newBalance = remaining.reduce(
          (sum, e) => (e.isSettled ? sum : sum + e.amount),
          0,
        );
        return {
          ...c,
          metadata: { ...c.metadata, ledgerEntries: remaining, ledgerBalance: newBalance },
        };
      }),
    }));
  },

  addSharedObject: (conversationId, data) => {
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
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              metadata: c.metadata
                ? {
                    ...c.metadata,
                    sharedObjects: [newObject, ...(c.metadata.sharedObjects ?? [])],
                  }
                : c.metadata,
            }
          : c,
      ),
    }));

    messagesRepository.addSharedObject(conversationId, data).catch(() => {
      // Revert: remove the optimistic object
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId && c.metadata
            ? { ...c, metadata: { ...c.metadata, sharedObjects: c.metadata.sharedObjects.filter((o) => o.id !== newObject.id) } }
            : c,
        ),
      }));
    });
  },

  deleteSharedObject: (conversationId, objectId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId && c.metadata
          ? { ...c, metadata: { ...c.metadata, sharedObjects: c.metadata.sharedObjects.filter((o) => o.id !== objectId) } }
          : c,
      ),
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
      _channel: null,
      scheduledMessages: [],
    });
  },
}));
