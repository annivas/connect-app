import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Avatar } from '../../../src/components/ui/Avatar';
import { CreateExpenseModal } from '../../../src/components/chat/CreateExpenseModal';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { LedgerEntry, User } from '../../../src/types';

interface EntryWithSource extends LedgerEntry {
  sourceId: string;
  sourceName: string;
  sourceType: 'conversation' | 'group';
}

interface SelectedTarget {
  type: 'conversation' | 'group';
  id: string;
  name: string;
}

export default function AllExpensesScreen() {
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const groups = useGroupsStore((s) => s.groups);
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryWithSource | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);

  // Conversation expenses
  const convEntries: EntryWithSource[] = conversations.flatMap((c) => {
    const otherUserId = c.participants.find((p) => p !== currentUserId);
    const otherUser = otherUserId ? getUserById(otherUserId) : null;
    const name = otherUser?.name ?? 'Unknown';
    return (c.metadata?.ledgerEntries ?? []).map((entry) => ({
      ...entry,
      sourceId: c.id,
      sourceName: name,
      sourceType: 'conversation' as const,
    }));
  });

  // Group expenses
  const groupEntries: EntryWithSource[] = groups.flatMap((g) => {
    return (g.metadata?.ledgerEntries ?? []).map((entry) => ({
      ...entry,
      sourceId: g.id,
      sourceName: g.name,
      sourceType: 'group' as const,
    }));
  });

  const allEntries = [...convEntries, ...groupEntries];

  // Sort: unsettled first, then by date descending
  const sorted = useMemo(() => [...allEntries].sort((a, b) => {
    if (a.isSettled !== b.isSettled) return a.isSettled ? 1 : -1;
    return b.date.getTime() - a.date.getTime();
  }), [allEntries]);

  // Summary stats
  const totalAll = allEntries.reduce((sum, e) => sum + e.amount, 0);
  const unsettledEntries = sorted.filter((e) => !e.isSettled);
  const settledEntries = sorted.filter((e) => e.isSettled);
  const totalPending = unsettledEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalSettled = settledEntries.reduce((sum, e) => sum + e.amount, 0);

  // Resolve members for a conversation or group
  const getMembers = useCallback((sourceType: 'conversation' | 'group', sourceId: string): User[] => {
    const currentUser = useUserStore.getState().currentUser;
    if (!currentUser) return [];

    if (sourceType === 'conversation') {
      const conv = conversations.find((c) => c.id === sourceId);
      if (!conv) return [];
      const others = conv.participants
        .filter((uid) => uid !== currentUser.id)
        .map((uid) => getUserById(uid))
        .filter((u): u is User => u != null);
      return [currentUser, ...others];
    } else {
      const group = groups.find((g) => g.id === sourceId);
      if (!group) return [];
      const others = group.members
        .filter((uid) => uid !== currentUser.id)
        .map((uid) => getUserById(uid))
        .filter((u): u is User => u != null);
      return [currentUser, ...others];
    }
  }, [conversations, groups, getUserById]);

  const handleSettle = (entry: EntryWithSource) => {
    Alert.alert('Settle Expense', `Mark "${entry.description}" as settled?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (entry.sourceType === 'conversation') {
            useMessagesStore.getState().settleLedgerEntry(entry.sourceId, entry.id);
          } else {
            useGroupsStore.getState().settleGroupLedgerEntry(entry.sourceId, entry.id);
          }
        },
      },
    ]);
  };

  const handleDelete = (entry: EntryWithSource) => {
    Alert.alert('Delete Expense', `Delete "${entry.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (entry.sourceType === 'conversation') {
            useMessagesStore.getState().deleteLedgerEntry(entry.sourceId, entry.id);
          } else {
            useGroupsStore.getState().deleteGroupLedgerEntry(entry.sourceId, entry.id);
          }
        },
      },
    ]);
  };

  const handleEdit = (entry: EntryWithSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingEntry(entry);
    setSelectedTarget({ type: entry.sourceType, id: entry.sourceId, name: entry.sourceName });
    setShowCreateModal(true);
  };

  const handleLongPress = (entry: EntryWithSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];
    if (!entry.isSettled) {
      options.push({ text: 'Edit', onPress: () => handleEdit(entry) });
      options.push({ text: 'Settle', onPress: () => handleSettle(entry) });
    }
    options.push({
      text: 'Delete',
      style: 'destructive',
      onPress: () => handleDelete(entry),
    });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Expense Options', entry.description, options);
  };

  const handleUpdate = (entryId: string, updates: { description?: string; amount?: number; category?: string }) => {
    if (!editingEntry) return;
    if (editingEntry.sourceType === 'conversation') {
      useMessagesStore.getState().updateLedgerEntry(editingEntry.sourceId, entryId, updates);
    } else {
      useGroupsStore.getState().updateGroupLedgerEntry(editingEntry.sourceId, entryId, updates);
    }
    setEditingEntry(null);
    setShowCreateModal(false);
    setSelectedTarget(null);
  };

  const handleSave = async (entry: Omit<LedgerEntry, 'id'>) => {
    if (!selectedTarget) return;
    if (selectedTarget.type === 'conversation') {
      await useMessagesStore.getState().createLedgerEntry(selectedTarget.id, {
        description: entry.description,
        amount: entry.amount,
        paidBy: entry.paidBy,
        splitBetween: entry.splitBetween,
        category: entry.category,
      });
    } else {
      useGroupsStore.getState().createGroupLedgerEntry(selectedTarget.id, {
        ...entry,
        date: new Date(),
        isSettled: false,
      });
    }
    setShowCreateModal(false);
    setSelectedTarget(null);
  };

  const toggleExpand = (itemKey: string) => {
    Haptics.selectionAsync();
    setExpandedEntryId(expandedEntryId === itemKey ? null : itemKey);
  };

  const itemKey = (item: EntryWithSource) => `${item.sourceType}-${item.id}`;

  const modalMembers = useMemo(() => {
    if (editingEntry) return getMembers(editingEntry.sourceType, editingEntry.sourceId);
    if (selectedTarget) return getMembers(selectedTarget.type, selectedTarget.id);
    return [];
  }, [editingEntry, selectedTarget, getMembers]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">All Expenses</Text>
      </View>

      {allEntries.length === 0 ? (
        <View className="flex-1">
          <EmptyState
            icon="wallet-outline"
            title="No expenses"
            description="Shared expenses from your conversations and groups will appear here"
          />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={itemKey}
          ListHeaderComponent={
            <View className="mb-4">
              {/* Hero card */}
              <View className="bg-accent-primary rounded-2xl p-5 mb-3">
                <Text className="text-white/80 text-sm font-medium mb-1">Total Expenses</Text>
                <Text className="text-white text-3xl font-bold">
                  ${totalAll.toFixed(2)}
                </Text>
              </View>

              {/* Pending / Settled pills */}
              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface rounded-2xl p-4">
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#D4964E' }} />
                    <Text className="text-text-secondary text-xs font-medium">Pending</Text>
                  </View>
                  <Text className="text-text-primary text-lg font-bold">
                    ${totalPending.toFixed(2)}
                  </Text>
                  <Text className="text-text-tertiary text-xs mt-0.5">
                    {unsettledEntries.length} expense{unsettledEntries.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                <View className="flex-1 bg-surface rounded-2xl p-4">
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full bg-status-success mr-2" />
                    <Text className="text-text-secondary text-xs font-medium">Settled</Text>
                  </View>
                  <Text className="text-text-primary text-lg font-bold">
                    ${totalSettled.toFixed(2)}
                  </Text>
                  <Text className="text-text-tertiary text-xs mt-0.5">
                    {settledEntries.length} expense{settledEntries.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const key = itemKey(item);
            const isExpanded = expandedEntryId === key;
            const paidByUser = getUserById(item.paidBy);

            return (
              <Pressable
                onPress={() => toggleExpand(key)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={500}
              >
                <Card className="mb-3">
                  {/* Title row */}
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center flex-1 mr-3">
                      {item.category && (
                        <View
                          className="w-7 h-7 rounded-lg items-center justify-center mr-2.5"
                          style={{ backgroundColor: item.isSettled ? '#F0E2D4' : '#D4764E18' }}
                        >
                          <Text className="text-[13px]">
                            {item.category === 'Food' ? '🍔' : item.category === 'Transport' ? '🚗' : item.category === 'Entertainment' ? '🎬' : item.category === 'Shopping' ? '🛍️' : '📦'}
                          </Text>
                        </View>
                      )}
                      <Text
                        className={`text-sm font-semibold flex-1 ${
                          item.isSettled ? 'text-text-tertiary line-through' : 'text-text-primary'
                        }`}
                        numberOfLines={1}
                      >
                        {item.description}
                      </Text>
                    </View>
                    <Text className={`text-[15px] font-bold ${item.isSettled ? 'text-text-tertiary' : 'text-text-primary'}`}>
                      ${item.amount.toFixed(2)}
                    </Text>
                  </View>

                  {/* Meta row */}
                  <View className="flex-row items-center justify-between mt-1">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={11} color="#A8937F" />
                      <Text className="text-text-tertiary text-[11px] ml-1">
                        {format(item.date, 'MMM d')}
                      </Text>
                      <Ionicons
                        name={item.sourceType === 'group' ? 'people-outline' : 'person-outline'}
                        size={11}
                        color="#A8937F"
                        style={{ marginLeft: 8 }}
                      />
                      <Text className="text-text-tertiary text-[11px] ml-1">
                        {item.sourceName}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      {item.isSettled ? (
                        <View className="px-2 py-0.5 bg-status-success/15 rounded-md">
                          <Text className="text-status-success text-[10px] font-semibold">Settled</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleSettle(item)}
                          hitSlop={4}
                          className="px-2 py-0.5 bg-status-warning/15 rounded-md"
                        >
                          <Text className="text-status-warning text-[10px] font-semibold">Settle</Text>
                        </Pressable>
                      )}
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color="#A8937F"
                        style={{ marginLeft: 6 }}
                      />
                    </View>
                  </View>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View className="mt-3 pt-3 border-t border-border-subtle">
                      {/* Paid by */}
                      <View className="flex-row items-center mb-2">
                        {paidByUser?.avatar ? (
                          <Avatar uri={paidByUser.avatar} size="sm" />
                        ) : (
                          <View className="w-5 h-5 rounded-full bg-surface items-center justify-center">
                            <Ionicons name="person" size={12} color="#A8937F" />
                          </View>
                        )}
                        <Text className="text-text-secondary text-xs ml-2">
                          Paid by <Text className="text-text-primary font-semibold">{paidByUser?.name ?? 'Unknown'}</Text>
                        </Text>
                      </View>

                      {/* Split info */}
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="git-branch-outline" size={13} color="#A8937F" />
                        <Text className="text-text-secondary text-xs ml-2">
                          Split {item.splitBetween.length} ways
                          {' · '}
                          <Text className="text-text-primary font-semibold">
                            ${(item.amount / item.splitBetween.length).toFixed(2)} each
                          </Text>
                        </Text>
                      </View>

                      {/* Split members */}
                      <View className="flex-row flex-wrap gap-1.5 mb-2">
                        {item.splitBetween.map((uid) => {
                          const u = getUserById(uid);
                          return (
                            <View key={uid} className="bg-background-secondary rounded-full px-2.5 py-1">
                              <Text className="text-text-secondary text-[10px] font-medium">
                                {uid === currentUserId ? 'You' : u?.name?.split(' ')[0] ?? '?'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Edit button */}
                      {!item.isSettled && (
                        <Pressable
                          onPress={() => handleEdit(item)}
                          className="flex-row items-center mt-1 active:opacity-70"
                        >
                          <Ionicons name="create-outline" size={14} color="#D4764E" />
                          <Text className="text-accent-primary text-xs font-medium ml-1.5">Edit expense</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      {/* FAB — add new expense */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowTargetPicker(true);
        }}
        className="absolute bottom-36 right-8 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
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

      {/* Target Picker Modal */}
      <Modal
        visible={showTargetPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTargetPicker(false)}
      >
        <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
            <Pressable onPress={() => setShowTargetPicker(false)} hitSlop={8}>
              <Text className="text-accent-primary text-[16px]">Cancel</Text>
            </Pressable>
            <Text className="text-text-primary text-[17px] font-semibold">Add Expense To</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
            {/* Conversations */}
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">Conversations</Text>
            {conversations.map((c) => {
              const otherUserId = c.participants.find((p) => p !== currentUserId);
              const otherUser = otherUserId ? getUserById(otherUserId) : null;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedTarget({ type: 'conversation', id: c.id, name: otherUser?.name ?? 'Unknown' });
                    setShowTargetPicker(false);
                    setShowCreateModal(true);
                  }}
                  className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
                >
                  {otherUser?.avatar ? (
                    <Avatar uri={otherUser.avatar} size="sm" />
                  ) : (
                    <View className="w-8 h-8 rounded-full bg-surface items-center justify-center">
                      <Ionicons name="person" size={16} color="#A8937F" />
                    </View>
                  )}
                  <Text className="text-text-primary text-[15px] font-medium ml-3 flex-1">{otherUser?.name ?? 'Unknown'}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#A8937F" />
                </Pressable>
              );
            })}

            {/* Groups */}
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3 mt-5">Groups</Text>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedTarget({ type: 'group', id: g.id, name: g.name });
                  setShowTargetPicker(false);
                  setShowCreateModal(true);
                }}
                className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
              >
                <View className="w-8 h-8 rounded-full bg-accent-tertiary/20 items-center justify-center">
                  <Ionicons name="people" size={16} color="#5B8EC9" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-text-primary text-[15px] font-medium">{g.name}</Text>
                  <Text className="text-text-tertiary text-xs">{g.members.length} members</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#A8937F" />
              </Pressable>
            ))}
            <View className="h-8" />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create / Edit Expense Modal */}
      <CreateExpenseModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingEntry(null);
          setSelectedTarget(null);
        }}
        editingEntry={editingEntry}
        members={modalMembers}
        onSave={handleSave}
        onUpdate={editingEntry ? handleUpdate : undefined}
      />
    </SafeAreaView>
  );
}
