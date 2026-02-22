import { User } from '../../types';
import { MOCK_USERS } from '../../mocks/users';
import { IUserRepository } from '../types';

let users = [...MOCK_USERS];

export const mockUserRepository: IUserRepository = {
  async getCurrentUser(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  },

  async getUsers() {
    return users;
  },

  async updateUser(userId: string, updates: Partial<User>) {
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      throw new Error(`User not found: ${userId}`);
    }
    users[index] = { ...users[index], ...updates };
    return users[index];
  },
};
