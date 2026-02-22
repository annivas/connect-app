import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, ActionSheetIOS, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const layout = useWindowDimensions();
  const [tabIndex, setTabIndex] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

  const conversation = useMessagesStore(useShallow((s) => s.getConversationById(id!)));
  const getUserById = useUserStore((s) => s.getUserById);

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
        return <ChatTab conversationId={id!} />;
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

        <IconButton
          icon="ellipsis-horizontal"
          onPress={showMenu}
        />
      </View>

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
              backgroundColor: '#6366F1',
              height: 3,
              borderRadius: 1.5,
            }}
            style={{
              backgroundColor: '#0A0A0F',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#1F1F2E',
            }}
            activeColor="#6366F1"
            inactiveColor="#6B6B76"
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
