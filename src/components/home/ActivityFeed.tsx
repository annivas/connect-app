import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActivityFeedItem } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  items: ActivityFeedItem[];
  getUserName: (id: string) => string;
  onPressItem?: (item: ActivityFeedItem) => void;
}

function getIconColor(type: ActivityFeedItem['type']): string {
  switch (type) {
    case 'expense_settled': return '#2D9F6F';
    case 'reminder_completed': return '#2D9F6F';
    case 'shared_object': return '#D4764E';
    case 'event_created': return '#5B8EC9';
    case 'note_created': return '#D4964E';
    case 'poll_created': return '#8B6F5A';
    case 'message': return '#C2956B';
    default: return '#A8937F';
  }
}

export function ActivityFeed({ items, getUserName, onPressItem }: Props) {
  if (items.length === 0) return null;

  return (
    <View className="mx-4 mb-5">
      <View className="flex-row items-center mb-3">
        <Ionicons name="pulse-outline" size={18} color="#D4764E" />
        <Text className="text-text-primary font-bold text-base ml-2">Recent Activity</Text>
      </View>
      {items.slice(0, 5).map((item, index) => {
        const color = getIconColor(item.type);
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              Haptics.selectionAsync();
              onPressItem?.(item);
            }}
            className="active:opacity-80"
          >
            <View
              className={`flex-row items-center py-3 ${
                index < Math.min(items.length, 5) - 1 ? 'border-b border-border-subtle' : ''
              }`}
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${color}15` }}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={color}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-sm" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-text-tertiary text-xs mt-0.5" numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
              <Text className="text-text-tertiary text-[10px] ml-2">
                {formatDistanceToNow(item.timestamp, { addSuffix: false })}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
