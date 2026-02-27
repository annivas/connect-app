import React from 'react';
import { View, Text } from 'react-native';
import { RichStatus } from '../../types';

interface Props {
  richStatus: RichStatus;
  size?: 'sm' | 'md';
}

export function RichStatusBadge({ richStatus, size = 'sm' }: Props) {
  const isExpired = richStatus.expiresAt && new Date() > richStatus.expiresAt;
  if (isExpired) return null;

  if (size === 'sm') {
    return (
      <View className="flex-row items-center">
        <Text className="text-xs mr-0.5">{richStatus.emoji}</Text>
        <Text className="text-text-tertiary text-[10px]" numberOfLines={1}>
          {richStatus.text}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center bg-background-tertiary rounded-full px-2.5 py-1">
      <Text className="text-sm mr-1">{richStatus.emoji}</Text>
      <Text className="text-text-secondary text-xs" numberOfLines={1}>
        {richStatus.text}
      </Text>
      {richStatus.focusMode?.enabled && (
        <View className="ml-1.5 bg-status-warning/20 rounded-full px-1.5 py-0.5">
          <Text className="text-status-warning text-[9px] font-bold">DND</Text>
        </View>
      )}
    </View>
  );
}
