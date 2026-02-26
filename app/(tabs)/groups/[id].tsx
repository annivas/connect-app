import React, { useLayoutEffect, useEffect } from 'react';
import { View, Text, Pressable, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Avatar } from '../../../src/components/ui/Avatar';
import { GroupChatTab } from '../../../src/components/groups/GroupChatTab';
import { InChatSearchBar } from '../../../src/components/chat/InChatSearchBar';
import { DisappearingMessagesSheet } from '../../../src/components/chat/DisappearingMessagesSheet';
import { CreatePollModal } from '../../../src/components/groups/CreatePollModal';
import { useMessageSearch } from '../../../src/hooks/useMessageSearch';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import { useCallStore } from '../../../src/stores/useCallStore';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [showCreatePoll, setShowCreatePoll] = React.useState(false);
  const [showDisappearingSheet, setShowDisappearingSheet] = React.useState(false);

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
  const groupMessages = useGroupsStore(useShallow((s) => s.getGroupMessages(id!)));

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
      'Disappearing Messages',
      isPinned ? 'Unpin' : 'Pin',
      isMuted ? 'Unmute' : 'Mute',
      'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 4 },
        (idx) => {
          if (idx === 0) setShowCreatePoll(true);
          if (idx === 1) setShowDisappearingSheet(true);
          if (idx === 2) togglePin(id!);
          if (idx === 3) toggleMute(id!);
        }
      );
    } else {
      Alert.alert('Options', undefined, [
        { text: 'Create Poll', onPress: () => setShowCreatePoll(true) },
        { text: 'Disappearing Messages', onPress: () => setShowDisappearingSheet(true) },
        { text: options[2], onPress: () => togglePin(id!) },
        { text: options[3], onPress: () => toggleMute(id!) },
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
      params: { id: id! },
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

      {/* In-chat search bar */}
      <InChatSearchBar
        visible={isSearching}
        query={chatSearchQuery}
        onChangeQuery={setChatSearchQuery}
        matchCount={matchCount}
        onClose={clearSearch}
      />

      {/* Full-screen chat */}
      <GroupChatTab
        groupId={id!}
        highlightText={isSearching ? chatSearchQuery : undefined}
        matchingMessageIds={isSearching ? matchingMessageIds : undefined}
      />

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
    </SafeAreaView>
  );
}
