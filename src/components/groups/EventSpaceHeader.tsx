import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { GroupEvent, RSVPStatus } from '../../types';

interface Props {
  event: GroupEvent;
}

const typeIcons: Record<GroupEvent['type'], keyof typeof Ionicons.glyphMap> = {
  hangout: 'people',
  sports: 'football',
  trip: 'airplane',
  other: 'calendar',
};

export function EventSpaceHeader({ event }: Props) {
  const goingCount = event.attendees.filter((a) => a.status === 'going').length;
  const maybeCount = event.attendees.filter((a) => a.status === 'maybe').length;

  return (
    <View className="bg-surface mx-3 mt-3 mb-2 rounded-2xl p-4">
      <View className="flex-row items-center mb-2">
        <View className="w-9 h-9 rounded-full bg-accent-primary/20 items-center justify-center mr-3">
          <Ionicons name={typeIcons[event.type]} size={18} color="#D4764E" />
        </View>
        <View className="flex-1">
          <Text className="text-text-primary text-[16px] font-semibold">{event.title}</Text>
          {event.description && (
            <Text className="text-text-secondary text-xs mt-0.5" numberOfLines={1}>
              {event.description}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center mt-1">
        <Ionicons name="calendar-outline" size={13} color="#A8937F" />
        <Text className="text-text-tertiary text-xs ml-1">
          {format(event.startDate, 'EEE, MMM d')} at {format(event.startDate, 'h:mm a')}
        </Text>
      </View>

      <View className="flex-row items-center mt-2 gap-4">
        <View className="flex-row items-center">
          <Ionicons name="checkmark-circle" size={14} color="#2D9F6F" />
          <Text className="text-text-secondary text-xs ml-1">{goingCount} going</Text>
        </View>
        {maybeCount > 0 && (
          <View className="flex-row items-center">
            <Ionicons name="help-circle" size={14} color="#D4964E" />
            <Text className="text-text-secondary text-xs ml-1">{maybeCount} maybe</Text>
          </View>
        )}
      </View>
    </View>
  );
}
