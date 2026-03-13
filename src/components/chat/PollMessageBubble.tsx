import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';
import type { PollMessageMetadata } from '../../types';

const POLL_BLUE = '#5B8EC9';

interface Props {
  metadata: PollMessageMetadata;
  isMine: boolean;
  groupId?: string;
  conversationId?: string;
}

export function PollMessageBubble({ metadata, isMine, groupId, conversationId }: Props) {
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  // Read live poll data from the appropriate store
  const livePoll = groupId
    ? useGroupsStore((s) => (s.groupPolls[groupId] ?? []).find((p) => p.id === metadata.pollId))
    : useMessagesStore((s) => {
        const conv = s.conversations.find((c) => c.id === conversationId);
        return (conv?.metadata?.polls ?? []).find((p: any) => p.id === metadata.pollId);
      });

  // Fallback to metadata snapshot if live data unavailable
  const pollOptions = livePoll?.options ?? metadata.options;
  const isClosed = livePoll?.isClosed ?? metadata.isClosed;
  const isMulti = livePoll?.isMultipleChoice ?? metadata.isMultipleChoice;

  const totalVoters = useMemo(() => {
    const allVoterIds = new Set(pollOptions.flatMap((o: any) => o.voterIds));
    return allVoterIds.size;
  }, [pollOptions]);

  const maxVotes = useMemo(() => {
    return Math.max(1, ...pollOptions.map((o: any) => o.voterIds.length));
  }, [pollOptions]);

  const handleVote = useCallback((optionId: string) => {
    if (isClosed) return;
    Haptics.selectionAsync();
    if (groupId) {
      useGroupsStore.getState().votePoll(groupId, metadata.pollId, optionId);
    } else if (conversationId) {
      useMessagesStore.getState().votePoll(conversationId, metadata.pollId, optionId);
    }
  }, [groupId, conversationId, metadata.pollId, isClosed]);

  // Color scheme
  const accentColor = isMine ? '#FFFFFF' : POLL_BLUE;
  const primaryText = isMine ? '#FFFFFF' : '#2D1F14';
  const secondaryText = isMine ? 'rgba(255,255,255,0.6)' : '#7A6355';
  const barBg = isMine ? 'rgba(255,255,255,0.15)' : 'rgba(91,142,201,0.1)';
  const barFill = isMine ? 'rgba(255,255,255,0.4)' : 'rgba(91,142,201,0.25)';
  const barFillVoted = isMine ? 'rgba(255,255,255,0.6)' : 'rgba(91,142,201,0.4)';
  const checkColor = isMine ? '#FFFFFF' : POLL_BLUE;

  return (
    <View style={{ minWidth: 250 }}>
      {/* Header row */}
      <View className="flex-row items-center mb-2">
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(91,142,201,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="stats-chart" size={14} color={accentColor} />
        </View>
        <Text
          style={{ fontSize: 11, fontWeight: '700', color: accentColor, marginLeft: 8, letterSpacing: 1 }}
        >
          POLL
        </Text>
        {isMulti && (
          <View
            style={{
              marginLeft: 'auto',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(91,142,201,0.08)',
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '600', color: secondaryText }}>
              MULTI
            </Text>
          </View>
        )}
      </View>

      {/* Question */}
      <Text
        style={{ fontSize: 16, fontWeight: '600', color: primaryText, marginBottom: 10 }}
        numberOfLines={3}
      >
        {metadata.question}
      </Text>

      {/* Closed banner */}
      {isClosed && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(201,79,79,0.08)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          <Ionicons name="lock-closed" size={11} color={isMine ? 'rgba(255,255,255,0.7)' : '#C94F4F'} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: isMine ? 'rgba(255,255,255,0.7)' : '#C94F4F', marginLeft: 4 }}>
            Poll closed
          </Text>
        </View>
      )}

      {/* Options */}
      {pollOptions.map((option: any, index: number) => {
        const voteCount = option.voterIds.length;
        const userVoted = currentUserId ? option.voterIds.includes(currentUserId) : false;
        const ratio = totalVoters > 0 ? voteCount / maxVotes : 0;

        return (
          <Pressable
            key={option.id ?? index}
            onPress={() => handleVote(option.id)}
            disabled={isClosed}
            style={{
              marginBottom: 6,
              borderRadius: 10,
              overflow: 'hidden',
              opacity: isClosed ? 0.7 : 1,
            }}
          >
            {/* Background bar */}
            <View
              style={{
                backgroundColor: barBg,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                position: 'relative',
              }}
            >
              {/* Fill bar */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${Math.max(ratio * 100, 0)}%`,
                  backgroundColor: userVoted ? barFillVoted : barFill,
                  borderRadius: 10,
                }}
              />
              {/* Content */}
              <View className="flex-row items-center" style={{ zIndex: 1 }}>
                {/* Checkmark or circle */}
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: userVoted ? 0 : 1.5,
                    borderColor: isMine ? 'rgba(255,255,255,0.3)' : 'rgba(91,142,201,0.3)',
                    backgroundColor: userVoted ? (isMine ? 'rgba(255,255,255,0.3)' : 'rgba(91,142,201,0.2)') : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  {userVoted && (
                    <Ionicons name="checkmark" size={13} color={checkColor} />
                  )}
                </View>
                {/* Text */}
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: userVoted ? '600' : '400',
                    color: primaryText,
                  }}
                  numberOfLines={2}
                >
                  {option.text}
                </Text>
                {/* Vote count */}
                {totalVoters > 0 && (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: userVoted ? primaryText : secondaryText,
                      marginLeft: 8,
                    }}
                  >
                    {voteCount}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}

      {/* Footer */}
      <Text
        style={{ fontSize: 11, color: secondaryText, marginTop: 4, textAlign: 'center' }}
      >
        {totalVoters} {totalVoters === 1 ? 'vote' : 'votes'}
      </Text>
    </View>
  );
}
