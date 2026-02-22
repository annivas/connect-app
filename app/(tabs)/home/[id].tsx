import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { IconButton } from '../../../src/components/ui/IconButton';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { useHomeStore } from '../../../src/stores/useHomeStore';
import type { SharedObject, SharedObjectType } from '../../../src/types';

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

const itemIcons: Record<SharedObjectType, keyof typeof Ionicons.glyphMap> = {
  link: 'link',
  place: 'location',
  song: 'musical-notes',
  photo: 'image',
  video: 'videocam',
  file: 'document',
};

const itemColors: Record<SharedObjectType, string> = {
  link: '#5B8EC9',
  place: '#2D9F6F',
  song: '#C2956B',
  photo: '#D4964E',
  video: '#C94F4F',
  file: '#A8937F',
};

function CollectionItem({ item }: { item: SharedObject }) {
  const color = itemColors[item.type];
  const icon = itemIcons[item.type];

  return (
    <View className="bg-surface rounded-2xl overflow-hidden mb-3 mx-4">
      {item.thumbnail && (
        <Image
          source={{ uri: item.thumbnail }}
          style={{ width: '100%', height: 140 }}
          contentFit="cover"
          transition={200}
        />
      )}
      <View className="p-3.5">
        <View className="flex-row items-center mb-1.5">
          <View
            className="w-6 h-6 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: `${color}25` }}
          >
            <Ionicons name={icon} size={13} color={color} />
          </View>
          <Text className="text-text-primary font-semibold text-[15px] flex-1" numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        {item.description && (
          <Text className="text-text-tertiary text-xs mb-2" numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text className="text-text-tertiary text-[10px]">
          {format(item.sharedAt, 'MMM d, yyyy')}
        </Text>
      </View>
    </View>
  );
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const collections = useHomeStore((s) => s.collections);
  const collection = collections.find((c) => c.id === id);

  if (!collection) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
        <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
          <IconButton icon="chevron-back" onPress={() => router.back()} />
          <Text className="text-text-primary text-[17px] font-semibold ml-1">
            Collection
          </Text>
        </View>
        <EmptyState
          icon="folder-open-outline"
          title="Collection not found"
          description="This collection may have been deleted"
        />
      </SafeAreaView>
    );
  }

  const color = typeColors[collection.type] || '#D4764E';
  const icon = typeIcons[collection.type] || 'albums';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">
          Collection
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Collection header */}
        <View className="px-4 pt-6 pb-4">
          <View className="flex-row items-center mb-3">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
              style={{ backgroundColor: `${color}20` }}
            >
              <Ionicons name={icon} size={28} color={color} />
            </View>
            <View className="flex-1">
              <Text className="text-text-primary text-2xl font-bold">
                {collection.name}
              </Text>
              <Text className="text-text-tertiary text-sm mt-1">
                {collection.items.length} {collection.items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
          {collection.description && (
            <Text className="text-text-secondary text-[15px]">
              {collection.description}
            </Text>
          )}
        </View>

        {/* Items */}
        {collection.items.length === 0 ? (
          <View className="px-4 py-12">
            <EmptyState
              icon="folder-open-outline"
              title="No items yet"
              description="Shared items will appear here"
            />
          </View>
        ) : (
          collection.items.map((item) => (
            <CollectionItem key={item.id} item={item} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
