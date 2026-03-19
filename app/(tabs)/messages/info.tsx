import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { Avatar } from '../../../src/components/ui/Avatar';
import { AvatarViewer } from '../../../src/components/ui/AvatarViewer';
import { IconButton } from '../../../src/components/ui/IconButton';
import { ConversationInfoSection } from '../../../src/components/chat/ConversationInfoSection';
import { QuickActions } from '../../../src/components/chat/QuickActions';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import { useCallStore } from '../../../src/stores/useCallStore';
import { useToastStore } from '../../../src/stores/useToastStore';
import type { DisappearingDuration } from '../../../src/types';

export default function ConversationInfoScreen() {
  const { id, channelId } = useLocalSearchParams<{ id: string; channelId?: string }>();
  const router = useRouter();
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);

  const conversation = useMessagesStore(useShallow((s) => s.getConversationById(id!)));
  const messages = useMessagesStore(useShallow((s) => s.getMessagesByConversationId(id!)));
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  const otherUserId = conversation?.participants.find((uid) => uid !== currentUserId);
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  if (!conversation || !otherUser || !otherUserId) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Conversation not found</Text>
      </SafeAreaView>
    );
  }

  const activeChannel = channelId ? conversation.channels?.find((c) => c.id === channelId) : null;
  const meta = activeChannel ? activeChannel.metadata : conversation.metadata;
  const sharedCount = meta?.sharedObjects?.length ?? 0;
  const pinnedCount = meta?.pinnedMessages?.length ?? 0;
  const notes = meta?.notes ?? [];
  const starredCount = meta?.starredMessages?.length ?? 0;
  const notesSavedCount = notes.length + starredCount;
  const reminders = meta?.reminders ?? [];
  const activeReminders = reminders.filter((r) => !r.isCompleted);
  const ledgerEntries = meta?.ledgerEntries ?? [];
  const unsettledEntries = ledgerEntries.filter((e) => !e.isSettled);
  const balance = meta?.ledgerBalance ?? 0;
  const events = meta?.events ?? [];
  const upcomingEvents = events.filter((e) => e.startDate > new Date());

  const handleCall = (type: 'voice' | 'video') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useCallStore.getState().initiateCall(id!, [otherUserId], type);
  };

  const handleToggleMute = () => {
    Haptics.selectionAsync();
    useMessagesStore.getState().toggleMute(id!);
  };

  const handleTogglePin = () => {
    Haptics.selectionAsync();
    useMessagesStore.getState().togglePin(id!);
  };

  const handleDisappearing = () => {
    const current = conversation.disappearingDuration ?? 'off';
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
            useMessagesStore.getState().setDisappearingDuration(id!, options[idx].value);
          }
        }
      );
    } else {
      Alert.alert('Disappearing Messages', 'Select duration', [
        ...options.map((o) => ({
          text: o.value === current ? `${o.label} ✓` : o.label,
          onPress: () => useMessagesStore.getState().setDisappearingDuration(id!, o.value),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const navigateToSection = (section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/messages/section-detail',
      params: { id: id!, section, ...(channelId ? { channelId } : {}) },
    });
  };

  const quickActions = [
    {
      icon: 'call-outline' as const,
      label: 'Call',
      onPress: () => handleCall('voice'),
    },
    {
      icon: 'videocam-outline' as const,
      label: 'Video',
      onPress: () => handleCall('video'),
    },
    {
      icon: conversation.isPinned ? 'pin' as const : 'pin-outline' as const,
      label: conversation.isPinned ? 'Unpin' : 'Pin',
      onPress: handleTogglePin,
      active: conversation.isPinned,
    },
    {
      icon: conversation.isMuted ? 'notifications-off' as const : 'notifications-outline' as const,
      label: conversation.isMuted ? 'Unmute' : 'Mute',
      onPress: handleToggleMute,
      active: conversation.isMuted,
    },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="flex-1 text-text-primary text-[17px] font-semibold ml-1">
          {activeChannel ? `Info · ${activeChannel.emoji || ''} ${activeChannel.name}` : 'Info'}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile card */}
        <View className="items-center pt-8 pb-4">
          <Avatar
            uri={otherUser.avatar}
            name={otherUser.name}
            size="xl"
            status={otherUser.status}
            showStatus
            statusEmoji={otherUser.richStatus?.emoji}
            onPress={() => setShowAvatarViewer(true)}
          />
          <Text className="text-text-primary text-2xl font-bold mt-4">
            {otherUser.name}
          </Text>
          <Text className="text-text-secondary text-[15px] mt-0.5">
            {otherUser.username}
          </Text>
          {/* Status pill */}
          <View className="flex-row items-center bg-surface-elevated rounded-full px-3 py-1.5 mt-2">
            <View
              className="w-2 h-2 rounded-full mr-2"
              style={{
                backgroundColor:
                  otherUser.status === 'online' ? '#2D9F6F' :
                  otherUser.status === 'away' ? '#D4964E' : '#A8937F',
              }}
            />
            <Text className="text-text-secondary text-sm">
              {otherUser.status === 'online' ? 'Online' :
               otherUser.status === 'away' ? 'Away' : 'Offline'}
            </Text>
          </View>
          {otherUser.richStatus && (!otherUser.richStatus.expiresAt || otherUser.richStatus.expiresAt > new Date()) ? (
            <View className="flex-row items-center bg-background-tertiary rounded-full px-3 py-1.5 mt-2">
              <Text className="text-sm mr-1">{otherUser.richStatus.emoji}</Text>
              <Text className="text-text-secondary text-sm">{otherUser.richStatus.text}</Text>
              {otherUser.richStatus.focusMode?.enabled && (
                <View className="ml-1.5 bg-status-warning/20 rounded-full px-1.5 py-0.5">
                  <Text style={{ fontSize: 9, color: '#D4964E', fontWeight: '700' }}>DND</Text>
                </View>
              )}
            </View>
          ) : otherUser.statusMessage ? (
            <Text className="text-text-tertiary text-sm mt-2 italic px-8 text-center">
              &ldquo;{otherUser.statusMessage}&rdquo;
            </Text>
          ) : null}

          {/* View Insights Button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: '/(tabs)/messages/contact-insights',
                params: { conversationId: id! },
              } as any);
            }}
            className="mt-3 active:opacity-80"
          >
            <View className="flex-row items-center bg-accent-primary/10 rounded-full px-4 py-2">
              <Ionicons name="analytics-outline" size={16} color="#D4764E" />
              <Text className="text-accent-primary text-sm font-medium ml-1.5">View Insights</Text>
            </View>
          </Pressable>
        </View>

        {/* Contact info */}
        {(otherUser.email || otherUser.phone) && (
          <View className="mx-4 mb-4 px-4 py-2 bg-surface rounded-2xl">
            {otherUser.email && (
              <View className="flex-row items-center py-3">
                <View className="w-9 h-9 rounded-full bg-background-secondary items-center justify-center">
                  <Ionicons name="mail-outline" size={18} color="#A8937F" />
                </View>
                <Text className="text-text-primary text-[15px] ml-3">{otherUser.email}</Text>
              </View>
            )}
            {otherUser.email && otherUser.phone && <View className="h-px bg-border-subtle" />}
            {otherUser.phone && (
              <View className="flex-row items-center py-3">
                <View className="w-9 h-9 rounded-full bg-background-secondary items-center justify-center">
                  <Ionicons name="call-outline" size={18} color="#A8937F" />
                </View>
                <Text className="text-text-primary text-[15px] ml-3">{otherUser.phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Quick actions */}
        <QuickActions actions={quickActions} />

        {/* Sections */}
        <View className="mt-2">
          {/* Shared Media */}
          <ConversationInfoSection
            icon="images-outline"
            title="Shared Media"
            badge={sharedCount > 0 ? sharedCount : undefined}
            onPress={() => navigateToSection('media')}
            preview={sharedCount > 0 ? (
              <Text className="text-text-tertiary text-xs ml-11">
                {sharedCount} item{sharedCount !== 1 ? 's' : ''} shared
              </Text>
            ) : undefined}
          />

          {/* Pinned Messages */}
          <ConversationInfoSection
            icon="pin-outline"
            title="Pinned Messages"
            badge={pinnedCount > 0 ? pinnedCount : undefined}
            onPress={() => navigateToSection('pins')}
            preview={pinnedCount > 0 ? (
              <Text className="text-text-tertiary text-xs ml-11" numberOfLines={1}>
                {pinnedCount} pinned message{pinnedCount !== 1 ? 's' : ''}
              </Text>
            ) : undefined}
          />

          {/* Notes & Saved */}
          <ConversationInfoSection
            icon="document-text-outline"
            title="Notes & Saved"
            badge={notesSavedCount > 0 ? notesSavedCount : undefined}
            onPress={() => navigateToSection('notes')}
            preview={notes.length > 0 ? (
              <Text className="text-text-tertiary text-xs ml-11" numberOfLines={1}>
                {notes[0].title}
                {notes.length > 1 ? ` +${notes.length - 1} more` : ''}
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
            preview={activeReminders.length > 0 ? (
              <Text className="text-text-tertiary text-xs ml-11" numberOfLines={1}>
                {activeReminders[0].title}
                {activeReminders[0].dueDate
                  ? ` · ${format(new Date(activeReminders[0].dueDate), 'MMM d')}`
                  : ''}
              </Text>
            ) : undefined}
          />

          {/* Expenses */}
          <ConversationInfoSection
            icon="wallet-outline"
            title="Expenses"
            badge={balance !== 0 ? `$${Math.abs(balance).toFixed(2)}` : undefined}
            badgeColor={balance > 0 ? '#2D9F6F' : balance < 0 ? '#C94F4F' : '#7A6355'}
            onPress={() => navigateToSection('ledger')}
            preview={unsettledEntries.length > 0 ? (
              <Text className="text-text-tertiary text-xs ml-11" numberOfLines={1}>
                {unsettledEntries.length} unsettled expense{unsettledEntries.length !== 1 ? 's' : ''}
              </Text>
            ) : undefined}
          />

          {/* Events */}
          <ConversationInfoSection
            icon="calendar-outline"
            title="Events"
            badge={upcomingEvents.length > 0 ? upcomingEvents.length : undefined}
            onPress={() => navigateToSection('events')}
            preview={upcomingEvents.length > 0 ? (
              <Text className="text-text-tertiary text-xs ml-11" numberOfLines={1}>
                {upcomingEvents[0].title}
                {upcomingEvents.length > 1 ? ` +${upcomingEvents.length - 1} more` : ''}
              </Text>
            ) : undefined}
          />
        </View>

        {/* Footer actions */}
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
              {conversation.disappearingDuration === 'off' || !conversation.disappearingDuration
                ? 'Off'
                : conversation.disappearingDuration}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#A8937F" />
          </Pressable>

          {/* Block user */}
          <Pressable
            onPress={() => {
              Alert.alert(
                `Block ${otherUser.name}?`,
                'You will no longer receive messages from this person.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Block', style: 'destructive', onPress: () => {
                    useMessagesStore.getState().toggleArchive(id!);
                    useToastStore.getState().show({ message: `${otherUser.name} has been blocked`, type: 'success' });
                    router.back();
                    router.back();
                  } },
                ],
              );
            }}
            className="flex-row items-center justify-center py-3.5 bg-surface rounded-2xl active:bg-surface-hover"
          >
            <Ionicons name="ban-outline" size={18} color="#C94F4F" />
            <Text className="text-status-error text-[15px] font-medium ml-2">
              Block {otherUser.name}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Avatar fullscreen viewer */}
      <AvatarViewer
        visible={showAvatarViewer}
        uri={otherUser.avatar}
        name={otherUser.name}
        onClose={() => setShowAvatarViewer(false)}
      />
    </SafeAreaView>
  );
}
