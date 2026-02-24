import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay, isToday, differenceInMinutes } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { MessageBubble } from '../chat/MessageBubble';
import { MessageInput } from '../chat/MessageInput';
import { MessageContextMenu } from '../chat/MessageContextMenu';
import { ForwardModal } from '../chat/ForwardModal';
import { PinnedMessageBanner } from '../chat/PinnedMessageBanner';
import { DisappearingMessagesBanner } from '../chat/DisappearingMessagesBanner';
import { ScheduleMessageSheet } from '../chat/ScheduleMessageSheet';
import { AttachmentSheet } from '../chat/AttachmentSheet';
import { UnreadJumpButton } from '../chat/UnreadJumpButton';
import { TypingIndicator } from '../chat/TypingIndicator';
import { CallHistoryEntry } from '../call/CallHistoryEntry';
import { EventSuggestionChip } from './EventSuggestionChip';
import { CreateEventModal } from './CreateEventModal';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import { useCallStore } from '../../stores/useCallStore';
import { getImageGroup } from '../../utils/imageGrouping';
import { detectEventHint } from '../../utils/eventDetection';
import type { Message, GroupEvent, CallEntry, DisappearingDuration } from '../../types';

/**
 * Standalone "Today" divider — rendered at the visual top of the inverted list.
 */
function TodayDivider() {
  return (
    <View className="flex-row items-center my-4 px-2">
      <View className="flex-1 h-px bg-border-subtle" />
      <Text className="text-text-tertiary text-[11px] mx-3 font-medium tracking-wide uppercase">
        Today
      </Text>
      <View className="flex-1 h-px bg-border-subtle" />
    </View>
  );
}

/**
 * Dynamically measure the Y position of the GroupChatTab container to get an
 * accurate keyboardVerticalOffset. Same approach as ChatTab.
 */
function useKeyboardOffset() {
  const containerRef = useRef<View>(null);
  const [offset, setOffset] = useState(Platform.OS === 'ios' ? 0 : 0);

  const onLayout = useCallback(() => {
    if (Platform.OS !== 'ios') return;
    containerRef.current?.measureInWindow((_x, y) => {
      if (y > 0) setOffset(y);
    });
  }, []);

  return { containerRef, offset, onLayout };
}

interface Props {
  groupId: string;
  highlightText?: string;
  matchingMessageIds?: Set<string>;
}

// Messages within this window from the same sender are grouped (no avatar/name repeated)
const GROUP_THRESHOLD_MINUTES = 3;

