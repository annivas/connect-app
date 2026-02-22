import { create } from 'zustand';
import { User } from '../types';
import { userRepository } from '../services';
import { useAuthStore } from './useAuthStore';
import { config } from '../config/env';
import { CURRENT_USER_ID } from '../mocks/users';

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

  getUserById: (id: string) => get().users.find((u) => u.id === id),

  updateCurrentUser: (updates) => {
    const current = get().currentUser;
    if (!current) return;

    set((state) => ({
      currentUser: { ...current, ...updates },
    }));

    userRepository.updateUser(current.id, updates).catch(() => {});
  },
}));
