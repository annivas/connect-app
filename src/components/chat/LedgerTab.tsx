import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { CreateExpenseModal } from './CreateExpenseModal';
import { useToastStore } from '../../stores/useToastStore';
import type { LedgerEntry, User, GroupPairBalance } from '../../types';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  mode: 'conversation' | 'group';
  entries: LedgerEntry[];
  // 1-on-1 mode
  balance?: number;
  otherUser?: User | null;
  // Group mode
  pairBalances?: GroupPairBalance[];
  members?: User[];
  // Callbacks
  onSettle: (entryId: string) => void;
  onCreateEntry: (entry: Omit<LedgerEntry, 'id'>) => void;
  onUpdateEntry?: (entryId: string, updates: { description?: string; amount?: number; category?: string }) => void;
  onDeleteEntry?: (entryId: string) => void;
}

export function LedgerTab({ mode, entries, balance = 0, otherUser, pairBalances, members, onSettle, onCreateEntry, onUpdateEntry, onDeleteEntry }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const getUserById = useUserStore((s) => s.getUserById);

  const handleSettle = (entryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSettle(entryId);
  };

  const handleEdit = (entry: LedgerEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingEntry(entry);
    setIsModalVisible(true);
  };

  const handleLongPress = (entry: LedgerEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];
    if (onUpdateEntry && !entry.isSettled) {
      options.push({ text: 'Edit', onPress: () => handleEdit(entry) });
    }
    if (onDeleteEntry) {
      options.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDeleteEntry(entry.id);
          useToastStore.getState().show({ message: 'Expense deleted', type: 'success' });
        },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Expense', entry.description, options);
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
          onClose={() => { setIsModalVisible(false); setEditingEntry(null); }}
          onSave={onCreateEntry}
          onUpdate={onUpdateEntry}
          editingEntry={editingEntry}
          members={members}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      {/* Balance card — conversation mode */}
      {mode === 'conversation' && (
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
      )}

      {/* Group balances — group mode */}
      {mode === 'group' && pairBalances && pairBalances.length > 0 && (
        <View className="m-4 rounded-2xl p-4 bg-surface">
          <Text className="text-text-primary font-semibold text-[15px] mb-3">
            Group Balances
          </Text>
          {pairBalances.filter((pb) => pb.amount !== 0).map((pb) => {
            const user1 = getUserById(pb.userId1);
            const user2 = getUserById(pb.userId2);
            const owedByName = pb.amount > 0 ? (user2?.name ?? 'Unknown') : (user1?.name ?? 'Unknown');
            const owedToName = pb.amount > 0 ? (user1?.name ?? 'Unknown') : (user2?.name ?? 'Unknown');
            return (
              <View key={`${pb.userId1}-${pb.userId2}`} className="flex-row items-center justify-between py-2 border-b border-border-subtle">
                <Text className="text-text-secondary text-[13px] flex-1">
                  {owedByName} owes {owedToName}
                </Text>
                <Text className="text-accent-primary font-semibold text-[14px]">
                  ${Math.abs(pb.amount).toFixed(2)}
                </Text>
              </View>
            );
          })}
          {pairBalances.filter((pb) => pb.amount !== 0).length === 0 && (
            <View className="items-center py-3">
              <Ionicons name="checkmark-circle-outline" size={24} color="#2D9F6F" />
              <Text className="text-status-success text-[13px] font-medium mt-1">
                All settled up!
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Entries */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }: { item: LedgerEntry }) => {
          const paidBy = getUserById(item.paidBy);
          return (
            <Pressable onLongPress={() => handleLongPress(item)} delayLongPress={500}>
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
              {item.linkedMessageId && (
                <View className="flex-row items-center mt-1.5 mb-1">
                  <Ionicons name="chatbubble-outline" size={11} color="#D4764E" />
                  <Text className="text-accent-primary text-[11px] font-medium ml-1">
                    From message
                  </Text>
                </View>
              )}
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
            </Pressable>
          );
        }}
      />
      <FAB onPress={handleFABPress} />
      <CreateExpenseModal
        visible={isModalVisible}
        onClose={() => { setIsModalVisible(false); setEditingEntry(null); }}
        onSave={onCreateEntry}
        onUpdate={onUpdateEntry}
        editingEntry={editingEntry}
        members={members}
      />
    </View>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-14 right-6 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
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
