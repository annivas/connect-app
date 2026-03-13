import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { useUserStore } from '../../stores/useUserStore';
import type { ExpenseMessageMetadata } from '../../types';

const EXPENSE_COLOR = '#C2956B';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant',
  transport: 'car',
  entertainment: 'film',
  shopping: 'bag',
  utilities: 'flash',
  rent: 'home',
  travel: 'airplane',
  health: 'medical',
};

interface Props {
  metadata: ExpenseMessageMetadata;
  isMine: boolean;
}

export function ExpenseMessageBubble({ metadata, isMine }: Props) {
  const primaryText = isMine ? '#FFFFFF' : '#2D1F14';
  const secondaryText = isMine ? 'rgba(255,255,255,0.6)' : '#7A6355';
  const accentColor = isMine ? '#FFFFFF' : EXPENSE_COLOR;

  const paidByUser = useUserStore.getState().getUserById(metadata.paidBy);
  const categoryIcon = CATEGORY_ICONS[(metadata.category ?? '').toLowerCase()] ?? 'wallet';
  const perPerson = metadata.splitBetween.length > 0
    ? (metadata.amount / metadata.splitBetween.length).toFixed(2)
    : metadata.amount.toFixed(2);

  return (
    <View style={{ minWidth: 240 }}>
      {/* Header: icon badge + EXPENSE label + settled status */}
      <View className="flex-row items-center mb-2.5">
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : `${EXPENSE_COLOR}18`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={categoryIcon} size={16} color={accentColor} />
        </View>
        <Text
          style={{ fontSize: 11, fontWeight: '700', color: accentColor, marginLeft: 8, letterSpacing: 1, flex: 1 }}
        >
          EXPENSE
        </Text>
        {/* Status pill */}
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
            backgroundColor: metadata.isSettled
              ? (isMine ? 'rgba(45,159,111,0.3)' : 'rgba(45,159,111,0.1)')
              : (isMine ? 'rgba(255,255,255,0.15)' : 'rgba(212,150,78,0.1)'),
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: metadata.isSettled
                ? (isMine ? '#FFFFFF' : '#2D9F6F')
                : (isMine ? 'rgba(255,255,255,0.8)' : '#D4964E'),
              letterSpacing: 0.5,
            }}
          >
            {metadata.isSettled ? 'SETTLED' : 'PENDING'}
          </Text>
        </View>
      </View>

      {/* Hero amount */}
      <View
        style={{
          backgroundColor: isMine ? 'rgba(255,255,255,0.12)' : `${EXPENSE_COLOR}08`,
          borderRadius: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Text
          style={{ fontSize: 28, fontWeight: '800', color: primaryText, letterSpacing: -1 }}
        >
          ${metadata.amount.toFixed(2)}
        </Text>
        <Text
          style={{ fontSize: 14, fontWeight: '600', color: primaryText, marginTop: 2 }}
          numberOfLines={2}
        >
          {metadata.description}
        </Text>
      </View>

      {/* Details section */}
      <View style={{ gap: 6 }}>
        {/* Category pill */}
        {metadata.category && (
          <View className="flex-row items-center">
            <Ionicons name="pricetag" size={12} color={secondaryText} />
            <Text style={{ fontSize: 12, color: secondaryText, marginLeft: 6, textTransform: 'capitalize' }}>
              {metadata.category}
            </Text>
          </View>
        )}

        {/* Paid by row with avatar */}
        <View className="flex-row items-center">
          {paidByUser?.avatar ? (
            <Avatar uri={paidByUser.avatar} size="sm" />
          ) : (
            <Ionicons name="person-circle" size={20} color={secondaryText} />
          )}
          <Text style={{ fontSize: 12, color: secondaryText, marginLeft: 6 }}>
            Paid by <Text style={{ fontWeight: '600', color: primaryText }}>{paidByUser?.name ?? 'Unknown'}</Text>
          </Text>
        </View>

        {/* Split info */}
        <View className="flex-row items-center">
          <Ionicons name="git-branch" size={12} color={secondaryText} />
          <Text style={{ fontSize: 12, color: secondaryText, marginLeft: 6 }}>
            Split {metadata.splitBetween.length} ways · <Text style={{ fontWeight: '600', color: primaryText }}>${perPerson} each</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
