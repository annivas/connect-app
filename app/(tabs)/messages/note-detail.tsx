import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useToastStore } from '../../../src/stores/useToastStore';
import type { Note } from '../../../src/types';

export default function NoteDetailScreen() {
  const router = useRouter();
  const { data, conversationId, groupId } = useLocalSearchParams<{ data: string; conversationId?: string; groupId?: string }>();

  const note: Note | null = React.useMemo(() => {
    try {
      const parsed = JSON.parse(data ?? '');
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
      } as Note;
    } catch {
      return null;
    }
  }, [data]);

  const canDelete = !!(conversationId || groupId);

  const handleDelete = () => {
    if (!note || !canDelete) return;
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (conversationId) {
              useMessagesStore.getState().deleteNote(conversationId, note.id);
            } else if (groupId) {
              useGroupsStore.getState().deleteGroupNote(groupId, note.id);
            }
            useToastStore.getState().show({ message: 'Note deleted', type: 'success' });
            router.back();
          },
        },
      ],
    );
  };

  if (!note) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Note not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <View className="flex-1 flex-row items-center ml-1">
          <Ionicons name="document-text" size={20} color="#D4764E" />
          <Text className="text-text-primary text-[17px] font-semibold ml-2 flex-1" numberOfLines={1}>
            Note
          </Text>
        </View>
        {note.isPrivate && (
          <View className="flex-row items-center bg-surface-elevated rounded-full px-3 py-1 mr-2">
            <Ionicons name="lock-closed" size={12} color="#A8937F" />
            <Text className="text-text-tertiary text-xs ml-1">Private</Text>
          </View>
        )}
        {canDelete && (
          <IconButton icon="trash-outline" onPress={handleDelete} color="#C94F4F" />
        )}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Color banner */}
        <View
          className="h-2 rounded-full mb-6"
          style={{ backgroundColor: note.color }}
        />

        {/* Title */}
        <Text className="text-text-primary text-2xl font-bold mb-4">
          {note.title}
        </Text>

        {/* Content */}
        <Text className="text-text-secondary text-[15px] leading-6 mb-6">
          {note.content}
        </Text>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <View className="flex-row flex-wrap mb-6">
            {note.tags.map((tag) => (
              <View key={tag} className="bg-surface-elevated rounded-full px-3 py-1.5 mr-2 mb-2">
                <Text className="text-text-secondary text-xs">#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Metadata */}
        <View className="border-t border-border-subtle pt-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="time-outline" size={14} color="#A8937F" />
            <Text className="text-text-tertiary text-xs ml-2">
              Created {format(note.createdAt, 'MMM d, yyyy \'at\' h:mm a')}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="create-outline" size={14} color="#A8937F" />
            <Text className="text-text-tertiary text-xs ml-2">
              Updated {format(note.updatedAt, 'MMM d, yyyy \'at\' h:mm a')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
