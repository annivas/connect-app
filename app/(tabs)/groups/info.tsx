import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { isPast, format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { Avatar } from '../../../src/components/ui/Avatar';
import { IconButton } from '../../../src/components/ui/IconButton';
import { ConversationInfoSection } from '../../../src/components/chat/ConversationInfoSection';
import { QuickActions } from '../../../src/components/chat/QuickActions';
import { MemberListItem } from '../../../src/components/groups/MemberListItem';
import { EditGroupModal } from '../../../src/components/groups/EditGroupModal';
import { AddMembersModal } from '../../../src/components/groups/AddMembersModal';
import { useToastStore } from '../../../src/stores/useToastStore';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import { useCallStore } from '../../../src/stores/useCallStore';
import type { GroupType, DisappearingDuration } from '../../../src/types';

const TYPE_INFO: Record<GroupType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  general: { label: 'General', icon: 'people' },
  trip: { label: 'Trip', icon: 'airplane' },
  sports: { label: 'Sports', icon: 'basketball' },
  project: { label: 'Project', icon: 'briefcase' },
};

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const group = useGroupsStore(useShallow((s) => s.getGroupById(id!)));
  const polls = useGroupsStore(useShallow((s) => s.groupPolls[id!] ?? []));
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  if (!group || !currentUserId) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Group not found</Text>
      </SafeAreaView>
    );
  }

  const isAdmin = group.admins.includes(currentUserId);
  const typeInfo = TYPE_INFO[group.type];
  const meta = group.metadata;

  const sharedCount = meta?.sharedObjects?.length ?? 0;
  const pinnedCount = meta?.pinnedMessages?.length ?? 0;
  const notes = meta?.notes ?? [];
  const starredCount = meta?.starredMessages?.length ?? 0;
  const notesSavedCount = notes.length + starredCount;
  const reminders = meta?.reminders ?? [];
  const activeReminders = reminders.filter((r) => !r.isCompleted);
  const ledgerEntries = meta?.ledgerEntries ?? [];
  const unsettledEntries = ledgerEntries.filter((e) => !e.isSettled);
  const events = group.events ?? [];
  const upcomingEvents = events.filter((e) => !isPast(e.startDate));
  const activePolls = polls.filter((p) => !p.isClosed);

  const handleStartGroupCall = (type: 'voice' | 'video') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useCallStore.getState().initiateGroupCall(id!, group.members, type);
  };

  const handleToggleMute = () => {
    Haptics.selectionAsync();
    useGroupsStore.getState().toggleMute(id!);
  };

  const handleTogglePin = () => {
    Haptics.selectionAsync();
    useGroupsStore.getState().togglePin(id!);
  };

  const handleRemoveMember = (memberId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useGroupsStore.getState().removeMember(id!, memberId);
  };

  const handleToggleAdmin = (memberId: string) => {
    Haptics.selectionAsync();
    useGroupsStore.getState().toggleAdmin(id!, memberId);
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
            useGroupsStore.getState().leaveGroup(id!);
            router.dismissAll();
          },
        },
      ],
    );
  };

  const handleDisappearing = () => {
    const current = group.disappearingDuration ?? 'off';
    const options: { label: string; value: DisappearingDuration }[] = [
      { label: 'Off', value: 'off' },
      { label: '30 seconds', value: '30s' },
      { label: '5 minutes', value: '5m' },
      { label: '1 hour', value: '1h' },
      { label: '24 hours', value: '24h' },
      { label: '7 days', value: '7d' },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map((o) => (o.value === current ? `${o.label} ✓` : o.label)), 'Cancel'],
          cancelButtonIndex: options.length,
        },
        (idx) => {
          if (idx < options.length) {
            useGroupsStore.getState().setGroupDisappearingDuration(id!, options[idx].value);
          }
        }
      );
    } else {
      Alert.alert('Disappearing Messages', 'Select duration', [
        ...options.map((o) => ({
          text: o.value === current ? `${o.label} ✓` : o.label,
          onPress: () => useGroupsStore.getState().setGroupDisappearingDuration(id!, o.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const navigateToSection = (section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/groups/section-detail',
      params: { id: id!, section },
    });
  };

  const quickActions = [
    {
      icon: 'call-outline' as const,
      label: 'Call',
      onPress: () => handleStartGroupCall('voice'),
    },
    {
      icon: 'videocam-outline' as const,
      label: 'Video',
      onPress: () => handleStartGroupCall('video'),
    },
    {
      icon: group.isPinned ? 'pin' as const : 'pin-outline' as const,
      label: group.isPinned ? 'Unpin' : 'Pin',
      onPress: handleTogglePin,
      active: group.isPinned,
    },
    {
      icon: group.isMuted ? 'notifications-off' as const : 'notifications-outline' as const,
      label: group.isMuted ? 'Unmute' : 'Mute',
      onPress: handleToggleMute,
      active: group.isMuted,
    },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="flex-1 text-text-primary text-[17px] font-semibold ml-1">Group Info</Text>
        {isAdmin && (
          <Pressable onPress={() => setShowEditModal(true)} hitSlop={8} className="mr-2">
            <Text className="text-accent-primary text-[15px]">Edit</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
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

        {/* Quick actions */}
        <QuickActions actions={quickActions} />

        {/* ─── Group-specific sections ─── */}
        <View className="mt-2">
          {/* Events */}
          <ConversationInfoSection
            icon="calendar-outline"
            title="Events"
            badge={upcomingEvents.length > 0 ? upcomingEvents.length : undefined}
            badgeColor="#D4764E"
            onPress={() => navigateToSection('events')}
            preview={upcomingEvents.length > 0 ? (
              <Text className="text-text-tertiary text-xs ml-11" numberOfLines={1}>
                {upcomingEvents[0].title} · {format(upcomingEvents[0].startDate, 'MMM d')}
              </Text>
            ) : undefined}
          />

          {/* Polls */}
          <ConversationInfoSection
            icon="bar-chart-outline"
            title="Polls"
            badge={activePolls.length > 0 ? activePolls.length : undefined}
            badgeColor="#5B8EC9"
            onPress={() => navigateToSection('polls')}
            preview={activePolls.length > 0 ? (
              <Text className="text-text-tertiary text-xs ml-11" numberOfLines={1}>
                {activePolls[0].question}
              </Text>
            ) : undefined}
          />

          {/* Trip (if applicable) */}
          {group.type === 'trip' && group.trip && (
            <ConversationInfoSection
              icon="airplane-outline"
              title="Trip Itinerary"
              badge={group.trip.itinerary.length > 0 ? group.trip.itinerary.length : undefined}
              badgeColor="#D4764E"
              onPress={() => navigateToSection('trip')}
              preview={(
                <Text className="text-text-tertiary text-xs ml-11" numberOfLines={1}>
                  {group.trip.destination} · {format(group.trip.startDate, 'MMM d')} - {format(group.trip.endDate, 'MMM d')}
                </Text>
              )}
            />
          )}

          {/* Shared Media */}
          <ConversationInfoSection
            icon="images-outline"
            title="Shared Media"
            badge={sharedCount > 0 ? sharedCount : undefined}
            onPress={() => navigateToSection('media')}
          />

          {/* Pinned Messages */}
          {pinnedCount > 0 && (
            <ConversationInfoSection
              icon="pin-outline"
              title="Pinned Messages"
              badge={pinnedCount}
              onPress={() => navigateToSection('pins')}
            />
          )}

          {/* Notes & Saved */}
          <ConversationInfoSection
            icon="document-text-outline"
            title="Notes & Saved"
            badge={notesSavedCount > 0 ? notesSavedCount : undefined}
            onPress={() => navigateToSection('notes')}
            preview={notes.length > 0 ? (
              <Text className="text-text-tertiary text-xs ml-11" numberOfLines={1}>
                {notes[0].title}
              </Text>
            ) : undefined}
          />

          {/* Reminders */}
          <ConversationInfoSection
            icon="alarm-outline"
            title="Reminders"
            badge={activeReminders.length > 0 ? activeReminders.length : undefined}
            badgeColor={activeReminders.some((r) => new Date(r.dueDate) < new Date()) ? '#C94F4F' : '#D4764E'}
            onPress={() => navigateToSection('reminders')}
          />

          {/* Expenses */}
          <ConversationInfoSection
            icon="wallet-outline"
            title="Expenses"
            badge={unsettledEntries.length > 0 ? `${unsettledEntries.length} unsettled` : undefined}
            onPress={() => navigateToSection('ledger')}
          />
        </View>

        {/* ─── Members ─── */}
        <View className="mt-4">
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

          <View className="mx-4 bg-surface rounded-2xl overflow-hidden">
            {group.members.map((memberId, index) => {
              const user = getUserById(memberId);
              if (!user) return null;
              return (
                <React.Fragment key={memberId}>
                  {index > 0 && <View className="h-px bg-border-subtle mx-4" />}
                  <MemberListItem
                    user={user}
                    isAdmin={group.admins.includes(memberId)}
                    isCurrentUser={memberId === currentUserId}
                    canManage={isAdmin}
                    onRemove={() => handleRemoveMember(memberId)}
                    onToggleAdmin={() => handleToggleAdmin(memberId)}
                  />
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* ─── Footer actions ─── */}
        <View className="mx-4 mt-6">
          {/* Disappearing messages */}
          <Pressable
            onPress={handleDisappearing}
            className="flex-row items-center px-4 py-3.5 bg-surface rounded-2xl mb-3 active:bg-surface-hover"
          >
            <View className="w-8 h-8 rounded-full bg-background-secondary items-center justify-center mr-3">
              <Ionicons name="timer-outline" size={17} color="#7A6355" />
            </View>
            <Text className="flex-1 text-text-primary text-[15px] font-medium">
              Disappearing Messages
            </Text>
            <Text className="text-text-tertiary text-sm mr-2">
              {group.disappearingDuration === 'off' || !group.disappearingDuration
                ? 'Off'
                : group.disappearingDuration}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#A8937F" />
          </Pressable>

          {/* Leave group */}
          <Pressable
            onPress={handleLeave}
            className="flex-row items-center justify-center py-3.5 bg-surface rounded-2xl active:bg-surface-hover"
          >
            <Ionicons name="exit-outline" size={18} color="#C94F4F" />
            <Text className="text-status-error text-[15px] font-medium ml-2">
              Leave Group
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sub-modals */}
      <EditGroupModal
        group={group}
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={() => setShowEditModal(false)}
      />
      <AddMembersModal
        groupId={group.id}
        existingMemberIds={group.members}
        visible={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        onAdded={() => {
          setShowAddMembers(false);
          useToastStore.getState().show({ message: 'Members added successfully', type: 'success' });
        }}
      />
    </SafeAreaView>
  );
}
