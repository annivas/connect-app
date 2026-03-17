import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View, Text, ActivityIndicator, Alert } from 'react-native';
import { useToastStore } from '../../stores/useToastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay, differenceInMinutes } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Contacts from 'expo-contacts';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MessageBubble } from '../chat/MessageBubble';
import { MessageInput } from '../chat/MessageInput';
import { MessageContextMenu } from '../chat/MessageContextMenu';
import { ForwardModal } from '../chat/ForwardModal';
import { PinnedMessageBanner } from '../chat/PinnedMessageBanner';
import { AIInsightsBanner } from '../chat/AIInsightsBanner';
import { DisappearingMessagesBanner } from '../chat/DisappearingMessagesBanner';
import { ScheduleMessageSheet } from '../chat/ScheduleMessageSheet';
import { AttachmentSheet } from '../chat/AttachmentSheet';
import { LocationPickerModal } from '../chat/LocationPickerModal';
import { SpotifyPickerModal } from '../chat/SpotifyPickerModal';
import { UnreadJumpButton } from '../chat/UnreadJumpButton';
import { TypingIndicator } from '../chat/TypingIndicator';
import { CallHistoryEntry } from '../call/CallHistoryEntry';
import { EventSuggestionChip } from './EventSuggestionChip';
import { CreateEventModal } from './CreateEventModal';
import { CreatePollModal } from './CreatePollModal';
import { CreateReminderModal } from '../chat/CreateReminderModal';
import { CreateExpenseModal } from '../chat/CreateExpenseModal';
import { CreateNoteModal } from '../chat/CreateNoteModal';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import { useCallStore } from '../../stores/useCallStore';
import { getImageGroup } from '../../utils/imageGrouping';
import { detectEventHint } from '../../utils/eventDetection';
import { analyzeConversation } from '../../services/aiService';
import { config } from '../../config/env';
import type { ConversationInsight } from '../../utils/insightDetector';
import { detectActions } from '../../utils/actionDetector';
import type { Message, GroupEvent, CallEntry, DisappearingDuration, SongMetadata, Reminder, LedgerEntry, DetectedAction, NoteMessageMetadata, ReminderMessageMetadata, ExpenseMessageMetadata, EventMessageMetadata } from '../../types';

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
  isPrivate?: boolean;
  channelId?: string | null;

  highlightText?: string;
  matchingMessageIds?: Set<string>;
}

// Messages within this window from the same sender are grouped (no avatar/name repeated)
const GROUP_THRESHOLD_MINUTES = 3;

