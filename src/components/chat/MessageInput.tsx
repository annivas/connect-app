import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  onSend: (content: string) => void;
}

export function MessageInput({ onSend }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend(trimmed);
    setText('');
  };

  const hasText = text.trim().length > 0;

  return (
    <View className="flex-row items-end px-4 py-3 bg-background-secondary border-t border-border-subtle">
      <View className="flex-1 flex-row items-end bg-surface rounded-3xl px-4 py-2 mr-2 min-h-[44px]">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor="#6B6B76"
          className="flex-1 text-text-primary text-[15px] max-h-[100px]"
          multiline
          textAlignVertical="center"
        />
      </View>

      <Pressable
        onPress={handleSend}
        disabled={!hasText}
        className={`w-11 h-11 rounded-full items-center justify-center ${
          hasText ? 'bg-accent-primary' : 'bg-surface'
        }`}
      >
        <Ionicons
          name="arrow-up"
          size={22}
          color={hasText ? '#FFFFFF' : '#6B6B76'}
        />
      </Pressable>
    </View>
  );
}
