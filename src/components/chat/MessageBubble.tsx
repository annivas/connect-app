import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { FormattedText } from './FormattedText';
import { ForwardedLabel } from './ForwardedLabel';
import { LinkPreviewCard } from './LinkPreviewCard';
import { PhotoGrid } from './PhotoGrid';
import { VoiceMessageBubble } from './VoiceMessageBubble';
import { LocationMessageBubble } from './LocationMessageBubble';
import { DocumentMessageBubble } from './DocumentMessageBubble';
import { ContactMessageBubble } from './ContactMessageBubble';
import { SongMessageBubble } from './SongMessageBubble';
import { NoteMessageBubble } from './NoteMessageBubble';
import { ReminderMessageBubble } from './ReminderMessageBubble';
import { ExpenseMessageBubble } from './ExpenseMessageBubble';
import { PollMessageBubble } from './PollMessageBubble';
import { EventMessageBubble } from './EventMessageBubble';
import { ImageViewerModal } from './ImageViewerModal';
import { renderHighlightedText } from '../../utils/highlightText';
import { extractUrls } from '../../utils/urlDetection';
import { detectActions } from '../../utils/actionDetector';
import { ActionSuggestionChip } from './ActionSuggestionChip';
import { Message, Reaction, DetectedAction, VoiceMessageMetadata, LocationMessageMetadata, DocumentMessageMetadata, ContactMessageMetadata, SongMetadata, NoteMessageMetadata, ReminderMessageMetadata, ExpenseMessageMetadata, PollMessageMetadata, EventMessageMetadata } from '../../types';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  message: Message;
  showDateDivider?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showSenderName?: boolean;
  onRetry?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, currentContent: string) => void;
  highlightText?: string;
  isSearchMatch?: boolean;
  /** Called when long-press opens the full context menu */
  onContextMenu?: (message: Message) => void;
  /** Grouped image messages for photo grid rendering */
  imageGroup?: Message[];
  /** Called when a smart action suggestion chip is pressed */
  onActionSuggestion?: (action: DetectedAction) => void;
  /** Context IDs for interactive bubbles (polls, events) */
  groupId?: string;
  conversationId?: string;
}

// ─── Date Divider ────────────────────────────

function DateDivider({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else label = format(date, 'MMMM d, yyyy');

  return (
    <View className="flex-row items-center my-4 px-2">
      <View className="flex-1 h-px bg-border-subtle" />
      <Text className="text-text-tertiary text-[11px] mx-3 font-medium tracking-wide uppercase">
        {label}
      </Text>
      <View className="flex-1 h-px bg-border-subtle" />
    </View>
  );
}

// ─── Send Status ─────────────────────────────

function SendStatusIndicator({
  status,
  isRead,
  onRetry,
}: {
  status: Message['sendStatus'];
  isRead: boolean;
  onRetry?: () => void;
}) {
  if (!status) return null;

  if (status === 'sending') {
    return <Ionicons name="time-outline" size={12} color="#A8937F" style={{ marginLeft: 4 }} />;
  }

  if (status === 'failed') {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onRetry?.();
        }}
        className="flex-row items-center ml-1"
      >
        <Ionicons name="alert-circle" size={13} color="#C94F4F" />
      </Pressable>
    );
  }

  if (status === 'delivered') {
    return (
      <Ionicons
        name="checkmark-done"
        size={14}
        color="#A8937F"
        style={{ marginLeft: 4 }}
      />
    );
  }

  return (
    <Ionicons
      name={isRead ? 'checkmark-done' : 'checkmark'}
      size={14}
      color={isRead ? '#D4764E' : '#A8937F'}
      style={{ marginLeft: 4 }}
    />
  );
}

// ─── Reaction pills (overlaid at bubble corner) ──

interface GroupedReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

function groupReactions(reactions: Reaction[], currentUserId: string | undefined): GroupedReaction[] {
  const map = new Map<string, { count: number; userReacted: boolean }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji) ?? { count: 0, userReacted: false };
    existing.count++;
    if (r.userId === currentUserId) existing.userReacted = true;
    map.set(r.emoji, existing);
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userReacted: data.userReacted,
  }));
}

