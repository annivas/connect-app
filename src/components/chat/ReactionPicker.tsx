import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  onMore?: () => void;
}

export function ReactionPicker({ onSelect, onClose, onMore }: Props) {
  return (
    <View
      className="flex-row bg-surface-elevated rounded-full px-1.5 py-1 border border-border-subtle items-center"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      {EMOJI_OPTIONS.map((emoji) => (
        <Pressable
          key={emoji}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(emoji);
            onClose();
          }}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-surface-hover"
          hitSlop={2}
        >
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </Pressable>
      ))}
      {/* "More" button for Copy/Edit/Delete actions */}
      {onMore && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose();
            // Small delay to let the picker dismiss before showing ActionSheet
            setTimeout(() => onMore(), 150);
          }}
          className="w-9 h-9 items-center justify-center rounded-full active:bg-surface-hover ml-0.5"
          hitSlop={2}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#7A6355" />
        </Pressable>
      )}
    </View>
  );
}
