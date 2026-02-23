import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { DisappearingDuration } from '../../types';

interface Props {
  duration: DisappearingDuration;
  onPress: () => void;
}

const DURATION_LABELS: Record<DisappearingDuration, string> = {
  '30s': '30 seconds',
  '5m': '5 minutes',
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
  off: 'Off',
};

export function DisappearingMessagesBanner({ duration, onPress }: Props) {
  if (duration === 'off') return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-center py-2 px-4 bg-accent-primary/10 border-b border-border-subtle"
      >
        <Ionicons name="timer-outline" size={14} color="#D4764E" />
        <Text className="text-accent-primary text-[12px] font-medium ml-1.5">
          Disappearing messages: {DURATION_LABELS[duration]}
        </Text>
        <Ionicons name="chevron-forward" size={12} color="#D4764E" style={{ marginLeft: 4 }} />
      </Pressable>
    </Animated.View>
  );
}
