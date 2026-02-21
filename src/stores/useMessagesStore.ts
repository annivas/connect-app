import { create } from 'zustand';
import { Message, Conversation } from '../types';
import { MOCK_MESSAGES } from '../mocks/messages';
import { MOCK_CONVERSATIONS } from '../mocks/conversations';
import { CURRENT_USER_ID } from '../mocks/users';

interface MessagesState {
  conversations: Conversation[];
  messages: Message[];

  getConversationById: (id: string) => Conversation | undefined;
  getMessagesByConversationId: (conversationId: string) => Message[];
  getUnreadCount: () => number;

  sendMessage: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  toggleMute: (conversationId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: MOCK_CONVERSATIONS,
  messages: MOCK_MESSAGES,

  getConversationById: (id) => get().conversations.find((c) => c.id === id),

  getMessagesByConversationId: (conversationId) =>
    get().messages.filter((m) => m.conversationId === conversationId),

  getUnreadCount: () =>
    get().conversations.reduce((acc, conv) => acc + conv.unreadCount, 0),

  sendMessage: (conversationId, content) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: CURRENT_USER_ID,
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
          : c
      ),
    }));
  },

  markAsRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  togglePin: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isPinned: !c.isPinned } : c
      ),
    })),

  toggleMute: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isMuted: !c.isMuted } : c
      ),
    })),
}));
