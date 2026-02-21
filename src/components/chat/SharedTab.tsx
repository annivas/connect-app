import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { EmptyState } from '../ui/EmptyState';
import { useMessagesStore } from '../../stores/useMessagesStore';
import type { SharedObject, SharedObjectType } from '../../types';

// ─── Filter chips ────────────────────────────

type FilterKey = 'all' | SharedObjectType;

const FILTERS: { key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'link', label: 'Links', icon: 'link-outline' },
  { key: 'place', label: 'Places', icon: 'location-outline' },
  { key: 'song', label: 'Songs', icon: 'musical-notes-outline' },
  { key: 'photo', label: 'Photos', icon: 'image-outline' },
];

function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      className={`flex-row items-center px-3.5 py-2 rounded-full mr-2 ${
        active ? 'bg-accent-primary' : 'bg-surface-elevated'
      }`}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? '#FFFFFF' : '#A0A0AB'}
      />
      <Text
        className={`text-xs font-semibold ml-1.5 ${
          active ? 'text-white' : 'text-text-secondary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Shared item card ────────────────────────

const typeIcons: Record<SharedObjectType, keyof typeof Ionicons.glyphMap> = {
  link: 'link',
  place: 'location',
  song: 'musical-notes',
  photo: 'image',
  video: 'videocam',
  file: 'document',
};

const typeColors: Record<SharedObjectType, string> = {
  link: '#3B82F6',
  place: '#10B981',
  song: '#8B5CF6',
  photo: '#F59E0B',
  video: '#EF4444',
  file: '#6B7280',
};

function SharedItemCard({ item }: { item: SharedObject }) {
  const color = typeColors[item.type];
  const icon = typeIcons[item.type];

  return (
    <View className="bg-surface rounded-2xl overflow-hidden mb-3 mx-4">
      {/* Thumbnail row */}
      {item.thumbnail && (
        <Image
          source={{ uri: item.thumbnail }}
          style={{ width: '100%', height: 140 }}
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Content */}
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
          <Text className="text-text-tertiary text-xs mb-2" numberOfLines={1}>
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

// ─── Main component ──────────────────────────

interface SharedTabProps {
  conversationId?: string;
  sharedObjects?: SharedObject[];
}

export function SharedTab({ conversationId, sharedObjects: directObjects }: SharedTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const conversation = useMessagesStore(
    useShallow((s) => (conversationId ? s.getConversationById(conversationId) : undefined))
  );

  const sharedObjects = directObjects ?? conversation?.metadata?.sharedObjects ?? [];

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return sharedObjects;
    return sharedObjects.filter((obj) => obj.type === activeFilter);
  }, [sharedObjects, activeFilter]);

  if (sharedObjects.length === 0) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="folder-open-outline"
          title="No shared items"
          description="Photos, links, places, and songs you share will appear here"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-3">
            <FlatList
              data={FILTERS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(f) => f.key}
              renderItem={({ item: f }) => (
                <FilterChip
                  label={f.label}
                  icon={f.icon}
                  active={activeFilter === f.key}
                  onPress={() => setActiveFilter(f.key)}
                />
              )}
            />
          </View>
        }
        renderItem={({ item }) => <SharedItemCard item={item} />}
        ListEmptyComponent={
          <View className="px-4 py-12 items-center">
            <Ionicons name="search-outline" size={28} color="#6B6B76" />
            <Text className="text-text-tertiary text-sm mt-2">
              No {activeFilter === 'all' ? 'items' : activeFilter + 's'} found
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
