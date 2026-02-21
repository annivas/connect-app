import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Reminder } from '../../types';
import { useMessagesStore } from '../../stores/useMessagesStore';

interface Props {
  conversationId: string;
}

const priorityColors = {
  low: '#6B6B76',
  medium: '#F59E0B',
  high: '#EF4444',
};

export function RemindersTab({ conversationId }: Props) {
  const conversation = useMessagesStore(
    useShallow((s) => s.getConversationById(conversationId))
  );
  const reminders = conversation?.metadata?.reminders ?? [];

  if (reminders.length === 0) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="alarm-outline"
          title="No reminders"
          description="Set reminders from messages to stay on track"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: { item: Reminder }) => (
          <Card className="mb-3">
            <View className="flex-row items-start">
              <View
                className="w-5 h-5 rounded-full border-2 items-center justify-center mr-3 mt-0.5"
                style={{ borderColor: priorityColors[item.priority] }}
              >
                {item.isCompleted && (
                  <Ionicons name="checkmark" size={12} color="#10B981" />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className={`text-[15px] font-medium ${
                    item.isCompleted
                      ? 'text-text-tertiary line-through'
                      : 'text-text-primary'
                  }`}
                >
                  {item.title}
                </Text>
                <Text className="text-text-tertiary text-xs mt-1">
                  {format(item.dueDate, 'MMM d, yyyy · HH:mm')}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
