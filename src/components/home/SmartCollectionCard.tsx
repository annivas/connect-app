import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SmartCollection } from '../../types';

interface Props {
  collection: SmartCollection;
  onPress?: () => void;
}

export function SmartCollectionCard({ collection, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress ? () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      } : undefined}
      className="active:opacity-80"
    >
      <View
        className="rounded-2xl p-3.5 mr-3"
        style={{ width: 140, backgroundColor: `${collection.color}15` }}
      >
        <View
          className="w-9 h-9 rounded-full items-center justify-center mb-2"
          style={{ backgroundColor: `${collection.color}25` }}
        >
          <Ionicons
            name={collection.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={collection.color}
          />
        </View>
        <Text className="text-text-primary text-sm font-medium" numberOfLines={1}>
          {collection.name}
        </Text>
        <Text className="text-text-tertiary text-xs mt-0.5">
          {collection.items.length} item{collection.items.length !== 1 ? 's' : ''}
        </Text>
        <View className="flex-row items-center mt-1.5">
          <Ionicons name="sparkles" size={10} color={collection.color} />
          <Text className="text-text-tertiary text-[9px] ml-0.5">Auto-generated</Text>
        </View>
      </View>
    </Pressable>
  );
}
