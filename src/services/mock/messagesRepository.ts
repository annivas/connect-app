import { Message, Conversation, Note, Reminder, LedgerEntry } from '../../types';
import { MOCK_CONVERSATIONS } from '../../mocks/conversations';
import { MOCK_MESSAGES } from '../../mocks/messages';
import { IMessagesRepository, PaginationParams, CreateNoteInput, CreateReminderInput, CreateLedgerEntryInput } from '../types';

// In-memory copies so mutations don't affect the original mock data
let conversations = [...MOCK_CONVERSATIONS];
let messages = [...MOCK_MESSAGES];

export const mockMessagesRepository: IMessagesRepository = {
  async getConversations() {
    return conversations;
  },

  async getMessages(conversationId: string, pagination?: PaginationParams) {
    let filtered = messages.filter((m) => m.conversationId === conversationId);

    if (pagination?.before) {
      const cursorDate = new Date(pagination.before);
      filtered = filtered.filter((m) => m.timestamp < cursorDate);
    }

    const limit = pagination?.limit ?? 50;
    // Return the last `limit` messages in chronological order
    return filtered.slice(-limit);
  },

  async sendMessage(conversationId: string, content: string, senderId: string) {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      content,
      timestamp: new Date(),
      type: 'text',
      isRead: true,
    };
    messages = [...messages, newMessage];
    conversations = conversations.map((c) =>
      c.id === conversationId
        ? { ...c, lastMessage: newMessage, updatedAt: new Date() }
        : c,
    );
    return newMessage;
  },

  async markAsRead(conversationId: string) {
    conversations = conversations.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c,
    );
  },

  async togglePin(conversationId: string) {
    conversations = conversations.map((c) =>
      c.id === conversationId ? { ...c, isPinned: !c.isPinned } : c,
    );
  },

  async toggleMute(conversationId: string) {
    conversations = conversations.map((c) =>
      c.id === conversationId ? { ...c, isMuted: !c.isMuted } : c,
    );
  },

  async createNote(conversationId: string, input: CreateNoteInput): Promise<Note> {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: input.title,
      content: input.content,
      color: input.color,
      isPrivate: input.isPrivate,
      createdBy: 'current-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    conversations = conversations.map((c) =>
      c.id === conversationId
        ? { ...c, metadata: { ...c.metadata!, notes: [newNote, ...(c.metadata?.notes ?? [])] } }
        : c,
    );
    return newNote;
  },

  async createReminder(conversationId: string, input: CreateReminderInput): Promise<Reminder> {
    const newReminder: Reminder = {
      id: `rem-${Date.now()}`,
      title: input.title,
      description: input.description,
      dueDate: new Date(input.dueDate),
      isCompleted: false,
      createdBy: 'current-user',
      createdAt: new Date(),
      priority: input.priority,
    };
    conversations = conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            metadata: { ...c.metadata!, reminders: [newReminder, ...(c.metadata?.reminders ?? [])] },
          }
        : c,
    );
    return newReminder;
  },

  async toggleReminderComplete(reminderId: string): Promise<void> {
    conversations = conversations.map((c) => ({
      ...c,
      metadata: c.metadata
        ? {
            ...c.metadata,
            reminders: c.metadata.reminders.map((r) =>
              r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r,
            ),
          }
        : c.metadata,
    }));
  },

  async createLedgerEntry(conversationId: string, input: CreateLedgerEntryInput): Promise<LedgerEntry> {
    const newEntry: LedgerEntry = {
      id: `ledger-${Date.now()}`,
      description: input.description,
      amount: input.amount,
      paidBy: input.paidBy,
      splitBetween: input.splitBetween,
      category: input.category,
      date: new Date(),
      isSettled: false,
    };
    conversations = conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            metadata: c.metadata
              ? {
                  ...c.metadata,
                  ledgerEntries: [newEntry, ...c.metadata.ledgerEntries],
                  ledgerBalance: c.metadata.ledgerBalance + input.amount,
                }
              : c.metadata,
          }
        : c,
    );
    return newEntry;
  },

  async settleLedgerEntry(entryId: string): Promise<void> {
    conversations = conversations.map((c) => ({
      ...c,
      metadata: c.metadata
        ? {
            ...c.metadata,
            ledgerEntries: c.metadata.ledgerEntries.map((e) =>
              e.id === entryId ? { ...e, isSettled: true } : e,
            ),
          }
        : c.metadata,
    }));
  },
};
