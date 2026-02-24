import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { MediaPinsTab } from '../../../src/components/chat/MediaPinsTab';
import { NotesSavedTab } from '../../../src/components/chat/NotesSavedTab';
import { RemindersTab } from '../../../src/components/chat/RemindersTab';
import { LedgerTab } from '../../../src/components/chat/LedgerTab';
import { PollBubble } from '../../../src/components/groups/PollBubble';
import { ItineraryItemModal } from '../../../src/components/groups/ItineraryItemModal';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { RSVPStatus, ItineraryItem, User } from '../../../src/types';

const SECTION_TITLES: Record<string, string> = {
  events: 'Events',
  polls: 'Polls',
  trip: 'Trip Itinerary',
  media: 'Shared Media',
  pins: 'Pinned Messages',
  notes: 'Notes & Saved',
  reminders: 'Reminders',
  ledger: 'Expenses',
};

// ─── Inline sub-components for group-specific sections ───

const RSVP_OPTIONS: { status: RSVPStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: 'going', label: 'Going', icon: 'checkmark-circle-outline' },
  { status: 'maybe', label: 'Maybe', icon: 'help-circle-outline' },
  { status: 'declined', label: "Can't go", icon: 'close-circle-outline' },
];

function EventsSection({ groupId }: { groupId: string }) {
  const router = useRouter();
  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const events = group?.events ?? [];

  const upcoming = events.filter((e) => !isPast(e.startDate)).sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );
  const past = events.filter((e) => isPast(e.startDate)).sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime(),
  );

  const handleRSVP = (eventId: string, status: RSVPStatus) => {
    Haptics.selectionAsync();
    useGroupsStore.getState().updateRSVP(groupId, eventId, status);
  };

  const handleOpenEventSpace = (eventId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/groups/event-space',
      params: { groupId, eventId },
    });
  };

  if (events.length === 0) {
    return <EmptyState icon="calendar-outline" title="No events" description="Events created in this group will appear here" />;
  }

  return (
    <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
      {upcoming.length > 0 && (
        <>
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-2 font-semibold">Upcoming</Text>
          {upcoming.map((event) => {
            const goingCount = event.attendees.filter((a) => a.status === 'going').length;
            const maybeCount = event.attendees.filter((a) => a.status === 'maybe').length;
            const myStatus: RSVPStatus = event.attendees.find((a) => a.userId === currentUserId)?.status ?? 'pending';

            return (
              <Card key={event.id} className="mb-3">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="text-text-primary text-[16px] font-semibold">{event.title}</Text>
                    {event.description && <Text className="text-text-secondary text-sm mt-1">{event.description}</Text>}
                  </View>
                  <View className="bg-accent-primary/20 rounded-lg px-3 py-1.5">
                    <Text className="text-accent-primary text-xs font-semibold">{format(event.startDate, 'MMM d')}</Text>
                  </View>
                </View>
                <View className="flex-row items-center mt-2">
                  <Ionicons name="time-outline" size={14} color="#A8937F" />
                  <Text className="text-text-tertiary text-xs ml-1">
                    {format(event.startDate, 'HH:mm')}{event.endDate && ` - ${format(event.endDate, 'HH:mm')}`}
                  </Text>
                  <View className="flex-row items-center ml-4">
                    <Ionicons name="checkmark-circle" size={14} color="#2D9F6F" />
                    <Text className="text-text-tertiary text-xs ml-1">{goingCount} going</Text>
                  </View>
                  {maybeCount > 0 && (
                    <View className="flex-row items-center ml-3">
                      <Ionicons name="help-circle" size={14} color="#D4964E" />
                      <Text className="text-text-tertiary text-xs ml-1">{maybeCount} maybe</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row gap-2 mt-3">
                  {RSVP_OPTIONS.map((option) => {
                    const isSelected = myStatus === option.status;
                    const selectedStyles: Record<RSVPStatus, { bg: string; text: string; iconColor: string }> = {
                      going: { bg: 'bg-accent-primary', text: 'text-white', iconColor: '#FFFFFF' },
                      maybe: { bg: 'bg-status-warning/20', text: 'text-status-warning', iconColor: '#D4964E' },
                      declined: { bg: 'bg-surface-elevated', text: 'text-status-error', iconColor: '#C94F4F' },
                      pending: { bg: 'bg-surface-elevated', text: 'text-text-secondary', iconColor: '#7A6355' },
                    };
                    const style = isSelected ? selectedStyles[option.status] : { bg: 'bg-surface-elevated', text: 'text-text-secondary', iconColor: '#7A6355' };
                    return (
                      <Pressable key={option.status} onPress={() => handleRSVP(event.id, option.status)} className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${style.bg}`}>
                        <Ionicons name={option.icon} size={16} color={style.iconColor} />
                        <Text className={`text-xs font-medium ml-1.5 ${style.text}`}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={() => handleOpenEventSpace(event.id)} className="flex-row items-center justify-center mt-3 pt-3 border-t border-border-subtle active:opacity-70">
                  <Ionicons name="chatbubbles-outline" size={16} color="#D4764E" />
                  <Text className="text-accent-primary text-sm font-medium ml-1.5">{event.eventSpaceId ? 'Open Chat' : 'Start Chat'}</Text>
                </Pressable>
              </Card>
            );
          })}
        </>
      )}
      {past.length > 0 && (
        <>
          <Text className="text-text-tertiary text-xs uppercase tracking-wide mb-2 mt-4 font-semibold">Memories</Text>
          {past.map((event) => {
            const goingCount = event.attendees.filter((a) => a.status === 'going').length;
            return (
              <Card key={event.id} className="mb-3" style={{ opacity: 0.75 }}>
                <View className="flex-row items-start justify-between mb-1">
                  <Text className="text-text-secondary text-[15px] font-semibold flex-1 mr-3">{event.title}</Text>
                  <Text className="text-text-tertiary text-xs">{format(event.startDate, 'MMM d')}</Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="people" size={13} color="#A8937F" />
                  <Text className="text-text-tertiary text-xs ml-1">{goingCount} went</Text>
                </View>
                {event.eventSpaceId && (
                  <Pressable onPress={() => handleOpenEventSpace(event.id)} className="flex-row items-center justify-center mt-2.5 pt-2.5 border-t border-border-subtle active:opacity-70">
                    <Ionicons name="chatbubbles-outline" size={14} color="#A8937F" />
                    <Text className="text-text-tertiary text-xs font-medium ml-1.5">View Chat History</Text>
                  </Pressable>
                )}
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

function PollsSection({ groupId }: { groupId: string }) {
  const polls = useGroupsStore(useShallow((s) => s.groupPolls[groupId] ?? []));

  if (polls.length === 0) {
    return <EmptyState icon="bar-chart-outline" title="No polls" description="Create a poll to get the group's opinion" />;
  }

  const sorted = [...polls].sort((a, b) => {
    if (a.isClosed && !b.isClosed) return 1;
    if (!a.isClosed && b.isClosed) return -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <ScrollView className="flex-1 pt-3" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
      {sorted.map((poll) => (
        <PollBubble
          key={poll.id}
          poll={poll}
          onVote={(pollId, optionId) => useGroupsStore.getState().votePoll(groupId, pollId, optionId)}
          onClose={(pollId) => useGroupsStore.getState().closePoll(groupId, pollId)}
        />
      ))}
    </ScrollView>
  );
}

function TripSection({ groupId }: { groupId: string }) {
  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const trip = group?.trip;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);

  if (!trip) {
    return <EmptyState icon="airplane-outline" title="No trip planned" description="Create a trip itinerary for this group" />;
  }

  const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    activity: 'flag', accommodation: 'bed', transport: 'car', meal: 'restaurant', other: 'ellipse',
  };

  const totalDays = Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return (
    <View className="flex-1 bg-background-primary">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="mb-4">
          <Text className="text-text-primary text-xl font-bold">{trip.destination}</Text>
          <Text className="text-text-secondary text-sm mt-1">
            {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
          </Text>
        </View>
        {trip.itinerary.map((item, index) => {
          const showDayHeader = index === 0 || trip.itinerary[index - 1].day !== item.day;
          return (
            <View key={item.id}>
              {showDayHeader && <Text className="text-accent-primary text-sm font-bold mt-4 mb-2">Day {item.day}</Text>}
              <Pressable onLongPress={() => { setEditingItem(item); setModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} className="flex-row mb-3">
                <View className="items-center mr-3">
                  <View className="w-8 h-8 rounded-full bg-surface-elevated items-center justify-center">
                    <Ionicons name={typeIcons[item.type] || 'ellipse'} size={16} color="#7A6355" />
                  </View>
                  {index < trip.itinerary.length - 1 && <View className="w-[2px] flex-1 bg-border-subtle mt-1" />}
                </View>
                <View className="flex-1 pb-2">
                  <View className="flex-row items-center">
                    {item.time && <Text className="text-text-tertiary text-xs mr-2">{item.time}</Text>}
                    <Text className="text-text-primary font-medium flex-1">{item.title}</Text>
                    {item.cost != null && <Text className="text-text-secondary text-xs">${item.cost}</Text>}
                  </View>
                  {item.description && <Text className="text-text-secondary text-xs mt-0.5">{item.description}</Text>}
                </View>
              </Pressable>
            </View>
          );
        })}
        {trip.itinerary.length === 0 && (
          <View className="py-8 items-center">
            <Ionicons name="map-outline" size={32} color="#A8937F" />
            <Text className="text-text-tertiary text-sm mt-2">No items yet — tap + to add one</Text>
          </View>
        )}
      </ScrollView>
      <Pressable
        onPress={() => { setEditingItem(null); setModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
        style={{ shadowColor: '#D4764E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
      <ItineraryItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={(item) => { editingItem ? useGroupsStore.getState().editItineraryItem(groupId, item.id, item) : useGroupsStore.getState().addItineraryItem(groupId, item); }}
        onDelete={editingItem ? (id) => useGroupsStore.getState().deleteItineraryItem(groupId, id) : undefined}
        existingItem={editingItem}
        totalDays={totalDays}
      />
    </View>
  );
}

// ─── Main screen ───

export default function GroupSectionDetailScreen() {
  const { id, section } = useLocalSearchParams<{ id: string; section: string }>();
  const router = useRouter();

  const group = useGroupsStore(useShallow((s) => s.getGroupById(id!)));
  const groupMessages = useGroupsStore(useShallow((s) => s.getGroupMessages(id!)));
  const getUserById = useUserStore((s) => s.getUserById);

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Not found</Text>
      </SafeAreaView>
    );
  }

  const memberUsers: User[] = group.members
    .map((memberId) => getUserById(memberId))
    .filter((u): u is User => u != null);

  const renderContent = () => {
    switch (section) {
      case 'events':
        return <EventsSection groupId={id!} />;
      case 'polls':
        return <PollsSection groupId={id!} />;
      case 'trip':
        return <TripSection groupId={id!} />;
      case 'media':
      case 'pins':
        return (
          <MediaPinsTab
            pinnedMessageIds={group.metadata?.pinnedMessages ?? []}
            sharedObjects={group.metadata?.sharedObjects ?? []}
            allMessages={groupMessages}
            onAddSharedObject={(obj) => useGroupsStore.getState().addGroupSharedObject(id!, obj)}
            contextId={id!}
            contextType="group"
          />
        );
      case 'notes':
        return (
          <NotesSavedTab
            notes={group.metadata?.notes ?? []}
            starredMessageIds={group.metadata?.starredMessages ?? []}
            allMessages={groupMessages}
            onCreateNote={(note) => useGroupsStore.getState().createGroupNote(id!, note)}
          />
        );
      case 'reminders':
        return (
          <RemindersTab
            reminders={group.metadata?.reminders ?? []}
            onToggleComplete={(rid) => useGroupsStore.getState().toggleGroupReminderComplete(id!, rid)}
            onCreateReminder={(rem) => useGroupsStore.getState().createGroupReminder(id!, rem)}
            members={memberUsers}
          />
        );
      case 'ledger':
        return (
          <LedgerTab
            mode="group"
            entries={group.metadata?.ledgerEntries ?? []}
            pairBalances={useGroupsStore.getState().getGroupPairBalances(id!)}
            members={memberUsers}
            onSettle={(eid) => useGroupsStore.getState().settleGroupLedgerEntry(id!, eid)}
            onCreateEntry={(entry) => useGroupsStore.getState().createGroupLedgerEntry(id!, entry)}
          />
        );
      default:
        return (
          <View className="flex-1 items-center justify-center">
            <Text className="text-text-secondary">Section not found</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="flex-1 text-text-primary text-[17px] font-semibold ml-1">
          {SECTION_TITLES[section ?? ''] ?? 'Details'}
        </Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}
