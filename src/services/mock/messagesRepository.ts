import { Message, Conversation } from '../../types';
import { MOCK_CONVERSATIONS } from '../../mocks/conversations';
import { MOCK_MESSAGES } from '../../mocks/messages';
import { IMessagesRepository } from '../types';

// In-memory copies so mutations don't affect the original mock data
let conversations = [...MOCK_CONVERSATIONS];
let messages = [...MOCK_MESSAGES];

export const mockMessagesRepository: IMessagesRepository = {
  async getConversations() {
    return conversations;
  },

  async getMessages(conversationId: string) {
    return messages.filter((m) => m.conversationId === conversationId);
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
};
