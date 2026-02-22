import React, { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { CreateNoteModal } from './CreateNoteModal';
import { Note } from '../../types';
import { useMessagesStore } from '../../stores/useMessagesStore';

interface Props {
  conversationId: string;
}

export function NotesTab({ conversationId }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const conversation = useMessagesStore(
    useShallow((s) => s.getConversationById(conversationId))
  );
  const notes = conversation?.metadata?.notes ?? [];

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalVisible(true);
  };

  if (notes.length === 0) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="document-text-outline"
          title="No notes yet"
          description="Create shared or private notes in this conversation"
        />
        <FAB onPress={handleFABPress} />
        <CreateNoteModal
          visible={isModalVisible}
          conversationId={conversationId}
          onClose={() => setIsModalVisible(false)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
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
      <FAB onPress={handleFABPress} />
      <CreateNoteModal
        visible={isModalVisible}
        conversationId={conversationId}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
      style={{
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </Pressable>
  );
}
