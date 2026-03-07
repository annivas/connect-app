import { Message, MessageType, Conversation, Note, Reminder, LedgerEntry, Reaction, SharedObject, SharedObjectType, DisappearingDuration } from '../../types';
import { MOCK_CONVERSATIONS } from '../../mocks/conversations';
import { MOCK_MESSAGES } from '../../mocks/messages';
import { IMessagesRepository, PaginationParams, CreateNoteInput, UpdateNoteInput, CreateReminderInput, CreateLedgerEntryInput } from '../types';

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

  async sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    options?: { type?: MessageType; metadata?: Record<string, unknown> },
  ) {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      content,
      timestamp: new Date(),
      type: options?.type ?? 'text',
      metadata: options?.metadata,
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

  async createConversation(participantIds: string[]) {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      type: 'individual',
      participants: participantIds,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { sharedObjects: [], notes: [], reminders: [], ledgerBalance: 0, ledgerEntries: [], pinnedMessages: [], starredMessages: [], polls: [], callHistory: [] },
    };
    conversations = [newConv, ...conversations];
    return newConv;
  },

  async deleteMessage(messageId: string) {
    messages = messages.filter((m) => m.id !== messageId);
  },

  async toggleReaction(messageId: string, emoji: string) {
    const currentUserId = 'current-user';
    messages = messages.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = [...(m.reactions ?? [])];
      const idx = reactions.findIndex((r) => r.emoji === emoji && r.userId === currentUserId);
      if (idx >= 0) {
        reactions.splice(idx, 1);
      } else {
        reactions.push({ emoji, userId: currentUserId, timestamp: new Date() });
      }
      return { ...m, reactions };
    });
  },

  async editMessage(messageId: string, newContent: string) {
    let edited: Message | undefined;
    messages = messages.map((m) => {
      if (m.id !== messageId) return m;
      edited = { ...m, content: newContent, metadata: { ...m.metadata, edited: true } };
      return edited;
    });
    return edited!;
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
      blocks: input.blocks ?? [{ id: `block-${Date.now()}`, type: 'paragraph', content: '' }],
      color: input.color,
      isPrivate: input.isPrivate,
      isPinned: input.isPinned ?? false,
      createdBy: 'current-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      templateId: input.templateId,
    };
    conversations = conversations.map((c) =>
      c.id === conversationId
        ? { ...c, metadata: { ...c.metadata!, notes: [newNote, ...(c.metadata?.notes ?? [])] } }
        : c,
    );
    return newNote;
  },

  async updateNote(conversationId: string, noteId: string, input: UpdateNoteInput): Promise<Note> {
    let updated: Note | undefined;
    conversations = conversations.map((c) => {
      if (c.id !== conversationId || !c.metadata) return c;
      return {
        ...c,
        metadata: {
          ...c.metadata,
          notes: c.metadata.notes.map((n) => {
            if (n.id !== noteId) return n;
            updated = { ...n, ...input, updatedAt: new Date() };
            return updated;
          }),
        },
      };
    });
    return updated!;
  },

  async deleteNote(conversationId: string, noteId: string): Promise<void> {
    conversations = conversations.map((c) => {
      if (c.id !== conversationId || !c.metadata) return c;
      return {
        ...c,
        metadata: {
          ...c.metadata,
          notes: c.metadata.notes.filter((n) => n.id !== noteId),
        },
      };
    });
  },

  async toggleNotePin(conversationId: string, noteId: string): Promise<void> {
    conversations = conversations.map((c) => {
      if (c.id !== conversationId || !c.metadata) return c;
      return {
        ...c,
        metadata: {
          ...c.metadata,
          notes: c.metadata.notes.map((n) =>
            n.id === noteId ? { ...n, isPinned: !n.isPinned } : n,
          ),
        },
      };
    });
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

  async searchMessages(conversationId: string, query: string): Promise<Message[]> {
    const q = query.toLowerCase();
    return messages.filter(
      (m) => m.conversationId === conversationId && m.content.toLowerCase().includes(q),
    );
  },

  // ─── Stub implementations for new interface methods ───

  async toggleStarMessage(_messageId: string, _isStarred: boolean): Promise<void> {},

  async togglePinMessage(_messageId: string, _isPinned: boolean): Promise<void> {},

  async forwardMessage(
    targetConvId: string,
    content: string,
    senderId: string,
    type: MessageType,
    _metadata: Record<string, unknown> | undefined,
    _forwardedFrom: Record<string, unknown>,
  ): Promise<Message> {
    const msg: Message = {
      id: `msg-fwd-${Date.now()}`,
      conversationId: targetConvId,
      senderId,
      content,
      timestamp: new Date(),
      type,
      isRead: true,
    };
    messages = [...messages, msg];
    return msg;
  },

  async toggleArchive(_conversationId: string): Promise<void> {},

  async markAsUnread(_conversationId: string): Promise<void> {},

  async setDisappearingDuration(_conversationId: string, _duration: DisappearingDuration): Promise<void> {},

  async addSharedObject(_conversationId: string, data: { type: SharedObjectType; title: string; description?: string; url?: string }): Promise<SharedObject> {
    return {
      id: `shared-${Date.now()}`,
      type: data.type,
      title: data.title,
      description: data.description,
      url: data.url,
      sharedBy: 'current-user',
      sharedAt: new Date(),
      metadata: { url: data.url } as SharedObject['metadata'],
    };
  },
};
