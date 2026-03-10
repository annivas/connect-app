import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { MediaPinsTab } from '../../../src/components/chat/MediaPinsTab';
import { NotesSavedTab } from '../../../src/components/chat/NotesSavedTab';
import { RemindersTab } from '../../../src/components/chat/RemindersTab';
import { LedgerTab } from '../../../src/components/chat/LedgerTab';
import { EventsTab } from '../../../src/components/chat/EventsTab';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { User } from '../../../src/types';

const SECTION_TITLES: Record<string, string> = {
  media: 'Shared Media',
  pins: 'Pinned Messages',
  notes: 'Notes & Saved',
  reminders: 'Reminders',
  ledger: 'Expenses',
  events: 'Events',
};

export default function SectionDetailScreen() {
  const { id, section, channelId } = useLocalSearchParams<{ id: string; section: string; channelId?: string }>();
  const router = useRouter();

  const conversation = useMessagesStore(useShallow((s) => s.getConversationById(id!)));
  const messages = useMessagesStore(useShallow((s) => s.getMessagesByConversationId(id!)));
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  if (!conversation) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Not found</Text>
      </SafeAreaView>
    );
  }

  const otherUserId = conversation.participants.find((uid) => uid !== currentUserId);
  const otherUser = otherUserId ? getUserById(otherUserId) : null;
  const currentUser = useUserStore.getState().currentUser;
  const members = [currentUser, otherUser].filter(Boolean) as User[];
  const activeChannel = channelId ? conversation.channels?.find((c) => c.id === channelId) : null;
  const meta = activeChannel ? activeChannel.metadata : conversation.metadata;

  const renderContent = () => {
    switch (section) {
      case 'media':
      case 'pins':
        return (
          <MediaPinsTab
            pinnedMessageIds={meta?.pinnedMessages ?? []}
            sharedObjects={meta?.sharedObjects ?? []}
            allMessages={messages}
            onAddSharedObject={(obj) => useMessagesStore.getState().addSharedObject(id!, obj, channelId)}
            onDeleteSharedObject={(oid) => useMessagesStore.getState().deleteSharedObject(id!, oid, channelId)}
            contextId={id!}
            contextType="conversation"
          />
        );
      case 'notes':
        return (
          <NotesSavedTab
            notes={meta?.notes ?? []}
            starredMessageIds={meta?.starredMessages ?? []}
            allMessages={messages}
            onCreateNote={(note) => useMessagesStore.getState().createNote(id!, note, channelId)}
            onDeleteNote={(noteId) => useMessagesStore.getState().deleteNote(id!, noteId, channelId)}
            contextId={id!}
            contextType="conversation"
          />
        );
      case 'reminders':
        return (
          <RemindersTab
            reminders={meta?.reminders ?? []}
            onToggleComplete={(rid) => useMessagesStore.getState().toggleReminderComplete(id!, rid, channelId)}
            onCreateReminder={(rem) => useMessagesStore.getState().createReminder(id!, {
              title: rem.title,
              description: rem.description,
              dueDate: rem.dueDate instanceof Date ? rem.dueDate.toISOString() : String(rem.dueDate),
              priority: rem.priority,
            }, channelId)}
            onUpdateReminder={(rid, updates) => useMessagesStore.getState().updateReminder(id!, rid, updates, channelId)}
            onDeleteReminder={(rid) => useMessagesStore.getState().deleteReminder(id!, rid, channelId)}
            members={members}
          />
        );
      case 'ledger':
        return (
          <LedgerTab
            mode="conversation"
            entries={meta?.ledgerEntries ?? []}
            balance={meta?.ledgerBalance ?? 0}
            otherUser={otherUser ?? undefined}
            onSettle={(eid) => useMessagesStore.getState().settleLedgerEntry(id!, eid, channelId)}
            onCreateEntry={(entry) => useMessagesStore.getState().createLedgerEntry(id!, entry, channelId)}
            onUpdateEntry={(eid, updates) => useMessagesStore.getState().updateLedgerEntry(id!, eid, updates, channelId)}
            onDeleteEntry={(eid) => useMessagesStore.getState().deleteLedgerEntry(id!, eid, channelId)}
            members={members}
          />
        );
      case 'events':
        return (
          <EventsTab
            events={meta?.events ?? []}
            onCreateEvent={(event) => useMessagesStore.getState().createEvent(id!, event, channelId)}
            onUpdateEvent={(eventId, updates) => useMessagesStore.getState().updateEvent(id!, eventId, updates, channelId)}
            onDeleteEvent={(eventId) => useMessagesStore.getState().deleteEvent(id!, eventId, channelId)}
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
        <Text className="flex-1 text-text-primary text-[17px] font-semibold ml-1" numberOfLines={1}>
          {SECTION_TITLES[section ?? ''] ?? 'Details'}
          {activeChannel ? ` · ${activeChannel.name}` : ''}
        </Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}
