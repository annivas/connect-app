import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  unsettledExpenses: { total: number; count: number };
  unvotedPolls: number;
  pendingRSVPs: number;
  onPressExpenses?: () => void;
  onPressPolls?: () => void;
  onPressRSVPs?: () => void;
}

function ActionCard({
  icon,
  color,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      className="flex-1 active:opacity-80"
    >
      <View className="bg-surface rounded-2xl p-3.5 items-center">
        <View
          className="w-9 h-9 rounded-full items-center justify-center mb-1.5"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text className="text-text-primary text-sm font-bold">{value}</Text>
        <Text className="text-text-tertiary text-[10px] mt-0.5">{label}</Text>
      </View>
    </Pressable>
  );
}

export function PendingActions({
  unsettledExpenses,
  unvotedPolls,
  pendingRSVPs,
  onPressExpenses,
  onPressPolls,
  onPressRSVPs,
}: Props) {
  const hasAnyActions =
    unsettledExpenses.count > 0 || unvotedPolls > 0 || pendingRSVPs > 0;

  if (!hasAnyActions) return null;

  return (
    <View className="mx-4 mb-5">
      <View className="flex-row items-center mb-3">
        <Ionicons name="flash-outline" size={18} color="#D4764E" />
        <Text className="text-text-primary font-bold text-base ml-2">Needs Your Attention</Text>
      </View>
      <View className="flex-row gap-2.5">
        {unsettledExpenses.count > 0 && (
          <ActionCard
            icon="wallet-outline"
            color="#2D9F6F"
            label="Unsettled"
            value={`$${unsettledExpenses.total.toFixed(0)}`}
            onPress={onPressExpenses}
          />
        )}
        {unvotedPolls > 0 && (
          <ActionCard
            icon="bar-chart-outline"
            color="#5B8EC9"
            label={unvotedPolls === 1 ? 'Open poll' : 'Open polls'}
            value={`${unvotedPolls}`}
            onPress={onPressPolls}
          />
        )}
        {pendingRSVPs > 0 && (
          <ActionCard
            icon="calendar-outline"
            color="#D4964E"
            label={pendingRSVPs === 1 ? 'Pending RSVP' : 'Pending RSVPs'}
            value={`${pendingRSVPs}`}
            onPress={onPressRSVPs}
          />
        )}
      </View>
    </View>
  );
}
