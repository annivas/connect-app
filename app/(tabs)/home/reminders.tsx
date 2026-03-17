import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SearchBar } from '../../../src/components/ui/SearchBar';
import { Avatar } from '../../../src/components/ui/Avatar';
import { CreateReminderModal } from '../../../src/components/chat/CreateReminderModal';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { Reminder, User } from '../../../src/types';

interface ReminderWithSource extends Reminder {
  sourceId: string;
  sourceName: string;
  sourceType: 'conversation' | 'group';
}

interface SelectedTarget {
  type: 'conversation' | 'group';
  id: string;
  name: string;
}

const priorityColors: Record<string, string> = {
  high: '#C94F4F',
  medium: '#D4964E',
  low: '#2D9F6F',
};

export default function AllRemindersScreen() {
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const groups = useGroupsStore((s) => s.groups);
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  const [search, setSearch] = useState('');
  const [showCompletedSection, setShowCompletedSection] = useState(true);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);
  const [editingReminder, setEditingReminder] = useState<ReminderWithSource | null>(null);

  // Aggregate all reminders
  const allReminders = useMemo(() => {
    const convReminders: ReminderWithSource[] = conversations.flatMap((c) => {
      const otherUserId = c.participants.find((p) => p !== currentUserId);
      const otherUser = otherUserId ? getUserById(otherUserId) : null;
      const name = otherUser?.name ?? 'Unknown';
      return (c.metadata?.reminders ?? []).map((rem) => ({
        ...rem,
        sourceId: c.id,
        sourceName: name,
        sourceType: 'conversation' as const,
      }));
    });

    const groupReminders: ReminderWithSource[] = groups.flatMap((g) =>
      (g.metadata?.reminders ?? []).map((rem) => ({
        ...rem,
        sourceId: g.id,
        sourceName: g.name,
        sourceType: 'group' as const,
      })),
    );

    return [...convReminders, ...groupReminders];
  }, [conversations, groups, getUserById, currentUserId]);

  // Filter and separate
  const filtered = useMemo(() => {
    if (!search.trim()) return allReminders;
    const q = search.toLowerCase();
    return allReminders.filter(
      (r) => r.title.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q)),
    );
  }, [allReminders, search]);

  const activeReminders = useMemo(() =>
    filtered
      .filter((r) => !r.isCompleted)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
    [filtered],
  );

  const completedReminders = useMemo(() =>
    filtered
      .filter((r) => r.isCompleted)
      .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime()),
    [filtered],
  );

  const overdueCount = activeReminders.filter((r) => isPast(r.dueDate)).length;

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

  const handleToggle = (reminder: ReminderWithSource) => {
    Haptics.selectionAsync();
    if (reminder.sourceType === 'conversation') {
      useMessagesStore.getState().toggleReminderComplete(reminder.sourceId, reminder.id);
    } else {
      useGroupsStore.getState().toggleGroupReminderComplete(reminder.sourceId, reminder.id);
    }
  };

  const handleDelete = (reminder: ReminderWithSource) => {
    Alert.alert('Delete Reminder', `Delete "${reminder.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (reminder.sourceType === 'conversation') {
            useMessagesStore.getState().deleteReminder(reminder.sourceId, reminder.id);
          } else {
            useGroupsStore.getState().deleteGroupReminder(reminder.sourceId, reminder.id);
          }
        },
      },
    ]);
  };

  const handleEdit = (reminder: ReminderWithSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingReminder(reminder);
    setSelectedTarget({ type: reminder.sourceType, id: reminder.sourceId, name: reminder.sourceName });
    setShowCreateModal(true);
  };

  const handleLongPress = (reminder: ReminderWithSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Reminder Options', reminder.title, [
      { text: 'Edit', onPress: () => handleEdit(reminder) },
      {
        text: reminder.isCompleted ? 'Mark Active' : 'Mark Complete',
        onPress: () => handleToggle(reminder),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(reminder),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleUpdate = (reminderId: string, updates: { title?: string; description?: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' }) => {
    if (!editingReminder) return;
    if (editingReminder.sourceType === 'conversation') {
      useMessagesStore.getState().updateReminder(editingReminder.sourceId, reminderId, updates);
    } else {
      useGroupsStore.getState().updateGroupReminder(editingReminder.sourceId, reminderId, updates);
    }
    setEditingReminder(null);
    setShowCreateModal(false);
    setSelectedTarget(null);
  };

  const handleSave = async (reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
    if (!selectedTarget) return;
    if (selectedTarget.type === 'conversation') {
      await useMessagesStore.getState().createReminder(selectedTarget.id, {
        title: reminder.title,
        description: reminder.description,
        dueDate: reminder.dueDate.toISOString(),
        priority: reminder.priority,
      });
    } else {
      useGroupsStore.getState().createGroupReminder(selectedTarget.id, {
        ...reminder,
        createdAt: new Date(),
      });
    }
    setShowCreateModal(false);
    setSelectedTarget(null);
  };

  const modalMembers = useMemo(() => {
    if (editingReminder) return getMembers(editingReminder.sourceType, editingReminder.sourceId);
    if (selectedTarget) return getMembers(selectedTarget.type, selectedTarget.id);
    return [];
  }, [editingReminder, selectedTarget, getMembers]);

  const renderReminder = (item: ReminderWithSource) => {
    const overdue = !item.isCompleted && isPast(item.dueDate);
    return (
      <Pressable
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <Card className="mb-3">
          <Pressable
            onPress={() => handleToggle(item)}
            className="flex-row items-start"
          >
            <Ionicons
              name={item.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={item.isCompleted ? '#2D9F6F' : overdue ? '#C94F4F' : '#A8937F'}
              style={{ marginRight: 10, marginTop: 1 }}
            />
            <View className="flex-1">
              <Text
                className={`text-sm font-medium ${
                  item.isCompleted ? 'text-text-tertiary line-through' : 'text-text-primary'
                }`}
              >
                {item.title}
              </Text>
              {item.description && (
                <Text className="text-text-tertiary text-xs mt-0.5" numberOfLines={1}>
                  {item.description}
                </Text>
              )}
              <View className="flex-row items-center mt-1.5 flex-wrap">
                <View
                  className="w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: priorityColors[item.priority] }}
                />
                <Text className="text-text-tertiary text-[10px] mr-3">
                  {item.priority}
                </Text>
                <Ionicons name="time-outline" size={10} color={overdue ? '#C94F4F' : '#A8937F'} />
                <Text
                  className={`text-[10px] ml-0.5 mr-3 ${
                    overdue ? 'text-status-error font-semibold' : 'text-text-tertiary'
                  }`}
                >
                  {format(item.dueDate, 'MMM d')}
                  {overdue ? ' (overdue)' : ''}
                </Text>
                <Ionicons
                  name={item.sourceType === 'group' ? 'people-outline' : 'person-outline'}
                  size={10}
                  color="#A8937F"
                />
                <Text className="text-text-tertiary text-[10px] ml-0.5">
                  {item.sourceName}
                </Text>
              </View>
            </View>
            {/* Edit button */}
            <Pressable
              onPress={() => handleEdit(item)}
              hitSlop={8}
              className="ml-2 mt-1"
            >
              <Ionicons name="create-outline" size={16} color="#D4764E" />
            </Pressable>
          </Pressable>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1 flex-1">All Reminders</Text>
        <Text className="text-text-tertiary text-xs mr-2">{allReminders.length} total</Text>
      </View>

      {/* Search */}
      <View className="px-4 pt-3 pb-1">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search reminders..." />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="alarm-outline"
          title="No reminders"
          description={search ? 'No reminders match your search' : 'Reminders from your conversations and groups will appear here'}
        />
      ) : (
        <FlatList
          data={activeReminders}
          keyExtractor={(item) => `${item.sourceType}-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListHeaderComponent={
            <View>
              {/* Summary pills */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 bg-surface rounded-2xl p-4">
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full bg-accent-primary mr-2" />
                    <Text className="text-text-secondary text-xs font-medium">Active</Text>
                  </View>
                  <Text className="text-text-primary text-lg font-bold">{activeReminders.length}</Text>
                  {overdueCount > 0 && (
                    <Text className="text-status-error text-[10px] mt-0.5 font-medium">
                      {overdueCount} overdue
                    </Text>
                  )}
                </View>
                <View className="flex-1 bg-surface rounded-2xl p-4">
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full bg-status-success mr-2" />
                    <Text className="text-text-secondary text-xs font-medium">Completed</Text>
                  </View>
                  <Text className="text-text-primary text-lg font-bold">{completedReminders.length}</Text>
                </View>
              </View>

              {activeReminders.length > 0 && (
                <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                  Active ({activeReminders.length})
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => renderReminder(item)}
          ListFooterComponent={
            completedReminders.length > 0 ? (
              <View>
                <Pressable
                  onPress={() => setShowCompletedSection(!showCompletedSection)}
                  className="flex-row items-center justify-between mt-4 mb-3"
                >
                  <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                    Completed ({completedReminders.length})
                  </Text>
                  <Ionicons
                    name={showCompletedSection ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#A8937F"
                  />
                </Pressable>
                {showCompletedSection && completedReminders.map((item) => (
                  <View key={`${item.sourceType}-${item.id}`}>
                    {renderReminder(item)}
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
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
            <Text className="text-text-primary text-[17px] font-semibold">Add Reminder To</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
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

      {/* Create / Edit Reminder Modal */}
      <CreateReminderModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingReminder(null);
          setSelectedTarget(null);
        }}
        editingReminder={editingReminder}
        members={modalMembers}
        onSave={handleSave}
        onUpdate={editingReminder ? handleUpdate : undefined}
      />
    </SafeAreaView>
  );
}
