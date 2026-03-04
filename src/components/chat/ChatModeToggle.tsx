import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export type ChatMode = 'chat' | 'private';

interface Props {
  activeMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export function ChatModeToggle({ activeMode, onModeChange }: Props) {
  return (
    <View className="flex-row px-4 pt-2 pb-1 gap-2">
      {(['chat', 'private'] as const).map((mode) => (
        <Pressable
          key={mode}
          onPress={() => {
            Haptics.selectionAsync();
            onModeChange(mode);
          }}
          className="flex-1"
        >
          <View
            className={`flex-row items-center justify-center rounded-xl py-2 ${
              activeMode === mode ? 'bg-accent-primary' : 'bg-surface'
            }`}
          >
            <Ionicons
              name={mode === 'chat' ? 'chatbubbles-outline' : 'lock-closed-outline'}
              size={15}
              color={activeMode === mode ? '#FFFFFF' : '#7A6355'}
            />
            <Text
              className={`text-xs font-medium ml-1.5 ${
                activeMode === mode ? 'text-white' : 'text-text-secondary'
              }`}
            >
              {mode === 'chat' ? 'Chat' : 'Private'}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
