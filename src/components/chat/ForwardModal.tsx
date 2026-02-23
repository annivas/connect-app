import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SearchBar } from '../ui/SearchBar';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import type { Message } from '../../types';

interface Props {
  visible: boolean;
  message: Message;
  onClose: () => void;
  sourceConversationId: string;
}

interface ForwardTarget {
  id: string;
  name: string;
  avatar?: string;
  type: 'individual' | 'group';
}

export function ForwardModal({ visible, message, onClose, sourceConversationId }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const conversations = useMessagesStore((s) => s.conversations);
  const groups = useGroupsStore((s) => s.groups);
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  const targets = useMemo<ForwardTarget[]>(() => {
    const items: ForwardTarget[] = [];

    // Add individual conversations
    for (const conv of conversations) {
      if (conv.id === sourceConversationId) continue;
      if (conv.isArchived) continue;
      const otherUserId = conv.participants.find((p) => p !== currentUserId);
      const user = otherUserId ? getUserById(otherUserId) : null;
      if (user) {
        items.push({
          id: conv.id,
          name: user.name,
          avatar: user.avatar,
          type: 'individual',
        });
      }
    }

    // Add groups
    for (const group of groups) {
      items.push({
        id: group.id,
        name: group.name,
        avatar: group.avatar,
        type: 'group',
      });
    }

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((t) => t.name.toLowerCase().includes(q));
  }, [conversations, groups, currentUserId, getUserById, sourceConversationId, searchQuery]);

  const toggleTarget = (id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleForward = () => {
    if (selectedIds.size === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userId = currentUserId ?? 'unknown';

    // Partition targets by type — conversations go to useMessagesStore,
    // groups go to useGroupsStore
    const convTargetIds: string[] = [];
    const groupTargetIds: string[] = [];

    for (const id of selectedIds) {
      const target = targets.find((t) => t.id === id);
      if (target?.type === 'group') {
        groupTargetIds.push(id);
      } else {
        convTargetIds.push(id);
      }
    }

    // Forward to DM conversations
    if (convTargetIds.length > 0) {
      useMessagesStore.getState().forwardMessage(
        sourceConversationId,
        message.id,
        convTargetIds,
        userId,
      );
    }

    // Forward to groups — add directly to groupMessages store
    if (groupTargetIds.length > 0) {
      const senderUser = useUserStore.getState().getUserById(message.senderId);
      for (const groupId of groupTargetIds) {
        const forwardedMsg = {
          id: `msg-fwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          conversationId: groupId,
          senderId: userId,
          content: message.content,
          timestamp: new Date(),
          type: message.type,
          metadata: message.metadata,
          isRead: true,
          sendStatus: 'sent' as const,
          forwardedFrom: {
            originalMessageId: message.id,
            originalSenderId: message.senderId,
            originalSenderName: senderUser?.name ?? 'Unknown',
            originalConversationId: sourceConversationId,
            originalTimestamp: message.timestamp,
          },
        };

        useGroupsStore.setState((state) => ({
          groupMessages: [...state.groupMessages, forwardedMsg],
        }));
      }
    }

    setSelectedIds(new Set());
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={handleClose} className="mr-3">
            <Ionicons name="close" size={24} color="#A0A0AB" />
          </Pressable>
          <Text className="text-text-primary text-lg font-semibold flex-1">Forward Message</Text>
          {selectedIds.size > 0 && (
            <Pressable
              onPress={handleForward}
              className="bg-accent-primary px-4 py-1.5 rounded-full"
            >
              <Text className="text-white font-semibold text-sm">
                Send ({selectedIds.size})
              </Text>
            </Pressable>
          )}
        </View>

        {/* Search */}
        <View className="px-4 py-2">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
          />
        </View>

        {/* Message preview */}
        <View className="mx-4 mb-2 px-3 py-2 bg-surface-elevated rounded-xl border border-border-subtle">
          <Text className="text-text-tertiary text-[11px] mb-0.5">Forwarding:</Text>
          <Text className="text-text-primary text-[13px]" numberOfLines={2}>
            {message.content || 'Media message'}
          </Text>
        </View>

        {/* Target list */}
        <FlatList
          data={targets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <Pressable
                onPress={() => toggleTarget(item.id)}
                className={`flex-row items-center px-4 py-3 ${isSelected ? 'bg-accent-primary/10' : ''}`}
              >
                <Image
                  source={{ uri: item.avatar || 'https://picsum.photos/seed/default/100' }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                  contentFit="cover"
                />
                <View className="flex-1 ml-3">
                  <Text className="text-text-primary text-[15px] font-medium">{item.name}</Text>
                  <Text className="text-text-tertiary text-[12px]">
                    {item.type === 'group' ? 'Group' : 'Direct message'}
                  </Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected ? 'bg-accent-primary border-accent-primary' : 'border-border'
                  }`}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </Modal>
  );
}
