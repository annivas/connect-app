import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { Note } from '../../../src/types';

interface NoteWithSource extends Note {
  conversationId: string;
  conversationName: string;
}

export default function AllNotesScreen() {
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  const allNotes: NoteWithSource[] = conversations.flatMap((c) => {
    const otherUserId = c.participants.find((p) => p !== currentUserId);
    const otherUser = otherUserId ? getUserById(otherUserId) : null;
    const name = otherUser?.name ?? 'Unknown';
    return (c.metadata?.notes ?? []).map((note) => ({
      ...note,
      conversationId: c.id,
      conversationName: name,
    }));
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">All Notes</Text>
      </View>

      {allNotes.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No notes"
          description="Notes from your conversations will appear here"
        />
      ) : (
        <FlatList
          data={allNotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <Card
              className="mb-3"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/(tabs)/messages/note-detail',
                  params: { data: JSON.stringify(item) },
                });
              }}
            >
              <View className="flex-row items-center mb-1">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                />
                <Text className="text-text-primary font-semibold text-sm flex-1">
                  {item.title}
                </Text>
                {item.isPrivate && (
                  <Text className="text-text-tertiary text-xs">Private</Text>
                )}
              </View>
              <Text className="text-text-secondary text-xs mb-1.5" numberOfLines={2}>
                {item.content}
              </Text>
              <Text className="text-text-tertiary text-[10px]">
                From: {item.conversationName}
              </Text>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}
