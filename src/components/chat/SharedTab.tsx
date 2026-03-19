import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { EmptyState } from '../ui/EmptyState';
import { ShareLinkModal } from './ShareLinkModal';
import { useMessagesStore } from '../../stores/useMessagesStore';
import type { SharedObject, SharedObjectType, PlaceMetadata } from '../../types';

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
        color={active ? '#FFFFFF' : '#7A6355'}
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
  link: '#5B8EC9',
  place: '#2D9F6F',
  song: '#C2956B',
  photo: '#D4964E',
  video: '#C94F4F',
  file: '#A8937F',
};

function SharedItemCard({ item, onPress }: { item: SharedObject; onPress?: () => void }) {
  const color = typeColors[item.type];
  const icon = typeIcons[item.type];
  const isPlace = item.type === 'place';
  const placeMetadata = isPlace ? (item.metadata as PlaceMetadata) : null;

  return (
    <Pressable onPress={onPress} className="bg-surface rounded-2xl overflow-hidden mb-3 mx-4">
      {/* Thumbnail row — skip for places */}
      {item.thumbnail && !isPlace && (
        <Image
          source={{ uri: item.thumbnail }}
          style={{ width: '100%', height: 140 }}
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Place-specific header */}
      {isPlace && (
        <View className="px-3.5 pt-3.5">
          <View
            className="rounded-xl p-3 flex-row items-center"
            style={{ backgroundColor: '#2D9F6F15' }}
          >
            <View className="w-10 h-10 rounded-full items-center justify-center bg-status-success/20">
              <Ionicons name="location" size={20} color="#2D9F6F" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-text-primary font-semibold text-[15px]" numberOfLines={1}>
                {item.title}
              </Text>
              {placeMetadata?.address && (
                <Text className="text-text-tertiary text-xs mt-0.5" numberOfLines={2}>
                  {placeMetadata.address}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      <View className="p-3.5">
        {!isPlace && (
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
        )}

        {item.description && (
          <Text className="text-text-tertiary text-xs mb-2" numberOfLines={1}>
            {item.description}
          </Text>
        )}

        <View className="flex-row items-center justify-between">
          <Text className="text-text-tertiary text-[10px]">
            {format(item.sharedAt, 'MMM d, yyyy')}
          </Text>
          {isPlace && (
            <View className="flex-row items-center">
              <Ionicons name="navigate-outline" size={12} color="#2D9F6F" />
              <Text className="text-status-success text-[11px] font-medium ml-1">
                Open in Maps
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main component ──────────────────────────

interface SharedTabProps {
  conversationId?: string;
  sharedObjects?: SharedObject[];
}

export function SharedTab({ conversationId, sharedObjects: directObjects }: SharedTabProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const conversation = useMessagesStore(
    useShallow((s) => (conversationId ? s.getConversationById(conversationId) : undefined))
  );

  const sharedObjects = directObjects ?? conversation?.metadata?.sharedObjects ?? [];

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return sharedObjects;
    return sharedObjects.filter((obj) => obj.type === activeFilter);
  }, [sharedObjects, activeFilter]);

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalVisible(true);
  };

  return (
    <View className="flex-1 bg-background-primary">
      {sharedObjects.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          title="No shared items"
          description="Photos, links, places, and songs you share will appear here"
        />
      ) : (
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
          renderItem={({ item }) => (
            <SharedItemCard
              item={item}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/(tabs)/messages/shared-detail',
                  params: { data: JSON.stringify(item) },
                });
              }}
            />
          )}
          ListEmptyComponent={
            <View className="px-4 py-12 items-center">
              <Ionicons name="search-outline" size={28} color="#A8937F" />
              <Text className="text-text-tertiary text-sm mt-2">
                No {activeFilter === 'all' ? 'items' : activeFilter + 's'} found
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB — Share Link */}
      {conversationId && (
        <Pressable
          onPress={handleFABPress}
          className="absolute bottom-14 right-6 w-14 h-14 bg-accent-primary rounded-full items-center justify-center shadow-lg active:scale-95"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Share Link Modal */}
      {conversationId && (
        <ShareLinkModal
          visible={isModalVisible}
          conversationId={conversationId}
          onClose={() => setIsModalVisible(false)}
        />
      )}
    </View>
  );
}
