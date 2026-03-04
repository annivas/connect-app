import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { AISuggestedAction, AISuggestedActionType } from '../../types';

interface Props {
  suggestions: AISuggestedAction[];
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

const ACTION_ICONS: Record<AISuggestedActionType, keyof typeof Ionicons.glyphMap> = {
  meeting: 'calendar-outline',
  calendar: 'time-outline',
  task: 'checkbox-outline',
  reminder: 'alarm-outline',
  decision: 'checkmark-circle-outline',
  document: 'document-text-outline',
};

const ACTION_COLORS: Record<AISuggestedActionType, string> = {
  meeting: '#5B8EC9',
  calendar: '#D4964E',
  task: '#2D9F6F',
  reminder: '#C94F4F',
  decision: '#8B6F5A',
  document: '#D4764E',
};

export function AISuggestionCard({ suggestions, onApprove, onDismiss }: Props) {
  const pending = suggestions.filter((s) => !s.isApproved && !s.isDismissed);
  if (pending.length === 0) return null;

  return (
    <View className="mx-3 mb-2">
      <View className="bg-surface-elevated rounded-2xl border border-border-subtle overflow-hidden">
        <View className="flex-row items-center px-3 py-2 bg-background-tertiary">
          <Ionicons name="sparkles" size={14} color="#D4764E" />
          <Text className="text-accent-primary text-[12px] font-semibold ml-1.5">
            AI Suggestions
          </Text>
        </View>

        {pending.map((suggestion, index) => (
          <View
            key={suggestion.id}
            className={`flex-row items-center px-3 py-2.5 ${
              index < pending.length - 1 ? 'border-b border-border-subtle' : ''
            }`}
          >
            <View
              style={{ backgroundColor: `${ACTION_COLORS[suggestion.type]}15` }}
              className="w-8 h-8 rounded-lg items-center justify-center"
            >
              <Ionicons
                name={ACTION_ICONS[suggestion.type]}
                size={16}
                color={ACTION_COLORS[suggestion.type]}
              />
            </View>

            <View className="flex-1 ml-2.5">
              <Text className="text-text-primary text-[13px] font-medium">
                {suggestion.label}
              </Text>
              <Text className="text-text-secondary text-[11px]" numberOfLines={1}>
                {suggestion.description}
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5 ml-2">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onApprove(suggestion.id);
                }}
                className="w-7 h-7 rounded-full bg-status-success/15 items-center justify-center"
              >
                <Ionicons name="checkmark" size={16} color="#2D9F6F" />
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  onDismiss(suggestion.id);
                }}
                className="w-7 h-7 rounded-full bg-surface items-center justify-center"
              >
                <Ionicons name="close" size={14} color="#A8937F" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
