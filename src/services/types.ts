import { Conversation, Message, Group, User, Collection } from '../types';

// ─── Messages Repository ────────────────────
export interface IMessagesRepository {
  getConversations(): Promise<Conversation[]>;
  getMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, content: string, senderId: string): Promise<Message>;
  markAsRead(conversationId: string): Promise<void>;
  togglePin(conversationId: string): Promise<void>;
  toggleMute(conversationId: string): Promise<void>;
}

// ─── Groups Repository ──────────────────────
export interface IGroupsRepository {
  getGroups(): Promise<Group[]>;
  getGroupMessages(groupId: string): Promise<Message[]>;
  sendGroupMessage(groupId: string, content: string, senderId: string): Promise<Message>;
  togglePin(groupId: string): Promise<void>;
  toggleMute(groupId: string): Promise<void>;
}

// ─── User Repository ────────────────────────
export interface IUserRepository {
  getCurrentUser(userId: string): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
}

// ─── Collections Repository ─────────────────
export interface ICollectionsRepository {
  getCollections(): Promise<Collection[]>;
}
