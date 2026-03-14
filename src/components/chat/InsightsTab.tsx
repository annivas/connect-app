import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { EmptyState } from '../ui/EmptyState';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import { generateMockSummary, ConversationSummary } from '../../utils/mockSummarizer';
import { detectInsights, getInsightIcon, getInsightColor, getInsightLabel, ConversationInsight } from '../../utils/insightDetector';

interface Props {
  conversationId: string;
  channelId?: string | null;
  isGroup: boolean;
}

export function InsightsTab({ conversationId, channelId, isGroup }: Props) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [insights, setInsights] = useState<ConversationInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageCount, setMessageCount] = useState(0);

  // Pulsing sparkles animation
  const pulseOpacity = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  useEffect(() => {
    setSummary(null);
    setInsights([]);
    setIsLoading(true);

    // Start loading animation
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      true,
    );

    const messages = isGroup
      ? useGroupsStore.getState().getGroupMessages(conversationId, false, channelId)
      : useMessagesStore.getState().getMessagesByConversationId(conversationId, false, channelId);

    setMessageCount(messages.length);

    const getUserName = (id: string) =>
      useUserStore.getState().getUserById(id)?.name ?? 'Unknown';
    const currentUserId = useUserStore.getState().currentUser?.id ?? '';

    // Compute insights synchronously
    const detectedInsights = detectInsights(messages, currentUserId, getUserName, new Set());
    setInsights(detectedInsights);

    // Generate summary asynchronously
    generateMockSummary(messages, getUserName).then((result) => {
      setSummary(result);
      setIsLoading(false);
      pulseOpacity.value = 1;
    });
  }, [conversationId, channelId, isGroup]);

  // Edge case: not enough messages
  if (!isLoading && !summary) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="sparkles-outline"
          title="Not enough messages"
          description="Send more messages to generate AI insights"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Animated.View style={pulseStyle}>
            <Ionicons name="sparkles" size={40} color="#D4764E" />
          </Animated.View>
          <Text className="text-text-secondary text-base font-medium mt-4">
            Analyzing conversation...
          </Text>
          <Text className="text-text-tertiary text-sm mt-1">
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : summary ? (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {/* Overview */}
          <SectionHeader icon="document-text-outline" color="#D4764E" title="Overview" />
          <View className="bg-surface rounded-2xl p-3.5 mb-4">
            <Text className="text-text-primary text-sm leading-5">{summary.overview}</Text>
            <Text className="text-text-tertiary text-xs mt-2">
              {summary.participantCount} participant{summary.participantCount !== 1 ? 's' : ''} · {summary.messageCount} messages
            </Text>
          </View>

          {/* Key Topics */}
          {summary.keyTopics.length > 0 && (
            <>
              <SectionHeader icon="pricetags-outline" color="#C2956B" title="Key Topics" />
              <View className="flex-row flex-wrap mb-4">
                {summary.keyTopics.map((topic, i) => (
                  <View key={i} className="bg-background-tertiary rounded-full px-3 py-1.5 mr-2 mb-2">
                    <Text className="text-text-secondary text-xs font-medium">{topic}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Active Insights */}
          {insights.length > 0 && (
            <>
              <View className="flex-row items-center mb-2">
                <Ionicons name="sparkles" size={16} color="#D4764E" />
                <Text className="text-text-primary text-sm font-semibold ml-1.5">Active Insights</Text>
                <View className="bg-accent-primary/20 px-1.5 py-0.5 rounded-full ml-2">
                  <Text className="text-accent-primary text-[10px] font-semibold">{insights.length}</Text>
                </View>
              </View>
              <View className="mb-4">
                {insights.map((insight) => (
                  <View key={insight.id} className="bg-surface rounded-2xl p-3 mb-2">
                    <View className="flex-row items-start">
                      <Ionicons
                        name={getInsightIcon(insight.type) as any}
                        size={16}
                        color={getInsightColor(insight.type)}
                        style={{ marginTop: 1, marginRight: 8 }}
                      />
                      <View className="flex-1">
                        <Text className="text-text-primary text-sm leading-5">{insight.content}</Text>
                        <Text className="text-text-tertiary text-xs mt-1">
                          {getInsightLabel(insight.type)} · {insight.senderName}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {insights.length === 0 && (
            <View className="bg-surface rounded-2xl p-3.5 mb-4 items-center">
              <Text className="text-text-tertiary text-sm">No active insights</Text>
            </View>
          )}

          {/* Decisions */}
          {summary.decisions.length > 0 && (
            <>
              <SectionHeader icon="checkmark-circle-outline" color="#2D9F6F" title="Decisions" />
              <View className="mb-4">
                {summary.decisions.map((decision, i) => (
                  <View key={i} className="flex-row items-start mb-2">
                    <Ionicons name="checkmark-circle" size={16} color="#2D9F6F" style={{ marginTop: 1, marginRight: 8 }} />
                    <Text className="text-text-primary text-sm flex-1 leading-5">{decision}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Action Items */}
          {summary.actionItems.length > 0 && (
            <>
              <SectionHeader icon="flash-outline" color="#D4964E" title="Action Items" />
              <View className="mb-4">
                {summary.actionItems.map((item) => (
                  <View key={item.id} className="bg-surface rounded-2xl p-3 mb-2">
                    <Text className="text-text-primary text-sm leading-5">{item.text}</Text>
                    {item.assignee && (
                      <Text className="text-text-tertiary text-xs mt-1">{item.assignee}</Text>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Bottom padding */}
          <View className="h-8" />
        </ScrollView>
      ) : null}
    </View>
  );
}

function SectionHeader({ icon, color, title }: { icon: string; color: string; title: string }) {
  return (
    <View className="flex-row items-center mb-2">
      <Ionicons name={icon as any} size={16} color={color} />
      <Text className="text-text-primary text-sm font-semibold ml-1.5">{title}</Text>
    </View>
  );
}
