import { create } from 'zustand';
import { User } from '../types';
import { userRepository } from '../services';
import { useAuthStore } from './useAuthStore';
import { config } from '../config/env';
import { CURRENT_USER_ID } from '../mocks/users';
import { MOCK_AI_AGENTS } from '../mocks/aiAgents';

// Map AI agents to pseudo-users so they render naturally in MessageBubble, typing indicators, etc.
const AI_PSEUDO_USERS: User[] = MOCK_AI_AGENTS.map((agent) => ({
  id: agent.id,
  name: agent.name,
  username: agent.provider,
  avatar: agent.avatar,
  status: 'online' as const,
  statusMessage: agent.description,
  isAI: true,
}));

interface UserState {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  getUserById: (id: string) => User | undefined;
  updateCurrentUser: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  users: [],
  isLoading: false,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use auth session user ID when available, fall back to mock ID
      const userId = config.useMocks
        ? CURRENT_USER_ID
        : useAuthStore.getState().session?.user?.id;

      if (!userId) {
        throw new Error('No authenticated user');
      }

      const [currentUser, users] = await Promise.all([
        userRepository.getCurrentUser(userId),
        userRepository.getUsers(),
      ]);
      set({ currentUser, users, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load user',
        isLoading: false,
      });
    }
  },

  getUserById: (id: string) =>
    get().users.find((u) => u.id === id) ??
    AI_PSEUDO_USERS.find((u) => u.id === id),

  updateCurrentUser: (updates) => {
    const current = get().currentUser;
    if (!current) return;

    const updated = { ...current, ...updates };
    set((state) => ({
      currentUser: updated,
      users: state.users.map((u) => (u.id === current.id ? updated : u)),
    }));

    userRepository.updateUser(current.id, updates).catch(() => {});
  },
}));
