import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { Card } from '../../../src/components/ui/Card';
import { CollectionCard } from '../../../src/components/home/CollectionCard';
import { useHomeStore } from '../../../src/stores/useHomeStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';

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
  const collections = useHomeStore((s) => s.collections);
  const conversations = useMessagesStore((s) => s.conversations);

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

  // Aggregate data across conversations
  const allReminders = conversations.flatMap(
    (c) => c.metadata?.reminders ?? []
  );
  const pendingReminders = allReminders.filter((r) => !r.isCompleted);

  const allLedgerEntries = conversations.flatMap(
    (c) => c.metadata?.ledgerEntries ?? []
  );
  const unsettled = allLedgerEntries.filter((e) => !e.isSettled);

  const allNotes = conversations.flatMap((c) => c.metadata?.notes ?? []);

  const navigateToMessages = () => router.push('/(tabs)/messages/');

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
        <View className="px-4 pt-2 pb-4">
          <Text className="text-text-secondary text-lg">
            {getGreeting()},
          </Text>
          <Text className="text-text-primary text-3xl font-bold">
            {currentUser?.name}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="flex-row px-4 gap-3 mb-6">
          <QuickAction
            icon="alarm-outline"
            label="Reminders"
            count={pendingReminders.length}
            color="#D4964E"
            onPress={navigateToMessages}
          />
          <QuickAction
            icon="wallet-outline"
            label="Expenses"
            count={unsettled.length}
            color="#2D9F6F"
            onPress={navigateToMessages}
          />
          <QuickAction
            icon="document-text-outline"
            label="Notes"
            count={allNotes.length}
            color="#5B8EC9"
            onPress={navigateToMessages}
          />
        </View>

        {/* Collections */}
        <View className="px-4 mb-6">
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
        <View className="px-4 mb-6">
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
        <View className="px-4 mb-6">
          <SectionHeader title="Upcoming" />
          {pendingReminders.length > 0 ? (
            pendingReminders.map((rem) => (
              <Card key={rem.id} className="mb-2">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-status-warning mr-3" />
                  <Text className="text-text-primary text-sm font-medium flex-1">
                    {rem.title}
                  </Text>
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

        {/* Unsettled Expenses */}
        <View className="px-4 mb-6">
          <SectionHeader title="Pending Expenses" />
          {unsettled.length > 0 ? (
            unsettled.slice(0, 3).map((entry) => (
              <Card key={entry.id} className="mb-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-text-primary text-sm font-medium">
                    {entry.description}
                  </Text>
                  <Text className="text-text-primary font-bold">
                    ${entry.amount.toFixed(2)}
                  </Text>
                </View>
              </Card>
            ))
          ) : (
            <View className="bg-surface rounded-2xl p-6 items-center">
              <Ionicons name="wallet-outline" size={24} color="#A8937F" />
              <Text className="text-text-tertiary text-sm mt-2">
                No pending expenses
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
