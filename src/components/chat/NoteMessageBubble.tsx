import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NoteMessageMetadata } from '../../types';

const NOTE_ACCENT = '#D4764E';

interface Props {
  metadata: NoteMessageMetadata;
  isMine: boolean;
  onPress?: () => void;
}

export function NoteMessageBubble({ metadata, isMine, onPress }: Props) {
  const noteColor = metadata.color || NOTE_ACCENT;
  const accentColor = isMine ? '#FFFFFF' : noteColor;
  const primaryText = isMine ? '#FFFFFF' : '#2D1F14';
  const secondaryText = isMine ? 'rgba(255,255,255,0.6)' : '#7A6355';

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={!onPress} style={{ minWidth: 230 }}>
      {/* Header: icon badge + label + privacy pill */}
      <View className="flex-row items-center mb-2.5">
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : `${noteColor}18`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="document-text" size={16} color={accentColor} />
        </View>
        <Text
          style={{ fontSize: 11, fontWeight: '700', color: accentColor, marginLeft: 8, letterSpacing: 1, flex: 1 }}
        >
          NOTE
        </Text>
        {/* Private/Shared pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
            backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : `${noteColor}10`,
          }}
        >
          <Ionicons
            name={metadata.isPrivate ? 'lock-closed' : 'people'}
            size={10}
            color={isMine ? 'rgba(255,255,255,0.7)' : noteColor}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              marginLeft: 3,
              color: isMine ? 'rgba(255,255,255,0.7)' : noteColor,
            }}
          >
            {metadata.isPrivate ? 'Private' : 'Shared'}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text
        style={{ fontSize: 16, fontWeight: '700', color: primaryText, marginBottom: 4 }}
        numberOfLines={2}
      >
        {metadata.title}
      </Text>

      {/* Content preview in a styled quote block */}
      {metadata.contentPreview ? (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: isMine ? 'rgba(255,255,255,0.3)' : `${noteColor}40`,
            paddingLeft: 10,
            paddingVertical: 4,
            marginTop: 4,
            backgroundColor: isMine ? 'rgba(255,255,255,0.06)' : `${noteColor}06`,
            borderRadius: 4,
          }}
        >
          <Text
            style={{ fontSize: 13, color: secondaryText, lineHeight: 18 }}
            numberOfLines={3}
          >
            {metadata.contentPreview}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
