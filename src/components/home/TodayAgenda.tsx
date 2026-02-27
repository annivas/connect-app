import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Reminder, GroupEvent } from '../../types';
import { format, isToday } from 'date-fns';

interface AgendaItem {
  id: string;
  title: string;
  time: string;
  type: 'reminder' | 'event';
  priority?: 'low' | 'medium' | 'high';
  contextName: string;
}

interface Props {
  reminders: Reminder[];
  events: GroupEvent[];
  getUserName: (id: string) => string;
  getGroupName: (id: string) => string;
  onPressReminder?: (reminder: Reminder) => void;
  onPressEvent?: (event: GroupEvent) => void;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return '#C94F4F';
    case 'medium': return '#D4964E';
    default: return '#5B8EC9';
  }
}

export function TodayAgenda({ reminders, events, getGroupName }: Props) {
  const todayReminders = reminders.filter(
    (r) => !r.isCompleted && isToday(r.dueDate)
  );
  const todayEvents = events.filter((e) => isToday(e.startDate));

  const agendaItems: AgendaItem[] = [
    ...todayEvents.map((e) => ({
      id: e.id,
      title: e.title,
      time: format(e.startDate, 'h:mm a'),
      type: 'event' as const,
      contextName: getGroupName(e.groupId),
    })),
    ...todayReminders.map((r) => ({
      id: r.id,
      title: r.title,
      time: format(r.dueDate, 'h:mm a'),
      type: 'reminder' as const,
      priority: r.priority,
      contextName: 'Due today',
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  if (agendaItems.length === 0) {
    return (
      <View className="mx-4 mb-5 bg-surface rounded-2xl p-5 items-center">
        <View className="w-10 h-10 rounded-full bg-background-tertiary items-center justify-center mb-2">
          <Ionicons name="sunny-outline" size={22} color="#D4964E" />
        </View>
        <Text className="text-text-primary font-medium text-sm">Clear schedule today</Text>
        <Text className="text-text-tertiary text-xs mt-0.5">No events or reminders due</Text>
      </View>
    );
  }

  return (
    <View className="mx-4 mb-5">
      <View className="flex-row items-center mb-3">
        <Ionicons name="today-outline" size={18} color="#D4764E" />
        <Text className="text-text-primary font-bold text-base ml-2">Today's Agenda</Text>
        <View className="bg-accent-primary rounded-full px-2 py-0.5 ml-2">
          <Text className="text-white text-xs font-bold">{agendaItems.length}</Text>
        </View>
      </View>
      {agendaItems.map((item, index) => (
        <Pressable
          key={item.id}
          onPress={() => Haptics.selectionAsync()}
          className="active:opacity-80"
        >
          <View
            className={`flex-row items-center bg-surface rounded-2xl p-3.5 ${
              index < agendaItems.length - 1 ? 'mb-2' : ''
            }`}
          >
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3"
              style={{
                backgroundColor:
                  item.type === 'event'
                    ? '#5B8EC920'
                    : `${getPriorityColor(item.priority || 'low')}20`,
              }}
            >
              <Ionicons
                name={item.type === 'event' ? 'calendar' : 'alarm'}
                size={18}
                color={
                  item.type === 'event'
                    ? '#5B8EC9'
                    : getPriorityColor(item.priority || 'low')
                }
              />
            </View>
            <View className="flex-1">
              <Text className="text-text-primary font-medium text-sm" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-text-tertiary text-xs mt-0.5">{item.contextName}</Text>
            </View>
            <Text className="text-text-secondary text-xs font-medium">{item.time}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
