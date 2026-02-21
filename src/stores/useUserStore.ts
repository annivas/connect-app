import { create } from 'zustand';
import { User } from '../types';
import { MOCK_USERS, CURRENT_USER_ID } from '../mocks/users';

interface UserState {
  currentUser: User;
  users: User[];
  getUserById: (id: string) => User | undefined;
  updateCurrentUser: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: MOCK_USERS.find((u) => u.id === CURRENT_USER_ID)!,
  users: MOCK_USERS,

  getUserById: (id: string) => get().users.find((u) => u.id === id),

  updateCurrentUser: (updates) =>
    set((state) => ({
      currentUser: { ...state.currentUser, ...updates },
    })),
}));
