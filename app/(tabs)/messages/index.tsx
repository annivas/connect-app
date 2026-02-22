import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SearchBar } from '../../../src/components/ui/SearchBar';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ConversationListItem } from '../../../src/components/chat/ConversationListItem';
import { NewConversationModal } from '../../../src/components/chat/NewConversationModal';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';

export default function MessagesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const getUserById = useUserStore((s) => s.getUserById);

  const filtered = useMemo(() => {
    let list = [...conversations];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const other = c.participants.find((id) => id !== useUserStore.getState().currentUser?.id);
        const user = other ? getUserById(other) : null;
        return user?.name.toLowerCase().includes(q);
      });
    }

    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [conversations, searchQuery, getUserById]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await useMessagesStore.getState().init();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-text-primary text-3xl font-bold mb-4">
          Messages
        </Text>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations..."
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationListItem conversation={item} />}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4764E" />
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations"
            description={searchQuery ? 'No matches for your search' : 'Start a conversation to get going'}
          />
        }
      />

      {/* New Conversation FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowNewConversation(true);
        }}
        className="absolute bottom-4 right-4 w-14 h-14 bg-accent-primary rounded-full items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <NewConversationModal
        visible={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onConversationReady={(id) => router.push(`/(tabs)/messages/${id}` as any)}
      />
    </SafeAreaView>
  );
}
