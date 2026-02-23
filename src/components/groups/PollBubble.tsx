import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../../stores/useUserStore';
import type { Poll } from '../../types';

interface Props {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  onClose?: (pollId: string) => void;
}

export function PollBubble({ poll, onVote, onClose }: Props) {
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const getUserById = useUserStore((s) => s.getUserById);
  const creator = getUserById(poll.createdBy);
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voterIds.length, 0);
  const isCreator = currentUserId === poll.createdBy;

  const handleVote = (optionId: string) => {
    if (poll.isClosed) return;
    Haptics.selectionAsync();
    onVote(poll.id, optionId);
  };

  return (
    <View className="bg-surface rounded-2xl mx-4 mb-3 overflow-hidden">
      {/* Header */}
      <View className="px-4 pt-3.5 pb-2">
        <View className="flex-row items-center mb-1">
          <Ionicons name="bar-chart-outline" size={16} color="#D4764E" />
          <Text className="text-accent-primary text-[12px] font-semibold ml-1.5 uppercase tracking-wide">
            Poll
          </Text>
          {poll.isClosed && (
            <View className="ml-2 bg-surface-elevated px-2 py-0.5 rounded-full">
              <Text className="text-text-tertiary text-[10px] font-semibold">Closed</Text>
            </View>
          )}
        </View>
        <Text className="text-text-primary text-[16px] font-semibold">
          {poll.question}
        </Text>
        {poll.isMultipleChoice && (
          <Text className="text-text-tertiary text-[11px] mt-0.5">
            Select all that apply
          </Text>
        )}
      </View>

      {/* Options */}
      <View className="px-4 pb-2">
        {poll.options.map((option) => {
          const voteCount = option.voterIds.length;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const hasVoted = currentUserId ? option.voterIds.includes(currentUserId) : false;

          return (
            <Pressable
              key={option.id}
              onPress={() => handleVote(option.id)}
              disabled={poll.isClosed}
              className="mb-2"
            >
              <View className="relative bg-surface-elevated rounded-xl overflow-hidden">
                {/* Progress bar background */}
                <View
                  className="absolute inset-y-0 left-0 rounded-xl"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: hasVoted ? 'rgba(212, 118, 78, 0.2)' : 'rgba(168, 147, 127, 0.1)',
                  }}
                />

                {/* Option content */}
                <View className="flex-row items-center px-3.5 py-2.5 relative">
                  {/* Checkbox/radio indicator */}
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center mr-2.5"
                    style={{
                      borderWidth: hasVoted ? 0 : 1.5,
                      borderColor: '#A8937F',
                      backgroundColor: hasVoted ? '#D4764E' : 'transparent',
                    }}
                  >
                    {hasVoted && (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    )}
                  </View>

                  <Text
                    className={`flex-1 text-[14px] ${
                      hasVoted ? 'text-text-primary font-semibold' : 'text-text-secondary'
                    }`}
                  >
                    {option.text}
                  </Text>

                  <Text className="text-text-tertiary text-[12px] font-medium ml-2">
                    {voteCount > 0 ? `${Math.round(percentage)}%` : ''}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between px-4 py-2.5 border-t border-border-subtle">
        <Text className="text-text-tertiary text-[12px]">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · by {creator?.name ?? 'Unknown'}
        </Text>
        {isCreator && !poll.isClosed && onClose && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose(poll.id);
            }}
          >
            <Text className="text-status-error text-[12px] font-medium">
              Close Poll
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