function ReactionPills({
  reactions,
  currentUserId,
  isMine,
  onToggle,
}: {
  reactions: Reaction[];
  currentUserId: string | undefined;
  isMine: boolean;
  onToggle: (emoji: string) => void;
}) {
  if (!reactions || reactions.length === 0) return null;
  const grouped = groupReactions(reactions, currentUserId);

  return (
    <View
      className={`flex-row flex-wrap -mt-2 mb-1 ${isMine ? 'justify-end mr-2' : 'justify-start ml-10'}`}
    >
      <View className="flex-row bg-surface-elevated rounded-full px-1 py-0.5 border border-border-subtle">
        {grouped.map(({ emoji, count, userReacted }) => (
          <Pressable
            key={emoji}
            onPress={() => {
              Haptics.selectionAsync();
              onToggle(emoji);
            }}
            className={`flex-row items-center px-1.5 py-0.5 rounded-full ${
              userReacted ? 'bg-accent-primary/20' : ''
            }`}
          >
            <Text style={{ fontSize: 13 }}>{emoji}</Text>
            {count > 1 && (
              <Text
                className={`text-[10px] ml-0.5 font-medium ${
                  userReacted ? 'text-accent-primary' : 'text-text-tertiary'
                }`}
              >
                {count}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Swipe-to-reply constants ───────────────

const REPLY_THRESHOLD = 60; // px to trigger reply
const MAX_SWIPE = 80; // cap the visual swipe distance

// ─── Main component ──────────────────────────

const AVATAR_SIZE = 28;

export function MessageBubble({
  message,
  showDateDivider,
  isFirstInGroup = true,
  isLastInGroup = true,
  showSenderName = false,
  onRetry,
  onDelete,
  onReact,
  onReply,
  onEdit,
  highlightText,
  isSearchMatch,
  onContextMenu,
  imageGroup,
  onActionSuggestion,
  groupId,
  conversationId,
}: Props) {
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const getUserById = useUserStore((s) => s.getUserById);
  const isMine = message.senderId === currentUserId;
  const isFailed = message.sendStatus === 'failed';

  const sender = !isMine ? getUserById(message.senderId) : null;

  // ─── Image viewer state ───
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const handleImagePress = useCallback((index: number = 0) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImageViewerIndex(index);
    setImageViewerVisible(true);
  }, []);

  // Build image list for viewer
  const viewerImages = React.useMemo(() => {
    if (imageGroup && imageGroup.length > 1) {
      return imageGroup.map((img) => ({
        uri: img.content,
        width: img.metadata?.width as number | undefined,
        height: img.metadata?.height as number | undefined,
      }));
    }
    if (message.type === 'image') {
      return [{
        uri: message.content,
        width: message.metadata?.width as number | undefined,
        height: message.metadata?.height as number | undefined,
      }];
    }
    return [];
  }, [message, imageGroup]);

  // ─── Double-tap heart animation ───
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const heartAnimStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const triggerDoubleTapLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact?.(message.id, '\u2764\uFE0F');
  }, [message.id, onReact]);

  const playHeartAnimation = useCallback(() => {
    'worklet';
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 8, stiffness: 400 }),
      withDelay(400, withSpring(0, { damping: 15, stiffness: 300 })),
    );
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(0, { duration: 300 })),
    );
  }, [heartScale, heartOpacity]);

  // ─── Swipe-to-reply gesture (Reanimated) ───
  const translateX = useSharedValue(0);
  const replyIconOpacity = useSharedValue(0);
  const hasTriggered = useSharedValue(false);

  const triggerReply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReply?.(message);
  }, [message, onReply]);

  const openContextMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContextMenu?.(message);
  }, [message, onContextMenu]);

  // Pan gesture for swipe-to-reply — activates on deliberate horizontal movement
  const panGesture = Gesture.Pan()
    .activeOffsetX([15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      // Only allow right swipe (positive translateX)
      const clamped = Math.min(Math.max(e.translationX, 0), MAX_SWIPE);
      translateX.value = clamped;
      replyIconOpacity.value = Math.min(clamped / REPLY_THRESHOLD, 1);

      if (clamped >= REPLY_THRESHOLD && !hasTriggered.value) {
        hasTriggered.value = true;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      if (translateX.value >= REPLY_THRESHOLD) {
        runOnJS(triggerReply)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      replyIconOpacity.value = withTiming(0, { duration: 200 });
      hasTriggered.value = false;
    });

  // Long-press gesture — now opens full context menu instead of reaction picker
  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      runOnJS(openContextMenu)();
    });

  // Double-tap gesture — toggles reaction with heart animation
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      playHeartAnimation();
      runOnJS(triggerDoubleTapLike)();
    });

  // Race: whichever gesture activates first wins. Pan (horizontal swipe),
  // LongPress (hold in place), and DoubleTap (two quick taps) naturally compete.
  const composedGesture = Gesture.Race(panGesture, longPressGesture, doubleTapGesture);

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyIconStyle = useAnimatedStyle(() => ({
    opacity: replyIconOpacity.value,
    transform: [{ scale: 0.5 + replyIconOpacity.value * 0.5 }],
  }));

  // ─── Bubble corner radius logic (like iMessage) ───
  const getBubbleRadius = () => {
    const big = 20;
    const small = 6;
    if (isMine) {
      return {
        borderTopLeftRadius: big,
        borderTopRightRadius: isFirstInGroup ? big : small,
        borderBottomLeftRadius: big,
        borderBottomRightRadius: isLastInGroup ? big : small,
      };
    }
    return {
      borderTopLeftRadius: isFirstInGroup ? big : small,
      borderTopRightRadius: big,
      borderBottomLeftRadius: isLastInGroup ? big : small,
      borderBottomRightRadius: big,
    };
  };

  const hasReactions = (message.reactions?.length ?? 0) > 0;

  return (
    <>
      {/* Swipe wrapper — reply icon sits behind the bubble */}
      <View className={`${isLastInGroup ? 'mb-3' : 'mb-0.5'}`}>
        {/* Reply icon (revealed on swipe) */}
        <Animated.View
          style={[
            replyIconStyle,
            {
              position: 'absolute',
              left: isMine ? undefined : -4,
              right: isMine ? -4 : undefined,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              width: 36,
            },
          ]}
        >
          <View className="w-8 h-8 rounded-full bg-surface-elevated items-center justify-center border border-border-subtle">
            <Ionicons name="arrow-undo" size={16} color="#D4764E" />
          </View>
        </Animated.View>

          <GestureDetector gesture={composedGesture}>
          <Animated.View style={swipeStyle}>
            {/* Message row — no Pressable wrapper, gestures handled above */}
            <View className={`flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
              {/* Avatar column (received messages only) */}
              {!isMine && (
                <View style={{ width: AVATAR_SIZE, marginRight: 8 }}>
                  {isLastInGroup && sender ? (
                    <Image
                      source={{ uri: sender.avatar }}
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        borderRadius: AVATAR_SIZE / 2,
                      }}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={{ width: AVATAR_SIZE }} />
                  )}
                </View>
              )}

              {/* Bubble content */}
              <View className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                {/* Sender name for group messages */}
                {showSenderName && isFirstInGroup && !isMine && sender && (
                  <Text className="text-accent-primary text-[11px] font-semibold mb-0.5 ml-1">
                    {sender.name}
                  </Text>
                )}
                {/* Forwarded label */}
                {message.forwardedFrom && (
                  <ForwardedLabel forwardedFrom={message.forwardedFrom} isMine={isMine} />
                )}

                {message.type === 'audio' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3 py-2 ${
                      isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
                    }`}
                  >
                    <VoiceMessageBubble
                      messageId={message.id}
                      metadata={message.metadata as unknown as VoiceMessageMetadata}
                      isMine={isMine}
                    />
                  </View>
                ) : message.type === 'location' ? (
                  <View style={getBubbleRadius()} className="overflow-hidden">
                    <LocationMessageBubble
                      metadata={message.metadata as unknown as LocationMessageMetadata}
                      isMine={isMine}
                    />
                  </View>
                ) : message.type === 'file' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3 py-2 ${
                      isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
                    }`}
                  >
                    <DocumentMessageBubble
                      metadata={message.metadata as unknown as DocumentMessageMetadata}
                      isMine={isMine}
                    />
                  </View>
                ) : message.type === 'contact' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3 py-2 ${
                      isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
                    }`}
                  >
                    <ContactMessageBubble
                      metadata={message.metadata as unknown as ContactMessageMetadata}
                      isMine={isMine}
                    />
                  </View>
                ) : message.type === 'song' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3 py-2 ${
                      isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
                    }`}
                  >
                    <SongMessageBubble
                      messageId={message.id}
                      metadata={message.metadata as unknown as SongMetadata}
                      isMine={isMine}
                    />
                  </View>
                ) : message.type === 'note' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3 py-2 ${
                      isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
                    }`}
                  >
                    <NoteMessageBubble
                      metadata={message.metadata as unknown as NoteMessageMetadata}
                      isMine={isMine}
                    />
                  </View>
                ) : message.type === 'reminder' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3 py-2 ${
                      isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
                    }`}
                  >
                    <ReminderMessageBubble
                      metadata={message.metadata as unknown as ReminderMessageMetadata}
                      isMine={isMine}
                    />
                  </View>
                ) : message.type === 'expense' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3 py-2 ${
                      isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
                    }`}
                  >
                    <ExpenseMessageBubble
                      metadata={message.metadata as unknown as ExpenseMessageMetadata}
                      isMine={isMine}
                    />
                  </View>
                ) : message.type === 'poll' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3 py-2 ${
                      isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
                    }`}
                  >
                    <PollMessageBubble
                      metadata={message.metadata as unknown as PollMessageMetadata}
                      isMine={isMine}
                      groupId={groupId}
                      conversationId={conversationId}
                    />
                  </View>
                ) : message.type === 'event' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3 py-2 ${
                      isMine ? 'bg-accent-primary' : 'bg-surface-elevated'
                    }`}
                  >
                    <EventMessageBubble
                      metadata={message.metadata as unknown as EventMessageMetadata}
                      isMine={isMine}
                      groupId={groupId}
                    />
                  </View>
                ) : message.type === 'image' ? (
                  imageGroup && imageGroup.length > 1 ? (
                    <PhotoGrid images={imageGroup} isMine={isMine} onImagePress={handleImagePress} />
                  ) : (
                    <Pressable
                      onPress={() => handleImagePress(0)}
                      style={getBubbleRadius()}
                      className={`overflow-hidden ${isFailed ? 'opacity-60' : ''}`}
                    >
                      <Image
                        source={{ uri: message.content }}
                        style={{
                          width: 220,
                          aspectRatio:
                            message.metadata?.width && message.metadata?.height && (message.metadata.height as number) > 0
                              ? (message.metadata.width as number) / (message.metadata.height as number)
                              : 4 / 3,
                        }}
                        contentFit="cover"
                        transition={200}
                      />
                    </Pressable>
                  )
                ) : (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3.5 py-2 ${
                      isMine
                        ? isFailed
                          ? 'bg-accent-primary/60'
                          : 'bg-accent-primary'
                        : 'bg-surface-elevated'
                    } ${isSearchMatch ? 'border-l-2 border-status-warning' : ''}`}
                  >
                    {/* Inline reply preview */}
                    {message.replyTo && (
                      <View className={`mb-1.5 px-2.5 py-1.5 rounded-lg ${
                        isMine ? 'bg-white/15' : 'bg-background-primary/50'
                      } border-l-2 ${isMine ? 'border-white/40' : 'border-accent-primary'}`}>
                        <Text
                          className={`text-[11px] font-semibold ${
                            isMine ? 'text-white/80' : 'text-accent-primary'
                          }`}
                          numberOfLines={1}
                        >
                          {message.replyTo.senderName}
                        </Text>
                        <Text
                          className={`text-[12px] ${isMine ? 'text-white/60' : 'text-text-tertiary'}`}
                          numberOfLines={1}
                        >
                          {message.replyTo.content}
                        </Text>
                      </View>
                    )}

                    {highlightText ? (
                      renderHighlightedText(
                        message.content,
                        highlightText,
                        `text-[15px] leading-[21px] ${isMine ? 'text-white' : 'text-text-primary'}`,
                      )
                    ) : (
                      <FormattedText
                        text={message.content}
                        mentions={message.mentions}
                        isMine={isMine}
                      />
                    )}

                    {/* Link preview card */}
                    {message.type === 'text' && extractUrls(message.content).length > 0 && (
                      <LinkPreviewCard url={extractUrls(message.content)[0]} isMine={isMine} />
                    )}

                    {/* Inline timestamp + status + star/pin indicators */}
                    {isLastInGroup && (
                      <View className={`flex-row items-center mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {message.isStarred && (
                          <Ionicons name="star" size={10} color="#F59E0B" style={{ marginRight: 3 }} />
                        )}
                        {message.isPinned && (
                          <Ionicons name="pin" size={10} color="#D4764E" style={{ marginRight: 3 }} />
                        )}
                        {message.isEdited && (
                          <Text className={`text-[10px] mr-1 ${isMine ? 'text-white/50' : 'text-text-tertiary'}`}>
                            edited
                          </Text>
                        )}
                        <Text className={`text-[10px] ${isMine ? 'text-white/50' : 'text-text-tertiary'}`}>
                          {format(message.timestamp, 'h:mm a')}
                        </Text>
                        {isMine && (
                          <SendStatusIndicator
                            status={message.sendStatus}
                            isRead={message.isRead}
                            onRetry={() => onRetry?.(message.id)}
                          />
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Double-tap heart animation overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            heartAnimStyle,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: isMine ? 'flex-end' : 'flex-start',
              paddingHorizontal: isMine ? 40 : 48,
            },
          ]}
        >
          <Text style={{ fontSize: 44 }}>{'\u2764\uFE0F'}</Text>
        </Animated.View>

        {/* Reaction pills (slightly overlapping the bubble bottom) */}
        {hasReactions && (
          <ReactionPills
            reactions={message.reactions ?? []}
            currentUserId={currentUserId}
            isMine={isMine}
            onToggle={(emoji) => onReact?.(message.id, emoji)}
          />
        )}

        {/* Smart action suggestions */}
        {!isMine && message.type === 'text' && onActionSuggestion && (() => {
          const actions = detectActions(message.id, message.content);
          if (actions.length === 0) return null;
          return (
            <View className="mt-1" style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              <ActionSuggestionChip actions={actions} onPress={onActionSuggestion} />
            </View>
          );
        })()}

        {/* Failed to send banner */}
        {isFailed && isMine && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onRetry?.(message.id);
            }}
            className="flex-row items-center justify-end mt-1 mr-1"
          >
            <Ionicons name="alert-circle" size={12} color="#C94F4F" />
            <Text className="text-status-error text-[11px] ml-1">
              Failed to send · Tap to retry
            </Text>
          </Pressable>
        )}
      </View>

      {/* Date divider rendered AFTER the bubble in JSX so it appears
          ABOVE the message visually in the inverted FlatList */}
      {showDateDivider && <DateDivider date={message.timestamp} />}

      {/* Image viewer modal */}
      {viewerImages.length > 0 && (
        <ImageViewerModal
          visible={imageViewerVisible}
          images={viewerImages}
          initialIndex={imageViewerIndex}
          onClose={() => setImageViewerVisible(false)}
        />
      )}
    </>
  );
}
