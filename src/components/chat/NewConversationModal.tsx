import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { SearchBar } from '../ui/SearchBar';
import { useUserStore } from '../../stores/useUserStore';
import { useMessagesStore } from '../../stores/useMessagesStore';
import type { User } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConversationReady: (conversationId: string) => void;
}

export function NewConversationModal({ visible, onClose, onConversationReady }: Props) {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const pendingConvId = useRef<string | null>(null);

  const currentUser = useUserStore((s) => s.currentUser);
  const users = useUserStore((s) => s.users);

  const otherUsers = useMemo(
    () => users.filter((u) => u.id !== currentUser?.id),
    [users, currentUser?.id],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return otherUsers;
    const q = search.toLowerCase();
    return otherUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
    );
  }, [otherUsers, search]);

  const handleClose = useCallback(() => {
    setSearch('');
    setIsCreating(false);
    onClose();
  }, [onClose]);

  // Navigate after modal dismiss completes to avoid iOS pageSheet race condition
  const handleDismiss = useCallback(() => {
    if (pendingConvId.current) {
      const id = pendingConvId.current;
      pendingConvId.current = null;
      onConversationReady(id);
    }
  }, [onConversationReady]);

  const handleSelectUser = async (user: User) => {
    if (!currentUser || isCreating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCreating(true);

    try {
      // Check if conversation already exists
      const conversations = useMessagesStore.getState().conversations;
      const existing = conversations.find(
        (c) =>
          c.type === 'individual' &&
          c.participants.includes(currentUser.id) &&
          c.participants.includes(user.id),
      );

      let conversationId: string;

      if (existing) {
        conversationId = existing.id;
      } else {
        // Create new conversation
        conversationId = await useMessagesStore.getState().createConversation([currentUser.id, user.id]);
      }

      // Store ID and close modal — navigation happens in handleDismiss
      pendingConvId.current = conversationId;
      handleClose();

      // Android doesn't fire onDismiss, so use setTimeout fallback
      if (Platform.OS !== 'ios') {
        setTimeout(handleDismiss, 0);
      }
    } catch (err) {
      setIsCreating(false);
      Alert.alert(
        'Could not start conversation',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <Pressable
      onPress={() => handleSelectUser(item)}
      className="flex-row items-center px-4 py-3 active:bg-surface-hover"
    >
      <Avatar uri={item.avatar} size="md" status={item.status} showStatus />
      <View className="ml-3 flex-1">
        <Text className="text-text-primary text-[15px] font-medium">{item.name}</Text>
        <Text className="text-text-tertiary text-xs">@{item.username}</Text>
      </View>
      <Ionicons name="chatbubble-outline" size={20} color="#A8937F" />
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      onDismiss={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-background-primary"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={handleClose} hitSlop={8}>
            <Text className="text-accent-primary text-[15px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">New Message</Text>
          <View className="w-14" />
        </View>

        {/* Search */}
        <View className="px-4 py-3">
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search people..."
          />
        </View>

        {/* User list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : undefined}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="search" size={48} color="#A8937F" />
              <Text className="text-text-secondary mt-3 text-[15px]">
                {search ? 'No users found' : 'Search for someone to message'}
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
