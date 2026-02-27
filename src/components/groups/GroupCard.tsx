import React, { useRef } from 'react';
import { View, Text, Pressable, ActionSheetIOS, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { useGroupsStore } from '../../stores/useGroupsStore';
import type { Group } from '../../types';

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  general: 'people',
  trip: 'airplane',
  sports: 'basketball',
  project: 'briefcase',
  household: 'home',
};

function formatTimestamp(date: Date): string {
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

interface Props {
  group: Group;
}

export function GroupCard({ group }: Props) {
  const router = useRouter();
  const swipeableRef = useRef<Swipeable>(null);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/groups/${group.id}` as never);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isPinned = group.isPinned;
    const isMuted = group.isMuted;
    const isArchived = group.isArchived;

    const options = [
      isPinned ? 'Unpin' : 'Pin',
      isMuted ? 'Unmute' : 'Mute',
      isArchived ? 'Unarchive' : 'Archive',
      'Mark as Unread',
      'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 4 },
        (idx) => {
          if (idx === 0) useGroupsStore.getState().togglePin(group.id);
          if (idx === 1) useGroupsStore.getState().toggleMute(group.id);
          if (idx === 2) useGroupsStore.getState().toggleGroupArchive(group.id);
          if (idx === 3) useGroupsStore.getState().markGroupAsUnread(group.id);
        },
      );
    } else {
      Alert.alert('Options', undefined, [
        { text: options[0], onPress: () => useGroupsStore.getState().togglePin(group.id) },
        { text: options[1], onPress: () => useGroupsStore.getState().toggleMute(group.id) },
        { text: options[2], onPress: () => useGroupsStore.getState().toggleGroupArchive(group.id) },
        { text: options[3], onPress: () => useGroupsStore.getState().markGroupAsUnread(group.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const renderLeftActions = () => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        useGroupsStore.getState().togglePin(group.id);
        swipeableRef.current?.close();
      }}
      className="bg-accent-primary justify-center px-5"
    >
      <Ionicons
        name={group.isPinned ? 'pin-outline' : 'pin'}
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
          useGroupsStore.getState().toggleMute(group.id);
          swipeableRef.current?.close();
        }}
        className="bg-surface-elevated justify-center px-5"
      >
        <Ionicons
          name={group.isMuted ? 'notifications' : 'notifications-off'}
          size={22}
          color="#A8937F"
        />
      </Pressable>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          useGroupsStore.getState().toggleGroupArchive(group.id);
          swipeableRef.current?.close();
        }}
        className="bg-status-warning justify-center px-5"
      >
        <Ionicons
          name={group.isArchived ? 'arrow-undo' : 'archive'}
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
        style={group.isArchived ? { opacity: 0.6 } : undefined}
      >
        <Avatar uri={group.avatar} size="lg" />

        <View className="flex-1 ml-3">
          <View className="flex-row items-center mb-0.5">
            <Text
              className="text-text-primary text-[16px] font-semibold flex-1"
              numberOfLines={1}
            >
              {group.name}
            </Text>
            <View className="flex-row items-center">
              {group.isPinned && (
                <Ionicons name="pin" size={14} color="#D4764E" style={{ marginRight: 4 }} />
              )}
              {group.isMuted && (
                <Ionicons name="notifications-off-outline" size={14} color="#A8937F" style={{ marginRight: 4 }} />
              )}
              <Text className="text-text-tertiary text-xs">
                {formatTimestamp(group.lastActivity)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="flex-1 mr-2">
              {group.lastMessage ? (
                <Text className="text-text-secondary text-[13px]" numberOfLines={1}>
                  {group.lastMessage.content}
                </Text>
              ) : group.description ? (
                <Text className="text-text-secondary text-[13px]" numberOfLines={1}>
                  {group.description}
                </Text>
              ) : (
                <Text className="text-text-tertiary text-[13px]">
                  {group.members.length} members
                </Text>
              )}
            </View>

            <View className="flex-row items-center">
              <Ionicons
                name={typeIcons[group.type] || 'people'}
                size={13}
                color="#A8937F"
                style={{ marginRight: 4 }}
              />
              {(group.unreadCount > 0 || group.isMarkedUnread) && (
                <Badge count={group.unreadCount} />
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}
