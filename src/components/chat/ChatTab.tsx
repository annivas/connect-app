import React, { useRef, useEffect, useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';
import type { Message } from '../../types';

interface Props {
  conversationId: string;
}

const EMPTY_TYPING: string[] = [];

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
  const replyingTo = useMessagesStore((s) => s.replyingTo[conversationId] ?? null);
  const typingUserIds = useMessagesStore((s) => s.typingUsers[conversationId] ?? EMPTY_TYPING);

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

  const handleDelete = (messageId: string) => {
    useMessagesStore.getState().deleteMessage(conversationId, messageId);
  };

  const handleReact = (messageId: string, emoji: string) => {
    useMessagesStore.getState().toggleReaction(conversationId, messageId, emoji);
  };

  const handleReply = (message: Message) => {
    useMessagesStore.getState().setReplyTo(conversationId, message);
  };

  const handleCancelReply = () => {
    useMessagesStore.getState().setReplyTo(conversationId, null);
  };

  // ─── Edit flow ──────────────────────
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);

  const handleEdit = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };

  const handleSaveEdit = (newContent: string) => {
    if (editingMessageId) {
      useMessagesStore.getState().editMessage(conversationId, editingMessageId, newContent);
    }
    setEditingMessageId(null);
    setEditingContent(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent(null);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;

    sendMessage(conversationId, asset.uri, userId, {
      type: 'image',
      metadata: { width: asset.width, height: asset.height },
    });
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

  // The bottom tab bar uses position: 'absolute', so it overlays content.
  // We need padding at the bottom so the MessageInput is visible above the tab bar.
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 70;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-primary"
      style={{ paddingBottom: TAB_BAR_HEIGHT }}
      keyboardVerticalOffset={140}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const showDateDivider = !prev || !isSameDay(prev.timestamp, item.timestamp);
          return (
            <MessageBubble
              message={item}
              showDateDivider={showDateDivider}
              onRetry={retryMessage}
              onDelete={handleDelete}
              onReact={handleReact}
              onReply={handleReply}
              onEdit={handleEdit}
            />
          );
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
      <TypingIndicator typingUserIds={typingUserIds} />
      <MessageInput
        onSend={handleSend}
        onPickImage={handlePickImage}
        replyTo={
          replyingTo
            ? {
                senderName: useUserStore.getState().getUserById(replyingTo.senderId)?.name ?? 'Unknown',
                content: replyingTo.content,
              }
            : null
        }
        onCancelReply={handleCancelReply}
        editingContent={editingContent}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
      />
    </KeyboardAvoidingView>
  );
}
