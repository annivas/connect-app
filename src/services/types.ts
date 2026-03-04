import { Conversation, Message, MessageType, Group, GroupType, User, Collection, Note, Reminder, LedgerEntry, RSVPStatus, SharedObject, SharedObjectType, Poll, DisappearingDuration, ItineraryItem, GroupEvent } from '../types';

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
  type: 'general' | 'trip' | 'sports' | 'project' | 'household';
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
    options?: { type?: MessageType; metadata?: Record<string, unknown>; isPrivate?: boolean },
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

  // Star / Pin / Forward / Archive / Unread / Disappearing / Shared Objects
  toggleStarMessage(messageId: string, isStarred: boolean): Promise<void>;
  togglePinMessage(messageId: string, isPinned: boolean): Promise<void>;
  forwardMessage(
    targetConvId: string,
    content: string,
    senderId: string,
    type: MessageType,
    metadata: Record<string, unknown> | undefined,
    forwardedFrom: Record<string, unknown>,
  ): Promise<Message>;
  toggleArchive(conversationId: string): Promise<void>;
  markAsUnread(conversationId: string): Promise<void>;
  setDisappearingDuration(conversationId: string, duration: DisappearingDuration): Promise<void>;
  addSharedObject(conversationId: string, data: { type: SharedObjectType; title: string; description?: string; url?: string }): Promise<SharedObject>;
}

// ─── Groups Repository ──────────────────────
export interface IGroupsRepository {
  getGroups(): Promise<Group[]>;
  getGroupMessages(groupId: string, pagination?: PaginationParams): Promise<Message[]>;
  sendGroupMessage(
    groupId: string,
    content: string,
    senderId: string,
    options?: { type?: MessageType; metadata?: Record<string, unknown>; isPrivate?: boolean },
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

  // Events
  createEvent(groupId: string, event: Omit<GroupEvent, 'id' | 'groupId' | 'createdBy' | 'attendees'>): Promise<GroupEvent>;

  // Itinerary
  addItineraryItem(tripId: string, item: Omit<ItineraryItem, 'id'>): Promise<ItineraryItem>;
  editItineraryItem(itemId: string, updates: Partial<ItineraryItem>): Promise<void>;
  deleteItineraryItem(itemId: string): Promise<void>;

  // Notes / Reminders / Ledger / Shared Objects
  createNote(groupId: string, input: CreateNoteInput): Promise<Note>;
  deleteNote(noteId: string): Promise<void>;
  createReminder(groupId: string, input: CreateReminderInput): Promise<Reminder>;
  toggleReminderComplete(reminderId: string): Promise<void>;
  createLedgerEntry(groupId: string, input: CreateLedgerEntryInput): Promise<LedgerEntry>;
  settleLedgerEntry(entryId: string): Promise<void>;
  addSharedObject(groupId: string, data: { type: SharedObjectType; title: string; description?: string; url?: string }): Promise<SharedObject>;

  // Polls
  createPoll(groupId: string, question: string, options: string[], isMultipleChoice: boolean): Promise<Poll>;
  votePoll(pollId: string, optionId: string): Promise<void>;
  closePoll(pollId: string): Promise<void>;
  getPolls(groupId: string): Promise<Poll[]>;

  // Archive / Unread / Disappearing
  toggleArchive(groupId: string): Promise<void>;
  markAsUnread(groupId: string): Promise<void>;
  markAsRead(groupId: string): Promise<void>;
  setDisappearingDuration(groupId: string, duration: DisappearingDuration): Promise<void>;

  // Star / Pin for group messages
  toggleStarGroupMessage(messageId: string, isStarred: boolean): Promise<void>;
  togglePinGroupMessage(messageId: string, isPinned: boolean): Promise<void>;
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
