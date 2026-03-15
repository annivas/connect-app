import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import { analyzeConversation } from '../../services/aiService';
import type { ConversationSummary } from '../../utils/mockSummarizer';
import { NoteBlock } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  channelId?: string | null;
  isGroup: boolean;
}

const SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.75;

export function SummarySheet({ visible, onClose, conversationId, channelId, isGroup }: Props) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [createdReminders, setCreatedReminders] = useState<Set<string>>(new Set());

  // Pulsing sparkles animation
  const pulseOpacity = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  useEffect(() => {
    if (!visible) return;

    // Reset state
    setSummary(null);
    setIsLoading(true);
    setSavedToNotes(false);
    setCreatedReminders(new Set());

    // Start loading animation
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      true,
    );

    // Fetch messages
    const messages = isGroup
      ? useGroupsStore.getState().getGroupMessages(conversationId, false, channelId)
      : useMessagesStore.getState().getMessagesByConversationId(conversationId, false, channelId);

    setMessageCount(messages.length);

    const getUserName = (id: string) => {
      const user = useUserStore.getState().getUserById(id);
      return user?.name ?? 'Unknown';
    };
    const currentUserId = useUserStore.getState().currentUser?.id ?? '';

    analyzeConversation(messages, currentUserId, getUserName, conversationId, channelId).then((result) => {
      setSummary(result.summary);
      setIsLoading(false);
      pulseOpacity.value = 1;
    });
  }, [visible]);

  const handleCreateReminder = (itemId: string, text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    if (isGroup) {
      const currentUserId = useUserStore.getState().currentUser?.id ?? 'unknown';
      useGroupsStore.getState().createGroupReminder(
        conversationId,
        {
          title: text.length > 60 ? text.slice(0, 60) + '...' : text,
          dueDate: tomorrow,
          priority: 'medium' as const,
          isCompleted: false,
          createdBy: currentUserId,
        },
        channelId,
      );
    } else {
      useMessagesStore.getState().createReminder(
        conversationId,
        {
          title: text.length > 60 ? text.slice(0, 60) + '...' : text,
          dueDate: tomorrow.toISOString(),
          priority: 'medium' as const,
        },
        channelId,
      );
    }

    setCreatedReminders((prev) => new Set(prev).add(itemId));
  };

  const handleSaveToNotes = () => {
    if (!summary || savedToNotes) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const blocks: NoteBlock[] = [
      { id: 'sb-1', type: 'heading1', content: 'Chat Summary' },
      { id: 'sb-2', type: 'paragraph', content: summary.overview },
    ];

    if (summary.keyTopics.length > 0) {
      blocks.push({ id: 'sb-3', type: 'heading2', content: 'Key Topics' });
      summary.keyTopics.forEach((t, i) => {
        blocks.push({ id: `sb-topic-${i}`, type: 'bulletList', content: t });
      });
    }

    if (summary.decisions.length > 0) {
      blocks.push({ id: 'sb-4', type: 'heading2', content: 'Decisions' });
      summary.decisions.forEach((d, i) => {
        blocks.push({ id: `sb-dec-${i}`, type: 'bulletList', content: d });
      });
    }

    if (summary.actionItems.length > 0) {
      blocks.push({ id: 'sb-5', type: 'heading2', content: 'Action Items' });
      summary.actionItems.forEach((a, i) => {
        blocks.push({ id: `sb-action-${i}`, type: 'checklist', content: a.text, checked: false });
      });
    }

    const title = `Chat Summary - ${new Date().toLocaleDateString()}`;

    if (isGroup) {
      const currentUserId = useUserStore.getState().currentUser?.id ?? 'unknown';
      useGroupsStore.getState().createGroupNote(
        conversationId,
        {
          title,
          content: summary.overview,
          blocks,
          color: '#5B8EC9',
          isPrivate: false,
          isPinned: false,
          createdBy: currentUserId,
          tags: ['ai-summary'],
        },
        channelId,
      );
    } else {
      useMessagesStore.getState().createNote(
        conversationId,
        {
          title,
          content: summary.overview,
          blocks,
          color: '#5B8EC9',
          isPrivate: false,
        },
        channelId,
      );
    }

    setSavedToNotes(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        onPress={onClose}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <Pressable onPress={() => {}} className="bg-background-primary rounded-t-3xl">
          <View className="p-4" style={{ maxHeight: SHEET_MAX_HEIGHT }}>
            {/* Handle bar */}
            <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />

            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons name="sparkles" size={20} color="#D4764E" />
                <Text className="text-text-primary text-lg font-bold ml-2">Chat Summary</Text>
              </View>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={22} color="#A8937F" />
              </Pressable>
            </View>

            {isLoading ? (
              /* Loading state */
              <View className="items-center py-12">
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
              /* Summary content */
              <ScrollView showsVerticalScrollIndicator={false}>
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
                      {summary.actionItems.map((item) => {
                        const created = createdReminders.has(item.id);
                        return (
                          <View key={item.id} className="bg-surface rounded-2xl p-3 mb-2">
                            <View className="flex-row items-start">
                              <View className="flex-1">
                                <Text className="text-text-primary text-sm leading-5">{item.text}</Text>
                                {item.assignee && (
                                  <Text className="text-text-tertiary text-xs mt-1">{item.assignee}</Text>
                                )}
                              </View>
                              <Pressable
                                onPress={() => !created && handleCreateReminder(item.id, item.text)}
                                className="ml-3"
                              >
                                {created ? (
                                  <View className="flex-row items-center">
                                    <Ionicons name="checkmark-circle" size={18} color="#2D9F6F" />
                                  </View>
                                ) : (
                                  <View className="flex-row items-center bg-background-tertiary rounded-full px-2.5 py-1">
                                    <Ionicons name="alarm-outline" size={14} color="#D4964E" />
                                    <Text className="text-text-secondary text-xs font-medium ml-1">Remind</Text>
                                  </View>
                                )}
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Save to Notes */}
                <Pressable
                  onPress={handleSaveToNotes}
                  className={`rounded-2xl py-3.5 items-center mb-2 ${savedToNotes ? 'bg-status-success' : 'bg-accent-primary'}`}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={savedToNotes ? 'checkmark-circle' : 'document-text-outline'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text className="text-white text-sm font-semibold ml-2">
                      {savedToNotes ? 'Saved to Notes' : 'Save to Notes'}
                    </Text>
                  </View>
                </Pressable>

                {/* Bottom padding */}
                <View className="h-6" />
              </ScrollView>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
