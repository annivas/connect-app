import React, { useState, useLayoutEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, ActionSheetIOS, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar, SceneRendererProps } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { GroupChatTab } from '../../../src/components/groups/GroupChatTab';
import { GroupInfoSheet } from '../../../src/components/groups/GroupInfoSheet';
import { SharedTab } from '../../../src/components/chat/SharedTab';
import { InChatSearchBar } from '../../../src/components/chat/InChatSearchBar';
import { useMessageSearch } from '../../../src/hooks/useMessageSearch';
import { ItineraryItemModal } from '../../../src/components/groups/ItineraryItemModal';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { RSVPStatus, ItineraryItem } from '../../../src/types';

type Route = { key: string; title: string };

// ─── Sub-tab components ─────────────────────

const RSVP_OPTIONS: { status: RSVPStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: 'going', label: 'Going', icon: 'checkmark-circle-outline' },
  { status: 'maybe', label: 'Maybe', icon: 'help-circle-outline' },
  { status: 'declined', label: "Can't go", icon: 'close-circle-outline' },
];

function RSVPButton({
  option,
  isSelected,
  onPress,
}: {
  option: (typeof RSVP_OPTIONS)[number];
  isSelected: boolean;
  onPress: () => void;
}) {
  const selectedStyles: Record<RSVPStatus, { bg: string; text: string; iconColor: string }> = {
    going: { bg: 'bg-accent-primary', text: 'text-white', iconColor: '#FFFFFF' },
    maybe: { bg: 'bg-status-warning/20', text: 'text-status-warning', iconColor: '#D4964E' },
    declined: { bg: 'bg-surface-elevated', text: 'text-status-error', iconColor: '#C94F4F' },
    pending: { bg: 'bg-surface-elevated', text: 'text-text-secondary', iconColor: '#7A6355' },
  };

  const style = isSelected
    ? selectedStyles[option.status]
    : { bg: 'bg-surface-elevated', text: 'text-text-secondary', iconColor: '#7A6355' };

  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${style.bg}`}
    >
      <Ionicons name={option.icon} size={16} color={style.iconColor} />
      <Text className={`text-xs font-medium ml-1.5 ${style.text}`}>{option.label}</Text>
    </Pressable>
  );
}

function EventsTab({ groupId }: { groupId: string }) {
  const router = useRouter();
  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const events = group?.events ?? [];

  const upcoming = events.filter((e) => !isPast(e.startDate)).sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );
  const past = events.filter((e) => isPast(e.startDate)).sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime(),
  );

  const handleRSVP = (eventId: string, status: RSVPStatus) => {
    Haptics.selectionAsync();
    useGroupsStore.getState().updateRSVP(groupId, eventId, status);
  };

  const handleOpenEventSpace = (eventId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/groups/event-space',
      params: { groupId, eventId },
    });
  };

  if (events.length === 0) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="calendar-outline"
          title="No events"
          description='Events created in this group will appear here'
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary p-4">
      {/* ── Upcoming Events ── */}
      {upcoming.length > 0 && (
        <>
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-2 font-semibold">
            Upcoming
          </Text>
          {upcoming.map((event) => {
            const goingCount = event.attendees.filter((a) => a.status === 'going').length;
            const maybeCount = event.attendees.filter((a) => a.status === 'maybe').length;
            const myStatus: RSVPStatus =
              event.attendees.find((a) => a.userId === currentUserId)?.status ?? 'pending';

            return (
              <Card key={event.id} className="mb-3">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="text-text-primary text-[16px] font-semibold">
                      {event.title}
                    </Text>
                    {event.description && (
                      <Text className="text-text-secondary text-sm mt-1">{event.description}</Text>
                    )}
                  </View>
                  <View className="bg-accent-primary/20 rounded-lg px-3 py-1.5">
                    <Text className="text-accent-primary text-xs font-semibold">
                      {format(event.startDate, 'MMM d')}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mt-2">
                  <Ionicons name="time-outline" size={14} color="#A8937F" />
                  <Text className="text-text-tertiary text-xs ml-1">
                    {format(event.startDate, 'HH:mm')}
                    {event.endDate && ` - ${format(event.endDate, 'HH:mm')}`}
                  </Text>
                  <View className="flex-row items-center ml-4">
                    <Ionicons name="checkmark-circle" size={14} color="#2D9F6F" />
                    <Text className="text-text-tertiary text-xs ml-1">{goingCount} going</Text>
                  </View>
                  {maybeCount > 0 && (
                    <View className="flex-row items-center ml-3">
                      <Ionicons name="help-circle" size={14} color="#D4964E" />
                      <Text className="text-text-tertiary text-xs ml-1">{maybeCount} maybe</Text>
                    </View>
                  )}
                </View>

                {/* RSVP Buttons */}
                <View className="flex-row gap-2 mt-3">
                  {RSVP_OPTIONS.map((option) => (
                    <RSVPButton
                      key={option.status}
                      option={option}
                      isSelected={myStatus === option.status}
                      onPress={() => handleRSVP(event.id, option.status)}
                    />
                  ))}
                </View>

                {/* Event Space Link */}
                <Pressable
                  onPress={() => handleOpenEventSpace(event.id)}
                  className="flex-row items-center justify-center mt-3 pt-3 border-t border-border-subtle active:opacity-70"
                >
                  <Ionicons name="chatbubbles-outline" size={16} color="#D4764E" />
                  <Text className="text-accent-primary text-sm font-medium ml-1.5">
                    {event.eventSpaceId ? 'Open Chat' : 'Start Chat'}
                  </Text>
                </Pressable>
              </Card>
            );
          })}
        </>
      )}

      {/* ── Past Events ── */}
      {past.length > 0 && (
        <>
          <Text className="text-text-tertiary text-xs uppercase tracking-wide mb-2 mt-4 font-semibold">
            Memories
          </Text>
          {past.map((event) => {
            const goingCount = event.attendees.filter((a) => a.status === 'going').length;
            const maybeCount = event.attendees.filter((a) => a.status === 'maybe').length;

            return (
              <Card key={event.id} className="mb-3" style={{ opacity: 0.75 }}>
                <View className="flex-row items-start justify-between mb-1">
                  <View className="flex-1 mr-3">
                    <Text className="text-text-secondary text-[15px] font-semibold">
                      {event.title}
                    </Text>
                  </View>
                  <Text className="text-text-tertiary text-xs">
                    {format(event.startDate, 'MMM d')}
                  </Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="people" size={13} color="#A8937F" />
                  <Text className="text-text-tertiary text-xs ml-1">
                    {goingCount} went{maybeCount > 0 ? `, ${maybeCount} maybe` : ''}
                  </Text>
                </View>

                {/* View Chat History — only if event space was created */}
                {event.eventSpaceId && (
                  <Pressable
                    onPress={() => handleOpenEventSpace(event.id)}
                    className="flex-row items-center justify-center mt-2.5 pt-2.5 border-t border-border-subtle active:opacity-70"
                  >
                    <Ionicons name="chatbubbles-outline" size={14} color="#A8937F" />
                    <Text className="text-text-tertiary text-xs font-medium ml-1.5">
                      View Chat History
                    </Text>
                  </Pressable>
                )}
              </Card>
            );
          })}
        </>
      )}
    </View>
  );
}

function TripTab({ groupId }: { groupId: string }) {
  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const trip = group?.trip;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);

  if (!trip) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="airplane-outline"
          title="No trip planned"
          description="Create a trip itinerary for this group"
        />
      </View>
    );
  }

  const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    activity: 'flag',
    accommodation: 'bed',
    transport: 'car',
    meal: 'restaurant',
    other: 'ellipse',
  };

  const totalDays = Math.max(
    1,
    Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  const handleAddItem = () => {
    setEditingItem(null);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEditItem = (item: ItineraryItem) => {
    setEditingItem(item);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSave = (item: ItineraryItem) => {
    if (editingItem) {
      useGroupsStore.getState().editItineraryItem(groupId, item.id, item);
    } else {
      useGroupsStore.getState().addItineraryItem(groupId, item);
    }
  };

  const handleDelete = (itemId: string) => {
    useGroupsStore.getState().deleteItineraryItem(groupId, itemId);
  };

  return (
    <View className="flex-1 bg-background-primary">
      <View className="p-4 pb-20">
        {/* Trip header */}
        <View className="mb-4">
          <Text className="text-text-primary text-xl font-bold">
            {trip.destination}
          </Text>
          <Text className="text-text-secondary text-sm mt-1">
            {format(trip.startDate, 'MMM d')} -{' '}
            {format(trip.endDate, 'MMM d, yyyy')}
          </Text>
        </View>

        {/* Itinerary */}
        {trip.itinerary.map((item, index) => {
          const showDayHeader =
            index === 0 ||
            trip.itinerary[index - 1].day !== item.day;

          return (
            <View key={item.id}>
              {showDayHeader && (
                <Text className="text-accent-primary text-sm font-bold mt-4 mb-2">
                  Day {item.day}
                </Text>
              )}
              <Pressable
                onLongPress={() => handleEditItem(item)}
                className="flex-row mb-3"
              >
                <View className="items-center mr-3">
                  <View className="w-8 h-8 rounded-full bg-surface-elevated items-center justify-center">
                    <Ionicons
                      name={typeIcons[item.type] || 'ellipse'}
                      size={16}
                      color="#7A6355"
                    />
                  </View>
                  {index < trip.itinerary.length - 1 && (
                    <View className="w-[2px] flex-1 bg-border-subtle mt-1" />
                  )}
                </View>
                <View className="flex-1 pb-2">
                  <View className="flex-row items-center">
                    {item.time && (
                      <Text className="text-text-tertiary text-xs mr-2">
                        {item.time}
                      </Text>
                    )}
                    <Text className="text-text-primary font-medium flex-1">
                      {item.title}
                    </Text>
                    {item.cost != null && (
                      <Text className="text-text-secondary text-xs">
                        ${item.cost}
                      </Text>
                    )}
                  </View>
                  {item.description && (
                    <Text className="text-text-secondary text-xs mt-0.5">
                      {item.description}
                    </Text>
                  )}
                </View>
              </Pressable>
            </View>
          );
        })}

        {trip.itinerary.length === 0 && (
          <View className="py-8 items-center">
            <Ionicons name="map-outline" size={32} color="#A8937F" />
            <Text className="text-text-tertiary text-sm mt-2">
              No items yet — tap + to add one
            </Text>
          </View>
        )}
      </View>

      {/* FAB */}
      <Pressable
        onPress={handleAddItem}
        className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
        style={{
          shadowColor: '#D4764E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <ItineraryItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        onDelete={editingItem ? handleDelete : undefined}
        existingItem={editingItem}
        totalDays={totalDays}
      />
    </View>
  );
}

// ─── Main screen ────────────────────────────

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const layout = useWindowDimensions();
  const [tabIndex, setTabIndex] = useState(0);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

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

  const showMenu = () => {
    const { togglePin, toggleMute, getGroupById } = useGroupsStore.getState();
    const g = getGroupById(id!);
    const isPinned = g?.isPinned ?? false;
    const isMuted = g?.isMuted ?? false;

    const options = [
      'Group Info',
      isPinned ? 'Unpin' : 'Pin',
      isMuted ? 'Unmute' : 'Mute',
      'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3 },
        (idx) => {
          if (idx === 0) setShowGroupInfo(true);
          if (idx === 1) togglePin(id!);
          if (idx === 2) toggleMute(id!);
        }
      );
    } else {
      Alert.alert('Options', undefined, [
        { text: 'Group Info', onPress: () => setShowGroupInfo(true) },
        { text: options[1], onPress: () => togglePin(id!) },
        { text: options[2], onPress: () => toggleMute(id!) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Group not found</Text>
      </SafeAreaView>
    );
  }

  const isTrip = group.type === 'trip';
  const routes: Route[] = [
    { key: 'chat', title: 'Chat' },
    { key: 'events', title: 'Events' },
    { key: 'shared', title: 'Shared' },
    ...(isTrip ? [{ key: 'trip', title: 'Trip' }] : []),
  ];

  const renderScene = ({
    route,
  }: SceneRendererProps & { route: Route }) => {
    switch (route.key) {
      case 'chat':
        return (
          <GroupChatTab
            groupId={id!}
            highlightText={isSearching ? chatSearchQuery : undefined}
            matchingMessageIds={isSearching ? matchingMessageIds : undefined}
          />
        );
      case 'events':
        return <EventsTab groupId={id!} />;
      case 'shared':
        return <SharedTab sharedObjects={group?.metadata?.sharedObjects} />;
      case 'trip':
        return <TripTab groupId={id!} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Pressable
          onPress={() => setShowGroupInfo(true)}
          className="flex-1 flex-row items-center ml-1"
        >
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
          />
        )}
      />

      <GroupInfoSheet
        group={group}
        visible={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
        onLeave={() => router.back()}
      />
    </SafeAreaView>
  );
}
