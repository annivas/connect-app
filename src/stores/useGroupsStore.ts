import { create } from 'zustand';
import { Group, Message } from '../types';
import { MOCK_GROUPS } from '../mocks/groups';
import { MOCK_GROUP_MESSAGES } from '../mocks/messages';
import { CURRENT_USER_ID } from '../mocks/users';

interface GroupsState {
  groups: Group[];
  groupMessages: Message[];

  getGroupById: (id: string) => Group | undefined;
  getGroupMessages: (groupId: string) => Message[];
  sendGroupMessage: (groupId: string, content: string) => void;
  togglePin: (groupId: string) => void;
  toggleMute: (groupId: string) => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: MOCK_GROUPS,
  groupMessages: MOCK_GROUP_MESSAGES,

  getGroupById: (id) => get().groups.find((g) => g.id === id),

  getGroupMessages: (groupId) =>
    get().groupMessages.filter((m) => m.conversationId === groupId),

  sendGroupMessage: (groupId, content) => {
    const newMessage: Message = {
      id: `gmsg-${Date.now()}`,
      conversationId: groupId,
      senderId: CURRENT_USER_ID,
      content,
      timestamp: new Date(),
      type: 'text',
      isRead: true,
    };

    set((state) => ({
      groupMessages: [...state.groupMessages, newMessage],
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, lastActivity: new Date() } : g
      ),
    }));
  },

  togglePin: (groupId) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, isPinned: !g.isPinned } : g
      ),
    })),

  toggleMute: (groupId) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, isMuted: !g.isMuted } : g
      ),
    })),
}));
