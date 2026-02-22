import React, { useRef, useEffect, useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View, ActivityIndicator, RefreshControl } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay } from 'date-fns';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  conversationId: string;
}

export function ChatTab({ conversationId }: Props) {
  const listRef = useRef<FlatList>(null);
  const messages = useMessagesStore(
    useShallow((s) => s.getMessagesByConversationId(conversationId))
  );
  const sendMessage = useMessagesStore((s) => s.sendMessage);
  const retryMessage = useMessagesStore((s) => s.retryMessage);
  const hasMore = useMessagesStore((s) => s.hasMoreMessages[conversationId] ?? false);
  const isLoadingMore = useMessagesStore(
    (s) => s.loadingMessages.has(conversationId)
  );

  // Load messages when entering the conversation
  useEffect(() => {
    useMessagesStore.getState().loadMessages(conversationId);
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = (content: string) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendMessage(conversationId, content, userId);
  };

  const [refreshing, setRefreshing] = useState(false);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      useMessagesStore.getState().loadMoreMessages(conversationId);
    }
  }, [conversationId, hasMore, isLoadingMore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await useMessagesStore.getState().loadMessages(conversationId);
    } finally {
      setRefreshing(false);
    }
  }, [conversationId]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-primary"
      keyboardVerticalOffset={140}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const showDateDivider = !prev || !isSameDay(prev.timestamp, item.timestamp);
          return <MessageBubble message={item} showDateDivider={showDateDivider} onRetry={retryMessage} />;
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />
        }
        onStartReached={handleLoadMore}
        onStartReachedThreshold={0.2}
        ListHeaderComponent={
          isLoadingMore ? (
            <View className="py-3 items-center">
              <ActivityIndicator color="#6366F1" />
            </View>
          ) : null
        }
      />
      <MessageInput onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}
