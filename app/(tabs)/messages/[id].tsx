import React, { useLayoutEffect, useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Avatar } from '../../../src/components/ui/Avatar';
import { ChatTab } from '../../../src/components/chat/ChatTab';
import { ChatModeToggle, type ChatMode } from '../../../src/components/chat/ChatModeToggle';
import { InChatSearchBar } from '../../../src/components/chat/InChatSearchBar';
import { DisappearingMessagesSheet } from '../../../src/components/chat/DisappearingMessagesSheet';
import { useMessageSearch } from '../../../src/hooks/useMessageSearch';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import { useCallStore } from '../../../src/stores/useCallStore';
import type { DisappearingDuration } from '../../../src/types';

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [showDisappearingSheet, setShowDisappearingSheet] = React.useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('chat');

  // Mark conversation as read when screen opens
  useEffect(() => {
    if (id) {
      useMessagesStore.getState().markAsRead(id);
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

  const conversation = useMessagesStore(useShallow((s) => s.getConversationById(id!)));
  const messages = useMessagesStore(useShallow((s) => s.getMessagesByConversationId(id!, chatMode === 'private')));
  const getUserById = useUserStore((s) => s.getUserById);

  const {
    searchQuery: chatSearchQuery,
    setSearchQuery: setChatSearchQuery,
    isSearching,
    openSearch,
    clearSearch,
    matchingMessageIds,
    matchCount,
  } = useMessageSearch(messages);

  // Clear search when switching chat modes
  useEffect(() => {
    clearSearch();
  }, [chatMode]);

  const showMenu = () => {
    const { togglePin, toggleMute, getConversationById } = useMessagesStore.getState();
    const conv = getConversationById(id!);
    const isPinned = conv?.isPinned ?? false;
    const isMuted = conv?.isMuted ?? false;

    const options = [
      isPinned ? 'Unpin' : 'Pin',
      isMuted ? 'Unmute' : 'Mute',
      'Disappearing Messages',
      'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3 },
        (idx) => {
          if (idx === 0) togglePin(id!);
          if (idx === 1) toggleMute(id!);
          if (idx === 2) setShowDisappearingSheet(true);
        }
      );
    } else {
      Alert.alert('Options', undefined, [
        { text: options[0], onPress: () => togglePin(id!) },
        { text: options[1], onPress: () => toggleMute(id!) },
        { text: options[2], onPress: () => setShowDisappearingSheet(true) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleSetDisappearing = (duration: DisappearingDuration) => {
    useMessagesStore.getState().setDisappearingDuration(id!, duration);
  };

  const otherUserId = conversation?.participants.find(
    (uid) => uid !== useUserStore.getState().currentUser?.id
  );
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  if (!conversation || !otherUser) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Conversation not found</Text>
      </SafeAreaView>
    );
  }

  const handleOpenInfo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/messages/info',
      params: { id: id! },
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />

        <Pressable onPress={handleOpenInfo} className="flex-1 flex-row items-center ml-1">
          <Avatar
            uri={otherUser.avatar}
            size="md"
            status={otherUser.status}
            showStatus
          />
          <View className="ml-3 flex-1">
            <Text className="text-text-primary text-[17px] font-semibold">
              {otherUser.name}
            </Text>
            <Text className="text-text-tertiary text-xs" numberOfLines={1}>
              {otherUser.status === 'online'
                ? 'Online'
                : otherUser.statusMessage || 'Offline'}
            </Text>
          </View>
        </Pressable>

        <IconButton icon="call-outline" onPress={() => {
          if (!otherUserId) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          useCallStore.getState().initiateCall(id!, [otherUserId], 'voice');
        }} />
        <IconButton icon="videocam-outline" onPress={() => {
          if (!otherUserId) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          useCallStore.getState().initiateCall(id!, [otherUserId], 'video');
        }} />
        <IconButton icon="search" onPress={openSearch} />
        <IconButton
          icon="ellipsis-horizontal"
          onPress={showMenu}
        />
      </View>

      {/* Chat / Private mode toggle */}
      <ChatModeToggle activeMode={chatMode} onModeChange={setChatMode} />

      {/* In-chat search bar */}
      <InChatSearchBar
        visible={isSearching}
        query={chatSearchQuery}
        onChangeQuery={setChatSearchQuery}
        matchCount={matchCount}
        onClose={clearSearch}
      />

      {/* Full-screen chat */}
      <ChatTab
        conversationId={id!}
        isPrivate={chatMode === 'private'}
        highlightText={isSearching ? chatSearchQuery : undefined}
        matchingMessageIds={isSearching ? matchingMessageIds : undefined}
      />

      <DisappearingMessagesSheet
        visible={showDisappearingSheet}
        currentDuration={conversation.disappearingDuration ?? 'off'}
        onSelect={handleSetDisappearing}
        onClose={() => setShowDisappearingSheet(false)}
      />
    </SafeAreaView>
  );
}
