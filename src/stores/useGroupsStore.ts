import { create } from 'zustand';
import { Group, Message } from '../types';
import { groupsRepository } from '../services';

interface GroupsState {
  groups: Group[];
  groupMessages: Message[];
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  getGroupById: (id: string) => Group | undefined;
  getGroupMessages: (groupId: string) => Message[];
  sendGroupMessage: (groupId: string, content: string, senderId: string) => void;
  togglePin: (groupId: string) => void;
  toggleMute: (groupId: string) => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  groupMessages: [],
  isLoading: false,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await groupsRepository.getGroups();
      const allMessages: Message[] = [];
      for (const group of groups) {
        const msgs = await groupsRepository.getGroupMessages(group.id);
        allMessages.push(...msgs);
      }
      set({ groups, groupMessages: allMessages, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load groups',
        isLoading: false,
      });
    }
  },

  getGroupById: (id) => get().groups.find((g) => g.id === id),

  getGroupMessages: (groupId) =>
    get().groupMessages.filter((m) => m.conversationId === groupId),

  sendGroupMessage: (groupId, content, senderId) => {
    const newMessage: Message = {
      id: `gmsg-${Date.now()}`,
      conversationId: groupId,
      senderId,
      content,
      timestamp: new Date(),
      type: 'text',
      isRead: true,
    };

    set((state) => ({
      groupMessages: [...state.groupMessages, newMessage],
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, lastActivity: new Date() } : g,
      ),
    }));

    groupsRepository.sendGroupMessage(groupId, content, senderId).catch(() => {});
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
}));
