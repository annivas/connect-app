import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import type { AISubchat } from '../../types';

interface Props {
  subchat: AISubchat;
  agentColor: string;
  onPress: (subchatId: string) => void;
  isUnread?: boolean;
}

function formatTimestamp(date: Date) {
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

export function AISubchatListItem({ subchat, agentColor, onPress, isUnread }: Props) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(subchat.id);
      }}
      className="flex-row items-center px-4 py-3 bg-background-primary active:bg-surface-hover"
    >
      <View
        style={{ backgroundColor: `${agentColor}15` }}
        className="w-10 h-10 rounded-xl items-center justify-center"
      >
        <Ionicons
          name={subchat.title === 'General' ? 'chatbubble' : 'document-text'}
          size={20}
          color={agentColor}
        />
      </View>

      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between mb-0.5">
          <View className="flex-row items-center flex-1 mr-2">
            <Text
              className={`text-[15px] ${isUnread ? 'text-text-primary font-semibold' : 'text-text-primary font-medium'}`}
            >
              {subchat.title}
            </Text>
            {subchat.aiVisibility === 'ai-restricted' && (
              <View className="ml-1.5 flex-row items-center bg-background-tertiary rounded px-1.5 py-0.5">
                <Ionicons name="eye-off-outline" size={9} color="#8B6F5A" />
                <Text className="text-accent-tertiary text-[9px] font-bold ml-0.5">
                  RESTRICTED
                </Text>
              </View>
            )}
          </View>
          <Text className="text-text-tertiary text-xs">
            {formatTimestamp(subchat.updatedAt)}
          </Text>
        </View>

        {subchat.lastMessage && (
          <Text
            className={`text-sm ${isUnread ? 'text-text-primary font-medium' : 'text-text-secondary'}`}
            numberOfLines={1}
          >
            {subchat.lastMessage.isFromAI
              ? subchat.lastMessage.content
              : `You: ${subchat.lastMessage.content}`}
          </Text>
        )}
      </View>

      {isUnread && (
        <View className="w-2.5 h-2.5 rounded-full bg-accent-primary ml-2" />
      )}
    </Pressable>
  );
}
