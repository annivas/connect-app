import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="w-20 h-20 bg-surface-elevated rounded-full items-center justify-center mb-4">
        <Ionicons name={icon} size={32} color="#A8937F" />
      </View>
      <Text className="text-text-primary text-lg font-semibold mb-2">
        {title}
      </Text>
      {description && (
        <Text className="text-text-secondary text-sm text-center">
          {description}
        </Text>
      )}
    </View>
  );
}
