import { useMessagesStore } from '../useMessagesStore';

// Reset store before each test
beforeEach(() => {
  useMessagesStore.setState({
    conversations: [],
    messages: [],
    isLoading: false,
    error: null,
  });
});

describe('useMessagesStore', () => {
  describe('init', () => {
    it('should load conversations (messages load lazily)', async () => {
      const { init } = useMessagesStore.getState();

      await init();

      const state = useMessagesStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.conversations.length).toBeGreaterThan(0);
      // Messages are now loaded lazily per-conversation, not during init()
      expect(state.messages.length).toBe(0);
    });

    it('should load messages for a conversation via loadMessages', async () => {
      await useMessagesStore.getState().init();

      const { conversations } = useMessagesStore.getState();
      const convId = conversations[0].id;

      await useMessagesStore.getState().loadMessages(convId);

      const messages = useMessagesStore.getState().getMessagesByConversationId(convId);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should set isLoading to true during init', async () => {
      const { init } = useMessagesStore.getState();

      const promise = init();
      // isLoading should be true immediately after calling init
      expect(useMessagesStore.getState().isLoading).toBe(true);

      await promise;
      expect(useMessagesStore.getState().isLoading).toBe(false);
    });
  });

  describe('getConversationById', () => {
    it('should return a conversation by id', async () => {
      await useMessagesStore.getState().init();

      const { conversations, getConversationById } = useMessagesStore.getState();
      const first = conversations[0];
      expect(getConversationById(first.id)).toEqual(first);
    });

    it('should return undefined for unknown id', async () => {
      await useMessagesStore.getState().init();

      const { getConversationById } = useMessagesStore.getState();
      expect(getConversationById('nonexistent')).toBeUndefined();
    });
  });

  describe('sendMessage', () => {
    it('should add a message to the store', async () => {
      await useMessagesStore.getState().init();

      const { conversations } = useMessagesStore.getState();
      const convId = conversations[0].id;

      // Load messages first (lazy pagination)
      await useMessagesStore.getState().loadMessages(convId);
      const messagesBefore = useMessagesStore.getState().messages.length;

      useMessagesStore.getState().sendMessage(convId, 'Hello!', 'test-user');

      const messagesAfter = useMessagesStore.getState().messages.length;
      expect(messagesAfter).toBe(messagesBefore + 1);

      const newMsg = useMessagesStore.getState().messages[messagesAfter - 1];
      expect(newMsg.content).toBe('Hello!');
      expect(newMsg.senderId).toBe('test-user');
      expect(newMsg.conversationId).toBe(convId);
    });

    it('should update the conversation lastMessage', async () => {
      await useMessagesStore.getState().init();

      const { conversations } = useMessagesStore.getState();
      const convId = conversations[0].id;

      useMessagesStore.getState().sendMessage(convId, 'Updated!', 'test-user');

      const conv = useMessagesStore.getState().getConversationById(convId);
      expect(conv?.lastMessage?.content).toBe('Updated!');
    });
  });

  describe('markAsRead', () => {
    it('should set unreadCount to 0', async () => {
      await useMessagesStore.getState().init();

      const { conversations } = useMessagesStore.getState();
      const withUnread = conversations.find((c) => c.unreadCount > 0);
      if (!withUnread) return; // Skip if no unread conversations in mock data

      useMessagesStore.getState().markAsRead(withUnread.id);

      const updated = useMessagesStore.getState().getConversationById(withUnread.id);
      expect(updated?.unreadCount).toBe(0);
    });
  });

  describe('togglePin', () => {
    it('should toggle isPinned state', async () => {
      await useMessagesStore.getState().init();

      const { conversations } = useMessagesStore.getState();
      const convId = conversations[0].id;
      const wasPinned = conversations[0].isPinned;

      useMessagesStore.getState().togglePin(convId);

      const updated = useMessagesStore.getState().getConversationById(convId);
      expect(updated?.isPinned).toBe(!wasPinned);
    });
  });

  describe('toggleMute', () => {
    it('should toggle isMuted state', async () => {
      await useMessagesStore.getState().init();

      const { conversations } = useMessagesStore.getState();
      const convId = conversations[0].id;
      const wasMuted = conversations[0].isMuted;

      useMessagesStore.getState().toggleMute(convId);

      const updated = useMessagesStore.getState().getConversationById(convId);
      expect(updated?.isMuted).toBe(!wasMuted);
    });
  });

  describe('getUnreadCount', () => {
    it('should return total unread across all conversations', async () => {
      await useMessagesStore.getState().init();

      const { conversations, getUnreadCount } = useMessagesStore.getState();
      const expected = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
      expect(getUnreadCount()).toBe(expected);
    });
  });
});
