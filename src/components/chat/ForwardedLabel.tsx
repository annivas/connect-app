import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ForwardedFrom } from '../../types';

interface Props {
  forwardedFrom: ForwardedFrom;
  isMine: boolean;
}

export function ForwardedLabel({ forwardedFrom, isMine }: Props) {
  return (
    <View className="flex-row items-center mb-1">
      <Ionicons
        name="arrow-redo"
        size={11}
        color={isMine ? 'rgba(255,255,255,0.5)' : '#6B6B76'}
      />
      <Text
        className={`text-[11px] ml-1 italic ${
          isMine ? 'text-white/50' : 'text-text-tertiary'
        }`}
      >
        Forwarded from {forwardedFrom.originalSenderName}
      </Text>
    </View>
  );
}
