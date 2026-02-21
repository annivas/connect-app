import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Collection } from '../../types';

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  places: 'location',
  songs: 'musical-notes',
  photos: 'image',
  links: 'link',
  mixed: 'albums',
};

const typeColors: Record<string, string> = {
  places: '#10B981',
  songs: '#8B5CF6',
  photos: '#3B82F6',
  links: '#F59E0B',
  mixed: '#6366F1',
};

interface Props {
  collection: Collection;
}

export function CollectionCard({ collection }: Props) {
  const color = typeColors[collection.type] || '#6366F1';
  const icon = typeIcons[collection.type] || 'albums';

  return (
    <Pressable className="w-40 active:opacity-80">
      <View className="bg-surface rounded-2xl p-4 h-32 justify-between">
        <View
          className="w-12 h-12 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text className="text-text-tertiary text-xs">
          {collection.items.length} items
        </Text>
      </View>
      <Text
        className="text-text-primary font-semibold mt-2 text-sm"
        numberOfLines={1}
      >
        {collection.name}
      </Text>
      {collection.description && (
        <Text className="text-text-tertiary text-xs mt-0.5" numberOfLines={1}>
          {collection.description}
        </Text>
      )}
    </Pressable>
  );
}
