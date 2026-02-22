import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { MemberListItem } from './MemberListItem';
import { EditGroupModal } from './EditGroupModal';
import { AddMembersModal } from './AddMembersModal';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import type { Group, GroupType } from '../../types';

interface Props {
  group: Group | null;
  visible: boolean;
  onClose: () => void;
  onLeave: () => void;
}

const TYPE_INFO: Record<GroupType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  general: { label: 'General', icon: 'people' },
  trip: { label: 'Trip', icon: 'airplane' },
  sports: { label: 'Sports', icon: 'basketball' },
  project: { label: 'Project', icon: 'briefcase' },
};

function ActionButton({
  icon,
  label,
  onPress,
  color = '#7A6355',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} className="items-center flex-1">
      <View className="w-11 h-11 rounded-full bg-surface-elevated items-center justify-center mb-1">
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="text-text-secondary text-[11px]">{label}</Text>
    </Pressable>
  );
}

export function GroupInfoSheet({ group, visible, onClose, onLeave }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const getUserById = useUserStore((s) => s.getUserById);

  if (!group || !currentUserId) return null;

  const isAdmin = group.admins.includes(currentUserId);
  const typeInfo = TYPE_INFO[group.type];

  const handleTogglePin = () => {
    Haptics.selectionAsync();
    useGroupsStore.getState().togglePin(group.id);
  };

  const handleToggleMute = () => {
    Haptics.selectionAsync();
    useGroupsStore.getState().toggleMute(group.id);
  };

  const handleRemoveMember = (memberId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useGroupsStore.getState().removeMember(group.id, memberId);
  };

  const handleToggleAdmin = (memberId: string) => {
    Haptics.selectionAsync();
    useGroupsStore.getState().toggleAdmin(group.id, memberId);
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            useGroupsStore.getState().leaveGroup(group.id);
            onClose();
            onLeave();
          },
        },
      ],
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <ScrollView className="flex-1 bg-background-primary">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle">
            <Pressable onPress={onClose} hitSlop={8}>
              <Text className="text-accent-primary text-[15px]">Close</Text>
            </Pressable>
            <Text className="text-text-primary text-[17px] font-semibold">Group Info</Text>
            {isAdmin ? (
              <Pressable onPress={() => setShowEditModal(true)} hitSlop={8}>
                <Text className="text-accent-primary text-[15px]">Edit</Text>
              </Pressable>
            ) : (
              <View className="w-10" />
            )}
          </View>

          {/* Group profile */}
          <View className="items-center pt-8 pb-4">
            <Avatar uri={group.avatar} size="xl" />
            <Text className="text-text-primary text-2xl font-bold mt-4">
              {group.name}
            </Text>
            {/* Type badge */}
            <View className="flex-row items-center bg-surface-elevated rounded-full px-3 py-1.5 mt-2">
              <Ionicons name={typeInfo.icon} size={14} color="#D4764E" />
              <Text className="text-text-secondary text-sm ml-1.5">{typeInfo.label}</Text>
            </View>
            {group.description && (
              <Text className="text-text-tertiary text-sm mt-3 px-8 text-center">
                {group.description}
              </Text>
            )}
          </View>

          {/* Action buttons */}
          <View className="flex-row px-8 py-4">
            <ActionButton
              icon={group.isMuted ? 'notifications-off' : 'notifications-outline'}
              label={group.isMuted ? 'Unmute' : 'Mute'}
              onPress={handleToggleMute}
            />
            <ActionButton
              icon={group.isPinned ? 'pin' : 'pin-outline'}
              label={group.isPinned ? 'Unpin' : 'Pin'}
              onPress={handleTogglePin}
            />
          </View>

          {/* Members section */}
          <View className="mt-2">
            <View className="flex-row items-center justify-between px-4 mb-2">
              <Text className="text-text-secondary text-sm font-semibold">
                Members ({group.members.length})
              </Text>
              {isAdmin && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAddMembers(true);
                  }}
                  hitSlop={8}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="add-circle-outline" size={18} color="#D4764E" />
                    <Text className="text-accent-primary text-sm ml-1">Add</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {group.members.map((memberId) => {
              const user = getUserById(memberId);
              if (!user) return null;
              return (
                <MemberListItem
                  key={memberId}
                  user={user}
                  isAdmin={group.admins.includes(memberId)}
                  isCurrentUser={memberId === currentUserId}
                  canManage={isAdmin}
                  onRemove={() => handleRemoveMember(memberId)}
                  onToggleAdmin={() => handleToggleAdmin(memberId)}
                />
              );
            })}
          </View>

          {/* Leave group */}
          <View className="px-4 mt-6 mb-10">
            <Pressable
              onPress={handleLeave}
              className="flex-row items-center justify-center py-3 bg-surface-elevated rounded-xl"
            >
              <Ionicons name="exit-outline" size={20} color="#C94F4F" />
              <Text className="text-status-error text-[15px] font-medium ml-2">
                Leave Group
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Modal>

      {/* Sub-modals */}
      <EditGroupModal
        group={group}
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={() => {}}
      />
      <AddMembersModal
        groupId={group.id}
        existingMemberIds={group.members}
        visible={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        onAdded={() => {}}
      />
    </>
  );
}
