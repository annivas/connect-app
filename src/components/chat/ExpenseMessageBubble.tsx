import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../stores/useUserStore';
import type { ExpenseMessageMetadata } from '../../types';

interface Props {
  metadata: ExpenseMessageMetadata;
  isMine: boolean;
}

export function ExpenseMessageBubble({ metadata, isMine }: Props) {
  const accentText = isMine ? 'text-white' : 'text-text-primary';
  const secondaryText = isMine ? 'text-white/60' : 'text-text-tertiary';
  const labelColor = isMine ? '#FFFFFF' : '#D4764E';

  const paidByUser = useUserStore.getState().getUserById(metadata.paidBy);

  return (
    <View style={{ minWidth: 220 }}>
      {/* Header */}
      <View className="flex-row items-center mb-1.5">
        <Ionicons name="wallet-outline" size={14} color={labelColor} />
        <Text
          className={`text-[11px] font-semibold ml-1 tracking-wider ${
            isMine ? 'text-white/80' : 'text-accent-primary'
          }`}
        >
          EXPENSE
        </Text>
      </View>

      {/* Description + Amount */}
      <View className="flex-row items-start justify-between">
        <Text
          className={`text-[15px] font-semibold flex-1 mr-3 ${accentText}`}
          numberOfLines={2}
        >
          {metadata.description}
        </Text>
        <Text className={`text-[18px] font-bold ${accentText}`}>
          ${metadata.amount.toFixed(2)}
        </Text>
      </View>

      {/* Category */}
      {metadata.category ? (
        <Text className={`text-[12px] mt-0.5 ${secondaryText}`}>
          {metadata.category}
        </Text>
      ) : null}

      {/* Paid by */}
      <View className="flex-row items-center mt-1.5">
        <Ionicons
          name="person-outline"
          size={12}
          color={isMine ? 'rgba(255,255,255,0.5)' : '#A8937F'}
        />
        <Text className={`text-[12px] ml-1 ${secondaryText}`}>
          Paid by {paidByUser?.name ?? 'Unknown'}
        </Text>
      </View>

      {/* Split info */}
      <Text className={`text-[11px] mt-0.5 ${secondaryText}`}>
        Split between {metadata.splitBetween.length} {metadata.splitBetween.length === 1 ? 'person' : 'people'}
      </Text>
    </View>
  );
}
