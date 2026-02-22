import React from 'react';
import { View, Text, Pressable, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import type { User } from '../../types';

interface Props {
  user: User;
  isAdmin: boolean;
  isCurrentUser: boolean;
  canManage: boolean; // true if current user is admin
  onRemove?: () => void;
  onToggleAdmin?: () => void;
}

export function MemberListItem({
  user,
  isAdmin,
  isCurrentUser,
  canManage,
  onRemove,
  onToggleAdmin,
}: Props) {
  const handleLongPress = () => {
    if (!canManage || isCurrentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const adminLabel = isAdmin ? 'Remove Admin' : 'Make Admin';
    const options = [adminLabel, 'Remove from Group', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0) onToggleAdmin?.();
          if (idx === 1) {
            Alert.alert(
              'Remove Member',
              `Remove ${user.name} from this group?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: onRemove },
              ],
            );
          }
        },
      );
    } else {
      Alert.alert('Member Options', undefined, [
        { text: adminLabel, onPress: onToggleAdmin },
        {
          text: 'Remove from Group',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Remove Member',
              `Remove ${user.name} from this group?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: onRemove },
              ],
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <Pressable
      onLongPress={canManage && !isCurrentUser ? handleLongPress : undefined}
      className="flex-row items-center py-2.5 px-4"
    >
      <Avatar uri={user.avatar} size="sm" status={user.status} showStatus />
      <View className="ml-3 flex-1">
        <Text className="text-text-primary text-[15px] font-medium">
          {user.name}
        </Text>
        <Text className="text-text-tertiary text-xs">@{user.username}</Text>
      </View>
      {isCurrentUser && (
        <Text className="text-text-tertiary text-xs mr-2">You</Text>
      )}
      {isAdmin && (
        <View className="bg-accent-primary/20 rounded-full px-2.5 py-1">
          <Text className="text-accent-primary text-[11px] font-semibold">Admin</Text>
        </View>
      )}
      {canManage && !isCurrentUser && (
        <Ionicons name="ellipsis-horizontal" size={16} color="#A8937F" style={{ marginLeft: 8 }} />
      )}
    </Pressable>
  );
}
