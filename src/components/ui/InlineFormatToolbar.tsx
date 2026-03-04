import React from 'react';
import { View, Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { InlineFormat } from '../../utils/inlineFormatting';

interface Props {
  onFormat: (format: InlineFormat) => void;
}

const buttons: { format: InlineFormat; label: string; style: object }[] = [
  { format: 'bold', label: 'B', style: { fontWeight: '700' as const, fontSize: 16 } },
  { format: 'italic', label: 'I', style: { fontStyle: 'italic' as const, fontSize: 16 } },
  { format: 'strikethrough', label: 'S', style: { textDecorationLine: 'line-through' as const, fontSize: 16 } },
  { format: 'monospace', label: '</>', style: { fontFamily: 'Courier', fontSize: 13 } },
];

export function InlineFormatToolbar({ onFormat }: Props) {
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      {buttons.map((btn) => (
        <Pressable
          key={btn.format}
          onPress={() => {
            Haptics.selectionAsync();
            onFormat(btn.format);
          }}
          className="w-10 h-10 rounded-lg items-center justify-center"
          hitSlop={4}
        >
          <Text className="text-text-secondary" style={btn.style}>
            {btn.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
