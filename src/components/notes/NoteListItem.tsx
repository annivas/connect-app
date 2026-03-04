import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import type { Note } from '../../types';

interface Props {
  note: Note;
  onPress: () => void;
  onLongPress?: () => void;
}

export function NoteListItem({ note, onPress, onLongPress }: Props) {
  const preview = note.content.replace(/\n/g, ' ').trim();
  const timeAgo = formatDistanceToNow(note.updatedAt, { addSuffix: true });

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress?.();
      }}
      delayLongPress={500}
      className="bg-surface-elevated rounded-2xl px-4 py-3.5 mb-2.5"
      style={{
        shadowColor: '#2D1F14',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center mb-1">
        {note.isPinned && (
          <Ionicons name="pin" size={12} color="#D4764E" style={{ marginRight: 4 }} />
        )}
        <Text className="text-text-primary font-semibold text-[15px] flex-1" numberOfLines={1}>
          {note.title || 'Untitled'}
        </Text>
        {note.isPrivate ? (
          <View className="flex-row items-center bg-background-tertiary rounded-full px-2 py-0.5 ml-2">
            <Ionicons name="lock-closed" size={10} color="#7A6355" />
            <Text className="text-text-secondary text-[10px] font-medium ml-1">Private</Text>
          </View>
        ) : (
          <View className="flex-row items-center bg-accent-primary/10 rounded-full px-2 py-0.5 ml-2">
            <Ionicons name="people" size={10} color="#D4764E" />
            <Text className="text-accent-primary text-[10px] font-medium ml-1">Shared</Text>
          </View>
        )}
      </View>

      {preview.length > 0 && (
        <Text className="text-text-secondary text-[13px] leading-[18px] mb-1.5" numberOfLines={2}>
          {preview}
        </Text>
      )}

      <Text className="text-text-tertiary text-[11px]">{timeAgo}</Text>
    </Pressable>
  );
}
