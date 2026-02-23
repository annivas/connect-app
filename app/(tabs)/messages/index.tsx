import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SearchBar } from '../../../src/components/ui/SearchBar';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ConversationListItem } from '../../../src/components/chat/ConversationListItem';
import { ConversationFilterBar } from '../../../src/components/chat/ConversationFilterBar';
import { NewConversationModal } from '../../../src/components/chat/NewConversationModal';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { ConversationFilter, Message } from '../../../src/types';

// ─── Global search result card ──────────────

function GlobalSearchResult({
  conversationId,
  messages,
  query,
  onPress,
}: {
  conversationId: string;
  messages: Message[];
  query: string;
  onPress: () => void;
}) {
  const getUserById = useUserStore((s) => s.getUserById);
  const conversation = useMessagesStore.getState().getConversationById(conversationId);
  const otherUserId = conversation?.participants.find(
    (id) => id !== useUserStore.getState().currentUser?.id,
  );
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      className="mx-4 mb-3 bg-surface rounded-xl p-3"
    >
      <View className="flex-row items-center mb-2">
        <Ionicons name="chatbubble-outline" size={14} color="#D4764E" />
        <Text className="text-text-primary text-[14px] font-semibold ml-2">
          {otherUser?.name ?? 'Unknown'}
        </Text>
        <Text className="text-text-tertiary text-[11px] ml-auto">
          {messages.length} match{messages.length !== 1 ? 'es' : ''}
        </Text>
      </View>
      {messages.slice(0, 2).map((msg) => {
        const sender = getUserById(msg.senderId);
        return (
          <View key={msg.id} className="mb-1.5">
            <Text className="text-text-tertiary text-[11px]">
              {sender?.name ?? 'Unknown'}:
            </Text>
            <Text className="text-text-secondary text-[13px]" numberOfLines={2}>
              {msg.content}
            </Text>
          </View>
        );
      })}
      {messages.length > 2 && (
        <Text className="text-accent-primary text-[12px] font-medium mt-1">
          +{messages.length - 2} more matches
        </Text>
      )}
    </Pressable>
  );
}

// ─── Main screen ────────────────────────────

export default function MessagesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const getUserById = useUserStore((s) => s.getUserById);

  // Compute filter counts
  const filterCounts = useMemo(() => {
    const nonArchived = conversations.filter((c) => !c.isArchived);
    return {
      all: nonArchived.length,
      unread: nonArchived.filter((c) => c.unreadCount > 0 || c.isMarkedUnread).length,
      groups: nonArchived.filter((c) => c.type === 'group').length,
      archived: conversations.filter((c) => c.isArchived).length,
    };
  }, [conversations]);

  // Global search results (search across all messages)
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    return useMessagesStore.getState().searchAllConversations(searchQuery.trim());
  }, [searchQuery]);

  const isGlobalSearchActive = searchQuery.trim().length >= 2 && globalSearchResults.length > 0;

  const filtered = useMemo(() => {
    let list = [...conversations];

    // Apply filter
    switch (activeFilter) {
      case 'all':
        list = list.filter((c) => !c.isArchived);
        break;
      case 'unread':
        list = list.filter((c) => !c.isArchived && (c.unreadCount > 0 || c.isMarkedUnread));
        break;
      case 'groups':
        list = list.filter((c) => !c.isArchived && c.type === 'group');
        break;
      case 'archived':
        list = list.filter((c) => c.isArchived);
        break;
    }

    // Apply search on conversation name and last message
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const other = c.participants.find((id) => id !== useUserStore.getState().currentUser?.id);
        const user = other ? getUserById(other) : null;
        const nameMatch = user?.name.toLowerCase().includes(q);
        const messageMatch = c.lastMessage?.content?.toLowerCase().includes(q);
        return nameMatch || messageMatch;
      });
    }

    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [conversations, searchQuery, activeFilter, getUserById]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await useMessagesStore.getState().init();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const emptyDescription = useMemo(() => {
    if (searchQuery) return 'No matches for your search';
    switch (activeFilter) {
      case 'unread': return 'No unread conversations';
      case 'groups': return 'No group conversations';
      case 'archived': return 'No archived conversations';
      default: return 'Start a conversation to get going';
    }
  }, [searchQuery, activeFilter]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="px-4 pt-2 pb-1">
        <Text className="text-text-primary text-3xl font-bold mb-4">
          Messages
        </Text>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations & messages..."
        />
      </View>

      {/* Filter bar */}
      <ConversationFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={filterCounts}
      />

      {/* Global search results */}
      {isGlobalSearchActive && (
        <View className="pb-2">
          <View className="flex-row items-center px-4 py-2">
            <Ionicons name="search" size={14} color="#A8937F" />
            <Text className="text-text-secondary text-[13px] font-medium ml-2">
              Messages matching "{searchQuery}"
            </Text>
          </View>
          {globalSearchResults.slice(0, 5).map((result) => (
            <GlobalSearchResult
              key={result.conversationId}
              conversationId={result.conversationId}
              messages={result.messages}
              query={searchQuery}
              onPress={() => router.push(`/(tabs)/messages/${result.conversationId}` as any)}
            />
          ))}
          {globalSearchResults.length > 5 && (
            <Text className="text-text-tertiary text-[12px] text-center pb-2">
              +{globalSearchResults.length - 5} more conversations
            </Text>
          )}
          <View className="h-px bg-border-subtle mx-4 mb-1" />
        </View>
      )}

      {/* Conversation list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationListItem
            conversation={item}
            highlightText={searchQuery.trim() ? searchQuery : undefined}
          />
        )}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4764E" />
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations"
            description={emptyDescription}
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
