import { create } from 'zustand';
import { Group, Message, RSVPStatus } from '../types';
import { groupsRepository } from '../services';
import { supabase } from '../lib/supabase';
import { config } from '../config/env';
import { adaptMessage } from '../services/supabase/adapters';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CreateGroupInput } from '../services/types';

const PAGE_SIZE = 50;

interface GroupsState {
  groups: Group[];
  groupMessages: Message[];
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
  getGroupById: (id: string) => Group | undefined;
  getGroupMessages: (groupId: string) => Message[];

  // Pagination
  loadGroupMessages: (groupId: string) => Promise<void>;
  loadMoreGroupMessages: (groupId: string) => Promise<void>;

  sendGroupMessage: (groupId: string, content: string, senderId: string) => void;
  retryGroupMessage: (messageId: string) => void;
  togglePin: (groupId: string) => void;
  toggleMute: (groupId: string) => void;
  createGroup: (input: CreateGroupInput) => Promise<Group>;
  updateRSVP: (groupId: string, eventId: string, status: RSVPStatus) => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  groupMessages: [],
  isLoading: false,
  error: null,
  hasMoreMessages: {},
  loadingMessages: new Set(),
  _channel: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await groupsRepository.getGroups();
      set({ groups, isLoading: false });

      // Start realtime subscriptions after data is loaded
      get().subscribe();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load groups',
        isLoading: false,
      });
    }
  },

  subscribe: () => {
    if (config.useMocks) return;

    const existing = get()._channel;
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel('group-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'context_type=eq.group',
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const incomingMessage = adaptMessage(newRow as any);
          const state = get();

          // Dedup: check if this is an echo of an optimistic message
          const isDuplicate = state.groupMessages.some((m) => {
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
            // Replace optimistic message with canonical one
            set((s) => ({
              groupMessages: s.groupMessages.map((m) => {
                if (
                  m.content === incomingMessage.content &&
                  m.senderId === incomingMessage.senderId &&
                  m.conversationId === incomingMessage.conversationId &&
                  m.id.startsWith('gmsg-')
                ) {
                  return incomingMessage;
                }
                return m;
              }),
            }));
          } else {
            // New message from another user
            set((s) => ({
              groupMessages: [...s.groupMessages, incomingMessage],
              groups: s.groups.map((g) =>
                g.id === incomingMessage.conversationId
                  ? { ...g, lastActivity: new Date() }
                  : g
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

  getGroupById: (id) => get().groups.find((g) => g.id === id),

  getGroupMessages: (groupId) =>
    get().groupMessages.filter((m) => m.conversationId === groupId),

  loadGroupMessages: async (groupId) => {
    const state = get();
    if (state.loadingMessages.has(groupId)) return;

    const nextLoading = new Set(state.loadingMessages);
    nextLoading.add(groupId);
    set({ loadingMessages: nextLoading });

    try {
      const msgs = await groupsRepository.getGroupMessages(groupId, { limit: PAGE_SIZE });
      const otherMessages = get().groupMessages.filter((m) => m.conversationId !== groupId);
      set({
        groupMessages: [...otherMessages, ...msgs],
        hasMoreMessages: { ...get().hasMoreMessages, [groupId]: msgs.length >= PAGE_SIZE },
      });
    } finally {
      const done = new Set(get().loadingMessages);
      done.delete(groupId);
      set({ loadingMessages: done });
    }
  },

  loadMoreGroupMessages: async (groupId) => {
    const state = get();
    if (state.loadingMessages.has(groupId)) return;
    if (!state.hasMoreMessages[groupId]) return;

    const existing = state.groupMessages.filter((m) => m.conversationId === groupId);
    if (existing.length === 0) return;

    const oldest = existing.reduce((a, b) => (a.timestamp < b.timestamp ? a : b));

    const nextLoading = new Set(state.loadingMessages);
    nextLoading.add(groupId);
    set({ loadingMessages: nextLoading });

    try {
      const older = await groupsRepository.getGroupMessages(groupId, {
        limit: PAGE_SIZE,
        before: oldest.timestamp.toISOString(),
      });
      set({
        groupMessages: [...older, ...get().groupMessages],
        hasMoreMessages: { ...get().hasMoreMessages, [groupId]: older.length >= PAGE_SIZE },
      });
    } finally {
      const done = new Set(get().loadingMessages);
      done.delete(groupId);
      set({ loadingMessages: done });
    }
  },

  sendGroupMessage: (groupId, content, senderId) => {
    const messageId = `gmsg-${Date.now()}`;
    const newMessage: Message = {
      id: messageId,
      conversationId: groupId,
      senderId,
      content,
      timestamp: new Date(),
      type: 'text',
      isRead: true,
      sendStatus: 'sending',
    };

    set((state) => ({
      groupMessages: [...state.groupMessages, newMessage],
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, lastActivity: new Date() } : g,
      ),
    }));

    groupsRepository
      .sendGroupMessage(groupId, content, senderId)
      .then((savedMessage) => {
        set((state) => ({
          groupMessages: state.groupMessages.map((m) =>
            m.id === messageId ? { ...savedMessage, sendStatus: 'sent' as const } : m,
          ),
        }));
      })
      .catch(() => {
        set((state) => ({
          groupMessages: state.groupMessages.map((m) =>
            m.id === messageId ? { ...m, sendStatus: 'failed' as const } : m,
          ),
        }));
      });
  },

  retryGroupMessage: (messageId) => {
    const message = get().groupMessages.find((m) => m.id === messageId);
    if (!message || message.sendStatus !== 'failed') return;

    set((state) => ({
      groupMessages: state.groupMessages.map((m) =>
        m.id === messageId ? { ...m, sendStatus: 'sending' as const } : m,
      ),
    }));

    groupsRepository
      .sendGroupMessage(message.conversationId, message.content, message.senderId)
      .then((savedMessage) => {
        set((state) => ({
          groupMessages: state.groupMessages.map((m) =>
            m.id === messageId ? { ...savedMessage, sendStatus: 'sent' as const } : m,
          ),
        }));
      })
      .catch(() => {
        set((state) => ({
          groupMessages: state.groupMessages.map((m) =>
            m.id === messageId ? { ...m, sendStatus: 'failed' as const } : m,
          ),
        }));
      });
  },

  togglePin: (groupId) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, isPinned: !g.isPinned } : g,
      ),
    }));
    groupsRepository.togglePin(groupId).catch(() => {});
  },

  toggleMute: (groupId) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, isMuted: !g.isMuted } : g,
      ),
    }));
    groupsRepository.toggleMute(groupId).catch(() => {});
  },

  createGroup: async (input) => {
    const group = await groupsRepository.createGroup(input);
    set((state) => ({ groups: [group, ...state.groups] }));
    return group;
  },

  updateRSVP: (groupId, eventId, status) => {
    // Optimistic update — find the event and update current user's attendee status
    const currentUserId = (() => {
      // Inline import to avoid circular dep at module level
      const { useUserStore } = require('./useUserStore');
      return useUserStore.getState().currentUser?.id;
    })();
    if (!currentUserId) return;

    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          events: g.events?.map((e) => {
            if (e.id !== eventId) return e;
            const existingIdx = e.attendees.findIndex((a) => a.userId === currentUserId);
            const updatedAttendee = { userId: currentUserId, status, respondedAt: new Date() };
            const updatedAttendees =
              existingIdx >= 0
                ? e.attendees.map((a, i) => (i === existingIdx ? updatedAttendee : a))
                : [...e.attendees, updatedAttendee];
            return { ...e, attendees: updatedAttendees };
          }),
        };
      }),
    }));

    groupsRepository.updateRSVP(eventId, status).catch(() => {
      // Revert by re-fetching
      get().init();
    });
  },
}));
