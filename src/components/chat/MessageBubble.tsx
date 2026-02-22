import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { ReactionPicker } from './ReactionPicker';
import { Message, Reaction } from '../../types';
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
}: Props) {
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const getUserById = useUserStore((s) => s.getUserById);
  const isMine = message.senderId === currentUserId;
  const isFailed = message.sendStatus === 'failed';
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const sender = !isMine ? getUserById(message.senderId) : null;

  // ─── Swipe-to-reply gesture (Reanimated) ───
  const translateX = useSharedValue(0);
  const replyIconOpacity = useSharedValue(0);
  const hasTriggered = useSharedValue(false);

  const triggerReply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReply?.(message);
  }, [message, onReply]);

  const openReactionPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowReactionPicker(true);
  }, []);

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

  // Long-press gesture for reaction picker — managed at the gesture-handler level
  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      runOnJS(openReactionPicker)();
    });

  // Race: whichever gesture activates first wins. Pan (horizontal swipe) and
  // LongPress (hold in place) naturally compete — the user either drags or holds.
  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyIconStyle = useAnimatedStyle(() => ({
    opacity: replyIconOpacity.value,
    transform: [{ scale: 0.5 + replyIconOpacity.value * 0.5 }],
  }));

  // ─── "More" actions (Copy, Reply, Edit, Delete via ActionSheet) ───

  const confirmDelete = () => {
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete?.(message.id),
      },
    ]);
  };

  const showMoreActions = () => {
    const actions: { label: string; handler: () => void }[] = [
      { label: 'Copy Text', handler: () => Clipboard.setStringAsync(message.content) },
    ];
    if (onReply) {
      actions.push({ label: 'Reply', handler: () => onReply(message) });
    }
    if (isMine && onEdit && message.type === 'text') {
      actions.push({ label: 'Edit', handler: () => onEdit(message.id, message.content) });
    }
    if (isMine && onDelete) {
      actions.push({ label: 'Delete', handler: confirmDelete });
    }

    const options = [...actions.map((a) => a.label), 'Cancel'];
    const cancelIndex = options.length - 1;
    const destructiveIndex = actions.findIndex((a) => a.label === 'Delete');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        (idx) => {
          if (idx < actions.length) actions[idx].handler();
        },
      );
    } else {
      Alert.alert('Message', undefined, [
        ...actions.map((a) => ({ text: a.label, onPress: a.handler })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const handleReactionSelect = (emoji: string) => {
    onReact?.(message.id, emoji);
  };

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
      {showDateDivider && <DateDivider date={message.timestamp} />}

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

        {/* Composed gesture: Pan (swipe-to-reply) races with LongPress (reaction picker) */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={swipeStyle}>
            {/* Reaction picker — positioned above the bubble */}
            {showReactionPicker && (
              <View className={`mb-1.5 ${isMine ? 'items-end pr-0' : 'items-start pl-9'}`}>
                <ReactionPicker
                  onSelect={handleReactionSelect}
                  onClose={() => setShowReactionPicker(false)}
                  onMore={() => {
                    setShowReactionPicker(false);
                    showMoreActions();
                  }}
                />
              </View>
            )}

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
                {message.type === 'image' ? (
                  <View
                    style={getBubbleRadius()}
                    className={`overflow-hidden ${isFailed ? 'opacity-60' : ''}`}
                  >
                    <Image
                      source={{ uri: message.content }}
                      style={{
                        width: 220,
                        aspectRatio:
                          (message.metadata?.width as number) && (message.metadata?.height as number)
                            ? (message.metadata!.width as number) / (message.metadata!.height as number)
                            : 4 / 3,
                      }}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                ) : (
                  <View
                    style={getBubbleRadius()}
                    className={`px-3.5 py-2 ${
                      isMine
                        ? isFailed
                          ? 'bg-accent-primary/60'
                          : 'bg-accent-primary'
                        : 'bg-surface-elevated'
                    }`}
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

                    <Text
                      className={`text-[15px] leading-[21px] ${
                        isMine ? 'text-white' : 'text-text-primary'
                      }`}
                    >
                      {message.content}
                    </Text>

                    {/* Inline timestamp + status */}
                    {isLastInGroup && (
                      <View className={`flex-row items-center mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
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

        {/* Reaction pills (slightly overlapping the bubble bottom) */}
        {hasReactions && (
          <ReactionPills
            reactions={message.reactions ?? []}
            currentUserId={currentUserId}
            isMine={isMine}
            onToggle={(emoji) => onReact?.(message.id, emoji)}
          />
        )}
      </View>

      {/* Dismiss reaction picker on tap outside */}
      {showReactionPicker && (
        <Pressable
          onPress={() => setShowReactionPicker(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
          }}
        />
      )}
    </>
  );
}
