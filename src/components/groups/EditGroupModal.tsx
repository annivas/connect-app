import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useToastStore } from '../../stores/useToastStore';
import type { Group, GroupType } from '../../types';

interface Props {
  group: Group;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const GROUP_TYPES: { key: GroupType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'general', label: 'General', icon: 'people' },
  { key: 'trip', label: 'Trip', icon: 'airplane' },
  { key: 'sports', label: 'Sports', icon: 'basketball' },
  { key: 'project', label: 'Project', icon: 'briefcase' },
];

export function EditGroupModal({ group, visible, onClose, onSaved }: Props) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [groupType, setGroupType] = useState<GroupType>(group.type);
  const [isSaving, setIsSaving] = useState(false);

  // Sync when modal opens with a different group
  useEffect(() => {
    if (visible) {
      setName(group.name);
      setDescription(group.description ?? '');
      setGroupType(group.type);
      setIsSaving(false);
    }
  }, [visible, group]);

  const hasChanges =
    name.trim() !== group.name ||
    description.trim() !== (group.description ?? '') ||
    groupType !== group.type;

  const canSave = name.trim().length > 0 && hasChanges;

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await useGroupsStore.getState().updateGroup(group.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        type: groupType,
      });
      onSaved();
      onClose();
    } catch (err) {
      useToastStore.getState().show({ message: err instanceof Error ? err.message : 'Failed to update group', type: 'error' });
      setIsSaving(false);
    }
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
          <Text className="text-text-primary text-[17px] font-semibold">Edit Group</Text>
          <Pressable onPress={handleSave} disabled={!canSave || isSaving} hitSlop={8}>
            <Text
              className={`text-[16px] font-semibold ${
                canSave && !isSaving ? 'text-accent-primary' : 'text-text-tertiary'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save'}
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
            <Text className="text-text-secondary text-sm font-medium mb-2">Description</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
