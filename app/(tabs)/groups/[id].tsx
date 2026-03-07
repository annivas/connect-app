import React, { useLayoutEffect, useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Avatar } from '../../../src/components/ui/Avatar';
import { GroupChatTab } from '../../../src/components/groups/GroupChatTab';
import { HouseholdTab } from '../../../src/components/groups/HouseholdTab';
import { TripTab } from '../../../src/components/groups/TripTab';
import { InChatSearchBar } from '../../../src/components/chat/InChatSearchBar';
import { DisappearingMessagesSheet } from '../../../src/components/chat/DisappearingMessagesSheet';
import { ChannelStrip } from '../../../src/components/chat/ChannelStrip';
import { CreateChannelModal } from '../../../src/components/chat/CreateChannelModal';
import { EditChannelModal } from '../../../src/components/chat/EditChannelModal';
import { CreatePollModal } from '../../../src/components/groups/CreatePollModal';
import { useMessageSearch } from '../../../src/hooks/useMessageSearch';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import { useCallStore } from '../../../src/stores/useCallStore';
import { CURRENT_USER_ID } from '../../../src/mocks/users';
import type { Channel } from '../../../src/types';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [showCreatePoll, setShowCreatePoll] = React.useState(false);
  const [showDisappearingSheet, setShowDisappearingSheet] = React.useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showEditChannel, setShowEditChannel] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [householdActiveTab, setHouseholdActiveTab] = useState<'chat' | 'household'>('chat');
  const [tripActiveTab, setTripActiveTab] = useState<'chat' | 'trip'>('chat');

  // Mark group as read when screen opens
  useEffect(() => {
    if (id) {
      useGroupsStore.getState().markGroupAsRead(id);
    }
  }, [id]);

  // Hide the bottom tab bar when this screen is focused
  const parentNavigation = navigation.getParent();
  useLayoutEffect(() => {
    parentNavigation?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      parentNavigation?.setOptions({
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#FFF1E6',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 8,
        },
      });
    };
  }, [parentNavigation]);

  const group = useGroupsStore(useShallow((s) => s.getGroupById(id!)));
  const activeChannelId = useGroupsStore((s) => s.getActiveChannel(id!));
  const channels = group?.channels ?? [];
  const groupMessages = useGroupsStore(useShallow((s) =>
    s.getGroupMessages(id!, false, activeChannelId)
  ));


  const {
    searchQuery: chatSearchQuery,
    setSearchQuery: setChatSearchQuery,
    isSearching,
    openSearch,
    clearSearch,
    matchingMessageIds,
    matchCount,
  } = useMessageSearch(groupMessages);

  const handleStartGroupCall = (type: 'voice' | 'video') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useCallStore.getState().initiateGroupCall(id!, group?.members ?? [], type);
  };

  const showMenu = () => {
    const { togglePin, toggleMute, getGroupById } = useGroupsStore.getState();
    const g = getGroupById(id!);
    const isPinned = g?.isPinned ?? false;
    const isMuted = g?.isMuted ?? false;

    const options = [
      'Create Poll',
      'Create Channel',
      'Disappearing Messages',
      isPinned ? 'Unpin' : 'Pin',
      isMuted ? 'Unmute' : 'Mute',
      'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 5 },
        (idx) => {
          if (idx === 0) setShowCreatePoll(true);
          if (idx === 1) setShowCreateChannel(true);
          if (idx === 2) setShowDisappearingSheet(true);
          if (idx === 3) togglePin(id!);
          if (idx === 4) toggleMute(id!);
        }
      );
    } else {
      Alert.alert('Options', undefined, [
        { text: 'Create Poll', onPress: () => setShowCreatePoll(true) },
        { text: 'Create Channel', onPress: () => setShowCreateChannel(true) },
        { text: 'Disappearing Messages', onPress: () => setShowDisappearingSheet(true) },
        { text: options[3], onPress: () => togglePin(id!) },
        { text: options[4], onPress: () => toggleMute(id!) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleSetDisappearing = (duration: import('../../../src/types').DisappearingDuration) => {
    useGroupsStore.getState().setGroupDisappearingDuration(id!, duration);
  };

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Group not found</Text>
      </SafeAreaView>
    );
  }

  const handleOpenInfo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/groups/info',
      params: { id: id!, ...(activeChannelId ? { channelId: activeChannelId } : {}) },
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />

        <Pressable onPress={handleOpenInfo} className="flex-1 flex-row items-center ml-1">
          <Avatar uri={group.avatar} size="md" />
          <View className="ml-3 flex-1">
            <Text className="text-text-primary text-[17px] font-semibold">
              {group.name}
            </Text>
            <Text className="text-text-tertiary text-xs">
              {group.members.length} members
            </Text>
          </View>
        </Pressable>

        <IconButton icon="call-outline" onPress={() => handleStartGroupCall('voice')} />
        <IconButton icon="videocam-outline" onPress={() => handleStartGroupCall('video')} />
        <IconButton icon="search" onPress={openSearch} />
        <IconButton icon="ellipsis-horizontal" onPress={showMenu} />
      </View>

      {/* Channel strip — shown when channels exist */}
      {channels.length > 0 && (
        <ChannelStrip
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={(channelId) => {
            useGroupsStore.getState().setActiveChannel(id!, channelId);
          }}
          onCreateChannel={() => setShowCreateChannel(true)}
          onLongPressChannel={(channel) => {
            setEditingChannel(channel);
            setShowEditChannel(true);
          }}
        />
      )}


      {/* In-chat search bar */}
      <InChatSearchBar
        visible={isSearching}
        query={chatSearchQuery}
        onChangeQuery={setChatSearchQuery}
        matchCount={matchCount}
        onClose={clearSearch}
      />

      {/* Household tab toggle */}
      {group.type === 'household' && group.household && (
        <View className="flex-row px-4 pt-2 pb-1 gap-2">
          {(['chat', 'household'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                Haptics.selectionAsync();
                setHouseholdActiveTab(tab);
              }}
              className="flex-1"
            >
              <View
                className={`flex-row items-center justify-center rounded-xl py-2 ${
                  householdActiveTab === tab ? 'bg-accent-primary' : 'bg-surface'
                }`}
              >
                <Ionicons
                  name={tab === 'chat' ? 'chatbubbles-outline' : 'home-outline'}
                  size={15}
                  color={householdActiveTab === tab ? '#FFFFFF' : '#7A6355'}
                />
                <Text
                  className={`text-xs font-medium ml-1.5 ${
                    householdActiveTab === tab ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {tab === 'chat' ? 'Chat' : 'Home'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Trip tab toggle */}
      {group.type === 'trip' && (
        <View className="flex-row px-4 pt-2 pb-1 gap-2">
          {(['chat', 'trip'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                Haptics.selectionAsync();
                setTripActiveTab(tab);
              }}
              className="flex-1"
            >
              <View
                className={`flex-row items-center justify-center rounded-xl py-2 ${
                  tripActiveTab === tab ? 'bg-accent-primary' : 'bg-surface'
                }`}
              >
                <Ionicons
                  name={tab === 'chat' ? 'chatbubbles-outline' : 'airplane-outline'}
                  size={15}
                  color={tripActiveTab === tab ? '#FFFFFF' : '#7A6355'}
                />
                <Text
                  className={`text-xs font-medium ml-1.5 ${
                    tripActiveTab === tab ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {tab === 'chat' ? 'Chat' : 'Trip'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Main content area */}
      {group.type === 'household' && group.household && householdActiveTab === 'household' ? (
        <HouseholdTab
          data={group.household}
          getUserName={(uid) => useUserStore.getState().getUserById(uid)?.name ?? 'Unknown'}
          getUserAvatar={(uid) => useUserStore.getState().getUserById(uid)?.avatar ?? ''}
          currentUserId={CURRENT_USER_ID}
          onToggleChore={(choreId) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const g = useGroupsStore.getState().getGroupById(id!);
            if (!g?.household) return;
            const updatedChores = g.household.chores.map((c) =>
              c.id === choreId ? { ...c, isCompleted: !c.isCompleted, lastCompleted: !c.isCompleted ? new Date() : c.lastCompleted } : c
            );
            useGroupsStore.getState().updateGroup(id!, { household: { ...g.household, chores: updatedChores } } as any);
          }}
          onToggleShoppingItem={(itemId) => {
            Haptics.selectionAsync();
            const g = useGroupsStore.getState().getGroupById(id!);
            if (!g?.household) return;
            const updatedItems = g.household.shoppingList.map((item) =>
              item.id === itemId ? { ...item, isChecked: !item.isChecked, checkedBy: !item.isChecked ? CURRENT_USER_ID : undefined } : item
            );
            useGroupsStore.getState().updateGroup(id!, { household: { ...g.household, shoppingList: updatedItems } } as any);
          }}
          onAddShoppingItem={(name) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const g = useGroupsStore.getState().getGroupById(id!);
            if (!g?.household) return;
            const newItem = { id: `shop-${Date.now()}`, name, isChecked: false, addedBy: CURRENT_USER_ID, addedAt: new Date() };
            useGroupsStore.getState().updateGroup(id!, { household: { ...g.household, shoppingList: [...g.household.shoppingList, newItem] } } as any);
          }}
          onDeleteShoppingItem={(itemId) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const g = useGroupsStore.getState().getGroupById(id!);
            if (!g?.household) return;
            const updatedItems = g.household.shoppingList.filter((item) => item.id !== itemId);
            useGroupsStore.getState().updateGroup(id!, { household: { ...g.household, shoppingList: updatedItems } } as any);
          }}
          onToggleBillPaid={(billId) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const g = useGroupsStore.getState().getGroupById(id!);
            if (!g?.household) return;
            const updatedBills = g.household.recurringBills.map((b) =>
              b.id === billId ? { ...b, isPaid: !b.isPaid, paidBy: !b.isPaid ? CURRENT_USER_ID : undefined } : b
            );
            useGroupsStore.getState().updateGroup(id!, { household: { ...g.household, recurringBills: updatedBills } } as any);
          }}
        />
      ) : group.type === 'trip' && tripActiveTab === 'trip' ? (
        <TripTab groupId={id!} />
      ) : (
        <GroupChatTab
          groupId={id!}
          isPrivate={false}
          channelId={activeChannelId}

          highlightText={isSearching ? chatSearchQuery : undefined}
          matchingMessageIds={isSearching ? matchingMessageIds : undefined}
        />
      )}

      <CreatePollModal
        visible={showCreatePoll}
        onClose={() => setShowCreatePoll(false)}
        onCreatePoll={(question, options, isMultipleChoice) => {
          useGroupsStore.getState().createPoll(id!, question, options, isMultipleChoice);
        }}
      />

      <DisappearingMessagesSheet
        visible={showDisappearingSheet}
        currentDuration={group?.disappearingDuration ?? 'off'}
        onSelect={handleSetDisappearing}
        onClose={() => setShowDisappearingSheet(false)}
      />

      <CreateChannelModal
        visible={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        onCreate={(name, emoji, color) => {
          useGroupsStore.getState().createChannel(id!, name, emoji, color);
        }}
      />

      <EditChannelModal
        visible={showEditChannel}
        channel={editingChannel}
        onClose={() => {
          setShowEditChannel(false);
          setEditingChannel(null);
        }}
        onUpdate={(channelId, updates) => {
          useGroupsStore.getState().updateChannel(id!, channelId, updates);
        }}
        onDelete={(channelId) => {
          useGroupsStore.getState().deleteChannel(id!, channelId);
        }}
      />
    </SafeAreaView>
  );
}
