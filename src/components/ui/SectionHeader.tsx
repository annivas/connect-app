import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-text-primary text-xl font-semibold">{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} className="flex-row items-center">
          <Text className="text-accent-primary text-sm font-medium mr-1">
            See All
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#D4764E" />
        </Pressable>
      )}
    </View>
  );
}
