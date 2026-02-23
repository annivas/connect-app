import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { IconButton } from '../../../src/components/ui/IconButton';
import type { SharedObject, SharedObjectType, PlaceMetadata, LinkMetadata, SongMetadata } from '../../../src/types';

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

export default function SharedDetailScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();

  const item: SharedObject | null = React.useMemo(() => {
    try {
      const parsed = JSON.parse(data ?? '');
      return {
        ...parsed,
        sharedAt: new Date(parsed.sharedAt),
      } as SharedObject;
    } catch {
      return null;
    }
  }, [data]);

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Item not found</Text>
      </SafeAreaView>
    );
  }

  const color = typeColors[item.type];
  const icon = typeIcons[item.type];

  const handleOpenUrl = () => {
    const url = item.url ?? (item.metadata as LinkMetadata)?.url;
    if (url) Linking.openURL(url);
  };

  const handleOpenMaps = () => {
    const meta = item.metadata as PlaceMetadata;
    const url = `https://maps.apple.com/?q=${encodeURIComponent(meta.name)}&ll=${meta.latitude},${meta.longitude}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <View className="flex-1 flex-row items-center ml-1">
          <View
            className="w-8 h-8 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: `${color}25` }}
          >
            <Ionicons name={icon} size={16} color={color} />
          </View>
          <Text className="text-text-primary text-[17px] font-semibold flex-1" numberOfLines={1}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
      </View>

      <View className="flex-1 px-4 pt-6">
        {/* Thumbnail / Hero */}
        {item.type === 'photo' && item.thumbnail && (
          <View className="rounded-2xl overflow-hidden mb-4">
            <Image
              source={{ uri: item.thumbnail }}
              style={{ width: '100%', height: 300 }}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}

        {item.type === 'link' && item.thumbnail && (
          <View className="rounded-2xl overflow-hidden mb-4">
            <Image
              source={{ uri: item.thumbnail }}
              style={{ width: '100%', height: 180 }}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}

        {/* Title */}
        <Text className="text-text-primary text-2xl font-bold mb-2">
          {item.title}
        </Text>

        {/* Description */}
        {item.description && (
          <Text className="text-text-secondary text-sm mb-4">
            {item.description}
          </Text>
        )}

        {/* Type-specific content */}
        {item.type === 'place' && (
          <View className="bg-surface rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full items-center justify-center bg-status-success/20">
                <Ionicons name="location" size={20} color="#2D9F6F" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-text-primary font-semibold text-[15px]">
                  {(item.metadata as PlaceMetadata).name}
                </Text>
                <Text className="text-text-tertiary text-xs mt-0.5">
                  {(item.metadata as PlaceMetadata).address}
                </Text>
              </View>
            </View>
            {(item.metadata as PlaceMetadata).rating && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="star" size={14} color="#D4964E" />
                <Text className="text-text-secondary text-sm ml-1">
                  {(item.metadata as PlaceMetadata).rating} rating
                </Text>
              </View>
            )}
            <Pressable
              onPress={handleOpenMaps}
              className="flex-row items-center justify-center py-3 bg-status-success/15 rounded-xl"
            >
              <Ionicons name="navigate" size={18} color="#2D9F6F" />
              <Text className="text-status-success font-semibold ml-2">
                Open in Maps
              </Text>
            </Pressable>
          </View>
        )}

        {item.type === 'link' && (
          <Pressable
            onPress={handleOpenUrl}
            className="flex-row items-center justify-center py-3 bg-surface rounded-xl mb-4"
          >
            <Ionicons name="open-outline" size={18} color="#5B8EC9" />
            <Text className="text-[#5B8EC9] font-semibold ml-2">
              Open Link
            </Text>
          </Pressable>
        )}

        {item.type === 'song' && (
          <View className="bg-surface rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              {(item.metadata as SongMetadata).albumArt && (
                <Image
                  source={{ uri: (item.metadata as SongMetadata).albumArt }}
                  style={{ width: 56, height: 56, borderRadius: 8 }}
                  contentFit="cover"
                />
              )}
              <View className="ml-3 flex-1">
                <Text className="text-text-primary font-semibold">{item.title}</Text>
                <Text className="text-text-secondary text-sm">
                  {(item.metadata as SongMetadata).artist}
                </Text>
                <Text className="text-text-tertiary text-xs">
                  {(item.metadata as SongMetadata).album}
                </Text>
              </View>
            </View>
            {(item.metadata as SongMetadata).spotifyUrl && (
              <Pressable
                onPress={() => Linking.openURL((item.metadata as SongMetadata).spotifyUrl!)}
                className="flex-row items-center justify-center py-3 bg-[#1DB954]/15 rounded-xl"
              >
                <Ionicons name="musical-notes" size={18} color="#1DB954" />
                <Text className="text-[#1DB954] font-semibold ml-2">
                  Open in Spotify
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Metadata footer */}
        <View className="flex-row items-center mt-2">
          <Ionicons name="time-outline" size={14} color="#A8937F" />
          <Text className="text-text-tertiary text-xs ml-1">
            Shared {format(item.sharedAt, 'MMM d, yyyy \'at\' h:mm a')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
