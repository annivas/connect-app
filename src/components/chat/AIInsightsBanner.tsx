import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import type { ConversationInsight, InsightType } from '../../utils/insightDetector';
import { getInsightIcon, getInsightColor, getInsightLabel } from '../../utils/insightDetector';

interface Props {
  insights: ConversationInsight[];
  onJumpToMessage?: (messageId: string) => void;
  onDismiss: () => void;
}

function buildSummaryText(insights: ConversationInsight[]): string {
  const counts: Record<InsightType, number> = {
    unanswered_question: 0,
    pending_decision: 0,
    follow_up: 0,
  };

  for (const insight of insights) {
    counts[insight.type]++;
  }

  const parts: string[] = [];

  if (counts.unanswered_question > 0) {
    parts.push(
      `${counts.unanswered_question} unanswered question${counts.unanswered_question > 1 ? 's' : ''}`,
    );
  }
  if (counts.pending_decision > 0) {
    parts.push(
      `${counts.pending_decision} pending decision${counts.pending_decision > 1 ? 's' : ''}`,
    );
  }
  if (counts.follow_up > 0) {
    parts.push(
      `${counts.follow_up} follow-up${counts.follow_up > 1 ? 's' : ''}`,
    );
  }

  return parts.join(', ');
}

export function AIInsightsBanner({ insights, onJumpToMessage, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (insights.length === 0) return null;

  const handleTap = () => {
    Haptics.selectionAsync();
    setExpanded(!expanded);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Animated.View entering={SlideInUp.duration(250).springify()} exiting={FadeOut.duration(150)}>
      {/* Compact banner */}
      <Pressable
        onPress={handleTap}
        className="flex-row items-center px-4 py-2.5 bg-surface border-b border-border-subtle"
      >
        <Ionicons name="sparkles" size={14} color="#D4764E" />
        <Text className="text-text-primary text-[13px] flex-1 ml-2" numberOfLines={1}>
          {buildSummaryText(insights)}
        </Text>
        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          className="mr-2"
        >
          <Ionicons name="close-circle" size={16} color="#A8937F" />
        </Pressable>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#A8937F"
        />
      </Pressable>

      {/* Expanded list */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="bg-surface border-b border-border-subtle"
        >
          {insights.map((insight) => (
            <Pressable
              key={insight.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onJumpToMessage?.(insight.messageId);
                setExpanded(false);
              }}
              className="flex-row items-center px-4 py-2.5 border-b border-border-subtle/50"
            >
              <Ionicons
                name={getInsightIcon(insight.type) as any}
                size={14}
                color={getInsightColor(insight.type)}
              />
              <View className="flex-1 ml-2.5">
                <Text className="text-text-primary text-[13px]" numberOfLines={1}>
                  {insight.content}
                </Text>
                <Text className="text-text-tertiary text-[11px] mt-0.5">
                  {getInsightLabel(insight.type)} · {insight.senderName}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#A8937F" />
            </Pressable>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}
