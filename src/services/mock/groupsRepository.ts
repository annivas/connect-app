import { Message, Group, RSVPStatus } from '../../types';
import { MOCK_GROUPS } from '../../mocks/groups';
import { MOCK_GROUP_MESSAGES } from '../../mocks/messages';
import { IGroupsRepository, PaginationParams, CreateGroupInput, UpdateGroupInput } from '../types';

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

  async sendGroupMessage(groupId: string, content: string, senderId: string, options?: { type?: import('../../types').MessageType; metadata?: Record<string, unknown> }) {
    const newMessage: Message = {
      id: `gmsg-${Date.now()}`,
      conversationId: groupId,
      senderId,
      content,
      timestamp: new Date(),
      type: options?.type ?? 'text',
      metadata: options?.metadata,
      isRead: true,
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
      metadata: { sharedObjects: [], notes: [] },
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
};
