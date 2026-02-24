import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  color?: string;
}

interface Props {
  actions: Action[];
}

export function QuickActions({ actions }: Props) {
  return (
    <View className="flex-row px-6 py-4 justify-around">
      {actions.map((action) => {
        const iconColor = action.active ? '#D4764E' : (action.color ?? '#7A6355');
        return (
          <Pressable
            key={action.label}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              action.onPress();
            }}
            className="items-center"
          >
            <View className="w-11 h-11 rounded-full bg-surface items-center justify-center mb-1.5">
              <Ionicons name={action.icon} size={20} color={iconColor} />
            </View>
            <Text
              className="text-[11px] font-medium"
              style={{ color: iconColor }}
            >
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
