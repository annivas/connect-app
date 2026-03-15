import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View, Text, ActivityIndicator, Alert } from 'react-native';
import { useToastStore } from '../../stores/useToastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay, differenceInMinutes } from 'date-fns';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Contacts from 'expo-contacts';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MessageContextMenu } from './MessageContextMenu';
import { ForwardModal } from './ForwardModal';
import { PinnedMessageBanner } from './PinnedMessageBanner';
import { AIInsightsBanner } from './AIInsightsBanner';
import { DisappearingMessagesBanner } from './DisappearingMessagesBanner';
import { ScheduleMessageSheet } from './ScheduleMessageSheet';
import { AttachmentSheet } from './AttachmentSheet';
import { LocationPickerModal } from './LocationPickerModal';
import { SpotifyPickerModal } from './SpotifyPickerModal';
import { UnreadJumpButton } from './UnreadJumpButton';
import { TypingIndicator } from './TypingIndicator';
import { CallHistoryEntry } from '../call/CallHistoryEntry';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';
import { useCallStore } from '../../stores/useCallStore';
import { getImageGroup } from '../../utils/imageGrouping';
import { analyzeConversation } from '../../services/aiService';
import { config } from '../../config/env';
import type { ConversationInsight } from '../../utils/insightDetector';
import { CreateReminderModal } from './CreateReminderModal';
import { CreateExpenseModal } from './CreateExpenseModal';
import { CreateNoteModal } from './CreateNoteModal';
import { CreatePollModal } from '../groups/CreatePollModal';
import type { Message, CallEntry, DisappearingDuration, SongMetadata, DetectedAction, User, Reminder, LedgerEntry, NoteMessageMetadata, ReminderMessageMetadata, ExpenseMessageMetadata } from '../../types';

