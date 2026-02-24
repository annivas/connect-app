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
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { User } from '../../../src/types';

const SECTION_TITLES: Record<string, string> = {
  media: 'Shared Media',
  pins: 'Pinned Messages',
  notes: 'Notes & Saved',
  reminders: 'Reminders',
  ledger: 'Expenses',
};

export default function SectionDetailScreen() {
  const { id, section } = useLocalSearchParams<{ id: string; section: string }>();
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

  const renderContent = () => {
    switch (section) {
      case 'media':
      case 'pins':
        return (
          <MediaPinsTab
            pinnedMessageIds={conversation.metadata?.pinnedMessages ?? []}
            sharedObjects={conversation.metadata?.sharedObjects ?? []}
            allMessages={messages}
            contextId={id!}
            contextType="conversation"
          />
        );
      case 'notes':
        return (
          <NotesSavedTab
            notes={conversation.metadata?.notes ?? []}
            starredMessageIds={conversation.metadata?.starredMessages ?? []}
            allMessages={messages}
            onCreateNote={(note) => useMessagesStore.getState().createNote(id!, note)}
          />
        );
      case 'reminders':
        return (
          <RemindersTab
            reminders={conversation.metadata?.reminders ?? []}
            onToggleComplete={(rid) => useMessagesStore.getState().toggleReminderComplete(id!, rid)}
            onCreateReminder={(rem) => useMessagesStore.getState().createReminder(id!, {
              title: rem.title,
              description: rem.description,
              dueDate: rem.dueDate instanceof Date ? rem.dueDate.toISOString() : String(rem.dueDate),
              priority: rem.priority,
            })}
          />
        );
      case 'ledger':
        return (
          <LedgerTab
            mode="conversation"
            entries={conversation.metadata?.ledgerEntries ?? []}
            balance={conversation.metadata?.ledgerBalance ?? 0}
            otherUser={otherUser ?? undefined}
            onSettle={(eid) => useMessagesStore.getState().settleLedgerEntry(id!, eid)}
            onCreateEntry={(entry) => useMessagesStore.getState().createLedgerEntry(id!, entry)}
            members={members}
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