export function GroupChatTab({ groupId, highlightText, matchingMessageIds }: Props) {
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const { containerRef, offset: kbOffset, onLayout } = useKeyboardOffset();

  const messages = useGroupsStore(useShallow((s) => s.getGroupMessages(groupId)));
  const sendGroupMessage = useGroupsStore((s) => s.sendGroupMessage);
  const retryGroupMessage = useGroupsStore((s) => s.retryGroupMessage);
  const hasMore = useGroupsStore((s) => s.hasMoreMessages[groupId] ?? false);
  const isLoadingMore = useGroupsStore((s) => s.loadingMessages.has(groupId));
  const replyingTo = useGroupsStore((s) => s.replyingTo[groupId] ?? null);

  // Context menu state — replaces old reaction picker
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);

  // Event suggestion state
  const [dismissedHintIds, setDismissedHintIds] = useState<Set<string>>(new Set());
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [suggestedEventTitle, setSuggestedEventTitle] = useState<string | undefined>();

  // Forward modal
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  // Attachment sheet
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);

  // Schedule message
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [pendingScheduleText, setPendingScheduleText] = useState('');

  // Unread jump button
  const groupUnreadCount = useGroupsStore(
    useShallow((s) => s.groups.find((g) => g.id === groupId)?.unreadCount ?? 0),
  ) as number;
  const [showUnreadJump, setShowUnreadJump] = useState(false);

  // Disappearing messages
  const disappearingDuration = useGroupsStore(
    useShallow((s) => s.groups.find((g) => g.id === groupId)?.disappearingDuration ?? 'off'),
  ) as DisappearingDuration;

  // Pinned messages
  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned),
    [messages],
  );

  // Typing users
  const typingUserIds = useGroupsStore(
    useShallow((s) => s.typingUsers[groupId] ?? []),
  );

  // Call history for this group
  const callHistory = useCallStore(
    useShallow((s) => s.callHistory.filter((c) => c.groupId === groupId)),
  );

  // Merge messages and call history into a unified timeline
  type TimelineItem =
    | { kind: 'message'; data: Message }
    | { kind: 'call'; data: CallEntry };

  const invertedTimeline = useMemo(() => {
    const timeline: TimelineItem[] = [
      ...messages.map((m): TimelineItem => ({ kind: 'message', data: m })),
      ...callHistory
        .filter((c) => c.status !== 'ongoing')
        .map((c): TimelineItem => ({ kind: 'call', data: c })),
    ];
    timeline.sort(
      (a, b) =>
        new Date(
          a.kind === 'message' ? a.data.timestamp : a.data.startedAt,
        ).getTime() -
        new Date(
          b.kind === 'message' ? b.data.timestamp : b.data.startedAt,
        ).getTime(),
    );
    return timeline.reverse();
  }, [messages, callHistory]);

  // Inverted FlatList needs newest-first order
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Detect event suggestions from recent messages
  const currentUserId = useUserStore((s) => s.currentUser?.id) ?? '';
  const eventHint = useMemo(
    () => detectEventHint(messages, currentUserId, dismissedHintIds),
    [messages, currentUserId, dismissedHintIds],
  );

  // Load messages when entering the group chat
  useEffect(() => {
    useGroupsStore.getState().loadGroupMessages(groupId);
  }, [groupId]);

  // ─── Disappearing messages expiry timer ──────────────
  useEffect(() => {
    if (disappearingDuration === 'off') return;

    const DURATION_MS: Record<string, number> = {
      '30s': 30_000,
      '5m': 5 * 60_000,
      '1h': 60 * 60_000,
      '24h': 24 * 60 * 60_000,
      '7d': 7 * 24 * 60 * 60_000,
    };

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const durationMs = DURATION_MS[disappearingDuration];
      if (!durationMs) return;

      const store = useGroupsStore.getState();
      const currentMessages = store.getGroupMessages(groupId);

      for (const msg of currentMessages) {
        const msgAge = now - new Date(msg.timestamp).getTime();
        if (msgAge > durationMs) {
          store.deleteGroupMessage(groupId, msg.id);
        }
      }
    }, 10_000);

    return () => clearInterval(checkInterval);
  }, [groupId, disappearingDuration]);

  // ─── Scheduled messages timer ──────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useGroupsStore.getState();
      const now = new Date();

      for (const sched of store.scheduledMessages) {
        if (
          sched.status === 'pending' &&
          sched.groupId === groupId &&
          new Date(sched.scheduledFor) <= now
        ) {
          const userId = useUserStore.getState().currentUser?.id;
          if (userId) {
            store.sendGroupMessage(groupId, sched.content, userId);
            store.cancelGroupScheduledMessage(sched.id);
          }
        }
      }
    }, 5_000);

    return () => clearInterval(interval);
  }, [groupId]);

  const handleSend = (content: string) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendGroupMessage(groupId, content, userId);
  };

  const handleDelete = (messageId: string) => {
    useGroupsStore.getState().deleteGroupMessage(groupId, messageId);
  };

  const handleReact = (messageId: string, emoji: string) => {
    useGroupsStore.getState().toggleGroupReaction(groupId, messageId, emoji);
  };

  const handleReply = (message: Message) => {
    useGroupsStore.getState().setReplyTo(groupId, message);
  };

  const handleCancelReply = () => {
    useGroupsStore.getState().setReplyTo(groupId, null);
  };

  // ─── Edit flow ──────────────────────
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);

  const handleEdit = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };

  const handleSaveEdit = (newContent: string) => {
    if (editingMessageId) {
      useGroupsStore.getState().editGroupMessage(groupId, editingMessageId, newContent);
    }
    setEditingMessageId(null);
    setEditingContent(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent(null);
  };

  // ─── Context menu handlers ──────────────
  const handleContextMenu = (message: Message) => {
    setContextMenuMessage(message);
  };

  const handleContextMenuClose = () => {
    setContextMenuMessage(null);
  };

  const handleContextMenuReact = (emoji: string) => {
    if (!contextMenuMessage) return;
    useGroupsStore.getState().toggleGroupReaction(groupId, contextMenuMessage.id, emoji);
  };

  const handleContextMenuReply = () => {
    if (!contextMenuMessage) return;
    handleReply(contextMenuMessage);
  };

  const handleContextMenuForward = () => {
    if (!contextMenuMessage) return;
    setForwardMessage(contextMenuMessage);
  };

  const handleContextMenuPin = () => {
    if (!contextMenuMessage) return;
    useGroupsStore.getState().togglePinGroupMessage(groupId, contextMenuMessage.id);
  };

  const handleContextMenuStar = () => {
    if (!contextMenuMessage) return;
    useGroupsStore.getState().toggleStarGroupMessage(groupId, contextMenuMessage.id);
  };

  const handleContextMenuCopy = () => {
    if (!contextMenuMessage) return;
    Clipboard.setStringAsync(contextMenuMessage.content);
  };

  const handleContextMenuEdit = () => {
    if (!contextMenuMessage) return;
    handleEdit(contextMenuMessage.id, contextMenuMessage.content);
  };

  const handleContextMenuDelete = () => {
    if (!contextMenuMessage) return;
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(contextMenuMessage.id),
      },
    ]);
  };

  // ─── Attachment handlers ──────────────
  const handleOpenAttachments = () => {
    setShowAttachmentSheet(true);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;

    sendGroupMessage(groupId, asset.uri, userId, {
      type: 'image',
      metadata: { width: asset.width, height: asset.height },
    });
  };

  const handlePickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;

    sendGroupMessage(groupId, asset.uri, userId, {
      type: 'image',
      metadata: { width: asset.width, height: asset.height },
    });
  };

  const handlePickDocument = () => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendGroupMessage(groupId, 'Project_Report.pdf', userId, {
      type: 'file',
      metadata: {
        fileName: 'Project_Report.pdf',
        fileSize: 2_456_000,
        mimeType: 'application/pdf',
        uri: 'mock://document.pdf',
      },
    });
  };

  const handleShareLocation = () => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendGroupMessage(groupId, 'Shared location', userId, {
      type: 'location',
      metadata: {
        latitude: 37.7749,
        longitude: -122.4194,
        address: '1 Market Street, San Francisco, CA 94105',
        placeName: 'Ferry Building',
        staticMapUrl: 'https://picsum.photos/seed/sf-map/300/150',
      },
    });
  };

  const handleShareContact = () => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendGroupMessage(groupId, 'Shared contact', userId, {
      type: 'contact',
      metadata: {
        name: 'Alex Rivera',
        phone: '+1 (555) 123-4567',
        email: 'alex@example.com',
        avatar: 'https://picsum.photos/seed/contact/100',
      },
    });
  };

  // ─── Voice message handler ──────────────
  const handleSendVoice = useCallback((data: { duration: number; waveformSamples: number[]; uri: string }) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendGroupMessage(groupId, '🎤 Voice message', userId, {
      type: 'audio',
      metadata: {
        duration: data.duration,
        waveformSamples: data.waveformSamples,
        uri: data.uri,
      },
    });
  }, [groupId, sendGroupMessage]);

  // ─── Schedule message handlers ──────────────
  const handleScheduleSend = (text: string) => {
    setPendingScheduleText(text);
    setShowScheduleSheet(true);
  };

  const handleConfirmSchedule = (date: Date) => {
    if (!pendingScheduleText.trim()) return;
    useGroupsStore.getState().scheduleGroupMessage(
      groupId,
      pendingScheduleText.trim(),
      date,
    );
    setPendingScheduleText('');
  };

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      useGroupsStore.getState().loadMoreGroupMessages(groupId);
    }
  }, [groupId, hasMore, isLoadingMore]);

  const handleDismissHint = useCallback(() => {
    if (eventHint) {
      setDismissedHintIds((prev) => new Set(prev).add(eventHint.messageId));
    }
  }, [eventHint]);

  const handleOpenCreateEvent = useCallback(() => {
    if (eventHint) {
      setSuggestedEventTitle(eventHint.matchedText);
      setDismissedHintIds((prev) => new Set(prev).add(eventHint.messageId));
    }
    setShowCreateEvent(true);
  }, [eventHint]);

  const handleSaveEvent = useCallback((eventData: Omit<GroupEvent, 'id' | 'groupId' | 'createdBy' | 'attendees'>) => {
    useGroupsStore.getState().createEvent(groupId, eventData);
  }, [groupId]);

  return (
    <View ref={containerRef} onLayout={onLayout} className="flex-1 bg-background-primary">
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      keyboardVerticalOffset={kbOffset}
    >
      {/* Disappearing messages banner */}
      <DisappearingMessagesBanner
        duration={disappearingDuration}
        onPress={() => {/* Sheet is opened from header menu */}}
      />

      {/* Pinned message banner */}
      <PinnedMessageBanner
        pinnedMessages={pinnedMessages}
        onJumpToMessage={(messageId) => {
          const index = invertedTimeline.findIndex(
            (ti) => ti.kind === 'message' && ti.data.id === messageId,
          );
          if (index >= 0) {
            listRef.current?.scrollToIndex({ index, animated: true });
          }
        }}
      />

      <FlatList<TimelineItem>
        ref={listRef as React.RefObject<FlatList<TimelineItem>>}
        data={invertedTimeline}
        keyExtractor={(ti) =>
          ti.kind === 'message' ? ti.data.id : `call-${ti.data.id}`
        }
        inverted
        renderItem={({ item: ti, index }) => {
          // ── Call history entry ──
          if (ti.kind === 'call') {
            return (
              <CallHistoryEntry
                entry={ti.data}
                conversationId={groupId}
              />
            );
          }

          // ── Message bubble ──
          const msg = ti.data;

          // Find neighboring messages (skip call entries for grouping)
          const findNeighborMsg = (dir: -1 | 1): Message | null => {
            for (let i = index + dir; i >= 0 && i < invertedTimeline.length; i += dir) {
              const neighbor = invertedTimeline[i];
              if (neighbor.kind === 'message') return neighbor.data;
            }
            return null;
          };
          const olderMsg = findNeighborMsg(1);
          const newerMsg = findNeighborMsg(-1);

          // Show date divider if this is the first message of the day
          const showDateDivider = !olderMsg || !isSameDay(olderMsg.timestamp, msg.timestamp);

          // Group consecutive messages from same sender within threshold
          const isFirstInGroup =
            !olderMsg ||
            olderMsg.senderId !== msg.senderId ||
            differenceInMinutes(msg.timestamp, olderMsg.timestamp) > GROUP_THRESHOLD_MINUTES ||
            showDateDivider;

          const isLastInGroup =
            !newerMsg ||
            newerMsg.senderId !== msg.senderId ||
            differenceInMinutes(newerMsg.timestamp, msg.timestamp) > GROUP_THRESHOLD_MINUTES;

          // Photo grid: group consecutive images from same sender
          const msgIndex = invertedMessages.indexOf(msg);
          const imgGroup = msgIndex >= 0 ? getImageGroup(invertedMessages, msgIndex) : undefined;
          if (imgGroup && !imgGroup.isLeader) return null;

          return (
            <MessageBubble
              message={msg}
              showDateDivider={showDateDivider}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              showSenderName
              onRetry={retryGroupMessage}
              onDelete={handleDelete}
              onReact={handleReact}
              onReply={handleReply}
              onEdit={handleEdit}
              highlightText={highlightText}
              isSearchMatch={matchingMessageIds?.has(msg.id)}
              onContextMenu={handleContextMenu}
              imageGroup={imgGroup?.isLeader ? imgGroup.images : undefined}
            />
          );
        }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 4,
        }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        onScrollBeginDrag={() => setContextMenuMessage(null)}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setShowUnreadJump(y > 300 && groupUnreadCount > 0);
        }}
        scrollEventThrottle={200}
        ListHeaderComponent={
          eventHint ? (
            <EventSuggestionChip
              hint={eventHint}
              onCreateEvent={handleOpenCreateEvent}
              onDismiss={handleDismissHint}
            />
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View className="py-3 items-center">
              <ActivityIndicator color="#D4764E" />
            </View>
          ) : invertedMessages.length > 0 && isToday(invertedMessages[invertedMessages.length - 1].timestamp) && !hasMore ? (
            <TodayDivider />
          ) : null
        }
      />
      <TypingIndicator typingUserIds={typingUserIds} />
      <MessageInput
        onSend={handleSend}
        onPickImage={handleOpenAttachments}
        onScheduleSend={handleScheduleSend}
        onSendVoice={handleSendVoice}
        replyTo={
          replyingTo
            ? {
                senderName: useUserStore.getState().getUserById(replyingTo.senderId)?.name ?? 'Unknown',
                content: replyingTo.content,
              }
            : null
        }
        onCancelReply={handleCancelReply}
        editingContent={editingContent}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
      />
      {/* Safe area bottom padding so input sits above the home indicator */}
      <View style={{ height: insets.bottom }} className="bg-background-secondary" />
    </KeyboardAvoidingView>

    {/* Unread jump button */}
    {showUnreadJump && groupUnreadCount > 0 && (
      <UnreadJumpButton
        unreadCount={groupUnreadCount}
        onPress={() => {
          listRef.current?.scrollToEnd({ animated: true });
          setShowUnreadJump(false);
        }}
      />
    )}

    {/* Full-screen context menu overlay */}
    {contextMenuMessage && (
      <MessageContextMenu
        message={contextMenuMessage}
        isMine={contextMenuMessage.senderId === useUserStore.getState().currentUser?.id}
        onClose={handleContextMenuClose}
        onReact={handleContextMenuReact}
        onReply={handleContextMenuReply}
        onForward={handleContextMenuForward}
        onPin={handleContextMenuPin}
        onStar={handleContextMenuStar}
        onCopy={handleContextMenuCopy}
        onEdit={
          contextMenuMessage.senderId === useUserStore.getState().currentUser?.id &&
          contextMenuMessage.type === 'text'
            ? handleContextMenuEdit
            : undefined
        }
        onDelete={
          contextMenuMessage.senderId === useUserStore.getState().currentUser?.id
            ? handleContextMenuDelete
            : undefined
        }
      />
    )}

    {/* Forward modal */}
    {forwardMessage && (
      <ForwardModal
        visible={!!forwardMessage}
        message={forwardMessage}
        sourceConversationId={groupId}
        onClose={() => setForwardMessage(null)}
      />
    )}

    {/* Schedule message sheet */}
    <ScheduleMessageSheet
      visible={showScheduleSheet}
      onSchedule={handleConfirmSchedule}
      onClose={() => {
        setShowScheduleSheet(false);
        setPendingScheduleText('');
      }}
    />

    {/* Attachment sheet */}
    <AttachmentSheet
      visible={showAttachmentSheet}
      onClose={() => setShowAttachmentSheet(false)}
      onPickCamera={handlePickCamera}
      onPickPhoto={handlePickPhoto}
      onPickDocument={handlePickDocument}
      onShareLocation={handleShareLocation}
      onShareContact={handleShareContact}
    />

    <CreateEventModal
      visible={showCreateEvent}
      onClose={() => setShowCreateEvent(false)}
      onSave={handleSaveEvent}
      suggestedTitle={suggestedEventTitle}
    />
    </View>
  );
}
