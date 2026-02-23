import React from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { LedgerEntry } from '../../../src/types';

interface EntryWithSource extends LedgerEntry {
  conversationId: string;
  conversationName: string;
}

export default function AllExpensesScreen() {
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  const allEntries: EntryWithSource[] = conversations.flatMap((c) => {
    const otherUserId = c.participants.find((p) => p !== currentUserId);
    const otherUser = otherUserId ? getUserById(otherUserId) : null;
    const name = otherUser?.name ?? 'Unknown';
    return (c.metadata?.ledgerEntries ?? []).map((entry) => ({
      ...entry,
      conversationId: c.id,
      conversationName: name,
    }));
  });

  // Sort: unsettled first, then by date descending
  const sorted = [...allEntries].sort((a, b) => {
    if (a.isSettled !== b.isSettled) return a.isSettled ? 1 : -1;
    return b.date.getTime() - a.date.getTime();
  });

  const totalUnsettled = sorted
    .filter((e) => !e.isSettled)
    .reduce((sum, e) => sum + e.amount, 0);

  const handleSettle = (entry: EntryWithSource) => {
    Alert.alert('Settle Expense', `Mark "${entry.description}" as settled?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          useMessagesStore.getState().settleLedgerEntry(
            entry.conversationId,
            entry.id,
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">All Expenses</Text>
      </View>

      {allEntries.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="No expenses"
          description="Shared expenses from your conversations will appear here"
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            totalUnsettled > 0 ? (
              <View className="mx-4 mt-4 mb-2 bg-surface rounded-2xl p-4 flex-row items-center justify-between">
                <Text className="text-text-secondary text-sm">Total unsettled</Text>
                <Text className="text-text-primary text-xl font-bold">
                  ${totalUnsettled.toFixed(2)}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <Card className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text
                  className={`text-sm font-medium flex-1 ${
                    item.isSettled ? 'text-text-tertiary line-through' : 'text-text-primary'
                  }`}
                >
                  {item.description}
                </Text>
                <Text className={`text-sm font-bold ${item.isSettled ? 'text-text-tertiary' : 'text-text-primary'}`}>
                  ${item.amount.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={11} color="#A8937F" />
                  <Text className="text-text-tertiary text-[10px] ml-1">
                    {format(item.date, 'MMM d')}
                  </Text>
                  <Text className="text-text-tertiary text-[10px] ml-3">
                    From: {item.conversationName}
                  </Text>
                </View>
                {!item.isSettled && (
                  <Pressable
                    onPress={() => handleSettle(item)}
                    className="flex-row items-center"
                  >
                    <Ionicons name="checkmark-circle-outline" size={14} color="#2D9F6F" />
                    <Text className="text-status-success text-xs font-medium ml-1">Settle</Text>
                  </Pressable>
                )}
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}
