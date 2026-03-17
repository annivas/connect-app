import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface AvatarProps {
  uri?: string;
  name?: string;
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
  name,
  size = 'md',
  status = 'offline',
  showStatus = false,
  statusEmoji,
}: AvatarProps) {
  const px = sizeMap[size];
  const dot = size === 'sm' ? 10 : size === 'md' ? 12 : 16;
  const emojiFontSize = size === 'sm' ? 9 : size === 'md' ? 10 : 14;
  const emojiSize = size === 'sm' ? 14 : size === 'md' ? 16 : 22;

  const statusIndicator = showStatus && statusEmoji ? (
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
  ) : null;

  return (
    <View style={{ width: px, height: px }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: px, height: px, borderRadius: px / 2 }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={{
            width: px,
            height: px,
            borderRadius: px / 2,
            backgroundColor: '#C2956B',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {name ? (
            <Text
              style={{
                color: '#FFFFFF',
                fontWeight: '600',
                fontSize: px * 0.4,
              }}
            >
              {name[0].toUpperCase()}
            </Text>
          ) : (
            <Ionicons name="person" size={px * 0.5} color="#FFFFFF" />
          )}
        </View>
      )}
      {statusIndicator}
    </View>
  );
}
