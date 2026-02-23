import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import type { GroupEvent } from '../../types';

interface Props {
  event: GroupEvent;
  onPress: () => void;
}

export function EventCard({ event, onPress }: Props) {
  const goingCount = event.attendees.filter((a) => a.status === 'going').length;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="bg-surface-elevated rounded-2xl p-3 mx-3 mb-2 active:opacity-80"
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-xl bg-accent-primary/20 items-center justify-center mr-3">
          <Ionicons name="calendar" size={20} color="#D4764E" />
        </View>
        <View className="flex-1">
          <Text className="text-text-primary text-sm font-semibold">{event.title}</Text>
          <View className="flex-row items-center mt-0.5">
            <Text className="text-text-tertiary text-xs">
              {format(event.startDate, 'MMM d, h:mm a')}
            </Text>
            <Text className="text-text-tertiary text-xs ml-2">
              {goingCount} going
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Text className="text-accent-primary text-xs font-medium mr-1">Chat</Text>
          <Ionicons name="chevron-forward" size={14} color="#D4764E" />
        </View>
      </View>
    </Pressable>
  );
}