/**
 * Dynamically measure the Y position of the ChatTab container to get an accurate
 * keyboardVerticalOffset. The KAV needs to know how much non-KAV content sits
 * above it (safe area + header + TabView tab bar).
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
  conversationId: string;
  isPrivate?: boolean;
  channelId?: string | null;
  highlightText?: string;
  matchingMessageIds?: Set<string>;
}

const EMPTY_TYPING: string[] = [];

// Messages within this window from the same sender are grouped (no avatar/name repeated)
const GROUP_THRESHOLD_MINUTES = 3;

export function ChatTab({ conversationId, isPrivate, channelId, highlightText, matchingMessageIds }: Props) {
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { containerRef, offset: kbOffset, onLayout } = useKeyboardOffset();

  const messages = useMessagesStore(
    useShallow((s) => s.getMessagesByConversationId(conversationId, isPrivate, channelId))
  );
  const sendMessage = useMessagesStore((s) => s.sendMessage);
  const retryMessage = useMessagesStore((s) => s.retryMessage);
  const hasMore = useMessagesStore((s) => s.hasMoreMessages[conversationId] ?? false);
  const isLoadingMore = useMessagesStore(
    (s) => s.loadingMessages.has(conversationId)
  );
  const replyingTo = useMessagesStore((s) => s.replyingTo[conversationId] ?? null);
  const typingUserIds = useMessagesStore((s) => s.typingUsers[conversationId] ?? EMPTY_TYPING);

  // Context menu state — replaces old reaction picker
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);

  // Forward modal state
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  // Schedule message sheet
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [pendingScheduleText, setPendingScheduleText] = useState('');

  // Disappearing messages
  const disappearingDuration = useMessagesStore(
    useShallow((s) => s.getConversationById(conversationId)?.disappearingDuration ?? 'off'),
  ) as DisappearingDuration;

  // Show disappearing messages sheet from banner tap
  const [showDisappearingSheet, setShowDisappearingSheet] = useState(false);

  // Attachment sheet
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);

  // Action suggestion modals (triggered by smart action chips)
  const [showActionReminderModal, setShowActionReminderModal] = useState(false);
  const [showActionExpenseModal, setShowActionExpenseModal] = useState(false);
  const [actionSuggestionValue, setActionSuggestionValue] = useState('');

  // Sheet-triggered creation modals
  const [showSheetNoteModal, setShowSheetNoteModal] = useState(false);
  const [showSheetExpenseModal, setShowSheetExpenseModal] = useState(false);
  const [showSheetReminderModal, setShowSheetReminderModal] = useState(false);
  const [showSheetPollModal, setShowSheetPollModal] = useState(false);

  // Edit modals triggered by tapping rich bubbles in chat
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<LedgerEntry | null>(null);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);

  // Unread jump button
  const conversationUnreadCount = useMessagesStore(
    useShallow((s) => s.getConversationById(conversationId)?.unreadCount ?? 0),
  ) as number;
  const [showUnreadJump, setShowUnreadJump] = useState(false);

  // Pinned messages
  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned),
    [messages],
  );

  // AI Insights (async — uses LLM in real mode, regex in mock mode)
  const [insightsDismissed, setInsightsDismissed] = useState(false);
  const [insights, setInsights] = useState<ConversationInsight[]>([]);
  useEffect(() => {
    if (insightsDismissed) { setInsights([]); return; }
    const getUserName = (id: string) => useUserStore.getState().getUserById(id)?.name ?? 'Unknown';
    const currentUserId = useUserStore.getState().currentUser?.id ?? '';
    // Debounce in real mode to avoid calling LLM on every message update
    const timer = setTimeout(() => {
      analyzeConversation(messages, currentUserId, getUserName, conversationId, channelId).then((result) => {
        setInsights(result.insights);
      });
    }, config.useMocks ? 0 : 2000);
    return () => clearTimeout(timer);
  }, [messages, insightsDismissed]);

  // Call history for this conversation
  const callHistory = useCallStore(
    useShallow((s) => s.callHistory.filter((c) => c.conversationId === conversationId)),
  );

  // Build members list for expense modals (same pattern as section-detail.tsx)
  const expenseMembers = useMemo(() => {
    const conv = useMessagesStore.getState().getConversationById(conversationId);
    if (!conv) return [];
    const currentUser = useUserStore.getState().currentUser;
    const getUserById = useUserStore.getState().getUserById;
    const others = conv.participants
      .filter((uid) => uid !== currentUser?.id)
      .map((uid) => getUserById(uid))
      .filter(Boolean) as import('../../types').User[];
    return currentUser ? [currentUser, ...others] : others;
  }, [conversationId]);

  // Merge messages and call history into a unified timeline
  type TimelineItem =
    | { kind: 'message'; data: Message }
    | { kind: 'call'; data: CallEntry };

  const invertedTimeline = useMemo(() => {
    const timeline: TimelineItem[] = [
      ...messages.map((m): TimelineItem => ({ kind: 'message', data: m })),
      ...callHistory
        .filter((c) => c.status !== 'ongoing') // Don't show ongoing calls in history
        .map((c): TimelineItem => ({ kind: 'call', data: c })),
    ];
    // Sort chronologically then reverse for inverted FlatList (newest first)
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

  // Keep a messages-only inverted list for grouping logic
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Load messages when entering the conversation
  useEffect(() => {
    useMessagesStore.getState().loadMessages(conversationId);
  }, [conversationId]);

  const handleSend = (content: string) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendMessage(conversationId, content, userId, { ...(isPrivate ? { isPrivate } : {}), ...(channelId ? { channelId } : {}) });
  };

  const handleDelete = (messageId: string) => {
    useMessagesStore.getState().deleteMessage(conversationId, messageId);
  };

  const handleReact = (messageId: string, emoji: string) => {
    useMessagesStore.getState().toggleReaction(conversationId, messageId, emoji);
  };

  const handleReply = (message: Message) => {
    useMessagesStore.getState().setReplyTo(conversationId, message);
  };

  const handleCancelReply = () => {
    useMessagesStore.getState().setReplyTo(conversationId, null);
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
      useMessagesStore.getState().editMessage(conversationId, editingMessageId, newContent);
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
    useMessagesStore.getState().toggleReaction(conversationId, contextMenuMessage.id, emoji);
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
    useMessagesStore.getState().togglePinMessage(conversationId, contextMenuMessage.id);
  };

  const handleContextMenuStar = () => {
    if (!contextMenuMessage) return;
    useMessagesStore.getState().toggleStarMessage(conversationId, contextMenuMessage.id);
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

  // ─── Action suggestion handler ──────────────
  const handleActionSuggestion = useCallback((action: DetectedAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionSuggestionValue(action.extractedValue);

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
          router.push({ pathname: '/(tabs)/messages/note-detail', params: { noteId, conversationId } } as never);
        }
        break;
      }
      case 'reminder': {
        const reminderId = (metadata as unknown as ReminderMessageMetadata).reminderId;
        if (reminderId) {
          const conversation = useMessagesStore.getState().getConversationById(conversationId);
          const reminder = conversation?.metadata?.reminders?.find((r: Reminder) => r.id === reminderId);
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
          const conversation = useMessagesStore.getState().getConversationById(conversationId);
          const entry = conversation?.metadata?.ledgerEntries?.find((e: LedgerEntry) => e.id === entryId);
          if (entry) {
            setEditingExpense(entry);
            setShowEditExpenseModal(true);
          }
        }
        break;
      }
    }
  }, [conversationId, router]);

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

    sendMessage(conversationId, asset.uri, userId, {
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

    sendMessage(conversationId, asset.uri, userId, {
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

      sendMessage(conversationId, asset.name, userId, {
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
    sendMessage(conversationId, location.placeName, userId, {
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

    sendMessage(conversationId, `${song.title} by ${song.artist}`, userId, {
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

      sendMessage(conversationId, `Shared contact: ${contact.name}`, userId, {
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

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      useMessagesStore.getState().loadMoreMessages(conversationId);
    }
  }, [conversationId, hasMore, isLoadingMore]);

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

      const store = useMessagesStore.getState();
      const currentMessages = store.getMessagesByConversationId(conversationId);

      for (const msg of currentMessages) {
        const msgAge = now - new Date(msg.timestamp).getTime();
        if (msgAge > durationMs) {
          store.deleteMessage(conversationId, msg.id);
        }
      }
    }, 10_000); // check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [conversationId, disappearingDuration]);

  // ─── Scheduled messages timer ──────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useMessagesStore.getState();
      const now = new Date();

      for (const sched of store.scheduledMessages) {
        if (
          sched.status === 'pending' &&
          sched.conversationId === conversationId &&
          new Date(sched.scheduledFor) <= now
        ) {
          // Send the scheduled message
          const userId = useUserStore.getState().currentUser?.id;
          if (userId) {
            store.sendMessage(conversationId, sched.content, userId, { ...(isPrivate ? { isPrivate } : {}), ...(channelId ? { channelId } : {}) });

            store.cancelScheduledMessage(sched.id); // marks as sent/cancelled
          }
        }
      }
    }, 5_000); // check every 5 seconds

    return () => clearInterval(interval);
  }, [conversationId]);

  // ─── Voice message handler ──────────────
  const handleSendVoice = useCallback((data: { duration: number; waveformSamples: number[]; uri: string }) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendMessage(conversationId, '🎤 Voice message', userId, {
      type: 'audio',
      metadata: {
        duration: data.duration,
        waveformSamples: data.waveformSamples,
        uri: data.uri,
      },
      isPrivate,
      channelId,

    });
  }, [conversationId, sendMessage, channelId]);

  const handleScheduleSend = (text: string) => {
    setPendingScheduleText(text);
    setShowScheduleSheet(true);
  };

  const handleConfirmSchedule = (date: Date) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId || !pendingScheduleText.trim()) return;
    useMessagesStore.getState().scheduleMessage(
      conversationId,
      pendingScheduleText.trim(),
      userId,
      date,
    );
    setPendingScheduleText('');
  };

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
        onPress={() => setShowDisappearingSheet(true)}
      />

      {/* Pinned message banner */}
      <PinnedMessageBanner
        pinnedMessages={pinnedMessages}
        onJumpToMessage={(messageId) => {
          const index = invertedTimeline.findIndex(
            (item) => item.kind === 'message' && item.data.id === messageId,
          );
          if (index >= 0) {
            listRef.current?.scrollToIndex({ index, animated: true });
          }
        }}
      />

      {/* AI Insights banner */}
      {insights.length > 0 && (
        <AIInsightsBanner
          insights={insights}
          onJumpToMessage={(messageId) => {
            const index = invertedTimeline.findIndex(
              (item) => item.kind === 'message' && item.data.id === messageId,
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
        keyExtractor={(item) =>
          item.kind === 'message' ? item.data.id : `call-${item.data.id}`
        }
        inverted
        renderItem={({ item, index }) => {
          // ── Call history entry ──
          if (item.kind === 'call') {
            return (
              <CallHistoryEntry
                entry={item.data}
                conversationId={conversationId}
              />
            );
          }

          // ── Message bubble ──
          const msg = item.data;

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
          // We need the index in the messages-only list for imageGrouping
          const msgIndex = invertedMessages.indexOf(msg);
          const imgGroup = msgIndex >= 0 ? getImageGroup(invertedMessages, msgIndex) : undefined;
          if (imgGroup && !imgGroup.isLeader) return null;

          return (
            <MessageBubble
              message={msg}
              showDateDivider={showDateDivider}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              onRetry={retryMessage}
              onDelete={handleDelete}
              onReact={handleReact}
              onReply={handleReply}
              onEdit={handleEdit}
              highlightText={highlightText}
              isSearchMatch={matchingMessageIds?.has(msg.id)}
              onContextMenu={handleContextMenu}
              onActionSuggestion={handleActionSuggestion}
              imageGroup={imgGroup?.isLeader ? imgGroup.images : undefined}
              conversationId={conversationId}
              onItemPress={handleItemPress}
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
          // In inverted list, scrolling "up" means moving away from newest messages
          setShowUnreadJump(y > 300 && conversationUnreadCount > 0);
        }}
        scrollEventThrottle={200}
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
        conversationId={conversationId}
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
    {showUnreadJump && conversationUnreadCount > 0 && (
      <UnreadJumpButton
        unreadCount={conversationUnreadCount}
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
        sourceConversationId={conversationId}
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
      onCreatePoll={() => setShowSheetPollModal(true)}
      onCreateNote={() => setShowSheetNoteModal(true)}
      onCreateExpense={() => setShowSheetExpenseModal(true)}
      onCreateReminder={() => setShowSheetReminderModal(true)}
      isGroup={false}
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

    {/* Action suggestion modals */}
    <CreateReminderModal
      visible={showActionReminderModal}
      conversationId={conversationId}
      onClose={() => {
        setShowActionReminderModal(false);
        setActionSuggestionValue('');
      }}
      onSave={async (reminder) => {
        const created = await useMessagesStore.getState().createReminder(conversationId, {
          title: reminder.title,
          description: reminder.description,
          dueDate: reminder.dueDate instanceof Date ? reminder.dueDate.toISOString() : String(reminder.dueDate),
          priority: reminder.priority,
        });
        const userId = useUserStore.getState().currentUser?.id;
        if (userId) {
          sendMessage(conversationId, `Set a reminder: ${reminder.title}`, userId, {
            type: 'reminder',
            metadata: {
              reminderId: created.id,
              title: created.title,
              description: created.description,
              dueDate: typeof created.dueDate === 'string' ? created.dueDate : created.dueDate instanceof Date ? created.dueDate.toISOString() : String(created.dueDate),
              priority: created.priority,
              isCompleted: created.isCompleted,
              assignedTo: created.assignedTo,
            },
          });
        }
        setShowActionReminderModal(false);
        setActionSuggestionValue('');
        useToastStore.getState().show({ message: 'Reminder created', type: 'success' });
      }}
    />
    <CreateExpenseModal
      visible={showActionExpenseModal}
      conversationId={conversationId}
      members={expenseMembers}
      onClose={() => {
        setShowActionExpenseModal(false);
        setActionSuggestionValue('');
      }}
      onSave={async (entry) => {
        const created = await useMessagesStore.getState().createLedgerEntry(conversationId, {
          description: entry.description,
          amount: entry.amount,
          paidBy: entry.paidBy,
          splitBetween: entry.splitBetween,
          category: entry.category,
        });
        const userId = useUserStore.getState().currentUser?.id;
        if (userId) {
          sendMessage(conversationId, `Added an expense: ${entry.description} — $${entry.amount.toFixed(2)}`, userId, {
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
        setActionSuggestionValue('');
        useToastStore.getState().show({ message: 'Expense added', type: 'success' });
      }}
    />

    {/* Sheet-triggered creation modals */}
    <CreateNoteModal
      visible={showSheetNoteModal}
      conversationId={conversationId}
      onClose={() => setShowSheetNoteModal(false)}
      onSave={async (note) => {
        const created = await useMessagesStore.getState().createNote(conversationId, note);
        const userId = useUserStore.getState().currentUser?.id;
        if (userId) {
          sendMessage(conversationId, `Created a note: ${note.title}`, userId, {
            type: 'note',
            metadata: {
              noteId: created.id,
              title: created.title,
              contentPreview: (created.content || '').slice(0, 80),
              isPrivate: created.isPrivate,
              color: created.color,
            },
          });
        }
        setShowSheetNoteModal(false);
        useToastStore.getState().show({ message: 'Note created', type: 'success' });
      }}
    />
    <CreateExpenseModal
      visible={showSheetExpenseModal}
      conversationId={conversationId}
      members={expenseMembers}
      onClose={() => setShowSheetExpenseModal(false)}
      onSave={async (entry) => {
        const created = await useMessagesStore.getState().createLedgerEntry(conversationId, {
          description: entry.description,
          amount: entry.amount,
          paidBy: entry.paidBy,
          splitBetween: entry.splitBetween,
          category: entry.category,
        });
        const userId = useUserStore.getState().currentUser?.id;
        if (userId) {
          sendMessage(conversationId, `Added an expense: ${entry.description} — $${entry.amount.toFixed(2)}`, userId, {
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
        setShowSheetExpenseModal(false);
        useToastStore.getState().show({ message: 'Expense added', type: 'success' });
      }}
    />
    <CreatePollModal
      visible={showSheetPollModal}
      onClose={() => setShowSheetPollModal(false)}
      onCreatePoll={(question, options, isMultipleChoice) => {
        const poll = useMessagesStore.getState().createPoll(conversationId, question, options, isMultipleChoice);
        const userId = useUserStore.getState().currentUser?.id;
        if (userId && poll) {
          sendMessage(conversationId, `Created a poll: ${question}`, userId, {
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
        setShowSheetPollModal(false);
        useToastStore.getState().show({ message: 'Poll created', type: 'success' });
      }}
    />
    <CreateReminderModal
      visible={showSheetReminderModal}
      conversationId={conversationId}
      onClose={() => setShowSheetReminderModal(false)}
      onSave={async (reminder) => {
        const created = await useMessagesStore.getState().createReminder(conversationId, {
          title: reminder.title,
          description: reminder.description,
          dueDate: reminder.dueDate instanceof Date ? reminder.dueDate.toISOString() : String(reminder.dueDate),
          priority: reminder.priority,
        });
        const userId = useUserStore.getState().currentUser?.id;
        if (userId) {
          sendMessage(conversationId, `Set a reminder: ${reminder.title}`, userId, {
            type: 'reminder',
            metadata: {
              reminderId: created.id,
              title: created.title,
              description: created.description,
              dueDate: typeof created.dueDate === 'string' ? created.dueDate : created.dueDate instanceof Date ? created.dueDate.toISOString() : String(created.dueDate),
              priority: created.priority,
              isCompleted: created.isCompleted,
              assignedTo: created.assignedTo,
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
      conversationId={conversationId}
      onClose={() => { setShowEditReminderModal(false); setEditingReminder(null); }}
      editingReminder={editingReminder}
      onUpdate={(id, updates) => {
        useMessagesStore.getState().updateReminder(conversationId, id, updates);
        setShowEditReminderModal(false);
        setEditingReminder(null);
        useToastStore.getState().show({ message: 'Reminder updated', type: 'success' });
      }}
    />
    <CreateExpenseModal
      visible={showEditExpenseModal}
      conversationId={conversationId}
      members={expenseMembers}
      onClose={() => { setShowEditExpenseModal(false); setEditingExpense(null); }}
      editingEntry={editingExpense}
      onUpdate={(id, updates) => {
        useMessagesStore.getState().updateLedgerEntry(conversationId, id, updates);
        setShowEditExpenseModal(false);
        setEditingExpense(null);
        useToastStore.getState().show({ message: 'Expense updated', type: 'success' });
      }}
    />
    </View>
  );
}
