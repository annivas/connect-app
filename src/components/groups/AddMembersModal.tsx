import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { SearchBar } from '../ui/SearchBar';
import { useUserStore } from '../../stores/useUserStore';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useToastStore } from '../../stores/useToastStore';
import type { User } from '../../types';

interface Props {
  groupId: string;
  existingMemberIds: string[];
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddMembersModal({
  groupId,
  existingMemberIds,
  visible,
  onClose,
  onAdded,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const currentUser = useUserStore((s) => s.currentUser);
  const users = useUserStore((s) => s.users);

  // Users not already in the group
  const availableUsers = useMemo(
    () => users.filter((u) => !existingMemberIds.includes(u.id) && u.id !== currentUser?.id),
    [users, existingMemberIds, currentUser?.id],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return availableUsers;
    const q = search.toLowerCase();
    return availableUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
    );
  }, [availableUsers, search]);

  const canAdd = selectedIds.size > 0;

  const handleClose = () => {
    setSearch('');
    setSelectedIds(new Set());
    setIsAdding(false);
    onClose();
  };

  const handleToggle = (userId: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (!canAdd || isAdding) return;
    setIsAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      useGroupsStore.getState().addMembers(groupId, Array.from(selectedIds));
      handleClose();
      onAdded();
    } catch (err) {
      useToastStore.getState().show({ message: err instanceof Error ? err.message : 'Failed to add members', type: 'error' });
      setIsAdding(false);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <Pressable
        onPress={() => handleToggle(item.id)}
        className="flex-row items-center py-2.5 px-4"
      >
        <Avatar uri={item.avatar} size="sm" />
        <View className="ml-3 flex-1">
          <Text className="text-text-primary text-[15px]">{item.name}</Text>
          <Text className="text-text-tertiary text-xs">@{item.username}</Text>
        </View>
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={22}
          color={isSelected ? '#D4764E' : '#A8937F'}
        />
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-background-primary"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Pressable onPress={handleClose} hitSlop={8}>
            <Text className="text-accent-primary text-[16px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">Add Members</Text>
          <Pressable onPress={handleAdd} disabled={!canAdd || isAdding} hitSlop={8}>
            <Text
              className={`text-[16px] font-semibold ${
                canAdd && !isAdding ? 'text-accent-primary' : 'text-text-tertiary'
              }`}
            >
              {isAdding ? 'Adding...' : `Add (${selectedIds.size})`}
            </Text>
          </Pressable>
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
              <Ionicons name="people-outline" size={48} color="#A8937F" />
              <Text className="text-text-secondary mt-3 text-[15px]">
                {search ? 'No users found' : 'All users are already members'}
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
