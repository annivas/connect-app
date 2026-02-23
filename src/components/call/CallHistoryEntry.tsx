import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../../stores/useUserStore';
import { useCallStore } from '../../stores/useCallStore';
import type { CallEntry } from '../../types';

interface Props {
  entry: CallEntry;
  conversationId: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `0:${secs.toString().padStart(2, '0')}`;
}

export function CallHistoryEntry({ entry, conversationId }: Props) {
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const getUserById = useUserStore((s) => s.getUserById);

  const isOutgoing = entry.callerId === currentUserId;
  const isMissed = entry.status === 'missed';
  const isDeclined = entry.status === 'declined';
  const isAnswered = entry.status === 'answered';
  const isVideo = entry.type === 'video';

  // Determine the other participant for display
  const otherUserId = isOutgoing ? entry.receiverIds[0] : entry.callerId;
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  // Icon and color based on call status
  const iconName = isVideo ? 'videocam' : 'call';
  const statusColor = isMissed ? '#EF4444' : isDeclined ? '#A0A0AB' : '#10B981';
  const directionIcon = isOutgoing ? 'arrow-up-outline' : 'arrow-down-outline';

  // Status text
  let statusText: string;
  if (isMissed) {
    statusText = `Missed ${isVideo ? 'video' : 'voice'} call`;
  } else if (isDeclined) {
    statusText = `Declined ${isVideo ? 'video' : 'voice'} call`;
  } else if (isAnswered && entry.duration != null) {
    statusText = `${isVideo ? 'Video' : 'Voice'} call \u00B7 ${formatDuration(entry.duration)}`;
  } else {
    statusText = `${isVideo ? 'Video' : 'Voice'} call`;
  }

  const handleTapCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (otherUserId) {
      useCallStore.getState().initiateCall(conversationId, [otherUserId], entry.type);
    }
  };

  return (
    <Pressable onPress={handleTapCall} className="my-1.5">
      <View className="flex-row items-center justify-center py-2 px-4">
        <View
          className="w-8 h-8 rounded-full items-center justify-center mr-2.5"
          style={{ backgroundColor: `${statusColor}20` }}
        >
          <Ionicons name={iconName} size={16} color={statusColor} />
        </View>

        <View className="items-center flex-1">
          <View className="flex-row items-center">
            <Ionicons
              name={directionIcon}
              size={12}
              color={statusColor}
              style={{ marginRight: 4 }}
            />
            <Text
              className="text-[13px] font-medium"
              style={{ color: statusColor }}
            >
              {statusText}
            </Text>
          </View>
          <Text className="text-text-tertiary text-[11px] mt-0.5">
            {format(entry.startedAt, 'HH:mm')}
          </Text>
        </View>

        <View
          className="w-8 h-8 rounded-full items-center justify-center ml-2.5"
          style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }}
        >
          <Ionicons name={iconName} size={14} color="#6366F1" />
        </View>
      </View>
    </Pressable>
  );
}
