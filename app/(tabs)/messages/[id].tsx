import React, { useState, useLayoutEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, ActionSheetIOS, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar, SceneRendererProps } from 'react-native-tab-view';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Avatar } from '../../../src/components/ui/Avatar';
import { ChatTab } from '../../../src/components/chat/ChatTab';
import { SharedTab } from '../../../src/components/chat/SharedTab';
import { NotesTab } from '../../../src/components/chat/NotesTab';
import { RemindersTab } from '../../../src/components/chat/RemindersTab';
import { LedgerTab } from '../../../src/components/chat/LedgerTab';
import { UserProfileSheet } from '../../../src/components/chat/UserProfileSheet';
import { InChatSearchBar } from '../../../src/components/chat/InChatSearchBar';
import { useMessageSearch } from '../../../src/hooks/useMessageSearch';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';

type Route = { key: string; title: string };

const routes: Route[] = [
  { key: 'chat', title: 'Chat' },
  { key: 'shared', title: 'Shared' },
  { key: 'notes', title: 'Notes' },
  { key: 'reminders', title: 'Reminders' },
  { key: 'ledger', title: 'Ledger' },
];

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const layout = useWindowDimensions();
  const [tabIndex, setTabIndex] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

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
  const messages = useMessagesStore(useShallow((s) => s.getMessagesByConversationId(id!)));
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

  const showMenu = () => {
    const { togglePin, toggleMute, getConversationById } = useMessagesStore.getState();
    const conv = getConversationById(id!);
    const isPinned = conv?.isPinned ?? false;
    const isMuted = conv?.isMuted ?? false;

    const options = [
      isPinned ? 'Unpin' : 'Pin',
      isMuted ? 'Unmute' : 'Mute',
      'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) togglePin(id!);
          if (idx === 1) toggleMute(id!);
        }
      );
    } else {
      Alert.alert('Options', undefined, [
        { text: options[0], onPress: () => togglePin(id!) },
        { text: options[1], onPress: () => toggleMute(id!) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
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

  const renderScene = ({
    route,
  }: SceneRendererProps & { route: Route }) => {
    switch (route.key) {
      case 'chat':
        return (
          <ChatTab
            conversationId={id!}
            highlightText={isSearching ? chatSearchQuery : undefined}
            matchingMessageIds={isSearching ? matchingMessageIds : undefined}
          />
        );
      case 'shared':
        return <SharedTab conversationId={id!} />;
      case 'notes':
        return <NotesTab conversationId={id!} />;
      case 'reminders':
        return <RemindersTab conversationId={id!} />;
      case 'ledger':
        return <LedgerTab conversationId={id!} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />

        <Pressable onPress={() => setShowProfile(true)} className="flex-1 flex-row items-center ml-1">
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

        <IconButton icon="search" onPress={openSearch} />
        <IconButton
          icon="ellipsis-horizontal"
          onPress={showMenu}
        />
      </View>

      {/* In-chat search bar */}
      <InChatSearchBar
        visible={isSearching}
        query={chatSearchQuery}
        onChangeQuery={setChatSearchQuery}
        matchCount={matchCount}
        onClose={clearSearch}
      />

      {/* Top Tabs */}
      <TabView
        navigationState={{ index: tabIndex, routes }}
        renderScene={renderScene}
        onIndexChange={setTabIndex}
        initialLayout={{ width: layout.width }}
        lazy
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={{
              backgroundColor: '#D4764E',
              height: 3,
              borderRadius: 1.5,
            }}
            style={{
              backgroundColor: '#FFF8F0',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#F0E2D4',
            }}
            activeColor="#D4764E"
            inactiveColor="#A8937F"
            scrollEnabled
            tabStyle={{ width: 'auto', minWidth: 80 }}
          />
        )}
      />

      <UserProfileSheet
        user={otherUser}
        visible={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </SafeAreaView>
  );
}
