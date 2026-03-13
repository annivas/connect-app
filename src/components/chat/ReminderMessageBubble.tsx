import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { useUserStore } from '../../stores/useUserStore';
import type { ReminderMessageMetadata } from '../../types';

const priorityColors: Record<string, string> = {
  low: '#A8937F',
  medium: '#D4964E',
  high: '#C94F4F',
};

const priorityLabels: Record<string, string> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
};

interface Props {
  metadata: ReminderMessageMetadata;
  isMine: boolean;
  onPress?: () => void;
}

export function ReminderMessageBubble({ metadata, isMine, onPress }: Props) {
  const priorityColor = priorityColors[metadata.priority] ?? '#A8937F';
  const accentColor = isMine ? '#FFFFFF' : priorityColor;
  const primaryText = isMine ? '#FFFFFF' : '#2D1F14';
  const secondaryText = isMine ? 'rgba(255,255,255,0.6)' : '#7A6355';

  const getUserById = useUserStore.getState().getUserById;

  let formattedDate = '';
  try {
    formattedDate = format(new Date(metadata.dueDate), 'EEE, MMM d · h:mm a');
  } catch {
    formattedDate = metadata.dueDate;
  }

  const assignees = (metadata.assignedTo ?? [])
    .map((id) => getUserById(id))
    .filter(Boolean);
  const visibleAssignees = assignees.slice(0, 4);
  const overflowCount = assignees.length - 4;

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={!onPress} style={{ minWidth: 240, opacity: metadata.isCompleted ? 0.7 : 1 }}>
      {/* Top accent strip with priority color */}
      <View
        style={{
          height: 3,
          borderRadius: 1.5,
          backgroundColor: accentColor,
          marginBottom: 10,
          opacity: 0.6,
        }}
      />

      {/* Header: icon badge + REMINDER label + priority pill */}
      <View className="flex-row items-center mb-2.5">
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : `${priorityColor}15`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={metadata.isCompleted ? 'checkmark-circle' : 'alarm'}
            size={16}
            color={accentColor}
          />
        </View>
        <Text
          style={{ fontSize: 11, fontWeight: '700', color: accentColor, marginLeft: 8, letterSpacing: 1, flex: 1 }}
        >
          REMINDER
        </Text>
        {/* Priority pill */}
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
            backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : `${priorityColor}12`,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: isMine ? 'rgba(255,255,255,0.8)' : priorityColor,
              letterSpacing: 0.5,
            }}
          >
            {priorityLabels[metadata.priority] ?? 'MEDIUM'}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: primaryText,
          marginBottom: 4,
          textDecorationLine: metadata.isCompleted ? 'line-through' : 'none',
        }}
        numberOfLines={2}
      >
        {metadata.title}
      </Text>

      {/* Description */}
      {metadata.description ? (
        <Text
          style={{ fontSize: 13, color: secondaryText, marginBottom: 6 }}
          numberOfLines={2}
        >
          {metadata.description}
        </Text>
      ) : null}

      {/* Due date in a tinted row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : `${priorityColor}08`,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 7,
          marginTop: 4,
        }}
      >
        <Ionicons name="calendar" size={14} color={accentColor} />
        <Text
          style={{ fontSize: 13, fontWeight: '500', color: primaryText, marginLeft: 8 }}
        >
          {formattedDate}
        </Text>
      </View>

      {/* Assignees */}
      {visibleAssignees.length > 0 && (
        <View className="flex-row items-center mt-2.5">
          <Ionicons name="people" size={12} color={secondaryText} />
          {visibleAssignees.map((user) => (
            <View key={user!.id} style={{ marginLeft: 4, marginRight: -4 }}>
              <Avatar uri={user!.avatar} size="sm" />
            </View>
          ))}
          {overflowCount > 0 && (
            <Text style={{ fontSize: 11, color: secondaryText, marginLeft: 10 }}>
              +{overflowCount}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}
