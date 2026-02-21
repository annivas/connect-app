import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { Group } from '../../types';

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  general: 'people',
  trip: 'airplane',
  sports: 'basketball',
  project: 'briefcase',
};

interface Props {
  group: Group;
}

export function GroupCard({ group }: Props) {
  const router = useRouter();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/groups/${group.id}` as never);
  };

  return (
    <Card onPress={handlePress} className="mx-4 mb-3">
      <View className="flex-row">
        <Avatar uri={group.avatar} size="lg" />

        <View className="flex-1 ml-3">
          <View className="flex-row items-center mb-1">
            <Text
              className="text-text-primary text-[16px] font-semibold flex-1"
              numberOfLines={1}
            >
              {group.name}
            </Text>
            <View className="flex-row items-center">
              {group.isPinned && (
                <Ionicons
                  name="pin"
                  size={14}
                  color="#6366F1"
                  style={{ marginRight: 6 }}
                />
              )}
              <Ionicons
                name={typeIcons[group.type] || 'people'}
                size={14}
                color="#6B6B76"
              />
            </View>
          </View>

          {group.description && (
            <Text
              className="text-text-secondary text-sm mb-1.5"
              numberOfLines={1}
            >
              {group.description}
            </Text>
          )}

          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={13} color="#6B6B76" />
            <Text className="text-text-tertiary text-xs ml-1">
              {group.members.length} members
            </Text>
            <Text className="text-text-tertiary text-xs mx-1.5">·</Text>
            <Text className="text-text-tertiary text-xs">
              {format(group.lastActivity, 'MMM d')}
            </Text>
            {group.events && group.events.length > 0 && (
              <>
                <Text className="text-text-tertiary text-xs mx-1.5">·</Text>
                <Ionicons name="calendar-outline" size={11} color="#6B6B76" />
                <Text className="text-text-tertiary text-xs ml-1">
                  {group.events.length}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
}
