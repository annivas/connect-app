import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SearchBar } from '../../../src/components/ui/SearchBar';
import { Avatar } from '../../../src/components/ui/Avatar';
import { CreateEventModal } from '../../../src/components/chat/CreateEventModal';
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

interface SelectedTarget {
  type: 'conversation' | 'group';
  id: string;
  name: string;
}

export default function AllEventsScreen() {
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const groups = useGroupsStore((s) => s.groups);
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  const [search, setSearch] = useState('');
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventWithSource | null>(null);
  const [showPastSection, setShowPastSection] = useState(true);

  // Aggregate all events
  const allEvents = useMemo(() => {
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

    const groupEvents: EventWithSource[] = groups.flatMap((g) =>
      (g.events ?? []).map((event: GroupEvent) => ({
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
      })),
    );

    return [...convEvents, ...groupEvents];
  }, [conversations, groups, getUserById, currentUserId]);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return allEvents;
    const q = search.toLowerCase();
    return allEvents.filter(
      (e) => e.title.toLowerCase().includes(q) || (e.description?.toLowerCase().includes(q)) || (e.location?.toLowerCase().includes(q)),
    );
  }, [allEvents, search]);

  const now = new Date();
  const upcoming = useMemo(() =>
    filtered.filter((e) => e.startDate >= now).sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [filtered],
  );
  const past = useMemo(() =>
    filtered.filter((e) => e.startDate < now).sort((a, b) => b.startDate.getTime() - a.startDate.getTime()),
    [filtered],
  );

  const handleDelete = (event: EventWithSource) => {
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (event.sourceType === 'conversation') {
            useMessagesStore.getState().deleteEvent(event.sourceId, event.id);
          } else {
            useGroupsStore.getState().deleteGroupEvent(event.sourceId, event.id);
          }
        },
      },
    ]);
  };

  const handleEdit = (event: EventWithSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingEvent(event);
    setSelectedTarget({ type: event.sourceType, id: event.sourceId, name: event.sourceName });
    setShowCreateModal(true);
  };

  const handleLongPress = (event: EventWithSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Event Options', event.title, [
      { text: 'Edit', onPress: () => handleEdit(event) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(event),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async (eventData: { title: string; description?: string; startDate: Date; endDate?: Date; location?: string }) => {
    if (!selectedTarget) return;
    if (selectedTarget.type === 'conversation') {
      useMessagesStore.getState().createEvent(selectedTarget.id, {
        title: eventData.title,
        description: eventData.description,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        location: eventData.location,
        createdBy: currentUserId ?? '',
        createdAt: new Date(),
      });
    } else {
      useGroupsStore.getState().createEvent(selectedTarget.id, {
        title: eventData.title,
        description: eventData.description,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        type: 'general' as any,
      });
    }
    setShowCreateModal(false);
    setSelectedTarget(null);
  };

  const handleUpdate = (eventId: string, updates: Partial<{ title: string; description?: string; startDate: Date; endDate?: Date; location?: string }>) => {
    if (!editingEvent) return;
    if (editingEvent.sourceType === 'conversation') {
      useMessagesStore.getState().updateEvent(editingEvent.sourceId, eventId, updates);
    } else {
      useGroupsStore.getState().updateGroupEvent(editingEvent.sourceId, eventId, updates);
    }
    setEditingEvent(null);
    setShowCreateModal(false);
    setSelectedTarget(null);
  };

  const renderEvent = (item: EventWithSource) => {
    const isPast = item.startDate < now;
    return (
      <Pressable
        onPress={() => handleEdit(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        key={`${item.sourceType}-${item.id}`}
      >
        <Card className="mb-3">
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
            {/* Edit icon */}
            <Pressable onPress={() => handleEdit(item)} hitSlop={8} className="mt-1">
              <Ionicons name="create-outline" size={16} color="#D4764E" />
            </Pressable>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1 flex-1">All Events</Text>
        <Text className="text-text-tertiary text-xs mr-2">{allEvents.length} total</Text>
      </View>

      {/* Search */}
      <View className="px-4 pt-3 pb-1">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search events..." />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No events"
          description={search ? 'No events match your search' : 'Events from your conversations and groups will appear here'}
        />
      ) : (
        <FlatList
          data={upcoming}
          keyExtractor={(item) => `${item.sourceType}-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListHeaderComponent={
            <View>
              {/* Summary pills */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 bg-surface rounded-2xl p-4">
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full bg-accent-primary mr-2" />
                    <Text className="text-text-secondary text-xs font-medium">Upcoming</Text>
                  </View>
                  <Text className="text-text-primary text-lg font-bold">{upcoming.length}</Text>
                </View>
                <View className="flex-1 bg-surface rounded-2xl p-4">
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#A8937F' }} />
                    <Text className="text-text-secondary text-xs font-medium">Past</Text>
                  </View>
                  <Text className="text-text-primary text-lg font-bold">{past.length}</Text>
                </View>
              </View>

              {upcoming.length > 0 && (
                <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                  Upcoming ({upcoming.length})
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => renderEvent(item)}
          ListFooterComponent={
            past.length > 0 ? (
              <View>
                <Pressable
                  onPress={() => setShowPastSection(!showPastSection)}
                  className="flex-row items-center justify-between mt-4 mb-3"
                >
                  <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                    Past ({past.length})
                  </Text>
                  <Ionicons
                    name={showPastSection ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#A8937F"
                  />
                </Pressable>
                {showPastSection && past.map(renderEvent)}
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowTargetPicker(true);
        }}
        className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
        style={{
          shadowColor: '#D4764E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Target Picker Modal */}
      <Modal
        visible={showTargetPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTargetPicker(false)}
      >
        <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
            <Pressable onPress={() => setShowTargetPicker(false)} hitSlop={8}>
              <Text className="text-accent-primary text-[16px]">Cancel</Text>
            </Pressable>
            <Text className="text-text-primary text-[17px] font-semibold">Add Event To</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">Conversations</Text>
            {conversations.map((c) => {
              const otherUserId = c.participants.find((p) => p !== currentUserId);
              const otherUser = otherUserId ? getUserById(otherUserId) : null;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedTarget({ type: 'conversation', id: c.id, name: otherUser?.name ?? 'Unknown' });
                    setShowTargetPicker(false);
                    setShowCreateModal(true);
                  }}
                  className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
                >
                  {otherUser?.avatar ? (
                    <Avatar uri={otherUser.avatar} size="sm" />
                  ) : (
                    <View className="w-8 h-8 rounded-full bg-surface items-center justify-center">
                      <Ionicons name="person" size={16} color="#A8937F" />
                    </View>
                  )}
                  <Text className="text-text-primary text-[15px] font-medium ml-3 flex-1">{otherUser?.name ?? 'Unknown'}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#A8937F" />
                </Pressable>
              );
            })}

            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3 mt-5">Groups</Text>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedTarget({ type: 'group', id: g.id, name: g.name });
                  setShowTargetPicker(false);
                  setShowCreateModal(true);
                }}
                className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
              >
                <View className="w-8 h-8 rounded-full bg-accent-tertiary/20 items-center justify-center">
                  <Ionicons name="people" size={16} color="#5B8EC9" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-text-primary text-[15px] font-medium">{g.name}</Text>
                  <Text className="text-text-tertiary text-xs">{g.members.length} members</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#A8937F" />
              </Pressable>
            ))}
            <View className="h-8" />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create / Edit Event Modal */}
      <CreateEventModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingEvent(null);
          setSelectedTarget(null);
        }}
        editingEvent={editingEvent}
        onSave={handleSave}
        onUpdate={editingEvent ? handleUpdate : undefined}
      />
    </SafeAreaView>
  );
}
