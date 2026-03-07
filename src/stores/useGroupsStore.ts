import { create } from 'zustand';
import { Group, Message, RSVPStatus, Poll, PollOption, Note, Reminder, LedgerEntry, SharedObject, DisappearingDuration, ScheduledMessage, GroupPairBalance, Channel, ConversationMetadata, GroupMetadata } from '../types';
import { groupsRepository } from '../services';
import { supabase } from '../lib/supabase';
import { config } from '../config/env';
import { adaptMessage, adaptPoll, PollRow } from '../services/supabase/adapters';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CreateGroupInput, UpdateGroupInput } from '../services/types';
import { getCurrentUserId, getUserById, getMessagesStoreRef } from './helpers';

const PAGE_SIZE = 50;

// Helper to update metadata on either group-level or channel-level
const updateGroupMetadata = (
  groups: Group[],
  groupId: string,
  channelId: string | null | undefined,
  updater: (metadata: GroupMetadata) => GroupMetadata,
): Group[] => {
  return groups.map((g) => {
    if (g.id !== groupId) return g;
    if (channelId && g.channels) {
      return {
        ...g,
        channels: g.channels.map((ch) =>
          ch.id === channelId ? { ...ch, metadata: updater(ch.metadata as unknown as GroupMetadata) as unknown as ConversationMetadata } : ch,
        ),
      };
    }
    if (!g.metadata) return g;
    return { ...g, metadata: updater(g.metadata) };
  });
};

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
  // Channels
  activeChannel: Record<string, string | null>;
  createChannel: (groupId: string, name: string, emoji?: string, color?: string) => void;
  deleteChannel: (groupId: string, channelId: string) => void;
  updateChannel: (groupId: string, channelId: string, updates: Partial<Pick<Channel, 'name' | 'emoji' | 'color'>>) => void;
  setActiveChannel: (groupId: string, channelId: string | null) => void;
  getActiveChannel: (groupId: string) => string | null;

  getGroupById: (id: string) => Group | undefined;
  getGroupMessages: (groupId: string, isPrivate?: boolean, channelId?: string | null) => Message[];

  // Pagination
  loadGroupMessages: (groupId: string) => Promise<void>;
  loadMoreGroupMessages: (groupId: string) => Promise<void>;

  sendGroupMessage: (groupId: string, content: string, senderId: string, options?: { type?: import('../types').MessageType; metadata?: Record<string, unknown>; isPrivate?: boolean; channelId?: string | null }) => void;
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
  createTrip: (groupId: string, trip: Omit<import('../types').Trip, 'id' | 'groupId' | 'itinerary' | 'participants'>) => void;
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

  // ─── NEW: Feature parity with 1-on-1 chats ──────

  // Typing indicators (per group -> user IDs typing)
  typingUsers: Record<string, string[]>;

  // Scheduled messages
  scheduledMessages: ScheduledMessage[];
  scheduleGroupMessage: (groupId: string, content: string, scheduledFor: Date) => void;
  cancelGroupScheduledMessage: (messageId: string) => void;

  // Notes CRUD
  createGroupNote: (groupId: string, note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>, channelId?: string | null) => void;
  updateGroupNote: (groupId: string, noteId: string, input: import('../services/types').UpdateNoteInput, channelId?: string | null) => void;
  deleteGroupNote: (groupId: string, noteId: string, channelId?: string | null) => void;
  toggleGroupNotePin: (groupId: string, noteId: string, channelId?: string | null) => void;

  // Reminders CRUD
  createGroupReminder: (groupId: string, reminder: Omit<Reminder, 'id' | 'createdAt'>, channelId?: string | null) => void;
  toggleGroupReminderComplete: (groupId: string, reminderId: string, channelId?: string | null) => void;
  deleteGroupReminder: (groupId: string, reminderId: string, channelId?: string | null) => void;

  // Ledger CRUD
  createGroupLedgerEntry: (groupId: string, entry: Omit<LedgerEntry, 'id'>, channelId?: string | null) => void;
  settleGroupLedgerEntry: (groupId: string, entryId: string, channelId?: string | null) => void;
  deleteGroupLedgerEntry: (groupId: string, entryId: string, channelId?: string | null) => void;
  getGroupPairBalances: (groupId: string, channelId?: string | null) => GroupPairBalance[];

  // Shared objects
  addGroupSharedObject: (groupId: string, obj: Omit<SharedObject, 'id' | 'sharedAt'>, channelId?: string | null) => void;
  deleteGroupSharedObject: (groupId: string, objectId: string, channelId?: string | null) => void;

  // List operations
  toggleGroupArchive: (groupId: string) => void;
  markGroupAsUnread: (groupId: string) => void;
  markGroupAsRead: (groupId: string) => void;

  // Disappearing messages
  setGroupDisappearingDuration: (groupId: string, duration: DisappearingDuration) => void;
  reset: () => void;
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
  activeChannel: {},
  eventSpaceMessages: {},
  groupPolls: {},
  typingUsers: {},
  scheduledMessages: [],

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await groupsRepository.getGroups();

      // Load polls for each group in parallel
      const pollsMap: Record<string, Poll[]> = {};
      await Promise.all(
        groups.map(async (g) => {
          try {
            const polls = await groupsRepository.getPolls(g.id);
            if (polls.length > 0) pollsMap[g.id] = polls;
          } catch {
            // Polls table may not exist yet — gracefully skip
          }
        }),
      );

      set({ groups, groupPolls: pollsMap, isLoading: false });

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
      // ─── Polls realtime (INSERT + UPDATE) ─────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'polls' },
        (payload) => {
          const row = payload.new as unknown as PollRow;
          const poll = adaptPoll(row);
          const groupId = row.group_id;

          // Skip if we already have this poll (optimistic)
          const existing = get().groupPolls[groupId] ?? [];
          if (existing.some((p) => p.id === poll.id)) return;

          set((s) => ({
            groupPolls: {
              ...s.groupPolls,
              [groupId]: [...(s.groupPolls[groupId] ?? []), poll],
            },
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'polls' },
        (payload) => {
          const row = payload.new as unknown as PollRow;
          const poll = adaptPoll(row);
          const groupId = row.group_id;

          set((s) => ({
            groupPolls: {
              ...s.groupPolls,
              [groupId]: (s.groupPolls[groupId] ?? []).map((p) =>
                p.id === poll.id ? poll : p,
              ),
            },
          }));
        }
      )
      // ─── Group members realtime (INSERT + DELETE) ──
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_members' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const groupId = row.group_id as string;
          const userId = row.user_id as string;
          const role = row.role as string;

          set((s) => ({
            groups: s.groups.map((g) => {
              if (g.id !== groupId) return g;
              if (g.members.includes(userId)) return g;
              return {
                ...g,
                members: [...g.members, userId],
                admins: role === 'admin' ? [...g.admins, userId] : g.admins,
              };
            }),
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'group_members' },
        (payload) => {
          const row = payload.old as Record<string, unknown>;
          const groupId = row.group_id as string;
          const userId = row.user_id as string;

          set((s) => ({
            groups: s.groups.map((g) => {
              if (g.id !== groupId) return g;
              return {
                ...g,
                members: g.members.filter((id) => id !== userId),
                admins: g.admins.filter((id) => id !== userId),
              };
            }),
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

  createChannel: (groupId, name, emoji, color = '#D4764E') => {
    const newChannel: Channel = {
      id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? { ...g, channels: [...(g.channels || []), newChannel] }
          : g,
      ),
    }));
  },

  deleteChannel: (groupId, channelId) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? { ...g, channels: (g.channels || []).filter((ch) => ch.id !== channelId) }
          : g,
      ),
      // Remove all messages belonging to this channel
      groupMessages: state.groupMessages.filter(
        (m) => !(m.conversationId === groupId && m.channelId === channelId),
      ),
      // Reset active channel if it was the deleted one
      activeChannel: state.activeChannel[groupId] === channelId
        ? { ...state.activeChannel, [groupId]: null }
        : state.activeChannel,
    }));
  },

  updateChannel: (groupId, channelId, updates) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              channels: (g.channels || []).map((ch) =>
                ch.id === channelId ? { ...ch, ...updates } : ch,
              ),
            }
          : g,
      ),
    }));
  },

  setActiveChannel: (groupId, channelId) => {
    set((state) => ({
      activeChannel: { ...state.activeChannel, [groupId]: channelId },
    }));
  },

  getActiveChannel: (groupId) => {
    return get().activeChannel[groupId] ?? null;
  },

  getGroupMessages: (groupId, isPrivate = false, channelId) =>
    get().groupMessages.filter(
      (m) => m.conversationId === groupId &&
        (isPrivate ? m.isPrivate === true : !m.isPrivate) &&
        (channelId ? m.channelId === channelId : !m.channelId)
    ),

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
      conversationId: groupId,
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
        // Preserve channelId/isPrivate from optimistic message if not in saved
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            m.id === messageId
              ? { ...savedMessage, sendStatus: 'sent' as const, channelId: savedMessage.channelId ?? m.channelId, isPrivate: savedMessage.isPrivate ?? m.isPrivate }
              : m,
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
    const userId = getCurrentUserId();
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
    const currentUserId = getCurrentUserId();
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

  createTrip: (groupId, tripInput) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return;

    const newTrip = {
      ...tripInput,
      id: `trip-${Date.now()}`,
      groupId,
      itinerary: [],
      participants: group.members,
    };

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, trip: newTrip } : g,
      ),
    }));

    groupsRepository.createTrip(groupId, tripInput).catch(() => {
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, trip: undefined } : g,
        ),
      }));
    });
  },

  addItineraryItem: (groupId, item) => {
    const group = get().groups.find((g) => g.id === groupId);
    const tripId = group?.trip?.id;

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

    if (tripId) {
      groupsRepository.addItineraryItem(tripId, item).catch(() => {
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId || !g.trip) return g;
            return { ...g, trip: { ...g.trip, itinerary: g.trip.itinerary.filter((i) => i.id !== item.id) } };
          }),
        }));
      });
    }
  },

  editItineraryItem: (groupId, itemId, updates) => {
    const group = get().groups.find((g) => g.id === groupId);
    const originalItem = group?.trip?.itinerary.find((i) => i.id === itemId);

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

    groupsRepository.editItineraryItem(itemId, updates).catch(() => {
      if (!originalItem) return;
      set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId || !g.trip) return g;
          return { ...g, trip: { ...g.trip, itinerary: g.trip.itinerary.map((i) => i.id === itemId ? originalItem : i) } };
        }),
      }));
    });
  },

  deleteItineraryItem: (groupId, itemId) => {
    const group = get().groups.find((g) => g.id === groupId);
    const originalItem = group?.trip?.itinerary.find((i) => i.id === itemId);

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

    groupsRepository.deleteItineraryItem(itemId).catch(() => {
      if (!originalItem) return;
      set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId || !g.trip) return g;
          return { ...g, trip: { ...g.trip, itinerary: [...g.trip.itinerary, originalItem] } };
        }),
      }));
    });
  },

  createEvent: (groupId, eventData) => {
    const userId = getCurrentUserId() || (get().groups.find((g) => g.id === groupId)?.members[0] ?? '');
    const optimisticId = `evt_${Date.now()}`;
    const newEvent = {
      ...eventData,
      id: optimisticId,
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

    groupsRepository.createEvent(groupId, eventData).then((saved) => {
      set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, events: (g.events ?? []).map((e) => e.id === optimisticId ? saved : e) };
        }),
      }));
    }).catch(() => {
      set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, events: (g.events ?? []).filter((e) => e.id !== optimisticId) };
        }),
      }));
    });
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
    const currentUserId = getCurrentUserId() || 'unknown';
    const optimisticId = `poll-${Date.now()}`;

    const newPoll: Poll = {
      id: optimisticId,
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

    groupsRepository.createPoll(groupId, question, options, isMultipleChoice).then((saved) => {
      set((state) => {
        const current = state.groupPolls[groupId] ?? [];
        const hasRealtimeCopy = current.some((p) => p.id === saved.id);
        // If realtime already inserted the saved poll, just remove the optimistic entry;
        // otherwise replace the optimistic entry with the saved one.
        const updated = hasRealtimeCopy
          ? current.filter((p) => p.id !== optimisticId)
          : current.map((p) => p.id === optimisticId ? saved : p);
        return { groupPolls: { ...state.groupPolls, [groupId]: updated } };
      });
    }).catch(() => {
      set((state) => ({
        groupPolls: {
          ...state.groupPolls,
          [groupId]: (state.groupPolls[groupId] ?? []).filter((p) => p.id !== optimisticId),
        },
      }));
    });
  },

  votePoll: (groupId, pollId, optionId) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const prevPolls = get().groupPolls[groupId] ?? [];

    set((state) => ({
      groupPolls: {
        ...state.groupPolls,
        [groupId]: (state.groupPolls[groupId] ?? []).map((poll) => {
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

    groupsRepository.votePoll(pollId, optionId).catch(() => {
      set((state) => ({
        groupPolls: { ...state.groupPolls, [groupId]: prevPolls },
      }));
    });
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

    groupsRepository.closePoll(pollId).catch(() => {
      set((state) => ({
        groupPolls: {
          ...state.groupPolls,
          [groupId]: (state.groupPolls[groupId] ?? []).map((poll) =>
            poll.id === pollId ? { ...poll, isClosed: false } : poll,
          ),
        },
      }));
    });
  },

  // ─── Star / Pin / Forward for group messages ────

  toggleStarGroupMessage: (groupId, messageId) => {
    const msg = get().groupMessages.find((m) => m.id === messageId);
    const willStar = !msg?.isStarred;
    set((state) => ({
      groupMessages: state.groupMessages.map((m) =>
        m.id === messageId ? { ...m, isStarred: willStar } : m,
      ),
      groups: state.groups.map((g) => {
        if (g.id !== groupId || !g.metadata) return g;
        const starred = g.metadata.starredMessages ?? [];
        return {
          ...g,
          metadata: {
            ...g.metadata,
            starredMessages: willStar
              ? [...starred, messageId]
              : starred.filter((id) => id !== messageId),
          },
        };
      }),
    }));

    groupsRepository.toggleStarGroupMessage(messageId, willStar).catch(() => {
      set((state) => ({
        groupMessages: state.groupMessages.map((m) =>
          m.id === messageId ? { ...m, isStarred: !willStar } : m,
        ),
      }));
    });
  },

  togglePinGroupMessage: (groupId, messageId) => {
    const msg = get().groupMessages.find((m) => m.id === messageId);
    const willPin = !msg?.isPinned;
    set((state) => ({
      groupMessages: state.groupMessages.map((m) =>
        m.id === messageId ? { ...m, isPinned: willPin } : m,
      ),
      groups: state.groups.map((g) => {
        if (g.id !== groupId || !g.metadata) return g;
        const pinned = g.metadata.pinnedMessages ?? [];
        return {
          ...g,
          metadata: {
            ...g.metadata,
            pinnedMessages: willPin
              ? [...pinned, messageId]
              : pinned.filter((id) => id !== messageId),
          },
        };
      }),
    }));

    groupsRepository.togglePinGroupMessage(messageId, willPin).catch(() => {
      set((state) => ({
        groupMessages: state.groupMessages.map((m) =>
          m.id === messageId ? { ...m, isPinned: !willPin } : m,
        ),
      }));
    });
  },

  forwardGroupMessage: (sourceGroupId, messageId, targetConvIds, senderId) => {
    const message = get().groupMessages.find((m) => m.id === messageId);
    if (!message) return;

    const senderUser = getUserById(message.senderId);

    // Forward to conversation targets via the messages store
    const messagesStore = getMessagesStoreRef();
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

      messagesStore.setState((state: any) => ({
        messages: [...state.messages, forwardedMessage],
        conversations: state.conversations.map((c: any) =>
          c.id === targetConvId
            ? { ...c, lastMessage: forwardedMessage, updatedAt: new Date() }
            : c,
        ),
      }));
    }
  },

  // ─── NEW: Feature parity actions ──────────────────

  // Scheduled messages
  scheduleGroupMessage: (groupId, content, scheduledFor) => {
    const currentUserId = getCurrentUserId() || 'unknown';
    const scheduled: ScheduledMessage = {
      id: `gsched-${Date.now()}`,
      conversationId: groupId,
      groupId,
      content,
      scheduledFor,
      createdAt: new Date(),
      status: 'pending',
    };
    set((state) => ({
      scheduledMessages: [...state.scheduledMessages, scheduled],
    }));
  },

  cancelGroupScheduledMessage: (messageId) => {
    set((state) => ({
      scheduledMessages: state.scheduledMessages.map((m) =>
        m.id === messageId ? { ...m, status: 'cancelled' as const } : m,
      ),
    }));
  },

  // Notes
  createGroupNote: (groupId, noteData, channelId) => {
    const optimisticId = `gnote-${Date.now()}`;
    const newNote: Note = {
      ...noteData,
      id: optimisticId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        notes: [...metadata.notes, newNote],
      })),
    }));

    groupsRepository.createNote(groupId, {
      title: noteData.title, content: noteData.content,
      color: noteData.color, isPrivate: noteData.isPrivate,
    }).then((saved) => {
      set((state) => ({
        groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
          ...metadata,
          notes: metadata.notes.map((n) => n.id === optimisticId ? saved : n),
        })),
      }));
    }).catch(() => {
      set((state) => ({
        groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
          ...metadata,
          notes: metadata.notes.filter((n) => n.id !== optimisticId),
        })),
      }));
    });
  },

  deleteGroupNote: (groupId, noteId, channelId) => {
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        notes: metadata.notes.filter((n) => n.id !== noteId),
      })),
    }));

    groupsRepository.deleteNote(noteId).catch(() => {});
  },

  updateGroupNote: (groupId, noteId, input, channelId) => {
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        notes: metadata.notes.map((n) =>
          n.id === noteId ? { ...n, ...input, updatedAt: new Date() } : n,
        ),
      })),
    }));
    groupsRepository.updateNote(groupId, noteId, input).catch(() => {});
  },

  toggleGroupNotePin: (groupId, noteId, channelId) => {
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        notes: metadata.notes.map((n) =>
          n.id === noteId ? { ...n, isPinned: !n.isPinned } : n,
        ),
      })),
    }));
    groupsRepository.toggleNotePin(groupId, noteId).catch(() => {});
  },

  // Reminders
  createGroupReminder: (groupId, reminderData, channelId) => {
    const optimisticId = `grem-${Date.now()}`;
    const newReminder: Reminder = {
      ...reminderData,
      id: optimisticId,
      createdAt: new Date(),
    };
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        reminders: [...metadata.reminders, newReminder],
      })),
    }));

    groupsRepository.createReminder(groupId, {
      title: reminderData.title,
      description: reminderData.description,
      dueDate: reminderData.dueDate.toISOString(),
      priority: reminderData.priority,
    }).then((saved) => {
      set((state) => ({
        groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
          ...metadata,
          reminders: metadata.reminders.map((r) => r.id === optimisticId ? saved : r),
        })),
      }));
    }).catch(() => {
      set((state) => ({
        groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
          ...metadata,
          reminders: metadata.reminders.filter((r) => r.id !== optimisticId),
        })),
      }));
    });
  },

  toggleGroupReminderComplete: (groupId, reminderId, channelId) => {
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        reminders: metadata.reminders.map((r) =>
          r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r,
        ),
      })),
    }));

    groupsRepository.toggleReminderComplete(reminderId).catch(() => {});
  },

  deleteGroupReminder: (groupId, reminderId, channelId) => {
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        reminders: metadata.reminders.filter((r) => r.id !== reminderId),
      })),
    }));
  },

  // Ledger
  createGroupLedgerEntry: (groupId, entryData, channelId) => {
    const optimisticId = `gled-${Date.now()}`;
    const newEntry: LedgerEntry = {
      ...entryData,
      id: optimisticId,
    };
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        ledgerEntries: [...metadata.ledgerEntries, newEntry],
      })),
    }));

    groupsRepository.createLedgerEntry(groupId, {
      description: entryData.description,
      amount: entryData.amount,
      paidBy: entryData.paidBy,
      splitBetween: entryData.splitBetween,
      category: entryData.category,
    }).then((saved) => {
      set((state) => ({
        groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
          ...metadata,
          ledgerEntries: metadata.ledgerEntries.map((e) => e.id === optimisticId ? saved : e),
        })),
      }));
    }).catch(() => {
      set((state) => ({
        groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
          ...metadata,
          ledgerEntries: metadata.ledgerEntries.filter((e) => e.id !== optimisticId),
        })),
      }));
    });
  },

  settleGroupLedgerEntry: (groupId, entryId, channelId) => {
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        ledgerEntries: metadata.ledgerEntries.map((e) =>
          e.id === entryId ? { ...e, isSettled: true } : e,
        ),
      })),
    }));

    groupsRepository.settleLedgerEntry(entryId).catch(() => {
      set((state) => ({
        groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
          ...metadata,
          ledgerEntries: metadata.ledgerEntries.map((e) =>
            e.id === entryId ? { ...e, isSettled: false } : e,
          ),
        })),
      }));
    });
  },

  deleteGroupLedgerEntry: (groupId, entryId, channelId) => {
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        ledgerEntries: metadata.ledgerEntries.filter((e) => e.id !== entryId),
      })),
    }));
  },

  getGroupPairBalances: (groupId, channelId) => {
    const group = get().groups.find((g) => g.id === groupId);
    let entries: LedgerEntry[] = [];
    if (channelId && group?.channels) {
      const channel = group.channels.find((ch) => ch.id === channelId);
      entries = (channel?.metadata as unknown as GroupMetadata)?.ledgerEntries ?? [];
    } else {
      entries = group?.metadata?.ledgerEntries ?? [];
    }
    const unsettled = entries.filter((e) => !e.isSettled);

    // Build net balance map: key = "userId1|userId2" (sorted), value = amount userId1 is owed
    const balanceMap: Record<string, number> = {};

    for (const entry of unsettled) {
      const perPerson = entry.amount / entry.splitBetween.length;
      for (const memberId of entry.splitBetween) {
        if (memberId === entry.paidBy) continue;
        // memberId owes paidBy
        const key = [entry.paidBy, memberId].sort().join('|');
        const sign = entry.paidBy < memberId ? 1 : -1;
        balanceMap[key] = (balanceMap[key] ?? 0) + perPerson * sign;
      }
    }

    return Object.entries(balanceMap)
      .filter(([, amount]) => Math.abs(amount) > 0.01)
      .map(([key, amount]) => {
        const [userId1, userId2] = key.split('|');
        return { userId1, userId2, amount };
      });
  },

  // Shared objects
  addGroupSharedObject: (groupId, objData, channelId) => {
    const optimisticId = `gso-${Date.now()}`;
    const newObj: SharedObject = {
      ...objData,
      id: optimisticId,
      sharedAt: new Date(),
    };
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        sharedObjects: [...metadata.sharedObjects, newObj],
      })),
    }));

    groupsRepository.addSharedObject(groupId, {
      type: objData.type, title: objData.title,
      description: objData.description, url: objData.url,
    }).then((saved) => {
      set((state) => ({
        groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
          ...metadata,
          sharedObjects: metadata.sharedObjects.map((o) => o.id === optimisticId ? saved : o),
        })),
      }));
    }).catch(() => {
      set((state) => ({
        groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
          ...metadata,
          sharedObjects: metadata.sharedObjects.filter((o) => o.id !== optimisticId),
        })),
      }));
    });
  },

  deleteGroupSharedObject: (groupId, objectId, channelId) => {
    set((state) => ({
      groups: updateGroupMetadata(state.groups, groupId, channelId, (metadata) => ({
        ...metadata,
        sharedObjects: metadata.sharedObjects.filter((o) => o.id !== objectId),
      })),
    }));
  },

  // Archive / Unread
  toggleGroupArchive: (groupId) => {
    const wasArchived = get().groups.find((g) => g.id === groupId)?.isArchived ?? false;

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, isArchived: !g.isArchived } : g,
      ),
    }));

    groupsRepository.toggleArchive(groupId).catch(() => {
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, isArchived: wasArchived } : g,
        ),
      }));
    });
  },

  markGroupAsUnread: (groupId) => {
    const prevCount = get().groups.find((g) => g.id === groupId)?.unreadCount ?? 0;

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, isMarkedUnread: true, unreadCount: Math.max(g.unreadCount, 1) } : g,
      ),
    }));

    groupsRepository.markAsUnread(groupId).catch(() => {
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, isMarkedUnread: false, unreadCount: prevCount } : g,
        ),
      }));
    });
  },

  markGroupAsRead: (groupId) => {
    const prevCount = get().groups.find((g) => g.id === groupId)?.unreadCount ?? 0;

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, isMarkedUnread: false, unreadCount: 0 } : g,
      ),
    }));

    groupsRepository.markAsRead(groupId).catch(() => {
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, isMarkedUnread: true, unreadCount: prevCount } : g,
        ),
      }));
    });
  },

  // Disappearing messages
  setGroupDisappearingDuration: (groupId, duration) => {
    const prevDuration = get().groups.find((g) => g.id === groupId)?.disappearingDuration;

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, disappearingDuration: duration } : g,
      ),
    }));

    groupsRepository.setDisappearingDuration(groupId, duration).catch(() => {
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, disappearingDuration: prevDuration } : g,
        ),
      }));
    });
  },

  reset: () => {
    get().unsubscribe();
    set({
      groups: [],
      groupMessages: [],
      isLoading: false,
      error: null,
      hasMoreMessages: {},
      loadingMessages: new Set(),
      replyingTo: {},
      _channel: null,
      activeChannel: {},
      eventSpaceMessages: {},
      groupPolls: {},
      typingUsers: {},
      scheduledMessages: [],
    });
  },
}));
