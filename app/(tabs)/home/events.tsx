import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { GroupEvent, ConversationEvent } from '../../../src/types';

interface EventWithSource {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  sourceId: string;
  sourceName: string;
  sourceType: 'conversation' | 'group';
  attendeeCount?: number;
}

export default function AllEventsScreen() {
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const groups = useGroupsStore((s) => s.groups);
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  // Conversation events
  const convEvents: EventWithSource[] = conversations.flatMap((c) => {
    const otherUserId = c.participants.find((p) => p !== currentUserId);
    const otherUser = otherUserId ? getUserById(otherUserId) : null;
    const name = otherUser?.name ?? 'Unknown';
    return (c.metadata?.events ?? []).map((event: ConversationEvent) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      sourceId: c.id,
      sourceName: name,
      sourceType: 'conversation' as const,
    }));
  });

  // Group events
  const groupEvents: EventWithSource[] = groups.flatMap((g) => {
    return (g.events ?? []).map((event: GroupEvent) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location?.name,
      sourceId: g.id,
      sourceName: g.name,
      sourceType: 'group' as const,
      attendeeCount: event.attendees?.length,
    }));
  });

  const allEvents = [...convEvents, ...groupEvents];

  // Sort by start date, upcoming first
  const sorted = [...allEvents].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const now = new Date();
  const upcoming = sorted.filter((e) => e.startDate >= now);
  const past = sorted.filter((e) => e.startDate < now).reverse();

  const handleEventPress = (event: EventWithSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (event.sourceType === 'conversation') {
      router.push({
        pathname: '/(tabs)/messages/section-detail',
        params: { id: event.sourceId, section: 'events' },
      });
    } else {
      router.push({
        pathname: '/(tabs)/groups/section-detail',
        params: { id: event.sourceId, section: 'events' },
      } as any);
    }
  };

  const renderEvent = (item: EventWithSource) => {
    const isPast = item.startDate < now;
    return (
      <Card className="mb-3" onPress={() => handleEventPress(item)}>
        <View className="flex-row items-start">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: isPast ? '#A8937F20' : '#D4764E20' }}
          >
            <Ionicons
              name="calendar"
              size={20}
              color={isPast ? '#A8937F' : '#D4764E'}
            />
          </View>
          <View className="flex-1">
            <Text className={`text-[15px] font-medium ${isPast ? 'text-text-tertiary' : 'text-text-primary'}`}>
              {item.title}
            </Text>
            {item.description && (
              <Text className="text-text-tertiary text-xs mt-0.5" numberOfLines={1}>
                {item.description}
              </Text>
            )}
            <View className="flex-row items-center mt-1.5">
              <Ionicons name="time-outline" size={11} color="#A8937F" />
              <Text className="text-text-tertiary text-[11px] ml-1">
                {format(item.startDate, 'MMM d, yyyy · HH:mm')}
              </Text>
            </View>
            {item.location && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="location-outline" size={11} color="#A8937F" />
                <Text className="text-text-tertiary text-[11px] ml-1">{item.location}</Text>
              </View>
            )}
            <View className="flex-row items-center mt-1">
              <Ionicons
                name={item.sourceType === 'group' ? 'people-outline' : 'person-outline'}
                size={11}
                color="#A8937F"
              />
              <Text className="text-text-tertiary text-[11px] ml-1">
                {item.sourceName}
                {item.attendeeCount ? ` · ${item.attendeeCount} attendees` : ''}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">All Events</Text>
      </View>

      {allEvents.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No events"
          description="Events from your conversations and groups will appear here"
        />
      ) : (
        <FlatList
          data={[...upcoming, ...past]}
          keyExtractor={(item) => `${item.sourceType}-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListHeaderComponent={
            upcoming.length > 0 ? (
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                Upcoming ({upcoming.length})
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => {
            // Add "Past" section header
            if (index === upcoming.length && past.length > 0) {
              return (
                <View>
                  <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3 mt-4">
                    Past ({past.length})
                  </Text>
                  {renderEvent(item)}
                </View>
              );
            }
            return renderEvent(item);
          }}
        />
      )}
    </SafeAreaView>
  );
}
