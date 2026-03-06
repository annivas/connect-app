import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import type { AIMessage, AIAgent } from '../../types';

interface Props {
  message: AIMessage;
  agent: AIAgent;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export function AIMessageBubble({ message, agent, isFirstInGroup = true, isLastInGroup = true }: Props) {
  const isMine = !message.isFromAI;

  const getBubbleRadius = () => {
    const big = 20;
    const small = 6;
    if (isMine) {
      return {
        borderTopLeftRadius: big,
        borderTopRightRadius: isFirstInGroup ? big : small,
        borderBottomLeftRadius: big,
        borderBottomRightRadius: isLastInGroup ? big : small,
      };
    }
    return {
      borderTopLeftRadius: isFirstInGroup ? big : small,
      borderTopRightRadius: big,
      borderBottomLeftRadius: isLastInGroup ? big : small,
      borderBottomRightRadius: big,
    };
  };

  return (
    <View className={`${isLastInGroup ? 'mb-3' : 'mb-0.5'}`}>
      <View className={`flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
        {/* AI avatar */}
        {!isMine && (
          <View style={{ width: 28, marginRight: 8 }}>
            {isLastInGroup && (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: agent.color,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Image
                  source={{ uri: agent.avatar }}
                  style={{ width: 18, height: 18 }}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}
          </View>
        )}

        {/* Bubble */}
        <View className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
          {/* Agent name label for first message in group */}
          {!isMine && isFirstInGroup && (
            <Text style={{ color: agent.color }} className="text-[11px] font-semibold mb-0.5 ml-1">
              {agent.name}
            </Text>
          )}

          <View
            style={getBubbleRadius()}
            className={`px-3.5 py-2.5 ${
              isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
            }`}
          >
            {/* Message content — handle markdown-like formatting */}
            <Text
              className={`text-[15px] leading-[22px] ${
                isMine ? 'text-white' : 'text-text-primary'
              }`}
            >
              {formatMessageContent(message.content, isMine)}
            </Text>

            {/* Timestamp */}
            {isLastInGroup && (
              <View className={`flex-row items-center mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <Text className={`text-[10px] ${isMine ? 'text-white/50' : 'text-text-tertiary'}`}>
                  {format(message.timestamp, 'h:mm a')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// Simple markdown-like formatting for AI responses
function formatMessageContent(content: string, isMine: boolean): string {
  // Strip markdown bold markers for display (React Native Text doesn't support inline bold easily)
  return content.replace(/\*\*/g, '');
}
