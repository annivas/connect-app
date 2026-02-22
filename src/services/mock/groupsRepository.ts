import { Message, Group, RSVPStatus } from '../../types';
import { MOCK_GROUPS } from '../../mocks/groups';
import { MOCK_GROUP_MESSAGES } from '../../mocks/messages';
import { IGroupsRepository, PaginationParams, CreateGroupInput } from '../types';

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
};
