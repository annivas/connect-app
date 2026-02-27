import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { Card } from '../../../src/components/ui/Card';
import { CollectionCard } from '../../../src/components/home/CollectionCard';
import { TodayAgenda } from '../../../src/components/home/TodayAgenda';
import { RelationshipPulse } from '../../../src/components/home/RelationshipPulse';
import { PendingActions } from '../../../src/components/home/PendingActions';
import { ActivityFeed } from '../../../src/components/home/ActivityFeed';
import { QuickComposeFAB } from '../../../src/components/home/QuickComposeFAB';
import { useHomeStore } from '../../../src/stores/useHomeStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { MOCK_ACTIVITY_FEED } from '../../../src/mocks/activityFeed';
import { CURRENT_USER_ID } from '../../../src/mocks/users';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Quick action card for the dashboard
function QuickAction({
  icon,
  label,
  count,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="flex-1 active:opacity-80"
    >
      <View className="bg-surface rounded-2xl p-4 items-center">
        <View
          className="w-11 h-11 rounded-full items-center justify-center mb-2"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text className="text-text-primary text-sm font-medium">{label}</Text>
        {count != null && (
          <Text className="text-text-tertiary text-xs mt-0.5">{count}</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useUserStore((s) => s.currentUser);
  const users = useUserStore((s) => s.users);
  const collections = useHomeStore((s) => s.collections);
  const conversations = useMessagesStore((s) => s.conversations);
  const groups = useGroupsStore((s) => s.groups);
  const groupPolls = useGroupsStore((s) => s.groupPolls);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        useMessagesStore.getState().init(),
        useGroupsStore.getState().init(),
        useHomeStore.getState().init(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ─── Aggregate data ──────────────────────────
  const allReminders = useMemo(
    () => [
      ...conversations.flatMap((c) => c.metadata?.reminders ?? []),
      ...groups.flatMap((g) => g.metadata?.reminders ?? []),
    ],
    [conversations, groups],
  );
  const pendingReminders = allReminders.filter((r) => !r.isCompleted);

  const allLedgerEntries = useMemo(
    () => [
      ...conversations.flatMap((c) => c.metadata?.ledgerEntries ?? []),
      ...groups.flatMap((g) => g.metadata?.ledgerEntries ?? []),
    ],
    [conversations, groups],
  );
  const unsettled = allLedgerEntries.filter((e) => !e.isSettled);
  const unsettledTotal = unsettled.reduce((sum, e) => sum + e.amount, 0);

  const allNotes = useMemo(
    () => [
      ...conversations.flatMap((c) => c.metadata?.notes ?? []),
      ...groups.flatMap((g) => g.metadata?.notes ?? []),
    ],
    [conversations, groups],
  );

  const allEvents = useMemo(
    () => groups.flatMap((g) => g.events ?? []),
    [groups],
  );

  // Count pending RSVPs (events where current user has 'pending' status)
  const pendingRSVPs = useMemo(
    () =>
      allEvents.filter((e) =>
        e.attendees.some(
          (a) => a.userId === CURRENT_USER_ID && a.status === 'pending',
        ),
      ).length,
    [allEvents],
  );

  // Count unvoted polls (from both conversations and groups)
  const unvotedPolls = useMemo(
    () => {
      const allPolls = [
        ...conversations.flatMap((c) => c.metadata?.polls ?? []),
        ...Object.values(groupPolls).flat(),
      ];
      return allPolls.filter(
        (p) =>
          !p.isClosed &&
          !p.options.some((o) => o.voterIds.includes(CURRENT_USER_ID)),
      ).length;
    },
    [conversations, groupPolls],
  );

  const getUserName = useCallback(
    (id: string) => users.find((u) => u.id === id)?.name ?? 'Unknown',
    [users],
  );

  const getGroupName = useCallback(
    (id: string) => groups.find((g) => g.id === id)?.name ?? 'Group',
    [groups],
  );

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4764E" />
        }
      >
        {/* Header */}
        <View className="px-4 pt-2 pb-1">
          <Text className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
            {today}
          </Text>
          <View className="flex-row items-baseline mt-1">
            <Text className="text-text-secondary text-lg">
              {getGreeting()},{' '}
            </Text>
            <Text className="text-text-primary text-lg font-bold">
              {currentUser?.name}
            </Text>
          </View>
          {currentUser?.richStatus && (
            <View className="flex-row items-center mt-1">
              <Text className="text-sm mr-1">{currentUser.richStatus.emoji}</Text>
              <Text className="text-text-tertiary text-xs">{currentUser.richStatus.text}</Text>
            </View>
          )}
        </View>

        {/* Quick Summary Strip */}
        <View className="flex-row px-4 gap-3 my-4">
          <QuickAction
            icon="alarm-outline"
            label="Reminders"
            count={pendingReminders.length}
            color="#D4964E"
            onPress={() => router.push('/(tabs)/home/reminders')}
          />
          <QuickAction
            icon="wallet-outline"
            label="Expenses"
            count={unsettled.length}
            color="#2D9F6F"
            onPress={() => router.push('/(tabs)/home/expenses')}
          />
          <QuickAction
            icon="document-text-outline"
            label="Notes"
            count={allNotes.length}
            color="#5B8EC9"
            onPress={() => router.push('/(tabs)/home/notes')}
          />
        </View>

        {/* Today's Agenda */}
        <TodayAgenda
          reminders={allReminders}
          events={allEvents}
          getUserName={getUserName}
          getGroupName={getGroupName}
        />

        {/* Pending Actions — needs your attention */}
        <PendingActions
          unsettledExpenses={{ total: unsettledTotal, count: unsettled.length }}
          unvotedPolls={unvotedPolls}
          pendingRSVPs={pendingRSVPs}
          onPressExpenses={() => router.push('/(tabs)/home/expenses')}
        />

        {/* Relationship Pulse */}
        <RelationshipPulse
          users={users}
          conversations={conversations}
          currentUserId={CURRENT_USER_ID}
          onPressContact={(convId) =>
            router.push(`/(tabs)/messages/${convId}` as any)
          }
        />

        {/* Activity Feed */}
        <ActivityFeed
          items={MOCK_ACTIVITY_FEED}
          getUserName={getUserName}
        />

        {/* Collections */}
        <View className="px-4 mb-5">
          <SectionHeader title="Collections" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {collections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </ScrollView>
        </View>

        {/* Recent Notes */}
        <View className="px-4 mb-5">
          <SectionHeader title="Recent Notes" />
          {allNotes.length > 0 ? (
            allNotes.slice(0, 3).map((note) => (
              <Card key={note.id} className="mb-2">
                <View className="flex-row items-center mb-1">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: note.color }}
                  />
                  <Text className="text-text-primary font-semibold text-sm">
                    {note.title}
                  </Text>
                </View>
                <Text
                  className="text-text-secondary text-xs"
                  numberOfLines={2}
                >
                  {note.content}
                </Text>
              </Card>
            ))
          ) : (
            <View className="bg-surface rounded-2xl p-6 items-center">
              <Ionicons
                name="document-text-outline"
                size={24}
                color="#A8937F"
              />
              <Text className="text-text-tertiary text-sm mt-2">
                No notes yet
              </Text>
            </View>
          )}
        </View>

        {/* Upcoming Reminders */}
        <View className="px-4 mb-5">
          <SectionHeader title="Upcoming" />
          {pendingReminders.length > 0 ? (
            pendingReminders.slice(0, 4).map((rem) => (
              <Card key={rem.id} className="mb-2">
                <View className="flex-row items-center">
                  <View
                    className="w-2 h-2 rounded-full mr-3"
                    style={{
                      backgroundColor:
                        rem.priority === 'high'
                          ? '#C94F4F'
                          : rem.priority === 'medium'
                          ? '#D4964E'
                          : '#5B8EC9',
                    }}
                  />
                  <Text className="text-text-primary text-sm font-medium flex-1">
                    {rem.title}
                  </Text>
                  {rem.dueDate && (
                    <Text className="text-text-tertiary text-xs">
                      {format(rem.dueDate, 'MMM d')}
                    </Text>
                  )}
                </View>
              </Card>
            ))
          ) : (
            <View className="bg-surface rounded-2xl p-6 items-center">
              <Ionicons name="checkmark-circle" size={24} color="#2D9F6F" />
              <Text className="text-text-tertiary text-sm mt-2">
                All caught up!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Quick Compose FAB */}
      <QuickComposeFAB
        onNewMessage={() => router.push('/(tabs)/messages')}
        onNewGroup={() => router.push('/(tabs)/groups')}
        onNewNote={() => router.push('/(tabs)/home/notes')}
        onNewReminder={() => router.push('/(tabs)/home/reminders')}
      />
    </SafeAreaView>
  );
}
