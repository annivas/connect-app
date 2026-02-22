import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  query: string;
  onChangeQuery: (text: string) => void;
  matchCount: number;
  onClose: () => void;
}

export function InChatSearchBar({ visible, query, onChangeQuery, matchCount, onClose }: Props) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Delay focus so the view mounts first
      const timeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View className="flex-row items-center px-3 py-2 bg-surface-elevated border-b border-border-subtle">
      <Ionicons name="search" size={16} color="#A8937F" />
      <TextInput
        ref={inputRef}
        value={query}
        onChangeText={onChangeQuery}
        placeholder="Search in chat..."
        placeholderTextColor="#A8937F"
        className="flex-1 text-text-primary text-[15px] mx-2 py-1"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {query.length > 0 && (
        <Text className="text-text-tertiary text-xs mr-2">
          {matchCount} {matchCount === 1 ? 'result' : 'results'}
        </Text>
      )}
      <Pressable onPress={onClose} hitSlop={8}>
        <Ionicons name="close-circle" size={20} color="#A8937F" />
      </Pressable>
    </View>
  );
}
