import React, { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { CreateExpenseModal } from './CreateExpenseModal';
import { LedgerEntry } from '../../types';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  conversationId: string;
}

export function LedgerTab({ conversationId }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const conversation = useMessagesStore(
    useShallow((s) => s.getConversationById(conversationId))
  );
  const getUserById = useUserStore((s) => s.getUserById);

  const entries = conversation?.metadata?.ledgerEntries ?? [];
  const balance = conversation?.metadata?.ledgerBalance ?? 0;

  const otherUserId = conversation?.participants.find(
    (id) => id !== useUserStore.getState().currentUser?.id
  );
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  const handleSettle = (entryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useMessagesStore.getState().settleLedgerEntry(conversationId, entryId);
  };

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalVisible(true);
  };

  if (entries.length === 0) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="wallet-outline"
          title="No expenses"
          description="Split costs and track shared expenses here"
        />
        <FAB onPress={handleFABPress} />
        <CreateExpenseModal
          visible={isModalVisible}
          conversationId={conversationId}
          onClose={() => setIsModalVisible(false)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      {/* Balance card */}
      <View className="m-4 rounded-2xl p-5 bg-accent-primary">
        <Text className="text-white/80 text-sm font-medium mb-1">
          Balance
        </Text>
        <Text className="text-white text-3xl font-bold">
          ${Math.abs(balance).toFixed(2)}
        </Text>
        <Text className="text-white/70 text-sm mt-1">
          {balance > 0
            ? `${otherUser?.name} owes you`
            : balance < 0
              ? `You owe ${otherUser?.name}`
              : "You're settled up"}
        </Text>
      </View>

      {/* Entries */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }: { item: LedgerEntry }) => {
          const paidBy = getUserById(item.paidBy);
          return (
            <Card className="mb-3">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-text-primary font-semibold">
                    {item.description}
                  </Text>
                  {item.category && (
                    <Text className="text-text-tertiary text-xs mt-0.5">
                      {item.category}
                    </Text>
                  )}
                </View>
                <Text className="text-text-primary font-bold text-lg">
                  ${item.amount.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-text-tertiary text-xs">
                  Paid by {paidBy?.name} &middot;{' '}
                  {format(item.date, 'MMM d')}
                </Text>
                {item.isSettled ? (
                  <View className="px-2 py-0.5 bg-status-success/20 rounded-md">
                    <Text className="text-status-success text-[10px] font-semibold">
                      Settled
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleSettle(item.id)}
                    hitSlop={4}
                    className="px-2.5 py-1 bg-status-warning/20 rounded-md"
                  >
                    <Text className="text-status-warning text-[10px] font-semibold">
                      Settle
                    </Text>
                  </Pressable>
                )}
              </View>
            </Card>
          );
        }}
      />
      <FAB onPress={handleFABPress} />
      <CreateExpenseModal
        visible={isModalVisible}
        conversationId={conversationId}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
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
  );
}
