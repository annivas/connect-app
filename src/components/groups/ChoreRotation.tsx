import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Chore } from '../../types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

interface Props {
  chores: Chore[];
  getUserName: (id: string) => string;
  getUserAvatar: (id: string) => string;
  onToggleChore: (choreId: string) => void;
}

function getFrequencyLabel(freq: Chore['frequency']): string {
  switch (freq) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'biweekly': return 'Every 2 weeks';
    case 'monthly': return 'Monthly';
  }
}

function getDueLabel(date: Date): { text: string; color: string } {
  if (isPast(date) && !isToday(date)) return { text: 'Overdue', color: '#C94F4F' };
  if (isToday(date)) return { text: 'Today', color: '#D4964E' };
  if (isTomorrow(date)) return { text: 'Tomorrow', color: '#5B8EC9' };
  return { text: format(date, 'MMM d'), color: '#A8937F' };
}

export function ChoreRotation({ chores, getUserName, getUserAvatar, onToggleChore }: Props) {
  const pendingChores = chores.filter((c) => !c.isCompleted);
  const completedChores = chores.filter((c) => c.isCompleted);

  return (
    <View>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="refresh-outline" size={18} color="#D4764E" />
          <Text className="text-text-primary font-bold text-base ml-2">Chore Rotation</Text>
        </View>
        <View className="bg-accent-primary/10 rounded-full px-2.5 py-0.5">
          <Text className="text-accent-primary text-xs font-bold">{pendingChores.length} due</Text>
        </View>
      </View>

      {/* Pending chores */}
      {pendingChores.map((chore) => {
        const due = getDueLabel(chore.nextDue);
        return (
          <Pressable
            key={chore.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleChore(chore.id);
            }}
            className="active:opacity-80"
          >
            <View className="flex-row items-center bg-surface rounded-2xl p-3.5 mb-2">
              <View className="w-6 h-6 rounded-full border-2 border-border items-center justify-center mr-3">
                {/* Empty checkbox */}
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-sm font-medium">{chore.title}</Text>
                <View className="flex-row items-center mt-1">
                  <Text className="text-text-tertiary text-xs">{getFrequencyLabel(chore.frequency)}</Text>
                  <Text className="text-text-tertiary text-xs mx-1.5">·</Text>
                  <Text className="text-xs font-medium" style={{ color: due.color }}>{due.text}</Text>
                </View>
              </View>
              <View className="items-center">
                <Image
                  source={{ uri: getUserAvatar(chore.assignedTo) }}
                  style={{ width: 28, height: 28, borderRadius: 14 }}
                />
                <Text className="text-text-tertiary text-[9px] mt-0.5">
                  {getUserName(chore.assignedTo).split(' ')[0]}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      {/* Completed chores */}
      {completedChores.length > 0 && (
        <View className="mt-1">
          <Text className="text-text-tertiary text-xs font-medium mb-2">Completed</Text>
          {completedChores.map((chore) => (
            <Pressable
              key={chore.id}
              onPress={() => {
                Haptics.selectionAsync();
                onToggleChore(chore.id);
              }}
              className="active:opacity-80"
            >
              <View className="flex-row items-center bg-surface/50 rounded-2xl p-3 mb-1.5">
                <View className="w-6 h-6 rounded-full bg-status-success items-center justify-center mr-3">
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text className="text-text-tertiary text-sm line-through flex-1">{chore.title}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
