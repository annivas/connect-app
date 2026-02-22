import { create } from 'zustand';
import { Message, Conversation } from '../types';
import { messagesRepository } from '../services';

interface MessagesState {
  conversations: Conversation[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  getConversationById: (id: string) => Conversation | undefined;
  getMessagesByConversationId: (conversationId: string) => Message[];
  getUnreadCount: () => number;

  sendMessage: (conversationId: string, content: string, senderId: string) => void;
  markAsRead: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  toggleMute: (conversationId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: [],
  isLoading: false,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const [conversations, messages] = await Promise.all([
        messagesRepository.getConversations(),
        // Load all messages upfront for now; Phase 4 adds pagination
        Promise.resolve([]),
      ]);
      // Flatten all conversation messages
      const allMessages: Message[] = [];
      for (const conv of conversations) {
        const convMessages = await messagesRepository.getMessages(conv.id);
        allMessages.push(...convMessages);
      }
      set({ conversations, messages: allMessages, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load conversations',
        isLoading: false,
      });
    }
  },

  getConversationById: (id) => get().conversations.find((c) => c.id === id),

  getMessagesByConversationId: (conversationId) =>
    get().messages.filter((m) => m.conversationId === conversationId),

  getUnreadCount: () =>
    get().conversations.reduce((acc, conv) => acc + conv.unreadCount, 0),

  sendMessage: (conversationId, content, senderId) => {
    // Optimistic update
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      content,
      timestamp: new Date(),
      type: 'text',
      isRead: true,
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: newMessage, updatedAt: new Date() }
          : c,
      ),
    }));

    // Fire-and-forget to repository
    messagesRepository.sendMessage(conversationId, content, senderId).catch(() => {
      // In Phase 4, this will handle rollback for failed sends
    });
  },

  markAsRead: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    }));
    messagesRepository.markAsRead(conversationId).catch(() => {});
  },

  togglePin: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isPinned: !c.isPinned } : c,
      ),
    }));
    messagesRepository.togglePin(conversationId).catch(() => {});
  },

  toggleMute: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isMuted: !c.isMuted } : c,
      ),
    }));
    messagesRepository.toggleMute(conversationId).catch(() => {});
  },
}));
