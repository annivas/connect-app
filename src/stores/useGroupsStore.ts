import { create } from 'zustand';
import { Group, Message, RSVPStatus, Poll, PollOption } from '../types';
import { groupsRepository } from '../services';
import { supabase } from '../lib/supabase';
import { config } from '../config/env';
import { adaptMessage } from '../services/supabase/adapters';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CreateGroupInput, UpdateGroupInput } from '../services/types';

const PAGE_SIZE = 50;

interface GroupsState {
  groups: Group[];
  groupMessages: Message[];
  isLoading: boolean;
  error: string | null;

  // Pagination
  hasMoreMessages: Record<string, boolean>;
  loadingMessages: Set<string>;

  // Reply state (per group)
  replyingTo: Record<string, Message | null>;

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

  sendGroupMessage: (groupId: string, content: string, senderId: string, options?: { type?: import('../types').MessageType; metadata?: Record<string, unknown> }) => void;
  retryGroupMessage: (messageId: string) => void;
  deleteGroupMessage: (groupId: string, messageId: string) => void;
  toggleGroupReaction: (groupId: string, messageId: string, emoji: string) => void;
  setReplyTo: (groupId: string, message: Message | null) => void;
  editGroupMessage: (groupId: string, messageId: string, newContent: string) => void;
  togglePin: (groupId: string) => void;
  toggleMute: (groupId: string) => void;
  createGroup: (input: CreateGroupInput) => Promise<Group>;
  updateRSVP: (groupId: string, eventId: string, status: RSVPStatus) => void;
  addMembers: (groupId: string, memberIds: string[]) => void;
  removeMember: (groupId: string, memberId: string) => void;
  leaveGroup: (groupId: string) => void;
  updateGroup: (groupId: string, updates: UpdateGroupInput) => Promise<Group>;
  toggleAdmin: (groupId: string, memberId: string) => void;
  addItineraryItem: (groupId: string, item: import('../types').ItineraryItem) => void;
  editItineraryItem: (groupId: string, itemId: string, updates: Partial<import('../types').ItineraryItem>) => void;
  deleteItineraryItem: (groupId: string, itemId: string) => void;
  createEvent: (groupId: string, event: Omit<import('../types').GroupEvent, 'id' | 'groupId' | 'createdBy' | 'attendees'>) => void;

  // Event Spaces
  eventSpaceMessages: Record<string, Message[]>;
  getEventSpaceMessages: (eventId: string) => Message[];
  createEventSpace: (groupId: string, eventId: string) => void;
  sendEventSpaceMessage: (eventId: string, content: string, senderId: string) => void;

  // Polls
  groupPolls: Record<string, Poll[]>;
  createPoll: (groupId: string, question: string, options: string[], isMultipleChoice: boolean) => void;
  votePoll: (groupId: string, pollId: string, optionId: string) => void;
  closePoll: (groupId: string, pollId: string) => void;