export function GroupChatTab({ groupId, isPrivate, channelId, highlightText, matchingMessageIds }: Props) {

  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { containerRef, offset: kbOffset, onLayout } = useKeyboardOffset();

  const messages = useGroupsStore(useShallow((s) => s.getGroupMessages(groupId, isPrivate, channelId)));

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

  // Action suggestion state (inline per-message chips)
  const [showActionReminderModal, setShowActionReminderModal] = useState(false);
  const [showActionExpenseModal, setShowActionExpenseModal] = useState(false);

  // Forward modal
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  // Attachment sheet
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);

  // Sheet-triggered creation modals
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showSheetNoteModal, setShowSheetNoteModal] = useState(false);
  const [showSheetExpenseModal, setShowSheetExpenseModal] = useState(false);
  const [showSheetReminderModal, setShowSheetReminderModal] = useState(false);

  // Edit modals triggered by tapping rich bubbles in chat
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<LedgerEntry | null>(null);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);

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

  // Group members for expense modals (ensures group mode + correct "Paid by" list)
  const expenseMembers = useMemo(() => {
    const group = useGroupsStore.getState().groups.find((g) => g.id === groupId);
    if (!group) return [];
    const currentUser = useUserStore.getState().currentUser;
    const getUser = useUserStore.getState().getUserById;
    const others = group.members
      .filter((uid) => uid !== currentUser?.id)
      .map((uid) => getUser(uid))
      .filter((u): u is import('../../types').User => u != null);
    return currentUser ? [currentUser, ...others] : others;
  }, [groupId]);

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

  // AI Insights (async — uses LLM in real mode, regex in mock mode)
  const [insightsDismissed, setInsightsDismissed] = useState(false);
  const [groupInsights, setGroupInsights] = useState<ConversationInsight[]>([]);
  useEffect(() => {
    if (insightsDismissed) { setGroupInsights([]); return; }
    const getUserName = (id: string) => useUserStore.getState().getUserById(id)?.name ?? 'Unknown';
    // Debounce in real mode to avoid calling LLM on every message update
    const timer = setTimeout(() => {
      analyzeConversation(messages, currentUserId, getUserName, groupId, channelId).then((result) => {
        setGroupInsights(result.insights);
      });
    }, config.useMocks ? 0 : 2000);
    return () => clearTimeout(timer);
  }, [messages, currentUserId, insightsDismissed]);

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
            store.sendGroupMessage(groupId, sched.content, userId, { ...(isPrivate ? { isPrivate } : {}), ...(channelId ? { channelId } : {}) });

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
    sendGroupMessage(groupId, content, userId, { ...(isPrivate ? { isPrivate } : {}), ...(channelId ? { channelId } : {}) });

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
      useToastStore.getState().show({ message: 'Please allow access to your photo library to send images.', type: 'warning' });
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
      isPrivate,
      channelId,

    });
  };

  const handlePickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      useToastStore.getState().show({ message: 'Please allow camera access to take photos.', type: 'warning' });
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
      isPrivate,
      channelId,

    });
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const userId = useUserStore.getState().currentUser?.id;
      if (!userId) return;

      sendGroupMessage(groupId, asset.name, userId, {
        type: 'file',
        metadata: {
          fileName: asset.name,
          fileSize: asset.size ?? 0,
          mimeType: asset.mimeType ?? 'application/octet-stream',
          uri: asset.uri,
        },
        isPrivate,
        channelId,

      });
    } catch {
      useToastStore.getState().show({ message: 'Failed to pick document. Please try again.', type: 'error' });
    }
  };

  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleShareLocation = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelected = (location: {
    latitude: number;
    longitude: number;
    address: string;
    placeName: string;
  }) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;

    const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey ?? '';
    sendGroupMessage(groupId, location.placeName, userId, {
      type: 'location',
      metadata: {
        ...location,
        staticMapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=${location.latitude},${location.longitude}&zoom=15&size=300x150&markers=color:red%7C${location.latitude},${location.longitude}&key=${apiKey}`,
      },
      isPrivate,
      channelId,

    });
  };

  // ─── Song sharing ──────────────
  const [showSpotifyPicker, setShowSpotifyPicker] = useState(false);

  const handleShareSong = () => {
    setShowSpotifyPicker(true);
  };

  const handleSongSelected = (song: SongMetadata) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;

    sendGroupMessage(groupId, `${song.title} by ${song.artist}`, userId, {
      type: 'song',
      metadata: { ...song },
      isPrivate,
      channelId,

    });
  };

  const handleShareContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        useToastStore.getState().show({ message: 'Please allow access to your contacts to share them.', type: 'warning' });
        return;
      }

      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;

      const userId = useUserStore.getState().currentUser?.id;
      if (!userId) return;

      sendGroupMessage(groupId, `Shared contact: ${contact.name}`, userId, {
        type: 'contact',
        metadata: {
          name: contact.name ?? 'Unknown',
          phone: contact.phoneNumbers?.[0]?.number,
          email: contact.emails?.[0]?.email,
          avatar:
            contact.imageAvailable && contact.image?.uri
              ? contact.image.uri
              : undefined,
        },
        isPrivate,
        channelId,

      });
    } catch {
      useToastStore.getState().show({ message: 'Failed to pick contact. Please try again.', type: 'error' });
    }
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
      isPrivate,
      channelId,

    });
  }, [groupId, sendGroupMessage, channelId]);

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
    const event = useGroupsStore.getState().createEvent(groupId, eventData);
    const userId = useUserStore.getState().currentUser?.id;
    if (userId && event) {
      sendGroupMessage(groupId, `Created an event: ${eventData.title}`, userId, {
        type: 'event',
        metadata: {
          eventId: event.id,
          title: event.title,
          type: event.type,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          description: event.description,
          attendees: event.attendees,
        },
      });
    }
  }, [groupId, sendGroupMessage]);

  // ─── Action suggestion handler ──────────────
  const handleActionSuggestion = useCallback((action: DetectedAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (action.type) {
      case 'reminder':
        setShowActionReminderModal(true);
        break;
      case 'expense':
        setShowActionExpenseModal(true);
        break;
      case 'event':
        useToastStore.getState().show({ message: `Event detected: "${action.extractedValue}"`, type: 'info' });
        break;
      case 'link_save':
        useToastStore.getState().show({ message: 'Link saved to collection', type: 'success' });
        break;
    }
  }, []);

  // ─── Rich bubble tap handler ──────────────
  const handleItemPress = useCallback((type: string, metadata: Record<string, unknown>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (type) {
      case 'note': {
        const noteId = (metadata as unknown as NoteMessageMetadata).noteId;
        if (noteId) {
          router.push({ pathname: '/(tabs)/messages/note-detail', params: { noteId, groupId } } as never);
        }
        break;
      }
      case 'reminder': {
        const reminderId = (metadata as unknown as ReminderMessageMetadata).reminderId;
        if (reminderId) {
          const group = useGroupsStore.getState().groups.find((g) => g.id === groupId);
          const reminder = group?.metadata?.reminders?.find((r: Reminder) => r.id === reminderId);
          if (reminder) {
            setEditingReminder(reminder);
            setShowEditReminderModal(true);
          }
        }
        break;
      }
      case 'expense': {
        const entryId = (metadata as unknown as ExpenseMessageMetadata).entryId;
        if (entryId) {
          const group = useGroupsStore.getState().groups.find((g) => g.id === groupId);
          const entry = group?.metadata?.ledgerEntries?.find((e: LedgerEntry) => e.id === entryId);
          if (entry) {
            setEditingExpense(entry);
            setShowEditExpenseModal(true);
          }
        }
        break;
      }
    }
  }, [groupId, router]);

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

      {/* AI Insights banner */}
      {groupInsights.length > 0 && (
        <AIInsightsBanner
          insights={groupInsights}
          onJumpToMessage={(messageId) => {
            const index = invertedTimeline.findIndex(
              (ti) => ti.kind === 'message' && ti.data.id === messageId,
            );
            if (index >= 0) {
              listRef.current?.scrollToIndex({ index, animated: true });
            }
          }}
          onDismiss={() => setInsightsDismissed(true)}
        />
      )}

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
              groupId={groupId}
              onItemPress={handleItemPress}
              onActionSuggestion={handleActionSuggestion}
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
              <Text className="text-text-tertiary text-xs mt-1.5">Loading earlier messages...</Text>
            </View>
          ) : null
        }
      />
      <TypingIndicator typingUserIds={typingUserIds} />
      <MessageInput
        conversationId={groupId}
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
      onShareSong={handleShareSong}
      onCreatePoll={() => setShowCreatePoll(true)}
      onCreateEvent={() => setShowCreateEvent(true)}
      onCreateNote={() => setShowSheetNoteModal(true)}
      onCreateExpense={() => setShowSheetExpenseModal(true)}
      onCreateReminder={() => setShowSheetReminderModal(true)}
      isGroup={true}
    />
    <SpotifyPickerModal
      visible={showSpotifyPicker}
      onClose={() => setShowSpotifyPicker(false)}
      onSelectSong={handleSongSelected}
    />
    <LocationPickerModal
      visible={showLocationPicker}
      onClose={() => setShowLocationPicker(false)}
      onSelectLocation={handleLocationSelected}
    />

    <CreateEventModal
      visible={showCreateEvent}
      onClose={() => setShowCreateEvent(false)}
      onSave={handleSaveEvent}
      suggestedTitle={suggestedEventTitle}
    />
    <CreatePollModal
      visible={showCreatePoll}
      onClose={() => setShowCreatePoll(false)}
      onCreatePoll={(question, options, isMultipleChoice) => {
        const poll = useGroupsStore.getState().createPoll(groupId, question, options, isMultipleChoice);
        const userId = useUserStore.getState().currentUser?.id;
        if (userId && poll) {
          sendGroupMessage(groupId, `Created a poll: ${question}`, userId, {
            type: 'poll',
            metadata: {
              pollId: poll.id,
              question: poll.question,
              options: poll.options,
              isMultipleChoice: poll.isMultipleChoice,
              isClosed: false,
            },
          });
        }
        setShowCreatePoll(false);
        useToastStore.getState().show({ message: 'Poll created', type: 'success' });
      }}
    />
    <CreateNoteModal
      visible={showSheetNoteModal}
      onClose={() => setShowSheetNoteModal(false)}
      onSave={(note) => {
        const created = useGroupsStore.getState().createGroupNote(groupId, note);
        const userId = useUserStore.getState().currentUser?.id;
        if (userId) {
          sendGroupMessage(groupId, `Created a note: ${note.title}`, userId, {
            type: 'note',
            metadata: {
              noteId: created.id,
              title: note.title,
              contentPreview: (note.content || '').slice(0, 80),
              isPrivate: note.isPrivate,
              color: note.color,
            },
          });
        }
        setShowSheetNoteModal(false);
        useToastStore.getState().show({ message: 'Note created', type: 'success' });
      }}
    />
    <CreateExpenseModal
      visible={showSheetExpenseModal}
      onClose={() => setShowSheetExpenseModal(false)}
      members={expenseMembers}
      onSave={(entry) => {
        const created = useGroupsStore.getState().createGroupLedgerEntry(groupId, {
          description: entry.description,
          amount: entry.amount,
          paidBy: entry.paidBy,
          splitBetween: entry.splitBetween,
          category: entry.category,
          date: new Date(),
          isSettled: false,
        });
        const userId = useUserStore.getState().currentUser?.id;
        if (userId) {
          sendGroupMessage(groupId, `Added an expense: ${entry.description} — $${entry.amount.toFixed(2)}`, userId, {
            type: 'expense',
            metadata: {
              entryId: created.id,
              description: entry.description,
              amount: entry.amount,
              paidBy: entry.paidBy,
              splitBetween: entry.splitBetween,
              category: entry.category,
              isSettled: false,
            },
          });
        }
        setShowSheetExpenseModal(false);
        useToastStore.getState().show({ message: 'Expense added', type: 'success' });
      }}
    />
    <CreateReminderModal
      visible={showSheetReminderModal}
      onClose={() => setShowSheetReminderModal(false)}
      onSave={(reminder) => {
        const userId = useUserStore.getState().currentUser?.id ?? '';
        const created = useGroupsStore.getState().createGroupReminder(groupId, {
          title: reminder.title,
          description: reminder.description,
          dueDate: reminder.dueDate instanceof Date ? reminder.dueDate : new Date(reminder.dueDate),
          priority: reminder.priority,
          isCompleted: false,
          createdBy: userId,
        });
        if (userId) {
          sendGroupMessage(groupId, `Set a reminder: ${reminder.title}`, userId, {
            type: 'reminder',
            metadata: {
              reminderId: created.id,
              title: reminder.title,
              description: reminder.description,
              dueDate: reminder.dueDate instanceof Date ? reminder.dueDate.toISOString() : String(reminder.dueDate),
              priority: reminder.priority,
              isCompleted: false,
            },
          });
        }
        setShowSheetReminderModal(false);
        useToastStore.getState().show({ message: 'Reminder created', type: 'success' });
      }}
    />

    {/* Edit modals triggered by tapping rich bubbles in chat */}
    <CreateReminderModal
      visible={showEditReminderModal}
      onClose={() => { setShowEditReminderModal(false); setEditingReminder(null); }}
      editingReminder={editingReminder}
      onUpdate={(id, updates) => {
        useGroupsStore.getState().updateGroupReminder(groupId, id, updates);
        setShowEditReminderModal(false);
        setEditingReminder(null);
        useToastStore.getState().show({ message: 'Reminder updated', type: 'success' });
      }}
    />
    <CreateExpenseModal
      visible={showEditExpenseModal}
      onClose={() => { setShowEditExpenseModal(false); setEditingExpense(null); }}
      editingEntry={editingExpense}
      members={expenseMembers}
      onUpdate={(id, updates) => {
        useGroupsStore.getState().updateGroupLedgerEntry(groupId, id, updates);
        setShowEditExpenseModal(false);
        setEditingExpense(null);
        useToastStore.getState().show({ message: 'Expense updated', type: 'success' });
      }}
    />

    {/* Action suggestion modals (triggered by inline chips on messages) */}
    <CreateReminderModal
      visible={showActionReminderModal}
      onClose={() => setShowActionReminderModal(false)}
      onSave={(reminder) => {
        const userId = useUserStore.getState().currentUser?.id ?? '';
        const created = useGroupsStore.getState().createGroupReminder(groupId, {
          title: reminder.title,
          description: reminder.description,
          dueDate: reminder.dueDate instanceof Date ? reminder.dueDate : new Date(reminder.dueDate),
          priority: reminder.priority,
          isCompleted: false,
          createdBy: userId,
        });
        if (userId) {
          sendGroupMessage(groupId, `Set a reminder: ${reminder.title}`, userId, {
            type: 'reminder',
            metadata: {
              reminderId: created.id,
              title: reminder.title,
              description: reminder.description,
              dueDate: reminder.dueDate instanceof Date ? reminder.dueDate.toISOString() : String(reminder.dueDate),
              priority: reminder.priority,
              isCompleted: false,
            },
          });
        }
        setShowActionReminderModal(false);
        useToastStore.getState().show({ message: 'Reminder created', type: 'success' });
      }}
    />
    <CreateExpenseModal
      visible={showActionExpenseModal}
      onClose={() => setShowActionExpenseModal(false)}
      members={expenseMembers}
      onSave={(entry) => {
        const created = useGroupsStore.getState().createGroupLedgerEntry(groupId, {
          description: entry.description,
          amount: entry.amount,
          paidBy: entry.paidBy,
          splitBetween: entry.splitBetween,
          category: entry.category,
          date: new Date(),
          isSettled: false,
        });
        const userId = useUserStore.getState().currentUser?.id;
        if (userId) {
          sendGroupMessage(groupId, `Added an expense: ${entry.description} — $${entry.amount.toFixed(2)}`, userId, {
            type: 'expense',
            metadata: {
              entryId: created.id,
              description: created.description,
              amount: created.amount,
              paidBy: created.paidBy,
              splitBetween: created.splitBetween,
              category: created.category,
              isSettled: created.isSettled,
            },
          });
        }
        setShowActionExpenseModal(false);
        useToastStore.getState().show({ message: 'Expense added', type: 'success' });
      }}
    />
    </View>
  );
}
