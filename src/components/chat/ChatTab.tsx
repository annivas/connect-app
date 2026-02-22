import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay, differenceInMinutes } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';
import type { Message } from '../../types';

/**
 * Dynamically measure the Y position of the ChatTab container to get an accurate
 * keyboardVerticalOffset. The KAV needs to know how much non-KAV content sits
 * above it (safe area + header + TabView tab bar).
 */
function useKeyboardOffset() {
  const containerRef = useRef<View>(null);
  const [offset, setOffset] = useState(Platform.OS === 'ios' ? 0 : 0);

  const onLayout = useCallback(() => {
    if (Platform.OS !== 'ios') return;
    containerRef.current?.measureInWindow((_x, y) => {
      if (y > 0) setOffset(y);
    });
  }, []);

  return { containerRef, offset, onLayout };
}

interface Props {
  conversationId: string;
}

const EMPTY_TYPING: string[] = [];

// Messages within this window from the same sender are grouped (no avatar/name repeated)
const GROUP_THRESHOLD_MINUTES = 3;

export function ChatTab({ conversationId }: Props) {
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const { containerRef, offset: kbOffset, onLayout } = useKeyboardOffset();

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

  // Inverted FlatList needs newest-first order
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Load messages when entering the conversation
  useEffect(() => {
    useMessagesStore.getState().loadMessages(conversationId);
  }, [conversationId]);

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

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      useMessagesStore.getState().loadMoreMessages(conversationId);
    }
  }, [conversationId, hasMore, isLoadingMore]);

  return (
    <View ref={containerRef} onLayout={onLayout} className="flex-1 bg-background-primary">
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      keyboardVerticalOffset={kbOffset}
    >
      <FlatList
        ref={listRef}
        data={invertedMessages}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item, index }) => {
          // In inverted list, index 0 = newest. We look at index+1 for the "next older" message.
          // For grouping logic, we think in chronological order:
          // "previous" = the message that came BEFORE this one in time = invertedMessages[index + 1]
          // "next" = the message that came AFTER this one in time = invertedMessages[index - 1]
          const olderMsg = index < invertedMessages.length - 1 ? invertedMessages[index + 1] : null;
          const newerMsg = index > 0 ? invertedMessages[index - 1] : null;

          // Show date divider if this is the first message of the day
          const showDateDivider = !olderMsg || !isSameDay(olderMsg.timestamp, item.timestamp);

          // Group consecutive messages from same sender within threshold
          const isFirstInGroup =
            !olderMsg ||
            olderMsg.senderId !== item.senderId ||
            differenceInMinutes(item.timestamp, olderMsg.timestamp) > GROUP_THRESHOLD_MINUTES ||
            showDateDivider;

          const isLastInGroup =
            !newerMsg ||
            newerMsg.senderId !== item.senderId ||
            differenceInMinutes(newerMsg.timestamp, item.timestamp) > GROUP_THRESHOLD_MINUTES;

          return (
            <MessageBubble
              message={item}
              showDateDivider={showDateDivider}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              onRetry={retryMessage}
              onDelete={handleDelete}
              onReact={handleReact}
              onReply={handleReply}
              onEdit={handleEdit}
            />
          );
        }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 4,
        }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View className="py-3 items-center">
              <ActivityIndicator color="#D4764E" />
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
      {/* Safe area bottom padding so input sits above the home indicator */}
      <View style={{ height: insets.bottom }} className="bg-background-secondary" />
    </KeyboardAvoidingView>
    </View>
  );
}
