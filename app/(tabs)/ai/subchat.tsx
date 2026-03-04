import React, { useRef, useEffect, useLayoutEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay, differenceInMinutes } from 'date-fns';
import { IconButton } from '../../../src/components/ui/IconButton';
import { AIAgentAvatar } from '../../../src/components/ai/AIAgentAvatar';
import { AIMessageBubble } from '../../../src/components/ai/AIMessageBubble';
import { AIVisibilityToggle } from '../../../src/components/ai/AIVisibilityToggle';
import { AISuggestionCard } from '../../../src/components/ai/AISuggestionCard';
import { MessageInput } from '../../../src/components/chat/MessageInput';
import { useAIStore } from '../../../src/stores/useAIStore';
import type { AIMessage } from '../../../src/types';

const GROUP_THRESHOLD_MINUTES = 3;

export default function AISubchatScreen() {
  const { subchatId, agentId } = useLocalSearchParams<{
    subchatId: string;
    agentId: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // Hide bottom tab bar
  const parentNavigation = navigation.getParent();
  useLayoutEffect(() => {
    parentNavigation?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      parentNavigation?.setOptions({
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#FFF1E6',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 8,
        },
      });
    };
  }, [parentNavigation]);

  const agent = useAIStore(useShallow((s) => s.getAgentById(agentId!)));
  const subchat = useAIStore(useShallow((s) => s.getSubchatById(subchatId!)));
  const messages = useAIStore(useShallow((s) => s.getMessagesBySubchatId(subchatId!)));

  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Typing indicator simulation
  const [isAITyping, setIsAITyping] = useState(false);
  const prevMessageCount = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const latest = messages[messages.length - 1];
      if (latest && !latest.isFromAI) {
        setIsAITyping(true);
        // AI response comes from the store's simulated delay
      } else if (latest?.isFromAI) {
        setIsAITyping(false);
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  // Get suggestions for messages in this subchat
  const allSuggestions = useAIStore((s) => s.suggestions);
  const subchatSuggestions = useMemo(() => {
    const msgIds = new Set(messages.map((m) => m.id));
    return allSuggestions.filter((s) => msgIds.has(s.messageId));
  }, [messages, allSuggestions]);

  if (!agent || !subchat) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Subchat not found</Text>
      </SafeAreaView>
    );
  }

  const handleSend = (content: string) => {
    useAIStore.getState().sendMessage(subchatId!, content);
    // Scroll to bottom after sending
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />

        <View className="flex-1 flex-row items-center ml-1">
          <AIAgentAvatar
            uri={agent.avatar}
            size="md"
            provider={agent.provider}
            color={agent.color}
            isConnected={agent.isConnected}
          />
          <View className="ml-3 flex-1">
            <Text className="text-text-primary text-[17px] font-semibold" numberOfLines={1}>
              {subchat.title}
            </Text>
            <Text className="text-text-tertiary text-xs" numberOfLines={1}>
              {agent.name} · {agent.model}
            </Text>
          </View>
        </View>

        <IconButton
          icon="ellipsis-horizontal"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
      </View>

      {/* AI Visibility toggle */}
      <AIVisibilityToggle
        visibility={subchat.aiVisibility}
        onToggle={(visibility) => {
          useAIStore.getState().updateSubchatVisibility(subchatId!, visibility);
        }}
      />

      {/* AI Suggestions */}
      {subchatSuggestions.length > 0 && (
        <AISuggestionCard
          suggestions={subchatSuggestions}
          onApprove={(id) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            useAIStore.getState().approveSuggestion(id);
          }}
          onDismiss={(id) => {
            useAIStore.getState().dismissSuggestion(id);
          }}
        />
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <FlatList<AIMessage>
          ref={listRef as React.RefObject<FlatList<AIMessage>>}
          data={invertedMessages}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={({ item, index }) => {
            const olderMsg = index < invertedMessages.length - 1 ? invertedMessages[index + 1] : null;
            const newerMsg = index > 0 ? invertedMessages[index - 1] : null;

            const isFirstInGroup =
              !olderMsg ||
              olderMsg.senderId !== item.senderId ||
              differenceInMinutes(item.timestamp, olderMsg.timestamp) > GROUP_THRESHOLD_MINUTES;

            const isLastInGroup =
              !newerMsg ||
              newerMsg.senderId !== item.senderId ||
              differenceInMinutes(newerMsg.timestamp, item.timestamp) > GROUP_THRESHOLD_MINUTES;

            return (
              <AIMessageBubble
                message={item}
                agent={agent}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
              />
            );
          }}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 4,
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          ListHeaderComponent={
            isAITyping ? (
              <View className="flex-row items-center ml-10 mb-3">
                <View className="bg-surface-elevated rounded-2xl px-4 py-2.5">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-text-tertiary mr-1 opacity-60" />
                    <View className="w-2 h-2 rounded-full bg-text-tertiary mr-1 opacity-40" />
                    <View className="w-2 h-2 rounded-full bg-text-tertiary opacity-20" />
                  </View>
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={
            messages.length === 0 ? (
              <View className="items-center py-12 px-8">
                <AIAgentAvatar
                  uri={agent.avatar}
                  size="lg"
                  provider={agent.provider}
                  color={agent.color}
                />
                <Text className="text-text-primary text-lg font-semibold mt-4">
                  {subchat.title}
                </Text>
                <Text className="text-text-secondary text-sm text-center mt-1">
                  Start a conversation with {agent.name}. Ask questions, brainstorm ideas, or get help with tasks.
                </Text>
              </View>
            ) : null
          }
        />

        <MessageInput onSend={handleSend} />
        <View style={{ height: insets.bottom }} className="bg-background-secondary" />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
