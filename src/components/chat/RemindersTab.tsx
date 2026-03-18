import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { CreateReminderModal } from './CreateReminderModal';
import { useUserStore } from '../../stores/useUserStore';
import { useToastStore } from '../../stores/useToastStore';
import type { Reminder, User } from '../../types';

interface Props {
  reminders: Reminder[];
  onToggleComplete: (reminderId: string) => void;
  onCreateReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void;
  onUpdateReminder?: (reminderId: string, updates: { title?: string; description?: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' }) => void;
  onDeleteReminder?: (reminderId: string) => void;
  members?: User[];
}

const priorityColors = {
  low: '#A8937F',
  medium: '#D4964E',
  high: '#C94F4F',
};

export function RemindersTab({ reminders, onToggleComplete, onCreateReminder, onUpdateReminder, onDeleteReminder, members }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const getUserById = useUserStore((s) => s.getUserById);

  const handleToggle = (reminderId: string) => {
    Haptics.selectionAsync();
    onToggleComplete(reminderId);
  };

  const handleEdit = (reminder: Reminder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingReminder(reminder);
    setIsModalVisible(true);
  };

  const handleLongPress = (reminder: Reminder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];
    if (onUpdateReminder) {
      options.push({ text: 'Edit', onPress: () => handleEdit(reminder) });
    }
    if (onDeleteReminder) {
      options.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDeleteReminder(reminder.id);
          useToastStore.getState().show({ message: 'Reminder deleted', type: 'success' });
        },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Reminder', reminder.title, options);
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
          onClose={() => { setIsModalVisible(false); setEditingReminder(null); }}
          onSave={onCreateReminder}
          onUpdate={onUpdateReminder}
          editingReminder={editingReminder}
          members={members}
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
          <Pressable onLongPress={() => handleLongPress(item)} delayLongPress={500}>
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
                      <Ionicons name="checkmark" size={12} color="#2D9F6F" />
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
                  {item.assignedTo && item.assignedTo.length > 0 && members && (
                    <View className="flex-row items-center mt-1.5">
                      {item.assignedTo.slice(0, 4).map((userId) => {
                        const user = getUserById(userId);
                        return user ? (
                          <View key={userId} className="-mr-1">
                            <Avatar uri={user.avatar} size="sm" />
                          </View>
                        ) : null;
                      })}
                      {item.assignedTo.length > 4 && (
                        <Text className="text-text-tertiary text-[10px] ml-2">
                          +{item.assignedTo.length - 4}
                        </Text>
                      )}
                    </View>
                  )}
                  {item.linkedMessageId && (
                    <View className="flex-row items-center mt-1.5">
                      <Ionicons name="chatbubble-outline" size={11} color="#D4764E" />
                      <Text className="text-accent-primary text-[11px] font-medium ml-1">
                        From message
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
      <FAB onPress={handleFABPress} />
      <CreateReminderModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSave={onCreateReminder}
        members={members}
      />
    </View>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
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
