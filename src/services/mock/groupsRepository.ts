import { Message, Group } from '../../types';
import { MOCK_GROUPS } from '../../mocks/groups';
import { MOCK_GROUP_MESSAGES } from '../../mocks/messages';
import { IGroupsRepository } from '../types';

let groups = [...MOCK_GROUPS];
let groupMessages = [...MOCK_GROUP_MESSAGES];

export const mockGroupsRepository: IGroupsRepository = {
  async getGroups() {
    return groups;
  },

  async getGroupMessages(groupId: string) {
    return groupMessages.filter((m) => m.conversationId === groupId);
  },

  async sendGroupMessage(groupId: string, content: string, senderId: string) {
    const newMessage: Message = {
      id: `gmsg-${Date.now()}`,
      conversationId: groupId,
      senderId,
      content,
      timestamp: new Date(),
      type: 'text',
      isRead: true,
    };
    groupMessages = [...groupMessages, newMessage];
    groups = groups.map((g) =>
      g.id === groupId ? { ...g, lastActivity: new Date() } : g,
    );
    return newMessage;
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
};
