import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Avatar } from '../ui/Avatar';
import { useUserStore } from '../../stores/useUserStore';
import type { ReminderMessageMetadata } from '../../types';

const priorityColors = {
  low: '#A8937F',
  medium: '#D4964E',
  high: '#C94F4F',
};

interface Props {
  metadata: ReminderMessageMetadata;
  isMine: boolean;
}

export function ReminderMessageBubble({ metadata, isMine }: Props) {
  const accentText = isMine ? 'text-white' : 'text-text-primary';
  const secondaryText = isMine ? 'text-white/60' : 'text-text-tertiary';
  const labelColor = isMine ? '#FFFFFF' : '#D4764E';
  const priorityColor = priorityColors[metadata.priority];

  const getUserById = useUserStore.getState().getUserById;

  let formattedDate = '';
  try {
    formattedDate = format(new Date(metadata.dueDate), 'MMM d, yyyy');
  } catch {
    formattedDate = metadata.dueDate;
  }

  const assignees = (metadata.assignedTo ?? [])
    .map((id) => getUserById(id))
    .filter(Boolean);
  const visibleAssignees = assignees.slice(0, 3);
  const overflowCount = assignees.length - 3;

  return (
    <View style={{ minWidth: 220 }}>
      {/* Header */}
      <View className="flex-row items-center mb-1.5">
        <Ionicons name="alarm-outline" size={14} color={labelColor} />
        <Text
          className={`text-[11px] font-semibold ml-1 tracking-wider ${
            isMine ? 'text-white/80' : 'text-accent-primary'
          }`}
        >
          REMINDER
        </Text>
      </View>

      {/* Priority dot + Title */}
      <View className="flex-row items-center">
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: priorityColor,
            marginRight: 8,
          }}
        />
        <Text
          className={`text-[15px] font-semibold flex-1 ${accentText} ${
            metadata.isCompleted ? 'line-through opacity-60' : ''
          }`}
          numberOfLines={1}
        >
          {metadata.title}
        </Text>
      </View>

      {/* Description */}
      {metadata.description ? (
        <Text
          className={`text-[13px] mt-0.5 ml-[18px] ${secondaryText}`}
          numberOfLines={2}
        >
          {metadata.description}
        </Text>
      ) : null}

      {/* Due date */}
      <View className="flex-row items-center mt-1.5 ml-[18px]">
        <Ionicons
          name="calendar-outline"
          size={12}
          color={isMine ? 'rgba(255,255,255,0.5)' : '#A8937F'}
        />
        <Text className={`text-[12px] ml-1 ${secondaryText}`}>
          {formattedDate}
        </Text>
      </View>

      {/* Assignees */}
      {visibleAssignees.length > 0 && (
        <View className="flex-row items-center mt-1.5 ml-[18px]">
          {visibleAssignees.map((user) => (
            <View key={user!.id} className="mr-[-4px]">
              <Avatar uri={user!.avatar} size="sm" />
            </View>
          ))}
          {overflowCount > 0 && (
            <Text className={`text-[11px] ml-2 ${secondaryText}`}>
              +{overflowCount}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
