import React from 'react';
import { View, Text, Pressable, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Message } from '../../types';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  message: Message;
  showDateDivider?: boolean;
  onRetry?: (messageId: string) => void;
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
  onRetry,
}: {
  status: Message['sendStatus'];
  onRetry?: () => void;
}) {
  if (!status || status === 'sent') return null;

  if (status === 'sending') {
    return (
      <View className="flex-row items-center mt-0.5 mx-2">
        <Ionicons name="time-outline" size={12} color="#6B6B76" />
      </View>
    );
  }

  // status === 'failed'
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

export function MessageBubble({ message, showDateDivider, onRetry }: Props) {
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const isMine = message.senderId === currentUserId;
  const isFailed = message.sendStatus === 'failed';

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const options = ['Copy Text', 'Cancel'];
    const cancelIndex = 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (idx) => {
          if (idx === 0) Clipboard.setStringAsync(message.content);
        }
      );
    } else {
      Alert.alert('Message', undefined, [
        { text: 'Copy Text', onPress: () => Clipboard.setStringAsync(message.content) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <>
      {showDateDivider && <DateDivider date={message.timestamp} />}
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        className={`mb-2 ${isMine ? 'items-end' : 'items-start'}`}
      >
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
          {isMine && (
            <SendStatusIndicator
              status={message.sendStatus}
              onRetry={() => onRetry?.(message.id)}
            />
          )}
        </View>
      </Pressable>
    </>
  );
}
