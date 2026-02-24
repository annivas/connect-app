import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { EmptyState } from '../ui/EmptyState';
import { ShareLinkModal } from './ShareLinkModal';
import { useUserStore } from '../../stores/useUserStore';
import type { SharedObject, SharedObjectType, PlaceMetadata, Message } from '../../types';

// ─── Filter chips ────────────────────────────

type FilterKey = 'all' | SharedObjectType;

const FILTERS: { key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'link', label: 'Links', icon: 'link-outline' },
  { key: 'place', label: 'Places', icon: 'location-outline' },
  { key: 'song', label: 'Songs', icon: 'musical-notes-outline' },
  { key: 'photo', label: 'Photos', icon: 'image-outline' },
  { key: 'file', label: 'Documents', icon: 'document-outline' },
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
        color={active ? '#FFFFFF' : '#A8937F'}
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

// ─── Pinned Message Card ─────────────────────

function PinnedMessageCard({
  message,
  onPress,
}: {
  message: Message;
  onPress: () => void;
}) {
  const getUserById = useUserStore((s) => s.getUserById);
  const sender = getUserById(message.senderId);

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      className="bg-surface rounded-xl p-3 mr-3"
      style={{ width: 220 }}
    >
      <View className="flex-row items-center mb-2">
        <Ionicons name="pin" size={12} color="#D4764E" />
        <Text className="text-accent-primary text-[11px] font-semibold ml-1">
          Pinned
        </Text>
        <Text className="text-text-tertiary text-[10px] ml-auto">
          {format(message.timestamp, 'MMM d')}
        </Text>
      </View>
      <Text
        className="text-text-primary text-[13px]"
        numberOfLines={3}
      >
        {message.content}
      </Text>
      <Text className="text-text-tertiary text-[11px] mt-1.5">
        — {sender?.name ?? 'Unknown'}
      </Text>
    </Pressable>
  );
}

// ─── Shared item card (reused from SharedTab) ──

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
  photo: '#F59E0B',
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
      {item.thumbnail && !isPlace && (
        <Image
          source={{ uri: item.thumbnail }}
          style={{ width: '100%', height: 140 }}
          contentFit="cover"
          transition={200}
        />
      )}

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

interface MediaPinsTabProps {
  pinnedMessageIds: string[];
  sharedObjects: SharedObject[];
  allMessages: Message[];
  onAddSharedObject?: (obj: Omit<SharedObject, 'id' | 'sharedAt'>) => void;
  contextId: string;
  contextType: 'conversation' | 'group';
}

export function MediaPinsTab({ pinnedMessageIds, sharedObjects, allMessages, contextId, contextType }: MediaPinsTabProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Resolve pinned messages from the message list
  const pinnedMessages = useMemo(() => {
    if (pinnedMessageIds.length === 0) return [];
    const idSet = new Set(pinnedMessageIds);
    return allMessages.filter((m) => idSet.has(m.id));
  }, [allMessages, pinnedMessageIds]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return sharedObjects;
    return sharedObjects.filter((obj) => obj.type === activeFilter);
  }, [sharedObjects, activeFilter]);

  const hasAnyContent = pinnedMessages.length > 0 || sharedObjects.length > 0;

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalVisible(true);
  };

  if (!hasAnyContent) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="folder-open-outline"
          title="No media or pinned items"
          description="Pinned messages and shared content will appear here"
        />
        <Pressable
          onPress={handleFABPress}
          className="absolute bottom-4 right-4 w-14 h-14 bg-accent-primary rounded-full items-center justify-center shadow-lg active:scale-95"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
        <ShareLinkModal
          visible={isModalVisible}
          conversationId={contextId}
          onClose={() => setIsModalVisible(false)}
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
          <View>
            {/* Pinned Messages Section */}
            {pinnedMessages.length > 0 && (
              <View className="pt-4 pb-2">
                <View className="flex-row items-center px-4 mb-3">
                  <Ionicons name="pin" size={16} color="#D4764E" />
                  <Text className="text-text-primary font-semibold text-[15px] ml-2">
                    Pinned Messages
                  </Text>
                  <View className="ml-2 bg-accent-primary/20 px-2 py-0.5 rounded-full">
                    <Text className="text-accent-primary text-[11px] font-semibold">
                      {pinnedMessages.length}
                    </Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                  {pinnedMessages.map((msg) => (
                    <PinnedMessageCard
                      key={msg.id}
                      message={msg}
                      onPress={() => {
                        // In a full app, this would scroll to the message in ChatTab
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Divider */}
            {pinnedMessages.length > 0 && sharedObjects.length > 0 && (
              <View className="h-px bg-border-subtle mx-4 my-2" />
            )}

            {/* Shared Media section header + filters */}
            {sharedObjects.length > 0 && (
              <View>
                <View className="flex-row items-center px-4 pt-3 mb-3">
                  <Ionicons name="images-outline" size={16} color="#A8937F" />
                  <Text className="text-text-primary font-semibold text-[15px] ml-2">
                    Shared Media
                  </Text>
                </View>
                <View className="px-4 pb-3">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {FILTERS.map((f) => (
                      <FilterChip
                        key={f.key}
                        label={f.label}
                        icon={f.icon}
                        active={activeFilter === f.key}
                        onPress={() => setActiveFilter(f.key)}
                      />
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
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
          sharedObjects.length > 0 ? (
            <View className="px-4 py-12 items-center">
              <Ionicons name="search-outline" size={28} color="#A8937F" />
              <Text className="text-text-tertiary text-sm mt-2">
                No {activeFilter === 'all' ? 'items' : activeFilter + 's'} found
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB — Share Link */}
      <Pressable
        onPress={handleFABPress}
        className="absolute bottom-4 right-4 w-14 h-14 bg-accent-primary rounded-full items-center justify-center shadow-lg active:scale-95"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <ShareLinkModal
        visible={isModalVisible}
        conversationId={contextId}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}
