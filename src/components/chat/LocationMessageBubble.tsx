import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { LocationMessageMetadata } from '../../types';

interface Props {
  metadata: LocationMessageMetadata;
  isMine: boolean;
}

export function LocationMessageBubble({ metadata, isMine }: Props) {
  const handleOpenMaps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://maps.apple.com/?ll=${metadata.latitude},${metadata.longitude}&q=${encodeURIComponent(metadata.placeName || 'Location')}`;
    Linking.openURL(url);
  };

  // Static map placeholder (in a real app, use a static map API)
  const staticMapUrl =
    metadata.staticMapUrl ||
    `https://picsum.photos/seed/map-${metadata.latitude}-${metadata.longitude}/300/150`;

  return (
    <View style={{ width: 240 }}>
      {/* Map preview */}
      <View className="rounded-t-xl overflow-hidden">
        <Image
          source={{ uri: staticMapUrl }}
          style={{ width: 240, height: 120 }}
          contentFit="cover"
          transition={200}
        />
        {/* Pin overlay */}
        <View className="absolute inset-0 items-center justify-center">
          <View className="w-8 h-8 rounded-full bg-status-error items-center justify-center"
            style={{
              shadowColor: '#C94F4F',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 4,
            }}
          >
            <Ionicons name="location" size={18} color="white" />
          </View>
        </View>
      </View>

      {/* Location info */}
      <View className={`px-3 py-2 ${isMine ? 'bg-accent-primary' : 'bg-surface-elevated'}`}>
        {metadata.placeName && (
          <Text
            className={`text-[14px] font-semibold ${isMine ? 'text-white' : 'text-text-primary'}`}
            numberOfLines={1}
          >
            {metadata.placeName}
          </Text>
        )}
        {metadata.address && (
          <Text
            className={`text-[12px] mt-0.5 ${isMine ? 'text-white/70' : 'text-text-tertiary'}`}
            numberOfLines={2}
          >
            {metadata.address}
          </Text>
        )}
      </View>

      {/* Open in Maps button */}
      <Pressable
        onPress={handleOpenMaps}
        className={`flex-row items-center justify-center py-2 rounded-b-xl ${
          isMine ? 'bg-white/15' : 'bg-surface-hover'
        }`}
      >
        <Ionicons name="navigate-outline" size={14} color={isMine ? '#FFFFFF' : '#D4764E'} />
        <Text
          className={`text-[13px] font-medium ml-1.5 ${
            isMine ? 'text-white' : 'text-accent-primary'
          }`}
        >
          Open in Maps
        </Text>
      </Pressable>
    </View>
  );
}
