import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { SearchBar } from '../ui/SearchBar';
import { useUserStore } from '../../stores/useUserStore';
import { useGroupsStore } from '../../stores/useGroupsStore';
import type { Group, GroupType, User } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (group: Group) => void;
}

const GROUP_TYPES: { key: GroupType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'general', label: 'General', icon: 'people' },
  { key: 'trip', label: 'Trip', icon: 'airplane' },
  { key: 'sports', label: 'Sports', icon: 'basketball' },
  { key: 'project', label: 'Project', icon: 'briefcase' },
];

export function CreateGroupModal({ visible, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('general');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = useUserStore((s) => s.currentUser);
  const users = useUserStore((s) => s.users);

  // Users excluding the current user (who is auto-added as admin)
  const otherUsers = useMemo(
    () => users.filter((u) => u.id !== currentUser?.id),
    [users, currentUser?.id],
  );

  const filteredUsers = useMemo(() => {
    if (!memberSearch.trim()) return otherUsers;
    const q = memberSearch.toLowerCase();
    return otherUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
    );
  }, [otherUsers, memberSearch]);

  const canCreate = name.trim().length > 0 && selectedMemberIds.size > 0;

  const reset = () => {
    setName('');
    setDescription('');
    setGroupType('general');
    setSelectedMemberIds(new Set());
    setMemberSearch('');
    setIsSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleToggleMember = (userId: string) => {
    Haptics.selectionAsync();
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!canCreate || isSaving) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const group = await useGroupsStore.getState().createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        type: groupType,
        memberIds: Array.from(selectedMemberIds),
      });
      reset();
      onCreated(group);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create group');
      setIsSaving(false);
    }
  };

  const renderMemberItem = ({ item }: { item: User }) => {
    const isSelected = selectedMemberIds.has(item.id);
    return (
      <Pressable
        onPress={() => handleToggleMember(item.id)}
        className="flex-row items-center py-2.5 px-4"
      >
        <Avatar uri={item.avatar} size="sm" />
        <Text className="text-text-primary text-[15px] ml-3 flex-1">{item.name}</Text>
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
          <Text className="text-text-primary text-[17px] font-semibold">New Group</Text>
          <Pressable onPress={handleCreate} disabled={!canCreate || isSaving} hitSlop={8}>
            <Text
              className={`text-[16px] font-semibold ${
                canCreate && !isSaving ? 'text-accent-primary' : 'text-text-tertiary'
              }`}
            >
              {isSaving ? 'Creating...' : 'Create'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group Name */}
          <View className="px-4 pt-4">
            <Text className="text-text-secondary text-sm font-medium mb-2">Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              placeholderTextColor="#A8937F"
              className="bg-surface-elevated rounded-xl px-4 py-3 text-text-primary text-[15px]"
            />
          </View>

          {/* Description */}
          <View className="px-4 pt-4">
            <Text className="text-text-secondary text-sm font-medium mb-2">
              Description (optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's this group about?"
              placeholderTextColor="#A8937F"
              multiline
              className="bg-surface-elevated rounded-xl px-4 py-3 text-text-primary text-[15px]"
              style={{ minHeight: 64, textAlignVertical: 'top' }}
            />
          </View>

          {/* Group Type */}
          <View className="px-4 pt-4">
            <Text className="text-text-secondary text-sm font-medium mb-2">Type</Text>
            <View className="flex-row gap-2">
              {GROUP_TYPES.map(({ key, label, icon }) => {
                const isSelected = groupType === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setGroupType(key);
                    }}
                    className={`flex-1 items-center py-3 rounded-xl border ${
                      isSelected
                        ? 'bg-accent-primary/20 border-accent-primary'
                        : 'bg-surface-elevated border-border'
                    }`}
                  >
                    <Ionicons
                      name={icon}
                      size={20}
                      color={isSelected ? '#D4764E' : '#7A6355'}
                    />
                    <Text
                      className={`text-xs mt-1 font-medium ${
                        isSelected ? 'text-accent-primary' : 'text-text-secondary'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Members */}
          <View className="pt-4">
            <View className="px-4 mb-2">
              <Text className="text-text-secondary text-sm font-medium mb-2">Members</Text>
              <SearchBar
                value={memberSearch}
                onChangeText={setMemberSearch}
                placeholder="Search people..."
              />
            </View>

            {/* Current user (admin) — non-removable */}
            {currentUser && (
              <View className="flex-row items-center py-2.5 px-4 opacity-60">
                <Avatar uri={currentUser.avatar} size="sm" />
                <Text className="text-text-primary text-[15px] ml-3 flex-1">
                  {currentUser.name}
                </Text>
                <Text className="text-text-tertiary text-xs">Admin</Text>
              </View>
            )}

            {/* Selectable users */}
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={renderMemberItem}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text className="text-text-tertiary text-sm text-center py-6">
                  {memberSearch ? 'No matches' : 'No users available'}
                </Text>
              }
            />

            {selectedMemberIds.size > 0 && (
              <Text className="text-text-tertiary text-xs px-4 mt-2">
                {selectedMemberIds.size} member{selectedMemberIds.size !== 1 ? 's' : ''} selected
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
