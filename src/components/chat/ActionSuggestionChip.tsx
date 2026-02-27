import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DetectedAction } from '../../types';
import { getActionIcon, getActionColor } from '../../utils/actionDetector';

interface Props {
  actions: DetectedAction[];
  onPress: (action: DetectedAction) => void;
}

export function ActionSuggestionChip({ actions, onPress }: Props) {
  if (actions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 4, paddingHorizontal: 2 }}
    >
      {actions.map((action, index) => {
        const iconName = getActionIcon(action.type);
        const color = getActionColor(action.type);

        return (
          <Pressable
            key={`${action.type}-${index}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress(action);
            }}
            className="active:opacity-80"
          >
            <View
              className="flex-row items-center rounded-full px-2.5 py-1.5 border"
              style={{
                backgroundColor: `${color}10`,
                borderColor: `${color}30`,
              }}
            >
              <Ionicons
                name={iconName as keyof typeof Ionicons.glyphMap}
                size={12}
                color={color}
              />
              <Text
                className="text-[11px] font-medium ml-1"
                style={{ color }}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
