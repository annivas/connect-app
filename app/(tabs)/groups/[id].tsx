import React, { useState } from 'react';
import { View, Text, useWindowDimensions, ActionSheetIOS, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar, SceneRendererProps } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { GroupChatTab } from '../../../src/components/groups/GroupChatTab';
import { SharedTab } from '../../../src/components/chat/SharedTab';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';

type Route = { key: string; title: string };

// ─── Sub-tab components ─────────────────────

function EventsTab({ groupId }: { groupId: string }) {
  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const getUserById = useUserStore((s) => s.getUserById);
  const events = group?.events ?? [];

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
      {events.map((event) => {
        const goingCount = event.attendees.filter(
          (a) => a.status === 'going'
        ).length;
        const maybeCount = event.attendees.filter(
          (a) => a.status === 'maybe'
        ).length;

        return (
          <Card key={event.id} className="mb-3">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-text-primary text-[16px] font-semibold">
                  {event.title}
                </Text>
                {event.description && (
                  <Text className="text-text-secondary text-sm mt-1">
                    {event.description}
                  </Text>
                )}
              </View>
              <View className="bg-accent-primary/20 rounded-lg px-3 py-1.5">
                <Text className="text-accent-primary text-xs font-semibold">
                  {format(event.startDate, 'MMM d')}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mt-2">
              <Ionicons name="time-outline" size={14} color="#6B6B76" />
              <Text className="text-text-tertiary text-xs ml-1">
                {format(event.startDate, 'HH:mm')}
                {event.endDate && ` - ${format(event.endDate, 'HH:mm')}`}
              </Text>
              <View className="flex-row items-center ml-4">
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color="#10B981"
                />
                <Text className="text-text-tertiary text-xs ml-1">
                  {goingCount} going
                </Text>
              </View>
              {maybeCount > 0 && (
                <View className="flex-row items-center ml-3">
                  <Ionicons
                    name="help-circle"
                    size={14}
                    color="#F59E0B"
                  />
                  <Text className="text-text-tertiary text-xs ml-1">
                    {maybeCount} maybe
                  </Text>
                </View>
              )}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function TripTab({ groupId }: { groupId: string }) {
  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const trip = group?.trip;

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

  return (
    <View className="flex-1 bg-background-primary p-4">
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
            <View className="flex-row mb-3">
              <View className="items-center mr-3">
                <View className="w-8 h-8 rounded-full bg-surface-elevated items-center justify-center">
                  <Ionicons
                    name={typeIcons[item.type] || 'ellipse'}
                    size={16}
                    color="#A0A0AB"
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
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ────────────────────────────

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const layout = useWindowDimensions();
  const [tabIndex, setTabIndex] = useState(0);

  const group = useGroupsStore(useShallow((s) => s.getGroupById(id!)));

  const showMenu = () => {
    const { togglePin, toggleMute, getGroupById } = useGroupsStore.getState();
    const g = getGroupById(id!);
    const isPinned = g?.isPinned ?? false;
    const isMuted = g?.isMuted ?? false;

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
        return <GroupChatTab groupId={id!} />;
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
        <View className="flex-1 flex-row items-center ml-1">
          <Avatar uri={group.avatar} size="md" />
          <View className="ml-3 flex-1">
            <Text className="text-text-primary text-[17px] font-semibold">
              {group.name}
            </Text>
            <Text className="text-text-tertiary text-xs">
              {group.members.length} members
            </Text>
          </View>
        </View>
        <IconButton icon="ellipsis-horizontal" onPress={showMenu} />
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
          />
        )}
      />
    </SafeAreaView>
  );
}
