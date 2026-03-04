import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  query: string;
  onChangeQuery: (query: string) => void;
}

export function NoteSearchHeader({ query, onChangeQuery }: Props) {
  return (
    <View className="flex-row items-center bg-surface rounded-xl mx-4 mt-3 mb-2 px-3 py-2">
      <Ionicons name="search" size={16} color="#A8937F" />
      <TextInput
        value={query}
        onChangeText={onChangeQuery}
        placeholder="Search notes..."
        placeholderTextColor="#A8937F"
        className="flex-1 text-text-primary text-[14px] ml-2 py-0"
        returnKeyType="search"
      />
      {query.length > 0 && (
        <Pressable onPress={() => onChangeQuery('')} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color="#A8937F" />
        </Pressable>
      )}
    </View>
  );
}
