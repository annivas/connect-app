import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { AIAgentAvatar } from './AIAgentAvatar';
import { Badge } from '../ui/Badge';
import type { AIAgent, AISubchat } from '../../types';

interface Props {
  agent: AIAgent;
  subchats: AISubchat[];
  unreadCount: number;
}

function formatTimestamp(date: Date) {
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

export function AIAgentListItem({ agent, subchats, unreadCount }: Props) {
  const router = useRouter();

  const lastUpdatedSubchat = subchats.length > 0
    ? subchats.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b))
    : null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/(tabs)/ai/[id]', params: { id: agent.id } } as never);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center px-4 py-3 bg-background-primary active:bg-surface-hover"
    >
      <AIAgentAvatar
        uri={agent.avatar}
        size="lg"
        provider={agent.provider}
        color={agent.color}
        isConnected={agent.isConnected}
      />

      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-text-primary text-[16px] font-semibold">
              {agent.name}
            </Text>
            <View
              style={{ backgroundColor: `${agent.color}20`, marginLeft: 6 }}
              className="rounded px-1.5 py-0.5"
            >
              <Text style={{ color: agent.color, fontSize: 9, fontWeight: '700' }}>
                {agent.provider.toUpperCase()}
              </Text>
            </View>
            {!agent.isConnected && (
              <View className="ml-1.5 bg-surface rounded px-1.5 py-0.5">
                <Text className="text-text-tertiary text-[9px] font-bold">
                  DISCONNECTED
                </Text>
              </View>
            )}
          </View>
          {lastUpdatedSubchat && (
            <Text className="text-text-tertiary text-xs">
              {formatTimestamp(lastUpdatedSubchat.updatedAt)}
            </Text>
          )}
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-2">
            {lastUpdatedSubchat?.lastMessage ? (
              <Text className="text-text-secondary text-sm" numberOfLines={1}>
                {lastUpdatedSubchat.lastMessage.isFromAI
                  ? lastUpdatedSubchat.lastMessage.content
                  : `You: ${lastUpdatedSubchat.lastMessage.content}`}
              </Text>
            ) : (
              <Text className="text-text-tertiary text-sm" numberOfLines={1}>
                {subchats.length} subchat{subchats.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
          <View className="flex-row items-center">
            {subchats.length > 0 && (
              <View className="flex-row items-center mr-2">
                <Ionicons name="chatbubbles-outline" size={12} color="#A8937F" />
                <Text className="text-text-tertiary text-[11px] ml-0.5">
                  {subchats.length}
                </Text>
              </View>
            )}
            {unreadCount > 0 && <Badge count={unreadCount} />}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
