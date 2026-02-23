import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay, isToday, differenceInMinutes } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MessageContextMenu } from './MessageContextMenu';
import { ForwardModal } from './ForwardModal';
import { PinnedMessageBanner } from './PinnedMessageBanner';
import { TypingIndicator } from './TypingIndicator';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';
import { getImageGroup } from '../../utils/imageGrouping';
import type { Message } from '../../types';

/**
 * Standalone "Today" divider — rendered at the visual top of the inverted list
 * (via ListFooterComponent) so the label is always visible when today's messages exist.
 */
function TodayDivider() {
  return (
    <View className="flex-row items-center my-4 px-2">
      <View className="flex-1 h-px bg-border-subtle" />
      <Text className="text-text-tertiary text-[11px] mx-3 font-medium tracking-wide uppercase">
        Today
      </Text>
      <View className="flex-1 h-px bg-border-subtle" />
    </View>
  );
}

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
  highlightText?: string;
  matchingMessageIds?: Set<string>;
}

const EMPTY_TYPING: string[] = [];

// Messages within this window from the same sender are grouped (no avatar/name repeated)
const GROUP_THRESHOLD_MINUTES = 3;

export function ChatTab({ conversationId, highlightText, matchingMessageIds }: Props) {
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

  // Context menu state — replaces old reaction picker
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);

  // Forward modal state
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  // Pinned messages
  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned),
    [messages],
  );

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

  // ─── Context menu handlers ──────────────
  const handleContextMenu = (message: Message) => {
    setContextMenuMessage(message);
  };

  const handleContextMenuClose = () => {
    setContextMenuMessage(null);
  };

  const handleContextMenuReact = (emoji: string) => {
    if (!contextMenuMessage) return;
    useMessagesStore.getState().toggleReaction(conversationId, contextMenuMessage.id, emoji);
  };

  const handleContextMenuReply = () => {
    if (!contextMenuMessage) return;
    handleReply(contextMenuMessage);
  };

  const handleContextMenuForward = () => {
    if (!contextMenuMessage) return;
    setForwardMessage(contextMenuMessage);
  };

  const handleContextMenuPin = () => {
    if (!contextMenuMessage) return;
    useMessagesStore.getState().togglePinMessage(conversationId, contextMenuMessage.id);
  };

  const handleContextMenuStar = () => {
    if (!contextMenuMessage) return;
    useMessagesStore.getState().toggleStarMessage(conversationId, contextMenuMessage.id);
  };

  const handleContextMenuCopy = () => {
    if (!contextMenuMessage) return;
    Clipboard.setStringAsync(contextMenuMessage.content);
  };

  const handleContextMenuEdit = () => {
    if (!contextMenuMessage) return;
    handleEdit(contextMenuMessage.id, contextMenuMessage.content);
  };

  const handleContextMenuDelete = () => {
    if (!contextMenuMessage) return;
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(contextMenuMessage.id),
      },
    ]);
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
      {/* Pinned message banner */}
      <PinnedMessageBanner
        pinnedMessages={pinnedMessages}
        onJumpToMessage={(messageId) => {
          const index = invertedMessages.findIndex((m) => m.id === messageId);
          if (index >= 0) {
            listRef.current?.scrollToIndex({ index, animated: true });
          }
        }}
      />

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

          // Photo grid: group consecutive images from same sender
          const imgGroup = getImageGroup(invertedMessages, index);
          if (imgGroup && !imgGroup.isLeader) return null;

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
              highlightText={highlightText}
              isSearchMatch={matchingMessageIds?.has(item.id)}
              onContextMenu={handleContextMenu}
              imageGroup={imgGroup?.isLeader ? imgGroup.images : undefined}
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
        onScrollBeginDrag={() => setContextMenuMessage(null)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View className="py-3 items-center">
              <ActivityIndicator color="#D4764E" />
            </View>
          ) : invertedMessages.length > 0 && isToday(invertedMessages[invertedMessages.length - 1].timestamp) && !hasMore ? (
            <TodayDivider />
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

    {/* Full-screen context menu overlay */}
    {contextMenuMessage && (
      <MessageContextMenu
        message={contextMenuMessage}
        isMine={contextMenuMessage.senderId === useUserStore.getState().currentUser?.id}
        onClose={handleContextMenuClose}
        onReact={handleContextMenuReact}
        onReply={handleContextMenuReply}
        onForward={handleContextMenuForward}
        onPin={handleContextMenuPin}
        onStar={handleContextMenuStar}
        onCopy={handleContextMenuCopy}
        onEdit={
          contextMenuMessage.senderId === useUserStore.getState().currentUser?.id &&
          contextMenuMessage.type === 'text'
            ? handleContextMenuEdit
            : undefined
        }
        onDelete={
          contextMenuMessage.senderId === useUserStore.getState().currentUser?.id
            ? handleContextMenuDelete
            : undefined
        }
      />
    )}

    {/* Forward modal */}
    {forwardMessage && (
      <ForwardModal
        visible={!!forwardMessage}
        message={forwardMessage}
        sourceConversationId={conversationId}
        onClose={() => setForwardMessage(null)}
      />
    )}
    </View>
  );
}
