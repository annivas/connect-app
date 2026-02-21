import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

interface AvatarProps {
  uri: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away';
  showStatus?: boolean;
}

const sizeMap = { sm: 32, md: 40, lg: 52, xl: 80 };

const statusColors = {
  online: '#10B981',
  away: '#F59E0B',
  offline: '#6B6B76',
};

export function Avatar({
  uri,
  size = 'md',
  status = 'offline',
  showStatus = false,
}: AvatarProps) {
  const px = sizeMap[size];
  const dot = size === 'sm' ? 10 : size === 'md' ? 12 : 16;

  return (
    <View style={{ width: px, height: px }}>
      <Image
        source={{ uri }}
        style={{ width: px, height: px, borderRadius: px / 2 }}
        contentFit="cover"
        transition={200}
      />
      {showStatus && (
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
            borderColor: '#0A0A0F',
          }}
        />
      )}
    </View>
  );
}
