import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Collection } from '../../types';

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  places: 'location',
  songs: 'musical-notes',
  photos: 'image',
  links: 'link',
  mixed: 'albums',
};

const typeColors: Record<string, string> = {
  places: '#2D9F6F',
  songs: '#C2956B',
  photos: '#5B8EC9',
  links: '#D4964E',
  mixed: '#D4764E',
};

interface Props {
  collection: Collection;
}

export function CollectionCard({ collection }: Props) {
  const router = useRouter();
  const color = typeColors[collection.type] || '#D4764E';
  const icon = typeIcons[collection.type] || 'albums';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/home/${collection.id}` as any);
  };

  return (
    <Pressable onPress={handlePress} className="w-40 active:opacity-80">
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
