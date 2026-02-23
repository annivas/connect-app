import React, { useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay, differenceInMinutes } from 'date-fns';
import { IconButton } from '../../../src/components/ui/IconButton';
import { MessageBubble } from '../../../src/components/chat/MessageBubble';
import { MessageInput } from '../../../src/components/chat/MessageInput';
import { EventSpaceHeader } from '../../../src/components/groups/EventSpaceHeader';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { Message } from '../../../src/types';

const GROUP_THRESHOLD_MINUTES = 3;

export default function EventSpaceScreen() {
  const router = useRouter();
  const { groupId, eventId } = useLocalSearchParams<{ groupId: string; eventId: string }>();
  const listRef = useRef<FlatList>(null);

  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId!)));
  const event = group?.events?.find((e) => e.id === eventId);
  const messages = useGroupsStore(useShallow((s) => s.getEventSpaceMessages(eventId!)));

  const [activePickerMessageId, setActivePickerMessageId] = useState<string | null>(null);

  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Ensure event space is initialised
  React.useEffect(() => {
    if (groupId && eventId && event && !event.eventSpaceId) {
      useGroupsStore.getState().createEventSpace(groupId, eventId);
    }
  }, [groupId, eventId, event]);

  const handleSend = useCallback((content: string) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId || !eventId) return;
    useGroupsStore.getState().sendEventSpaceMessage(eventId, content, userId);
  }, [eventId]);

  if (!event || !group) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-tertiary">Event not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <View className="flex-1 ml-1">
          <Text className="text-text-primary text-[17px] font-semibold" numberOfLines={1}>
            {event.title}
          </Text>
          <Text className="text-text-tertiary text-xs">{group.name}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={invertedMessages}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={({ item, index }) => {
            const olderMsg = index < invertedMessages.length - 1 ? invertedMessages[index + 1] : null;
            const newerMsg = index > 0 ? invertedMessages[index - 1] : null;

            const showDateDivider = !olderMsg || !isSameDay(olderMsg.timestamp, item.timestamp);

            const isFirstInGroup =
              !olderMsg ||
              olderMsg.senderId !== item.senderId ||
              differenceInMinutes(item.timestamp, olderMsg.timestamp) > GROUP_THRESHOLD_MINUTES ||
              showDateDivider;

            const isLastInGroup =
              !newerMsg ||
              newerMsg.senderId !== item.senderId ||
              differenceInMinutes(newerMsg.timestamp, item.timestamp) > GROUP_THRESHOLD_MINUTES;

            return (
              <MessageBubble
                message={item}
                showDateDivider={showDateDivider}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                showSenderName
                onReact={() => {}}
                activePickerMessageId={activePickerMessageId}
                onOpenPicker={setActivePickerMessageId}
                onClosePicker={() => setActivePickerMessageId(null)}
              />
            );
          }}
          ListFooterComponent={<EventSpaceHeader event={event} />}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 4,
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          onScrollBeginDrag={() => setActivePickerMessageId(null)}
          ListEmptyComponent={
            <View className="items-center py-8">
              <Text className="text-text-tertiary text-sm">
                Start the conversation for this event!
              </Text>
            </View>
          }
        />
        <MessageInput onSend={handleSend} />
      </KeyboardAvoidingView>

      {activePickerMessageId && (
        <Pressable
          onPress={() => setActivePickerMessageId(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
    </SafeAreaView>
  );
}
