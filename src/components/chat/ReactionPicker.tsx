import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: Props) {
  return (
    <View className="flex-row bg-surface-elevated rounded-full px-2 py-1.5 shadow-lg">
      {EMOJI_OPTIONS.map((emoji) => (
        <Pressable
          key={emoji}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(emoji);
            onClose();
          }}
          className="px-2 py-1 active:opacity-60"
          hitSlop={4}
        >
          <Text className="text-xl">{emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}
