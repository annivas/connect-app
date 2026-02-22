import React, { useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Conversation } from '../../types';
import { useUserStore } from '../../stores/useUserStore';
import { useMessagesStore } from '../../stores/useMessagesStore';

interface Props {
  conversation: Conversation;
}

function formatTimestamp(date: Date) {
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

export function ConversationListItem({ conversation }: Props) {
  const router = useRouter();
  const getUserById = useUserStore((s) => s.getUserById);
  const swipeableRef = useRef<Swipeable>(null);

  const otherUserId = conversation.participants.find(
    (id) => id !== useUserStore.getState().currentUser?.id
  );
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  if (!otherUser) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/messages/${conversation.id}` as never);
  };

  const renderLeftActions = () => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        useMessagesStore.getState().togglePin(conversation.id);
        swipeableRef.current?.close();
      }}
      className="bg-accent-primary justify-center px-5"
    >
      <Ionicons
        name={conversation.isPinned ? 'pin-outline' : 'pin'}
        size={22}
        color="#FFFFFF"
      />
    </Pressable>
  );

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        useMessagesStore.getState().toggleMute(conversation.id);
        swipeableRef.current?.close();
      }}
      className="bg-surface-elevated justify-center px-5"
    >
      <Ionicons
        name={conversation.isMuted ? 'notifications' : 'notifications-off'}
        size={22}
        color="#7A6355"
      />
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      <Pressable
        onPress={handlePress}
        className="flex-row items-center px-4 py-3 bg-background-primary active:bg-surface-hover"
      >
        {conversation.isPinned && (
          <View className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent-primary" />
        )}

        <Avatar
          uri={otherUser.avatar}
          size="lg"
          status={otherUser.status}
          showStatus
        />

        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-1 mr-2">
              <Text
                className="text-text-primary text-[16px] font-semibold"
                numberOfLines={1}
              >
                {otherUser.name}
              </Text>
              {conversation.isMuted && (
                <Ionicons
                  name="notifications-off"
                  size={14}
                  color="#A8937F"
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
            {conversation.lastMessage && (
              <Text className="text-text-tertiary text-xs">
                {formatTimestamp(conversation.lastMessage.timestamp)}
              </Text>
            )}
          </View>

          <View className="flex-row items-center justify-between">
            <Text
              className="text-text-secondary text-sm flex-1 mr-2"
              numberOfLines={1}
            >
              {conversation.lastMessage?.content || 'No messages yet'}
            </Text>
            {conversation.unreadCount > 0 && (
              <Badge count={conversation.unreadCount} />
            )}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}