  // Star / Pin / Forward for group messages
  toggleStarGroupMessage: (groupId: string, messageId: string) => void;
  togglePinGroupMessage: (groupId: string, messageId: string) => void;
  forwardGroupMessage: (sourceGroupId: string, messageId: string, targetConvIds: string[], senderId: string) => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  groupMessages: [],
  isLoading: false,
  error: null,
  hasMoreMessages: {},
  loadingMessages: new Set(),
  replyingTo: {},
  _channel: null,
  eventSpaceMessages: {},
  groupPolls: {},

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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: 'context_type=eq.group',
        },
        (payload) => {
          const updatedRow = payload.new as Record<string, unknown>;
          const updatedMessage = adaptMessage(updatedRow as any);
          const state = get();

          const localMsg = state.groupMessages.find((m) => m.id === updatedMessage.id);
          if (
            localMsg &&
            localMsg.content === updatedMessage.content &&
            JSON.stringify(localMsg.reactions) === JSON.stringify(updatedMessage.reactions)
          ) {
            return;
          }

          set((s) => ({
            groupMessages: s.groupMessages.map((m) =>
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
          filter: 'context_type=eq.group',
        },
        (payload) => {
          const deletedId = (payload.old as Record<string, unknown>).id as string;
          const state = get();

          if (!state.groupMessages.some((m) => m.id === deletedId)) return;

          set((s) => ({
            groupMessages: s.groupMessages.filter((m) => m.id !== deletedId),
          }));
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
      set((state) => ({
        groupMessages: [...older, ...state.groupMessages],
        hasMoreMessages: { ...state.hasMoreMessages, [groupId]: older.length >= PAGE_SIZE },
      }));
    } finally {
      const done = new Set(get().loadingMessages);
      done.delete(groupId);
      set({ loadingMessages: done });
    }
  },

  sendGroupMessage: (groupId, content, senderId, options) => {
    const messageId = `gmsg-${Date.now()}`;
    const state = get();

    // Attach reply data if replying to a message
    const replyingMsg = state.replyingTo[groupId];
    let metadata = options?.metadata;
    let replyTo: Message['replyTo'] | undefined;
    if (replyingMsg) {
      const { useUserStore } = require('./useUserStore');
      const senderUser = useUserStore.getState().getUserById(replyingMsg.senderId);
      replyTo = {
        messageId: replyingMsg.id,
        content: replyingMsg.content,
        senderName: senderUser?.name ?? 'Unknown',
      };
      metadata = { ...metadata, replyTo };
    }

    const newMessage: Message = {
      id: messageId,
      conversationId: groupId,
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
      groupMessages: [...s.groupMessages, newMessage],
      groups: s.groups.map((g) =>
        g.id === groupId ? { ...g, lastActivity: new Date() } : g,
      ),
      // Clear reply state after sending
      replyingTo: { ...s.replyingTo, [groupId]: null },
    }));

    const sendOptions = metadata ? { ...options, metadata } : options;
    groupsRepository
      .sendGroupMessage(groupId, content, senderId, sendOptions)
      .then((savedMessage) => {
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            m.id === messageId ? { ...savedMessage, sendStatus: 'sent' as const } : m,
          ),
        }));
      })
      .catch(() => {
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
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

  deleteGroupMessage: (groupId, messageId) => {
    const deletedMsg = get().groupMessages.find((m) => m.id === messageId);
    if (!deletedMsg) return;

    // Optimistic removal
    set((s) => ({
      groupMessages: s.groupMessages.filter((m) => m.id !== messageId),
    }));

    groupsRepository.deleteGroupMessage(messageId).catch(() => {
      // Revert on failure
      set((s) => ({
        groupMessages: [...s.groupMessages, deletedMsg].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        ),
      }));
    });
  },

  toggleGroupReaction: (groupId, messageId, emoji) => {
    const { useUserStore } = require('./useUserStore');
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;

    // Optimistic update
    set((state) => ({
      groupMessages: state.groupMessages.map((m) => {
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

    groupsRepository.toggleGroupReaction(messageId, emoji).catch(() => {
      // Revert by toggling back
      set((state) => ({
        groupMessages: state.groupMessages.map((m) => {
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

  setReplyTo: (groupId, message) => {
    set((state) => ({
      replyingTo: { ...state.replyingTo, [groupId]: message },
    }));
  },

  editGroupMessage: (groupId, messageId, newContent) => {
    const original = get().groupMessages.find((m) => m.id === messageId);
    if (!original) return;

    // Optimistic update
    set((state) => ({
      groupMessages: state.groupMessages.map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, isEdited: true }
          : m,
      ),
    }));

    groupsRepository.editGroupMessage(messageId, newContent).catch(() => {
      // Revert on failure
      set((state) => ({
        groupMessages: state.groupMessages.map((m) =>
          m.id === messageId ? original : m,
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

  addMembers: (groupId, memberIds) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return;
    const originalMembers = [...group.members];

    // Optimistic: append new members (dedup)
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? { ...g, members: [...g.members, ...memberIds.filter((id) => !g.members.includes(id))] }
          : g,
      ),
    }));

    groupsRepository.addMembers(groupId, memberIds).catch(() => {
      // Revert on failure
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, members: originalMembers } : g,
        ),
      }));
    });
  },

  removeMember: (groupId, memberId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return;
    const originalMembers = [...group.members];
    const originalAdmins = [...group.admins];

    // Optimistic: filter member from members + admins
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: g.members.filter((id) => id !== memberId),
              admins: g.admins.filter((id) => id !== memberId),
            }
          : g,
      ),
    }));

    groupsRepository.removeMember(groupId, memberId).catch(() => {
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, members: originalMembers, admins: originalAdmins } : g,
        ),
      }));
    });
  },

  leaveGroup: (groupId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return;
    const originalGroups = [...get().groups];

    // Optimistic: remove group from list (user won't see it after leaving)
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    }));

    groupsRepository.leaveGroup(groupId).catch(() => {
      // Revert on failure
      set({ groups: originalGroups });
    });
  },

  updateGroup: async (groupId, updates) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) throw new Error('Group not found');
    const original = { ...group };

    // Optimistic: apply updates
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, ...updates } : g,
      ),
    }));

    try {
      const updated = await groupsRepository.updateGroup(groupId, updates);
      set((state) => ({
        groups: state.groups.map((g) => (g.id === groupId ? { ...g, ...updated } : g)),
      }));
      return updated;
    } catch (err) {
      // Revert on failure
      set((state) => ({
        groups: state.groups.map((g) => (g.id === groupId ? original : g)),
      }));
      throw err;
    }
  },

  toggleAdmin: (groupId, memberId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return;
    const originalAdmins = [...group.admins];

    const isAdmin = group.admins.includes(memberId);
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              admins: isAdmin
                ? g.admins.filter((id) => id !== memberId)
                : [...g.admins, memberId],
            }
          : g,
      ),
    }));

    groupsRepository.toggleAdmin(groupId, memberId).catch(() => {
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, admins: originalAdmins } : g,
        ),
      }));
    });
  },

  addItineraryItem: (groupId, item) => {
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId || !g.trip) return g;
        const itinerary = [...g.trip.itinerary, item].sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day;
          return (a.time ?? '').localeCompare(b.time ?? '');
        });
        return { ...g, trip: { ...g.trip, itinerary } };
      }),
    }));
  },

  editItineraryItem: (groupId, itemId, updates) => {
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId || !g.trip) return g;
        const itinerary = g.trip.itinerary
          .map((i) => (i.id === itemId ? { ...i, ...updates } : i))
          .sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return (a.time ?? '').localeCompare(b.time ?? '');
          });
        return { ...g, trip: { ...g.trip, itinerary } };
      }),
    }));
  },

  deleteItineraryItem: (groupId, itemId) => {
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId || !g.trip) return g;
        return {
          ...g,
          trip: {
            ...g.trip,
            itinerary: g.trip.itinerary.filter((i) => i.id !== itemId),
          },
        };
      }),
    }));
  },

  createEvent: (groupId, eventData) => {
    const userId = get().groups.find((g) => g.id === groupId)?.members[0] ?? '';
    const newEvent = {
      ...eventData,
      id: `evt_${Date.now()}`,
      groupId,
      createdBy: userId,
      attendees: [{ userId, status: 'going' as const, respondedAt: new Date() }],
    };
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, events: [...(g.events ?? []), newEvent] };
      }),
    }));
  },

  // ─── Event Spaces ──────────────────────────────

  getEventSpaceMessages: (eventId) => {
    return get().eventSpaceMessages[eventId] ?? [];
  },

  createEventSpace: (groupId, eventId) => {
    const spaceId = `es_${Date.now()}`;
    // Tag the event with its space ID
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          events: (g.events ?? []).map((e) =>
            e.id === eventId ? { ...e, eventSpaceId: spaceId } : e,
          ),
        };
      }),
      // Initialise the message list for the space
      eventSpaceMessages: {
        ...state.eventSpaceMessages,
        [eventId]: state.eventSpaceMessages[eventId] ?? [],
      },
    }));
  },

  sendEventSpaceMessage: (eventId, content, senderId) => {
    const newMessage: Message = {
      id: `esm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: eventId,
      senderId,
      content,
      timestamp: new Date(),
      type: 'text',
      isRead: false,
      sendStatus: 'sent',
    };
    set((state) => ({
      eventSpaceMessages: {
        ...state.eventSpaceMessages,
        [eventId]: [...(state.eventSpaceMessages[eventId] ?? []), newMessage],
      },
    }));
  },

  // ─── Polls ──────────────────────────────────────

  createPoll: (groupId, question, options, isMultipleChoice) => {
    const { useUserStore } = require('./useUserStore');
    const currentUserId = useUserStore.getState().currentUser?.id ?? 'unknown';

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
      groupPolls: {
        ...state.groupPolls,
        [groupId]: [...(state.groupPolls[groupId] ?? []), newPoll],
      },
    }));
  },

  votePoll: (groupId, pollId, optionId) => {
    const { useUserStore } = require('./useUserStore');
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;

    set((state) => ({
      groupPolls: {
        ...state.groupPolls,
        [groupId]: (state.groupPolls[groupId] ?? []).map((poll) => {
          if (poll.id !== pollId || poll.isClosed) return poll;
          return {
            ...poll,
            options: poll.options.map((opt) => {
              if (opt.id === optionId) {
                // Toggle vote
                const hasVoted = opt.voterIds.includes(userId);
                return {
                  ...opt,
                  voterIds: hasVoted
                    ? opt.voterIds.filter((id) => id !== userId)
                    : [...opt.voterIds, userId],
                };
              }
              // If not multiple choice, remove vote from other options
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
      },
    }));
  },

  closePoll: (groupId, pollId) => {
    set((state) => ({
      groupPolls: {
        ...state.groupPolls,
        [groupId]: (state.groupPolls[groupId] ?? []).map((poll) =>
          poll.id === pollId ? { ...poll, isClosed: true } : poll,
        ),
      },
    }));
  },

  // ─── Star / Pin / Forward for group messages ────

  toggleStarGroupMessage: (groupId, messageId) => {
    set((state) => ({
      groupMessages: state.groupMessages.map((m) =>
        m.id === messageId ? { ...m, isStarred: !m.isStarred } : m,
      ),
    }));
  },

  togglePinGroupMessage: (groupId, messageId) => {
    set((state) => ({
      groupMessages: state.groupMessages.map((m) =>
        m.id === messageId ? { ...m, isPinned: !m.isPinned } : m,
      ),
    }));
  },

  forwardGroupMessage: (sourceGroupId, messageId, targetConvIds, senderId) => {
    const message = get().groupMessages.find((m) => m.id === messageId);
    if (!message) return;

    const { useUserStore } = require('./useUserStore');
    const senderUser = useUserStore.getState().getUserById(message.senderId);

    // Forward to conversation targets via the messages store
    const { useMessagesStore } = require('./useMessagesStore');
    for (const targetConvId of targetConvIds) {
      const forwardedMessage: Message = {
        id: `msg-fwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        conversationId: targetConvId,
        senderId,
        content: message.content,
        timestamp: new Date(),
        type: message.type,
        metadata: message.metadata,
        isRead: true,
        sendStatus: 'sent',
        forwardedFrom: {
          originalMessageId: message.id,
          originalSenderId: message.senderId,
          originalSenderName: senderUser?.name ?? 'Unknown',
          originalConversationId: sourceGroupId,
          originalTimestamp: message.timestamp,
        },
      };

      useMessagesStore.setState((state: any) => ({
        messages: [...state.messages, forwardedMessage],
        conversations: state.conversations.map((c: any) =>
          c.id === targetConvId
            ? { ...c, lastMessage: forwardedMessage, updatedAt: new Date() }
            : c,
        ),
      }));
    }
  },
}));
