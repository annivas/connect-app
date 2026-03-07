import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NoteMessageMetadata } from '../../types';

interface Props {
  metadata: NoteMessageMetadata;
  isMine: boolean;
}

export function NoteMessageBubble({ metadata, isMine }: Props) {
  const accentText = isMine ? 'text-white' : 'text-text-primary';
  const secondaryText = isMine ? 'text-white/60' : 'text-text-tertiary';
  const labelColor = isMine ? '#FFFFFF' : '#D4764E';
  const badgeBg = isMine ? 'bg-white/15' : 'bg-surface-hover';

  return (
    <View style={{ minWidth: 220 }}>
      {/* Header */}
      <View className="flex-row items-center mb-1.5">
        <Ionicons name="document-text-outline" size={14} color={labelColor} />
        <Text
          className={`text-[11px] font-semibold ml-1 tracking-wider ${
            isMine ? 'text-white/80' : 'text-accent-primary'
          }`}
        >
          NOTE
        </Text>
      </View>

      {/* Title */}
      <Text
        className={`text-[15px] font-semibold ${accentText}`}
        numberOfLines={1}
      >
        {metadata.title}
      </Text>

      {/* Content preview */}
      {metadata.contentPreview ? (
        <Text
          className={`text-[13px] mt-0.5 ${secondaryText}`}
          numberOfLines={2}
        >
          {metadata.contentPreview}
        </Text>
      ) : null}

      {/* Private/Shared badge */}
      <View className={`flex-row items-center mt-2 px-2 py-1 rounded-md self-start ${badgeBg}`}>
        <Ionicons
          name={metadata.isPrivate ? 'lock-closed-outline' : 'people-outline'}
          size={12}
          color={labelColor}
        />
        <Text
          className={`text-[11px] font-medium ml-1 ${
            isMine ? 'text-white/70' : 'text-accent-primary'
          }`}
        >
          {metadata.isPrivate ? 'Private' : 'Shared'}
        </Text>
      </View>
    </View>
  );
}
