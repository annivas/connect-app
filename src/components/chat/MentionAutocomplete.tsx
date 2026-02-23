import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { User } from '../../types';

interface Props {
  query: string;
  members: User[];
  onSelect: (user: User) => void;
}

export function MentionAutocomplete({ query, members, onSelect }: Props) {
  const filteredMembers = useMemo(() => {
    if (!query) return members.slice(0, 5);
    const q = query.toLowerCase();
    return members
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query, members]);

  if (filteredMembers.length === 0) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-surface-elevated rounded-xl border border-border-subtle overflow-hidden"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(item);
            }}
            className="flex-row items-center px-3 py-2.5 active:bg-surface-hover"
          >
            <Image
              source={{ uri: item.avatar }}
              style={{ width: 28, height: 28, borderRadius: 14 }}
              contentFit="cover"
            />
            <Text className="text-text-primary text-[14px] font-medium ml-2.5">
              {item.name}
            </Text>
            {item.username && (
              <Text className="text-text-tertiary text-[12px] ml-1.5">
                @{item.username}
              </Text>
            )}
          </Pressable>
        )}
      />
    </Animated.View>
  );
}
