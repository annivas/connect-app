import { Conversation, Message, MessageType, Group, GroupType, User, Collection, Note, Reminder, LedgerEntry, RSVPStatus } from '../types';

// ─── Pagination ─────────────────────────────
export interface PaginationParams {
  limit?: number;
  before?: string; // ISO timestamp cursor
}

// ─── Create DTOs ────────────────────────────
export type CreateNoteInput = {
  title: string;
  content: string;
  color: string;
  isPrivate: boolean;
};

export type CreateReminderInput = {
  title: string;
  description?: string;
  dueDate: string; // ISO timestamp
  priority: 'low' | 'medium' | 'high';
};

export type CreateLedgerEntryInput = {
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  category?: string;
};

export type CreateGroupInput = {
  name: string;
  description?: string;
  type: 'general' | 'trip' | 'sports' | 'project';
  memberIds: string[]; // excluding creator — creator auto-added as admin
};

export type UpdateGroupInput = {
  name?: string;
  description?: string;
  type?: GroupType;
};

// ─── Messages Repository ────────────────────
export interface IMessagesRepository {
  getConversations(): Promise<Conversation[]>;
  getMessages(conversationId: string, pagination?: PaginationParams): Promise<Message[]>;
  sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    options?: { type?: MessageType; metadata?: Record<string, unknown> },
  ): Promise<Message>;
  createConversation(participantIds: string[]): Promise<Conversation>;
  deleteMessage(messageId: string): Promise<void>;
  toggleReaction(messageId: string, emoji: string): Promise<void>;
  editMessage(messageId: string, newContent: string): Promise<Message>;
  markAsRead(conversationId: string): Promise<void>;
  togglePin(conversationId: string): Promise<void>;
  toggleMute(conversationId: string): Promise<void>;
  createNote(conversationId: string, input: CreateNoteInput): Promise<Note>;
  createReminder(conversationId: string, input: CreateReminderInput): Promise<Reminder>;
  toggleReminderComplete(reminderId: string): Promise<void>;
  createLedgerEntry(conversationId: string, input: CreateLedgerEntryInput): Promise<LedgerEntry>;
  settleLedgerEntry(entryId: string): Promise<void>;
  searchMessages(conversationId: string, query: string): Promise<Message[]>;
}

// ─── Groups Repository ──────────────────────
export interface IGroupsRepository {
  getGroups(): Promise<Group[]>;
  getGroupMessages(groupId: string, pagination?: PaginationParams): Promise<Message[]>;
  sendGroupMessage(
    groupId: string,
    content: string,
    senderId: string,
    options?: { type?: MessageType; metadata?: Record<string, unknown> },
  ): Promise<Message>;
  deleteGroupMessage(messageId: string): Promise<void>;
  toggleGroupReaction(messageId: string, emoji: string): Promise<void>;
  editGroupMessage(messageId: string, newContent: string): Promise<Message>;
  togglePin(groupId: string): Promise<void>;
  toggleMute(groupId: string): Promise<void>;
  createGroup(input: CreateGroupInput): Promise<Group>;
  updateRSVP(eventId: string, status: RSVPStatus): Promise<void>;
  addMembers(groupId: string, memberIds: string[]): Promise<void>;
  removeMember(groupId: string, memberId: string): Promise<void>;
  leaveGroup(groupId: string): Promise<void>;
  updateGroup(groupId: string, updates: UpdateGroupInput): Promise<Group>;
  toggleAdmin(groupId: string, memberId: string): Promise<void>;
  searchGroupMessages(groupId: string, query: string): Promise<Message[]>;
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
