import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import type { Message } from '../../types';

interface Props {
  pinnedMessages: Message[];
  onJumpToMessage?: (messageId: string) => void;
  onDismiss?: () => void;
}

export function PinnedMessageBanner({ pinnedMessages, onJumpToMessage, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  const handleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pinnedMessages.length > 1) {
      setExpanded(!expanded);
    } else {
      onJumpToMessage?.(latestPinned.id);
    }
  };

  return (
    <Animated.View entering={SlideInUp.duration(250).springify()} exiting={FadeOut.duration(150)}>
      {/* Compact banner */}
      <Pressable
        onPress={handleTap}
        className="flex-row items-center px-4 py-2.5 bg-surface border-b border-border-subtle"
      >
        <Ionicons name="pin" size={14} color="#D4764E" />
        <View className="flex-1 ml-2.5">
          <Text className="text-text-primary text-[13px]" numberOfLines={1}>
            {latestPinned.content || 'Pinned media'}
          </Text>
        </View>
        {pinnedMessages.length > 1 && (
          <View className="bg-accent-primary/20 px-1.5 py-0.5 rounded-full mr-2">
            <Text className="text-accent-primary text-[10px] font-semibold">
              {pinnedMessages.length}
            </Text>
          </View>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#A8937F"
        />
      </Pressable>

      {/* Expanded list of all pinned messages */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="bg-surface border-b border-border-subtle"
        >
          {pinnedMessages.map((msg) => (
            <Pressable
              key={msg.id}
              onPress={() => {
                Haptics.selectionAsync();
                onJumpToMessage?.(msg.id);
                setExpanded(false);
              }}
              className="flex-row items-center px-4 py-2.5 border-b border-border-subtle/50"
            >
              <Ionicons name="pin-outline" size={12} color="#D4764E" />
              <Text className="text-text-primary text-[13px] flex-1 ml-2" numberOfLines={1}>
                {msg.content || 'Pinned media'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#A8937F" />
            </Pressable>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}
