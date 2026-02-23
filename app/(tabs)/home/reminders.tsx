import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
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
import type { Reminder } from '../../../src/types';

interface ReminderWithSource extends Reminder {
  conversationId: string;
  conversationName: string;
}

const priorityColors: Record<string, string> = {
  high: '#C94F4F',
  medium: '#D4964E',
  low: '#2D9F6F',
};

export default function AllRemindersScreen() {
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  const allReminders: ReminderWithSource[] = conversations.flatMap((c) => {
    const otherUserId = c.participants.find((p) => p !== currentUserId);
    const otherUser = otherUserId ? getUserById(otherUserId) : null;
    const name = otherUser?.name ?? 'Unknown';
    return (c.metadata?.reminders ?? []).map((rem) => ({
      ...rem,
      conversationId: c.id,
      conversationName: name,
    }));
  });

  // Sort: incomplete first, then by due date
  const sorted = [...allReminders].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const handleToggle = (reminder: ReminderWithSource) => {
    Haptics.selectionAsync();
    useMessagesStore.getState().toggleReminderComplete(
      reminder.conversationId,
      reminder.id,
    );
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
          description="Reminders from your conversations will appear here"
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
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
                    <Text className="text-text-tertiary text-[10px] ml-3">
                      From: {item.conversationName}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}
