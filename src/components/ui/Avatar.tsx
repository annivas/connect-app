import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';

interface AvatarProps {
  uri: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away';
  showStatus?: boolean;
  statusEmoji?: string;
}

const sizeMap = { sm: 32, md: 40, lg: 52, xl: 80 };

const statusColors = {
  online: '#2D9F6F',
  away: '#D4964E',
  offline: '#A8937F',
};

export function Avatar({
  uri,
  size = 'md',
  status = 'offline',
  showStatus = false,
  statusEmoji,
}: AvatarProps) {
  const px = sizeMap[size];
  const dot = size === 'sm' ? 10 : size === 'md' ? 12 : 16;
  const emojiFontSize = size === 'sm' ? 9 : size === 'md' ? 10 : 14;
  const emojiSize = size === 'sm' ? 14 : size === 'md' ? 16 : 22;

  return (
    <View style={{ width: px, height: px }}>
      <Image
        source={{ uri }}
        style={{ width: px, height: px, borderRadius: px / 2 }}
        contentFit="cover"
        transition={200}
      />
      {showStatus && statusEmoji ? (
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: emojiSize,
            height: emojiSize,
            borderRadius: emojiSize / 2,
            backgroundColor: '#FFF8F0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: emojiFontSize }}>{statusEmoji}</Text>
        </View>
      ) : showStatus ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: statusColors[status],
            borderWidth: 2,
            borderColor: '#FFF8F0',
          }}
        />
      ) : null}
    </View>
  );
}
