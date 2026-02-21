import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Note } from '../../types';
import { useMessagesStore } from '../../stores/useMessagesStore';

interface Props {
  conversationId: string;
}

export function NotesTab({ conversationId }: Props) {
  const conversation = useMessagesStore(
    useShallow((s) => s.getConversationById(conversationId))
  );
  const notes = conversation?.metadata?.notes ?? [];

  if (notes.length === 0) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="document-text-outline"
          title="No notes yet"
          description="Create shared or private notes in this conversation"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: { item: Note }) => (
          <Card className="mb-3">
            <View className="flex-row items-center mb-2">
              <View
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              />
              <Text className="text-text-primary font-semibold flex-1">
                {item.title}
              </Text>
              {item.isPrivate && (
                <Text className="text-text-tertiary text-xs">Private</Text>
              )}
            </View>
            <Text className="text-text-secondary text-sm" numberOfLines={3}>
              {item.content}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}
