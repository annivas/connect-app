import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { Image } from 'expo-image';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';
import { MessageInput } from '../chat/MessageInput';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import type { Message } from '../../types';

// ─── Day divider ─────────────────────────────

function DateDivider({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else label = format(date, 'MMMM d, yyyy');

  return (
    <View className="flex-row items-center my-4 px-4">
      <View className="flex-1 h-px bg-border-subtle" />
      <Text className="text-text-tertiary text-xs mx-3 font-medium">
        {label}
      </Text>
      <View className="flex-1 h-px bg-border-subtle" />
    </View>
  );
}

// ─── Group message bubble ────────────────────

function GroupMessageBubble({
  message,
  showDateDivider,
  onRetry,
}: {
  message: Message;
  showDateDivider?: boolean;
  onRetry?: (messageId: string) => void;
}) {
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const isMine = message.senderId === currentUserId;
  const isFailed = message.sendStatus === 'failed';
  const getUserById = useUserStore((s) => s.getUserById);
  const sender = getUserById(message.senderId);

  return (
    <>
    {showDateDivider && <DateDivider date={message.timestamp} />}
    <View className={`mb-3 ${isMine ? 'items-end' : 'items-start'}`}>
      {!isMine && (
        <View className="flex-row items-center mb-1 ml-1">
          <Image
            source={{ uri: sender?.avatar }}
            style={{ width: 18, height: 18, borderRadius: 9 }}
            transition={100}
          />
          <Text className="text-text-secondary text-xs font-semibold ml-1.5">
            {sender?.name ?? 'Unknown'}
          </Text>
        </View>
      )}
      <View
        className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
          isMine
            ? `${isFailed ? 'bg-accent-primary/60' : 'bg-accent-primary'} rounded-br-md`
            : 'bg-surface rounded-bl-md'
        }`}
      >
        <Text
          className={`text-[15px] leading-[21px] ${
            isMine ? 'text-white' : 'text-text-primary'
          }`}
        >
          {message.content}
        </Text>
      </View>
      <View className="flex-row items-center">
        <Text className="text-text-tertiary text-[10px] mt-1 mx-2">
          {format(message.timestamp, 'HH:mm')}
        </Text>
        {isMine && message.sendStatus === 'sending' && (
          <View className="flex-row items-center mt-0.5">
            <Ionicons name="time-outline" size={12} color="#6B6B76" />
          </View>
        )}
        {isMine && message.sendStatus === 'failed' && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onRetry?.(message.id);
            }}
            className="flex-row items-center mt-0.5"
          >
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text className="text-status-error text-[11px] ml-1">Tap to retry</Text>
          </Pressable>
        )}
      </View>
    </View>
    </>
  );
}

// ─── Main component ──────────────────────────

interface Props {
  groupId: string;
}

export function GroupChatTab({ groupId }: Props) {
  const listRef = useRef<FlatList>(null);
  const messages = useGroupsStore(useShallow((s) => s.getGroupMessages(groupId)));
  const sendGroupMessage = useGroupsStore((s) => s.sendGroupMessage);
  const retryGroupMessage = useGroupsStore((s) => s.retryGroupMessage);
  const hasMore = useGroupsStore((s) => s.hasMoreMessages[groupId] ?? false);
  const isLoadingMore = useGroupsStore((s) => s.loadingMessages.has(groupId));

  // Load messages when entering the group chat
  useEffect(() => {
    useGroupsStore.getState().loadGroupMessages(groupId);
  }, [groupId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = (content: string) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendGroupMessage(groupId, content, userId);
  };

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      useGroupsStore.getState().loadMoreGroupMessages(groupId);
    }
  }, [groupId, hasMore, isLoadingMore]);

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
          return (
            <GroupMessageBubble
              message={item}
              showDateDivider={showDateDivider}
              onRetry={retryGroupMessage}
            />
          );
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
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
