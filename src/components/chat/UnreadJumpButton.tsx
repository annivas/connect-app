import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeOut, SlideInDown } from 'react-native-reanimated';

interface Props {
  unreadCount: number;
  onPress: () => void;
}

export function UnreadJumpButton({ unreadCount, onPress }: Props) {
  if (unreadCount <= 0) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify().damping(14).stiffness(200)}
      exiting={FadeOut.duration(150)}
      className="absolute bottom-24 right-4"
      style={{
        shadowColor: '#D4764E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
      }}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        className="flex-row items-center bg-accent-primary rounded-full px-4 py-2.5"
      >
        <Ionicons name="arrow-down" size={16} color="#FFFFFF" />
        <Text className="text-white text-[13px] font-semibold ml-1.5">
          {unreadCount} unread
        </Text>
      </Pressable>
    </Animated.View>
  );
}
