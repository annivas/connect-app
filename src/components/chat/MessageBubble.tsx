import React, { useState } from 'react';
import { View, Text, Pressable, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ReactionPicker } from './ReactionPicker';
import { Message, Reaction } from '../../types';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  message: Message;
  showDateDivider?: boolean;
  onRetry?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, currentContent: string) => void;
}

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

function SendStatusIndicator({
  status,
  isRead,
  onRetry,
}: {
  status: Message['sendStatus'];
  isRead: boolean;
  onRetry?: () => void;
}) {
  if (!status) return null;

  if (status === 'sending') {
    return (
      <View className="flex-row items-center mt-0.5 mx-2">
        <Ionicons name="time-outline" size={12} color="#6B6B76" />
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onRetry?.();
        }}
        className="flex-row items-center mt-0.5 mx-2"
      >
        <Ionicons name="alert-circle" size={14} color="#EF4444" />
        <Text className="text-status-error text-[11px] ml-1">Tap to retry</Text>
      </Pressable>
    );
  }

  // status === 'sent' — show read receipts
  return (
    <View className="flex-row items-center mt-0.5 mx-2">
      <Ionicons
        name={isRead ? 'checkmark-done' : 'checkmark'}
        size={14}
        color={isRead ? '#6366F1' : '#6B6B76'}
      />
    </View>
  );
}

// ─── Reaction display pills ─────────────────

interface GroupedReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

function groupReactions(reactions: Reaction[], currentUserId: string | undefined): GroupedReaction[] {
  const map = new Map<string, { count: number; userReacted: boolean }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji) ?? { count: 0, userReacted: false };
    existing.count++;
    if (r.userId === currentUserId) existing.userReacted = true;
    map.set(r.emoji, existing);
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userReacted: data.userReacted,
  }));
}

function ReactionPills({
  reactions,
  currentUserId,
  onToggle,
}: {
  reactions: Reaction[];
  currentUserId: string | undefined;
  onToggle: (emoji: string) => void;
}) {
  if (!reactions || reactions.length === 0) return null;
  const grouped = groupReactions(reactions, currentUserId);

  return (
    <View className="flex-row flex-wrap mt-1 mx-1 gap-1">
      {grouped.map(({ emoji, count, userReacted }) => (
        <Pressable
          key={emoji}
          onPress={() => {
            Haptics.selectionAsync();
            onToggle(emoji);
          }}
          className={`flex-row items-center px-2 py-0.5 rounded-full ${
            userReacted
              ? 'bg-accent-primary/20 border border-accent-primary'
              : 'bg-surface-elevated border border-transparent'
          }`}
        >
          <Text className="text-sm">{emoji}</Text>
          <Text
            className={`text-[11px] ml-1 font-medium ${
              userReacted ? 'text-accent-primary' : 'text-text-secondary'
            }`}
          >
            {count}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Main component ─────────────────────────

export function MessageBubble({ message, showDateDivider, onRetry, onDelete, onReact, onReply, onEdit }: Props) {
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const isMine = message.senderId === currentUserId;
  const isFailed = message.sendStatus === 'failed';
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const confirmDelete = () => {
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete?.(message.id),
      },
    ]);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Build options dynamically based on context
    const actions: { label: string; handler: () => void }[] = [
      { label: 'Copy Text', handler: () => Clipboard.setStringAsync(message.content) },
    ];
    if (onReply) {
      actions.push({ label: 'Reply', handler: () => onReply(message) });
    }
    if (onReact) {
      actions.push({ label: 'React', handler: () => setShowReactionPicker(true) });
    }
    if (isMine && onEdit && message.type === 'text') {
      actions.push({ label: 'Edit', handler: () => onEdit(message.id, message.content) });
    }
    if (isMine && onDelete) {
      actions.push({ label: 'Delete', handler: confirmDelete });
    }

    const options = [...actions.map((a) => a.label), 'Cancel'];
    const cancelIndex = options.length - 1;
    const destructiveIndex = actions.findIndex((a) => a.label === 'Delete');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        (idx) => {
          if (idx < actions.length) actions[idx].handler();
        },
      );
    } else {
      Alert.alert('Message', undefined, [
        ...actions.map((a) => ({ text: a.label, onPress: a.handler })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const handleReactionSelect = (emoji: string) => {
    onReact?.(message.id, emoji);
  };

  return (
    <>
      {showDateDivider && <DateDivider date={message.timestamp} />}
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        className={`mb-2 ${isMine ? 'items-end' : 'items-start'}`}
      >
        {/* Reaction picker overlay */}
        {showReactionPicker && (
          <View className={`mb-2 ${isMine ? 'self-end' : 'self-start'}`}>
            <ReactionPicker
              onSelect={handleReactionSelect}
              onClose={() => setShowReactionPicker(false)}
            />
          </View>
        )}

        {/* Reply preview above bubble */}
        {message.replyTo && (
          <View className="max-w-[78%] mb-1 px-3 py-1.5 rounded-lg bg-surface-elevated/50 border-l-2 border-accent-primary">
            <Text className="text-accent-primary text-[11px] font-semibold" numberOfLines={1}>
              {message.replyTo.senderName}
            </Text>
            <Text className="text-text-tertiary text-[12px]" numberOfLines={1}>
              {message.replyTo.content}
            </Text>
          </View>
        )}

        {message.type === 'image' ? (
          <View
            className={`max-w-[250px] rounded-2xl overflow-hidden ${
              isMine ? 'rounded-br-md' : 'rounded-bl-md'
            } ${isFailed ? 'opacity-60' : ''}`}
          >
            <Image
              source={{ uri: message.content }}
              style={{
                width: 250,
                aspectRatio: (message.metadata?.width as number) && (message.metadata?.height as number)
                  ? (message.metadata!.width as number) / (message.metadata!.height as number)
                  : 4 / 3,
              }}
              contentFit="cover"
              transition={200}
            />
          </View>
        ) : (
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
        )}

        {/* Reaction pills */}
        <ReactionPills
          reactions={message.reactions ?? []}
          currentUserId={currentUserId}
          onToggle={(emoji) => onReact?.(message.id, emoji)}
        />

        <View className="flex-row items-center">
          {message.isEdited && (
            <Text className="text-text-tertiary text-[10px] mt-1 ml-2">(edited)</Text>
          )}
          <Text className="text-text-tertiary text-[10px] mt-1 mx-2">
            {format(message.timestamp, 'HH:mm')}
          </Text>
          {isMine && (
            <SendStatusIndicator
              status={message.sendStatus}
              isRead={message.isRead}
              onRetry={() => onRetry?.(message.id)}
            />
          )}
        </View>
      </Pressable>
    </>
  );
}
