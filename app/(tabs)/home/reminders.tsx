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
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { Reminder } from '../../../src/types';

interface ReminderWithSource extends Reminder {
  sourceId: string;
  sourceName: string;
  sourceType: 'conversation' | 'group';
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

  // Conversation reminders
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

  // Group reminders
  const groupReminders: ReminderWithSource[] = groups.flatMap((g) => {
    return (g.metadata?.reminders ?? []).map((rem) => ({
      ...rem,
      sourceId: g.id,
      sourceName: g.name,
      sourceType: 'group' as const,
    }));
  });

  const allReminders = [...convReminders, ...groupReminders];

  // Sort: incomplete first, then by due date
  const sorted = [...allReminders].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

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

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">All Reminders</Text>
      </View>

      {sorted.length === 0 ? (
        <EmptyState
          icon="alarm-outline"
          title="No reminders"
          description="Reminders from your conversations and groups will appear here"
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => `${item.sourceType}-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <Pressable onLongPress={() => handleDelete(item)} delayLongPress={500}>
              <Card className="mb-3">
                <Pressable
                  onPress={() => handleToggle(item)}
                  className="flex-row items-start"
                >
                  <Ionicons
                    name={item.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={item.isCompleted ? '#2D9F6F' : '#A8937F'}
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
                    <View className="flex-row items-center mt-1.5">
                      <View
                        className="w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: priorityColors[item.priority] }}
                      />
                      <Text className="text-text-tertiary text-[10px] mr-3">
                        {item.priority}
                      </Text>
                      <Ionicons name="time-outline" size={10} color="#A8937F" />
                      <Text className="text-text-tertiary text-[10px] ml-0.5">
                        {format(item.dueDate, 'MMM d')}
                      </Text>
                      <Ionicons
                        name={item.sourceType === 'group' ? 'people-outline' : 'person-outline'}
                        size={10}
                        color="#A8937F"
                        style={{ marginLeft: 8 }}
                      />
                      <Text className="text-text-tertiary text-[10px] ml-0.5">
                        {item.sourceName}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
