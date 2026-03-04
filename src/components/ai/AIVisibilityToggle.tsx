import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { AIVisibility } from '../../types';

interface Props {
  visibility: AIVisibility;
  onToggle: (visibility: AIVisibility) => void;
}

export function AIVisibilityToggle({ visibility, onToggle }: Props) {
  const isEnabled = visibility === 'ai-enabled';

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onToggle(isEnabled ? 'ai-restricted' : 'ai-enabled');
      }}
      className="flex-row items-center px-3 py-2 mx-4 my-1 rounded-xl bg-background-secondary"
    >
      <View
        className={`w-6 h-6 rounded-full items-center justify-center ${
          isEnabled ? 'bg-status-success/15' : 'bg-surface'
        }`}
      >
        <Ionicons
          name={isEnabled ? 'eye-outline' : 'eye-off-outline'}
          size={14}
          color={isEnabled ? '#2D9F6F' : '#A8937F'}
        />
      </View>
      <View className="flex-1 ml-2.5">
        <Text className="text-text-primary text-[13px] font-medium">
          {isEnabled ? 'AI can access context' : 'AI restricted'}
        </Text>
        <Text className="text-text-tertiary text-[11px]">
          {isEnabled
            ? 'AI can read chat context, files, and notes'
            : 'AI only sees messages sent directly to it'}
        </Text>
      </View>
      <View
        className={`w-10 h-6 rounded-full ${isEnabled ? 'bg-status-success' : 'bg-border'} items-center justify-center`}
      >
        <View
          className="w-4.5 h-4.5 rounded-full bg-white"
          style={{
            width: 18,
            height: 18,
            transform: [{ translateX: isEnabled ? 7 : -7 }],
          }}
        />
      </View>
    </Pressable>
  );
}
