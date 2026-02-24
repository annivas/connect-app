import React, { useRef } from 'react';
import { View, Text, Pressable, Animated, ActionSheetIOS, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { renderHighlightedText } from '../../utils/highlightText';
import { Conversation } from '../../types';
import { useUserStore } from '../../stores/useUserStore';
import { useMessagesStore } from '../../stores/useMessagesStore';

const EMPTY_TYPING_USERS: string[] = [];

interface Props {
  conversation: Conversation;
  highlightText?: string;
}

function formatTimestamp(date: Date) {
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

export function ConversationListItem({ conversation, highlightText }: Props) {
  const router = useRouter();
  const getUserById = useUserStore((s) => s.getUserById);
  const swipeableRef = useRef<Swipeable>(null);
  const typingUserIds = useMessagesStore((s) => s.typingUsers[conversation.id] ?? EMPTY_TYPING_USERS);
  const draft = useMessagesStore((s) => s.drafts?.[conversation.id]);

  const otherUserId = conversation.participants.find(
    (id) => id !== useUserStore.getState().currentUser?.id
  );
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  if (!otherUser) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/messages/${conversation.id}` as never);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { togglePin, toggleMute, toggleArchive, markAsUnread } = useMessagesStore.getState();
    const isPinned = conversation.isPinned;
    const isMuted = conversation.isMuted;
    const isArchived = conversation.isArchived;

    const options = [
      isPinned ? 'Unpin' : 'Pin',
      isMuted ? 'Unmute' : 'Mute',
      'Mark as Unread',
      isArchived ? 'Unarchive' : 'Archive',
      'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 4, destructiveButtonIndex: 3 },
        (idx) => {
          if (idx === 0) togglePin(conversation.id);
          if (idx === 1) toggleMute(conversation.id);
          if (idx === 2) markAsUnread(conversation.id);
          if (idx === 3) toggleArchive(conversation.id);
        },
      );
    } else {
      Alert.alert('Options', undefined, [
        { text: options[0], onPress: () => togglePin(conversation.id) },
        { text: options[1], onPress: () => toggleMute(conversation.id) },
        { text: options[2], onPress: () => markAsUnread(conversation.id) },
        { text: options[3], onPress: () => toggleArchive(conversation.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
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
    <View className="flex-row">
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
          color="#A8937F"
        />
      </Pressable>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          useMessagesStore.getState().toggleArchive(conversation.id);
          swipeableRef.current?.close();
        }}
        className="bg-status-warning justify-center px-5"
      >
        <Ionicons
          name={conversation.isArchived ? 'arrow-undo' : 'archive'}
          size={22}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
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
        onLongPress={handleLongPress}
        delayLongPress={500}
        className="flex-row items-center px-4 py-3 bg-background-primary active:bg-surface-hover"
        style={conversation.isArchived ? { opacity: 0.6 } : undefined}
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
            <View className="flex-1 mr-2" style={{ overflow: 'hidden' }}>
              {typingUserIds.length > 0 ? (
                <Text className="text-accent-primary text-sm italic" numberOfLines={1}>
                  {(() => {
                    const names = typingUserIds
                      .map((uid) => getUserById(uid)?.name?.split(' ')[0])
                      .filter(Boolean);
                    if (names.length === 1) return `${names[0]} is typing...`;
                    return `${names.join(', ')} are typing...`;
                  })()}
                </Text>
              ) : draft ? (
                <Text className="text-sm" numberOfLines={1}>
                  <Text className="text-status-error font-medium">[Draft] </Text>
                  <Text className="text-text-secondary">{draft}</Text>
                </Text>
              ) : highlightText && conversation.lastMessage?.content ? (
                renderHighlightedText(
                  conversation.lastMessage.content,
                  highlightText,
                  'text-text-secondary text-sm',
                )
              ) : (
                <Text
                  className="text-text-secondary text-sm"
                  numberOfLines={1}
                >
                  {conversation.lastMessage?.content || 'No messages yet'}
                </Text>
              )}
            </View>
            {conversation.unreadCount > 0 && (
              <Badge count={conversation.unreadCount} />
            )}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}
