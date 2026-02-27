import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { User, Conversation } from '../../types';
import { differenceInDays } from 'date-fns';

interface RelationshipCard {
  user: User;
  daysSinceContact: number;
  conversationId: string;
}

interface Props {
  users: User[];
  conversations: Conversation[];
  currentUserId: string;
  onPressContact: (conversationId: string) => void;
}

function getUrgencyColor(days: number): string {
  if (days >= 21) return '#C94F4F';
  if (days >= 14) return '#D4964E';
  return '#5B8EC9';
}

function getUrgencyLabel(days: number): string {
  if (days >= 30) return `${Math.floor(days / 7)}w ago`;
  if (days >= 7) return `${Math.floor(days / 7)}w ago`;
  return `${days}d ago`;
}

export function RelationshipPulse({ users, conversations, currentUserId, onPressContact }: Props) {
  const now = new Date();

  const cards: RelationshipCard[] = conversations
    .filter((c) => c.type === 'individual' && !c.isArchived)
    .map((conv) => {
      const otherUserId = conv.participants.find((p) => p !== currentUserId);
      const user = users.find((u) => u.id === otherUserId);
      if (!user) return null;

      const lastMessageDate = conv.lastMessage?.timestamp || conv.updatedAt;
      const daysSince = differenceInDays(now, lastMessageDate);

      return {
        user,
        daysSinceContact: daysSince,
        conversationId: conv.id,
      };
    })
    .filter((card): card is RelationshipCard => card !== null && card.daysSinceContact >= 7)
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact)
    .slice(0, 6);

  if (cards.length === 0) return null;

  return (
    <View className="mb-5">
      <View className="flex-row items-center px-4 mb-3">
        <Ionicons name="heart-outline" size={18} color="#D4764E" />
        <Text className="text-text-primary font-bold text-base ml-2">Relationship Pulse</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {cards.map((card) => {
          const color = getUrgencyColor(card.daysSinceContact);
          return (
            <Pressable
              key={card.user.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPressContact(card.conversationId);
              }}
              className="active:opacity-80"
            >
              <View className="bg-surface rounded-2xl p-3.5 items-center" style={{ width: 110 }}>
                <View className="relative mb-2">
                  <Image
                    source={{ uri: card.user.avatar }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                  <View
                    className="absolute -bottom-0.5 -right-0.5 rounded-full px-1.5 py-0.5"
                    style={{ backgroundColor: color }}
                  >
                    <Text className="text-white text-[9px] font-bold">
                      {getUrgencyLabel(card.daysSinceContact)}
                    </Text>
                  </View>
                </View>
                <Text className="text-text-primary text-xs font-medium text-center" numberOfLines={1}>
                  {card.user.name}
                </Text>
                {card.user.richStatus?.emoji && (
                  <Text className="text-xs mt-0.5">{card.user.richStatus.emoji}</Text>
                )}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPressContact(card.conversationId);
                  }}
                  className="bg-accent-primary rounded-full px-3 py-1 mt-2 active:opacity-80"
                >
                  <Text className="text-white text-[10px] font-semibold">Say hi</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
