import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { User, Conversation, Message, ContactInsights, SharedObject } from '../../types';
import { InteractionChart } from './InteractionChart';
import { RichStatusBadge } from '../ui/RichStatusBadge';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface Props {
  user: User;
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  onClose: () => void;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-1 bg-surface rounded-2xl p-3 items-center">
      <Text className="text-text-primary text-lg font-bold" style={{ color }}>{value}</Text>
      <Text className="text-text-tertiary text-[10px] mt-0.5">{label}</Text>
    </View>
  );
}

function SharedMemoryRow({ icon, label, items }: { icon: keyof typeof Ionicons.glyphMap; label: string; items: SharedObject[] }) {
  if (items.length === 0) return null;
  return (
    <View className="flex-row items-center py-2.5 border-b border-border-subtle">
      <Ionicons name={icon} size={16} color="#8B6F5A" />
      <Text className="text-text-primary text-sm ml-2 flex-1">{label}</Text>
      <Text className="text-text-tertiary text-xs">{items.length}</Text>
      <Ionicons name="chevron-forward" size={14} color="#A8937F" />
    </View>
  );
}

export function ContactInsightsSheet({ user, conversation, messages, currentUserId, onClose }: Props) {
  const insights = useMemo<ContactInsights>(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);

    const messagesThisMonth = messages.filter((m) =>
      isWithinInterval(m.timestamp, { start: thisMonth, end: thisMonthEnd })
    ).length;

    // Build monthly counts for last 6 months
    const monthlyMessageCounts = Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const count = messages.filter((m) =>
        isWithinInterval(m.timestamp, { start: monthStart, end: monthEnd })
      ).length;
      return {
        month: format(monthDate, 'MMM'),
        count,
      };
    });

    const sharedObjects = conversation.metadata?.sharedObjects ?? [];
    const sharedPhotos = sharedObjects.filter((o) => o.type === 'photo');
    const sharedPlaces = sharedObjects.filter((o) => o.type === 'place');
    const sharedSongs = sharedObjects.filter((o) => o.type === 'song');

    const ledgerEntries = conversation.metadata?.ledgerEntries ?? [];
    const totalExpenseExchanged = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);
    const currentBalance = ledgerEntries
      .filter((e) => !e.isSettled)
      .reduce((sum, e) => {
        if (e.paidBy === currentUserId) return sum + e.amount;
        return sum - e.amount / e.splitBetween.length;
      }, 0);

    const firstMessage = messages.length > 0
      ? messages.reduce((a, b) => (a.timestamp < b.timestamp ? a : b))
      : null;

    return {
      userId: user.id,
      totalMessages: messages.length,
      firstMessageDate: firstMessage?.timestamp ?? now,
      messagesThisMonth,
      monthlyMessageCounts,
      sharedPhotos,
      sharedPlaces,
      sharedSongs,
      totalExpenseExchanged,
      currentBalance,
      activeReminders: (conversation.metadata?.reminders ?? []).filter((r) => !r.isCompleted),
      notes: conversation.metadata?.notes ?? [],
    };
  }, [user, conversation, messages, currentUserId]);

  return (
    <ScrollView
      className="flex-1 bg-background-primary"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View className="items-center pt-6 pb-4">
        <Image
          source={{ uri: user.avatar }}
          style={{ width: 80, height: 80, borderRadius: 40 }}
        />
        <Text className="text-text-primary text-xl font-bold mt-3">{user.name}</Text>
        <Text className="text-text-tertiary text-sm">{user.username}</Text>
        {user.richStatus && (
          <View className="mt-2">
            <RichStatusBadge richStatus={user.richStatus} size="md" />
          </View>
        )}
      </View>

      {/* Stats row */}
      <View className="flex-row px-4 gap-2.5 mb-5">
        <StatCard
          label="Total messages"
          value={insights.totalMessages > 999 ? `${(insights.totalMessages / 1000).toFixed(1)}k` : `${insights.totalMessages}`}
          color="#D4764E"
        />
        <StatCard
          label="This month"
          value={`${insights.messagesThisMonth}`}
          color="#5B8EC9"
        />
        <StatCard
          label="First chat"
          value={format(insights.firstMessageDate, 'MMM yy')}
          color="#2D9F6F"
        />
      </View>

      {/* Interaction chart */}
      <View className="px-4 mb-5">
        <InteractionChart data={insights.monthlyMessageCounts} />
      </View>

      {/* Financial summary */}
      {insights.totalExpenseExchanged > 0 && (
        <View className="mx-4 mb-5 bg-surface rounded-2xl p-4">
          <Text className="text-text-primary font-bold text-sm mb-2">Finances</Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-text-tertiary text-xs">Total exchanged</Text>
              <Text className="text-text-primary text-base font-bold">
                ${insights.totalExpenseExchanged.toFixed(2)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-text-tertiary text-xs">Current balance</Text>
              <Text
                className="text-base font-bold"
                style={{ color: insights.currentBalance >= 0 ? '#2D9F6F' : '#C94F4F' }}
              >
                {insights.currentBalance >= 0 ? '+' : ''}${insights.currentBalance.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Shared memories */}
      <View className="mx-4 mb-5">
        <Text className="text-text-primary font-bold text-sm mb-2">Shared Memories</Text>
        <View className="bg-surface rounded-2xl px-3.5">
          <SharedMemoryRow icon="images-outline" label="Photos" items={insights.sharedPhotos} />
          <SharedMemoryRow icon="location-outline" label="Places" items={insights.sharedPlaces} />
          <SharedMemoryRow icon="musical-notes-outline" label="Songs" items={insights.sharedSongs} />
        </View>
      </View>

      {/* Active reminders with this person */}
      {insights.activeReminders.length > 0 && (
        <View className="mx-4 mb-5">
          <Text className="text-text-primary font-bold text-sm mb-2">Active Reminders</Text>
          {insights.activeReminders.map((rem) => (
            <View key={rem.id} className="flex-row items-center bg-surface rounded-xl p-3 mb-1.5">
              <View
                className="w-2 h-2 rounded-full mr-3"
                style={{
                  backgroundColor:
                    rem.priority === 'high' ? '#C94F4F' : rem.priority === 'medium' ? '#D4964E' : '#5B8EC9',
                }}
              />
              <Text className="text-text-primary text-sm flex-1">{rem.title}</Text>
              <Text className="text-text-tertiary text-xs">{format(rem.dueDate, 'MMM d')}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {insights.notes.length > 0 && (
        <View className="mx-4 mb-5">
          <Text className="text-text-primary font-bold text-sm mb-2">Notes</Text>
          {insights.notes.slice(0, 3).map((note) => (
            <View key={note.id} className="bg-surface rounded-xl p-3 mb-1.5">
              <View className="flex-row items-center mb-1">
                <View
                  className="w-2.5 h-2.5 rounded-full mr-2"
                  style={{ backgroundColor: note.color }}
                />
                <Text className="text-text-primary text-sm font-medium">{note.title}</Text>
              </View>
              <Text className="text-text-tertiary text-xs" numberOfLines={2}>{note.content}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
