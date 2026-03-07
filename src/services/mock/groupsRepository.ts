import { Message, Group, RSVPStatus, Note, Reminder, LedgerEntry, SharedObject, SharedObjectType, Poll, DisappearingDuration, ItineraryItem, GroupEvent } from '../../types';
import { MOCK_GROUPS } from '../../mocks/groups';
import { MOCK_GROUP_MESSAGES } from '../../mocks/messages';
import { MOCK_POLLS } from '../../mocks/polls';
import { IGroupsRepository, PaginationParams, CreateGroupInput, UpdateGroupInput, CreateNoteInput, UpdateNoteInput, CreateReminderInput, CreateLedgerEntryInput } from '../types';

let groups = [...MOCK_GROUPS];
let groupMessages = [...MOCK_GROUP_MESSAGES];

export const mockGroupsRepository: IGroupsRepository = {
  async getGroups() {
    return groups;
  },

  async getGroupMessages(groupId: string, pagination?: PaginationParams) {
    let filtered = groupMessages.filter((m) => m.conversationId === groupId);

    if (pagination?.before) {
      const cursorDate = new Date(pagination.before);
      filtered = filtered.filter((m) => m.timestamp < cursorDate);
    }

    const limit = pagination?.limit ?? 50;
    return filtered.slice(-limit);
  },

  async sendGroupMessage(groupId: string, content: string, senderId: string, options?: { type?: import('../../types').MessageType; metadata?: Record<string, unknown>; isPrivate?: boolean; channelId?: string | null }) {
    const newMessage: Message = {
      id: `gmsg-${Date.now()}`,
      conversationId: groupId,
      senderId,
      content,
      timestamp: new Date(),
      type: options?.type ?? 'text',
      metadata: options?.metadata,
      isRead: true,
      isPrivate: options?.isPrivate,
      channelId: options?.channelId,
    };
    groupMessages = [...groupMessages, newMessage];
    groups = groups.map((g) =>
      g.id === groupId ? { ...g, lastActivity: new Date() } : g,
    );
    return newMessage;
  },

  async deleteGroupMessage(messageId: string) {
    groupMessages = groupMessages.filter((m) => m.id !== messageId);
  },

  async toggleGroupReaction(messageId: string, emoji: string) {
    groupMessages = groupMessages.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = [...(m.reactions ?? [])];
      const idx = reactions.findIndex((r) => r.emoji === emoji && r.userId === 'current-user');
      if (idx >= 0) {
        reactions.splice(idx, 1);
      } else {
        reactions.push({ emoji, userId: 'current-user', timestamp: new Date() });
      }
      return { ...m, reactions };
    });
  },

  async editGroupMessage(messageId: string, newContent: string) {
    let edited: Message | undefined;
    groupMessages = groupMessages.map((m) => {
      if (m.id !== messageId) return m;
      edited = { ...m, content: newContent, isEdited: true, metadata: { ...m.metadata, edited: true } };
      return edited;
    });
    if (!edited) throw new Error('Message not found');
    return edited;
  },

  async togglePin(groupId: string) {
    groups = groups.map((g) =>
      g.id === groupId ? { ...g, isPinned: !g.isPinned } : g,
    );
  },

  async toggleMute(groupId: string) {
    groups = groups.map((g) =>
      g.id === groupId ? { ...g, isMuted: !g.isMuted } : g,
    );
  },

  async createGroup(input: CreateGroupInput): Promise<Group> {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: input.name,
      description: input.description,
      avatar: '',
      members: ['current-user', ...input.memberIds],
      admins: ['current-user'],
      createdBy: 'current-user',
      createdAt: new Date(),
      type: input.type,
      lastActivity: new Date(),
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      metadata: { sharedObjects: [], notes: [], reminders: [], ledgerEntries: [], ledgerBalance: 0, pinnedMessages: [], starredMessages: [], callHistory: [] },
    };
    groups = [newGroup, ...groups];
    return newGroup;
  },

  async updateRSVP(eventId: string, status: RSVPStatus): Promise<void> {
    groups = groups.map((g) => ({
      ...g,
      events: g.events?.map((e) =>
        e.id === eventId
          ? {
              ...e,
              attendees: [
                ...e.attendees.filter((a) => a.userId !== 'current-user'),
                { userId: 'current-user', status, respondedAt: new Date() },
              ],
            }
          : e,
      ),
    }));
  },

  async addMembers(groupId: string, memberIds: string[]): Promise<void> {
    groups = groups.map((g) =>
      g.id === groupId
        ? { ...g, members: [...g.members, ...memberIds.filter((id) => !g.members.includes(id))] }
        : g,
    );
  },

  async removeMember(groupId: string, memberId: string): Promise<void> {
    groups = groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            members: g.members.filter((id) => id !== memberId),
            admins: g.admins.filter((id) => id !== memberId),
          }
        : g,
    );
  },

  async leaveGroup(groupId: string): Promise<void> {
    groups = groups.map((g) => {
      if (g.id !== groupId) return g;
      const updatedMembers = g.members.filter((id) => id !== 'current-user');
      let updatedAdmins = g.admins.filter((id) => id !== 'current-user');
      // Auto-promote first remaining member if no admins left
      if (updatedAdmins.length === 0 && updatedMembers.length > 0) {
        updatedAdmins = [updatedMembers[0]];
      }
      return { ...g, members: updatedMembers, admins: updatedAdmins };
    });
  },

  async updateGroup(groupId: string, updates: UpdateGroupInput): Promise<Group> {
    let updated: Group | undefined;
    groups = groups.map((g) => {
      if (g.id !== groupId) return g;
      updated = { ...g, ...updates };
      return updated;
    });
    if (!updated) throw new Error('Group not found');
    return updated;
  },

  async toggleAdmin(groupId: string, memberId: string): Promise<void> {
    groups = groups.map((g) => {
      if (g.id !== groupId) return g;
      const isAdmin = g.admins.includes(memberId);
      return {
        ...g,
        admins: isAdmin
          ? g.admins.filter((id) => id !== memberId)
          : [...g.admins, memberId],
      };
    });
  },

  async searchGroupMessages(groupId: string, query: string): Promise<Message[]> {
    const q = query.toLowerCase();
    return groupMessages.filter(
      (m) => m.conversationId === groupId && m.content.toLowerCase().includes(q),
    );
  },

  // ─── Stub implementations for new interface methods ───

  // Events
  async createEvent(groupId: string, event: Omit<GroupEvent, 'id' | 'groupId' | 'createdBy' | 'attendees'>): Promise<GroupEvent> {
    return { ...event, id: `evt-${Date.now()}`, groupId, createdBy: 'current-user', attendees: [] };
  },

  // Itinerary
  async addItineraryItem(_tripId: string, item: Omit<ItineraryItem, 'id'>): Promise<ItineraryItem> {
    return { ...item, id: `itin-${Date.now()}` };
  },
  async editItineraryItem(_itemId: string, _updates: Partial<ItineraryItem>): Promise<void> {},
  async deleteItineraryItem(_itemId: string): Promise<void> {},

  // Notes
  async createNote(_groupId: string, input: CreateNoteInput): Promise<Note> {
    return { id: `gnote-${Date.now()}`, title: input.title, content: input.content, blocks: input.blocks ?? [{ id: `block-${Date.now()}`, type: 'paragraph', content: '' }], color: input.color, isPrivate: input.isPrivate, isPinned: input.isPinned ?? false, createdBy: 'current-user', createdAt: new Date(), updatedAt: new Date(), templateId: input.templateId };
  },
  async updateNote(_groupId: string, _noteId: string, _input: UpdateNoteInput): Promise<Note> {
    return {} as Note;
  },
  async deleteNote(_noteId: string): Promise<void> {},
  async toggleNotePin(_groupId: string, _noteId: string): Promise<void> {},

  // Reminders
  async createReminder(_groupId: string, input: CreateReminderInput): Promise<Reminder> {
    return { id: `grem-${Date.now()}`, title: input.title, description: input.description, dueDate: new Date(input.dueDate), isCompleted: false, createdBy: 'current-user', createdAt: new Date(), priority: input.priority };
  },
  async toggleReminderComplete(_reminderId: string): Promise<void> {},

  // Ledger
  async createLedgerEntry(_groupId: string, input: CreateLedgerEntryInput): Promise<LedgerEntry> {
    return { id: `gled-${Date.now()}`, description: input.description, amount: input.amount, paidBy: input.paidBy, splitBetween: input.splitBetween, category: input.category, date: new Date(), isSettled: false };
  },
  async settleLedgerEntry(_entryId: string): Promise<void> {},

  // Shared objects
  async addSharedObject(_groupId: string, data: { type: SharedObjectType; title: string; description?: string; url?: string }): Promise<SharedObject> {
    return { id: `gso-${Date.now()}`, type: data.type, title: data.title, description: data.description, url: data.url, sharedBy: 'current-user', sharedAt: new Date(), metadata: { url: data.url } as SharedObject['metadata'] };
  },

  // Polls
  async createPoll(_groupId: string, question: string, options: string[], isMultipleChoice: boolean): Promise<Poll> {
    return { id: `poll-${Date.now()}`, question, options: options.map((text, i) => ({ id: `opt-${i}`, text, voterIds: [] })), createdBy: 'current-user', createdAt: new Date(), isMultipleChoice, isClosed: false };
  },
  async votePoll(_pollId: string, _optionId: string): Promise<void> {},
  async closePoll(_pollId: string): Promise<void> {},
  async getPolls(groupId: string): Promise<Poll[]> { return MOCK_POLLS[groupId] ?? []; },

  // Archive / Unread / Disappearing
  async toggleArchive(_groupId: string): Promise<void> {},
  async markAsUnread(_groupId: string): Promise<void> {},
  async markAsRead(_groupId: string): Promise<void> {},
  async setDisappearingDuration(_groupId: string, _duration: DisappearingDuration): Promise<void> {},

  // Star / Pin
  async toggleStarGroupMessage(_messageId: string, _isStarred: boolean): Promise<void> {},
  async togglePinGroupMessage(_messageId: string, _isPinned: boolean): Promise<void> {},
};
