import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { EmptyState } from '../ui/EmptyState';
import { CreateReminderModal } from './CreateReminderModal';
import { CreateExpenseModal } from './CreateExpenseModal';
import { CreateEventModal } from './CreateEventModal';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import { useToastStore } from '../../stores/useToastStore';
import { getInsightIcon, getInsightColor, getInsightLabel } from '../../utils/insightDetector';
import { getActionIcon, getActionColor } from '../../utils/actionDetector';
import { analyzeConversation } from '../../services/aiService';
import type { ConversationSummary } from '../../utils/mockSummarizer';
import type { ConversationInsight } from '../../utils/insightDetector';
import type { DetectedAction, User } from '../../types';

interface Props {
  conversationId: string;
  channelId?: string | null;
  isGroup: boolean;
}

export function InsightsTab({ conversationId, channelId, isGroup }: Props) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [insights, setInsights] = useState<ConversationInsight[]>([]);
  const [aggregatedActions, setAggregatedActions] = useState<DetectedAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageCount, setMessageCount] = useState(0);

  // Action modal state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [suggestedEventTitle, setSuggestedEventTitle] = useState('');

  // Pulsing sparkles animation
  const pulseOpacity = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  // Expense members for the modal
  const expenseMembers = useMemo(() => {
    const getUserById = useUserStore.getState().getUserById;
    const ids = isGroup
      ? (useGroupsStore.getState().getGroupById(conversationId)?.members ?? [])
      : (useMessagesStore.getState().getConversationById(conversationId)?.participants ?? []);
    return ids.map((uid) => getUserById(uid)).filter(Boolean) as User[];
  }, [conversationId, isGroup]);

  const loadAnalysis = (forceRefresh = false) => {
    setSummary(null);
    setInsights([]);
    setAggregatedActions([]);
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

    // Single unified analysis call (LLM in real mode, mock fallback otherwise)
    analyzeConversation(messages, currentUserId, getUserName, conversationId, channelId, forceRefresh).then((result) => {
      setSummary(result.summary);
      setInsights(result.insights);
      setAggregatedActions(result.actions);
      setIsLoading(false);
      pulseOpacity.value = 1;
    });
  };

  useEffect(() => {
    loadAnalysis();
  }, [conversationId, channelId, isGroup]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadAnalysis(true);
  };

  const handleActionPress = (action: DetectedAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (action.type) {
      case 'reminder':
        setShowReminderModal(true);
        break;
      case 'expense':
        setShowExpenseModal(true);
        break;
      case 'event':
        setSuggestedEventTitle(action.extractedValue);
        setShowEventModal(true);
        break;
      case 'link_save':
        useToastStore.getState().show({ message: 'Link saved to collection', type: 'success' });
        break;
    }
  };

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
          {/* Refresh button */}
          <View className="flex-row justify-end mb-2">
            <Pressable
              onPress={handleRefresh}
              className="flex-row items-center px-2.5 py-1.5 rounded-full bg-background-tertiary active:opacity-70"
            >
              <Ionicons name="refresh" size={14} color="#A8937F" />
              <Text className="text-text-tertiary text-xs ml-1">Refresh</Text>
            </Pressable>
          </View>

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

          {/* Suggested Actions */}
          {aggregatedActions.length > 0 && (
            <>
              <SectionHeader icon="bulb-outline" color="#D4964E" title="Suggested Actions" />
              <View className="mb-4">
                {aggregatedActions.map((action, i) => (
                  <Pressable
                    key={`${action.type}-${i}`}
                    onPress={() => handleActionPress(action)}
                    className="active:opacity-80"
                  >
                    <View className="bg-surface rounded-2xl p-3 mb-2 flex-row items-center">
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: `${getActionColor(action.type)}15` }}
                      >
                        <Ionicons
                          name={getActionIcon(action.type) as any}
                          size={16}
                          color={getActionColor(action.type)}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-text-primary text-sm font-medium">
                          {action.label}
                        </Text>
                        <Text className="text-text-tertiary text-xs mt-0.5" numberOfLines={1}>
                          "{action.extractedValue}"
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#A8937F" />
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
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

      {/* Action modals */}
      <CreateReminderModal
        visible={showReminderModal}
        conversationId={conversationId}
        onClose={() => setShowReminderModal(false)}
        onSave={async (reminder) => {
          const userId = useUserStore.getState().currentUser?.id ?? '';
          if (isGroup) {
            const created = useGroupsStore.getState().createGroupReminder(conversationId, {
              title: reminder.title,
              description: reminder.description,
              dueDate: reminder.dueDate instanceof Date ? reminder.dueDate : new Date(reminder.dueDate),
              priority: reminder.priority,
              isCompleted: false,
              createdBy: userId,
            });
            if (userId) {
              useGroupsStore.getState().sendGroupMessage(conversationId, `Set a reminder: ${reminder.title}`, userId, {
                type: 'reminder',
                metadata: {
                  reminderId: created.id,
                  title: reminder.title,
                  description: reminder.description,
                  dueDate: reminder.dueDate instanceof Date ? reminder.dueDate.toISOString() : String(reminder.dueDate),
                  priority: reminder.priority,
                  isCompleted: false,
                },
              });
            }
          } else {
            const created = await useMessagesStore.getState().createReminder(conversationId, {
              title: reminder.title,
              description: reminder.description,
              dueDate: reminder.dueDate instanceof Date ? reminder.dueDate.toISOString() : String(reminder.dueDate),
              priority: reminder.priority,
            });
            if (userId) {
              useMessagesStore.getState().sendMessage(conversationId, `Set a reminder: ${reminder.title}`, userId, {
                type: 'reminder',
                metadata: {
                  reminderId: created.id,
                  title: created.title,
                  description: created.description,
                  dueDate: typeof created.dueDate === 'string' ? created.dueDate : created.dueDate instanceof Date ? created.dueDate.toISOString() : String(created.dueDate),
                  priority: created.priority,
                  isCompleted: created.isCompleted,
                  assignedTo: created.assignedTo,
                },
              });
            }
          }
          setShowReminderModal(false);
          useToastStore.getState().show({ message: 'Reminder created', type: 'success' });
        }}
      />

      <CreateExpenseModal
        visible={showExpenseModal}
        conversationId={conversationId}
        members={expenseMembers}
        onClose={() => setShowExpenseModal(false)}
        onSave={async (entry) => {
          const userId = useUserStore.getState().currentUser?.id ?? '';
          if (isGroup) {
            const created = useGroupsStore.getState().createGroupLedgerEntry(conversationId, {
              description: entry.description,
              amount: entry.amount,
              paidBy: entry.paidBy,
              splitBetween: entry.splitBetween,
              category: entry.category,
              date: new Date(),
              isSettled: false,
            });
            if (userId) {
              useGroupsStore.getState().sendGroupMessage(conversationId, `Added an expense: ${entry.description} — $${entry.amount.toFixed(2)}`, userId, {
                type: 'expense',
                metadata: {
                  entryId: created.id,
                  description: created.description,
                  amount: created.amount,
                  paidBy: created.paidBy,
                  splitBetween: created.splitBetween,
                  category: created.category,
                  isSettled: created.isSettled,
                },
              });
            }
          } else {
            const created = await useMessagesStore.getState().createLedgerEntry(conversationId, {
              description: entry.description,
              amount: entry.amount,
              paidBy: entry.paidBy,
              splitBetween: entry.splitBetween,
              category: entry.category,
            });
            if (userId) {
              useMessagesStore.getState().sendMessage(conversationId, `Added an expense: ${entry.description} — $${entry.amount.toFixed(2)}`, userId, {
                type: 'expense',
                metadata: {
                  entryId: created.id,
                  description: created.description,
                  amount: created.amount,
                  paidBy: created.paidBy,
                  splitBetween: created.splitBetween,
                  category: created.category,
                  isSettled: created.isSettled,
                },
              });
            }
          }
          setShowExpenseModal(false);
          useToastStore.getState().show({ message: 'Expense logged', type: 'success' });
        }}
      />

      <CreateEventModal
        visible={showEventModal}
        suggestedTitle={suggestedEventTitle}
        onClose={() => { setShowEventModal(false); setSuggestedEventTitle(''); }}
        onSave={async (event) => {
          const userId = useUserStore.getState().currentUser?.id ?? '';
          if (isGroup) {
            const created = useGroupsStore.getState().createEvent(conversationId, {
              title: event.title,
              description: event.description,
              startDate: event.startDate,
              endDate: event.endDate,
              location: event.location,
              type: 'hangout',
            });
            if (userId && created) {
              useGroupsStore.getState().sendGroupMessage(conversationId, `Created an event: ${event.title}`, userId, {
                type: 'event',
                metadata: {
                  eventId: created.id,
                  title: event.title,
                  description: event.description,
                  startDate: event.startDate.toISOString(),
                  endDate: event.endDate?.toISOString(),
                  location: event.location,
                },
              });
            }
          } else {
            const created = useMessagesStore.getState().createEvent(conversationId, {
              title: event.title,
              description: event.description,
              startDate: event.startDate,
              endDate: event.endDate,
              location: event.location,
              createdBy: userId,
            });
            if (userId && created) {
              useMessagesStore.getState().sendMessage(conversationId, `Created an event: ${event.title}`, userId, {
                type: 'event',
                metadata: {
                  eventId: created.id,
                  title: event.title,
                  description: event.description,
                  startDate: event.startDate.toISOString(),
                  endDate: event.endDate?.toISOString(),
                  location: event.location,
                },
              });
            }
          }
          setShowEventModal(false);
          setSuggestedEventTitle('');
          useToastStore.getState().show({ message: 'Event created', type: 'success' });
        }}
      />
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
