import React, { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { CreateReminderModal } from './CreateReminderModal';
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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const conversation = useMessagesStore(
    useShallow((s) => s.getConversationById(conversationId))
  );
  const reminders = conversation?.metadata?.reminders ?? [];

  const handleToggle = (reminderId: string) => {
    Haptics.selectionAsync();
    useMessagesStore.getState().toggleReminderComplete(conversationId, reminderId);
  };

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalVisible(true);
  };

  if (reminders.length === 0) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="alarm-outline"
          title="No reminders"
          description="Set reminders from messages to stay on track"
        />
        <FAB onPress={handleFABPress} />
        <CreateReminderModal
          visible={isModalVisible}
          conversationId={conversationId}
          onClose={() => setIsModalVisible(false)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item }: { item: Reminder }) => (
          <Card className="mb-3">
            <View className="flex-row items-start">
              <Pressable
                onPress={() => handleToggle(item.id)}
                hitSlop={8}
                className="mr-3 mt-0.5"
              >
                <View
                  className="w-5 h-5 rounded-full border-2 items-center justify-center"
                  style={{
                    borderColor: priorityColors[item.priority],
                    backgroundColor: item.isCompleted
                      ? priorityColors[item.priority] + '30'
                      : 'transparent',
                  }}
                >
                  {item.isCompleted && (
                    <Ionicons name="checkmark" size={12} color="#10B981" />
                  )}
                </View>
              </Pressable>
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
      <FAB onPress={handleFABPress} />
      <CreateReminderModal
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
        shadowColor: '#6366F1',
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
