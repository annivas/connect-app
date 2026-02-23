import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { EventHint } from '../../utils/eventDetection';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  hint: EventHint;
  onCreateEvent: () => void;
  onDismiss: () => void;
}

export function EventSuggestionChip({ hint, onCreateEvent, onDismiss }: Props) {
  const senderName = useUserStore((s) => s.getUserById(hint.senderId))?.name ?? 'Someone';

  return (
    <View className="mx-3 mb-2 bg-surface-elevated rounded-2xl p-3 border border-border-subtle">
      <View className="flex-row items-center mb-2">
        <View className="w-7 h-7 rounded-full bg-accent-primary/20 items-center justify-center mr-2">
          <Ionicons name="calendar" size={14} color="#D4764E" />
        </View>
        <Text className="text-text-secondary text-xs flex-1" numberOfLines={1}>
          {senderName} suggested an activity
        </Text>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onDismiss();
          }}
          hitSlop={8}
        >
          <Ionicons name="close" size={16} color="#A8937F" />
        </Pressable>
      </View>

      <Text className="text-text-primary text-sm mb-3" numberOfLines={2}>
        "{hint.content}"
      </Text>

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCreateEvent();
          }}
          className="flex-1 bg-accent-primary rounded-xl py-2 items-center active:opacity-80"
        >
          <Text className="text-white text-sm font-semibold">Create Event</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onDismiss();
          }}
          className="flex-1 bg-surface rounded-xl py-2 items-center active:opacity-80"
        >
          <Text className="text-text-secondary text-sm font-medium">Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}
