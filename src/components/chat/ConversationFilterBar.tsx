import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ConversationFilter } from '../../types';

interface FilterOption {
  key: ConversationFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const FILTERS: FilterOption[] = [
  { key: 'all', label: 'All', icon: 'chatbubbles-outline' },
  { key: 'unread', label: 'Unread', icon: 'mail-unread-outline' },
  { key: 'groups', label: 'Groups', icon: 'people-outline' },
  { key: 'archived', label: 'Archived', icon: 'archive-outline' },
];

interface Props {
  activeFilter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  counts: Record<ConversationFilter, number>;
}

export function ConversationFilterBar({ activeFilter, onFilterChange, counts }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
    >
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = counts[filter.key];

        return (
          <Pressable
            key={filter.key}
            onPress={() => {
              Haptics.selectionAsync();
              onFilterChange(filter.key);
            }}
            className={`flex-row items-center px-3.5 py-2 rounded-full mr-2 ${
              isActive ? 'bg-accent-primary' : 'bg-surface-elevated'
            }`}
          >
            <Ionicons
              name={filter.icon}
              size={14}
              color={isActive ? '#FFFFFF' : '#A0A0AB'}
            />
            <Text
              className={`text-xs font-semibold ml-1.5 ${
                isActive ? 'text-white' : 'text-text-secondary'
              }`}
            >
              {filter.label}
            </Text>
            {count > 0 && filter.key !== 'all' && (
              <View
                className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-surface-hover'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    isActive ? 'text-white' : 'text-text-tertiary'
                  }`}
                >
                  {count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
