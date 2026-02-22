import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay, differenceInMinutes } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { MessageBubble } from '../chat/MessageBubble';
import { MessageInput } from '../chat/MessageInput';
import { TypingIndicator } from '../chat/TypingIndicator';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import type { Message } from '../../types';

/**
 * Dynamically measure the Y position of the GroupChatTab container to get an
 * accurate keyboardVerticalOffset. Same approach as ChatTab.
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
  groupId: string;
}

// Messages within this window from the same sender are grouped (no avatar/name repeated)
const GROUP_THRESHOLD_MINUTES = 3;

export function GroupChatTab({ groupId }: Props) {
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const { containerRef, offset: kbOffset, onLayout } = useKeyboardOffset();

  const messages = useGroupsStore(useShallow((s) => s.getGroupMessages(groupId)));
  const sendGroupMessage = useGroupsStore((s) => s.sendGroupMessage);
  const retryGroupMessage = useGroupsStore((s) => s.retryGroupMessage);
  const hasMore = useGroupsStore((s) => s.hasMoreMessages[groupId] ?? false);
  const isLoadingMore = useGroupsStore((s) => s.loadingMessages.has(groupId));
  const replyingTo = useGroupsStore((s) => s.replyingTo[groupId] ?? null);

  // Inverted FlatList needs newest-first order
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Load messages when entering the group chat
  useEffect(() => {
    useGroupsStore.getState().loadGroupMessages(groupId);
  }, [groupId]);

  const handleSend = (content: string) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendGroupMessage(groupId, content, userId);
  };

  const handleDelete = (messageId: string) => {
    useGroupsStore.getState().deleteGroupMessage(groupId, messageId);
  };

  const handleReact = (messageId: string, emoji: string) => {
    useGroupsStore.getState().toggleGroupReaction(groupId, messageId, emoji);
  };

  const handleReply = (message: Message) => {
    useGroupsStore.getState().setReplyTo(groupId, message);
  };

  const handleCancelReply = () => {
    useGroupsStore.getState().setReplyTo(groupId, null);
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
      useGroupsStore.getState().editGroupMessage(groupId, editingMessageId, newContent);
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

    sendGroupMessage(groupId, asset.uri, userId, {
      type: 'image',
      metadata: { width: asset.width, height: asset.height },
    });
  };

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      useGroupsStore.getState().loadMoreGroupMessages(groupId);
    }
  }, [groupId, hasMore, isLoadingMore]);

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
              showSenderName
              onRetry={retryGroupMessage}
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
      <TypingIndicator typingUserIds={[]} />
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
