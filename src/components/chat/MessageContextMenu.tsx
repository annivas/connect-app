import React from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeOut, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ReactionPicker } from './ReactionPicker';
import type { Message } from '../../types';
import { useToastStore } from '../../stores/useToastStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ContextMenuAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  message: Message;
  isMine: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  onStar: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRemindMe?: () => void;
  onSplitThis?: () => void;
}

export function MessageContextMenu({
  message,
  isMine,
  onClose,
  onReact,
  onReply,
  onForward,
  onPin,
  onStar,
  onCopy,
  onEdit,
  onDelete,
  onRemindMe,
  onSplitThis,
}: Props) {
  const actions: ContextMenuAction[] = [
    { id: 'reply', label: 'Reply', icon: 'arrow-undo', onPress: onReply },
    { id: 'forward', label: 'Forward', icon: 'arrow-redo', onPress: onForward },
    {
      id: 'pin',
      label: message.isPinned ? 'Unpin' : 'Pin',
      icon: message.isPinned ? 'pin-outline' : 'pin',
      onPress: onPin,
    },
    {
      id: 'star',
      label: message.isStarred ? 'Unstar' : 'Star',
      icon: message.isStarred ? 'star' : 'star-outline',
      onPress: onStar,
    },
    { id: 'copy', label: 'Copy Text', icon: 'copy-outline', onPress: onCopy },
  ];

  if (isMine && onEdit && message.type === 'text') {
    actions.push({ id: 'edit', label: 'Edit', icon: 'pencil-outline', onPress: onEdit });
  }

  if (onRemindMe) {
    actions.push({ id: 'remind', label: 'Remind Me', icon: 'alarm-outline', onPress: onRemindMe });
  }

  if (onSplitThis) {
    actions.push({ id: 'split', label: 'Split This', icon: 'receipt-outline', onPress: onSplitThis });
  }

  if (isMine && onDelete) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: 'trash-outline',
      destructive: true,
      onPress: onDelete,
    });
  }

  if (!isMine) {
    actions.push({ id: 'report', label: 'Report', icon: 'flag-outline', destructive: true, onPress: () => {
      useToastStore.getState().show({ message: 'Message reported', type: 'success' });
    } });
  }

  const handleAction = (action: ContextMenuAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    // Small delay to let overlay dismiss before executing action
    setTimeout(() => action.onPress(), 100);
  };

  const handleReaction = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact(emoji);
    onClose();
  };

  return (
    <Pressable
      onPress={onClose}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
      }}
    >
      {/* Dimmed backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{ flex: 1 }}
      >
        <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
          <View className="flex-1 bg-black/40 justify-center px-4">
            {/* Content area — prevent close on inner touch */}
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Reaction bar */}
              <Animated.View
                entering={FadeInUp.duration(200).delay(50)}
                className={`mb-3 ${isMine ? 'items-end' : 'items-start'}`}
              >
                <ReactionPicker
                  onSelect={handleReaction}
                  onClose={onClose}
                />
              </Animated.View>

              {/* Message preview snippet */}
              <View
                className={`mb-3 px-3.5 py-2.5 rounded-2xl max-w-[85%] ${
                  isMine ? 'bg-accent-primary self-end' : 'bg-surface-elevated self-start'
                }`}
              >
                <Text
                  className={`text-[15px] leading-[21px] ${
                    isMine ? 'text-white' : 'text-text-primary'
                  }`}
                  numberOfLines={4}
                >
                  {message.content || 'Voice message'}
                </Text>
              </View>

              {/* Action list */}
              <Animated.View
                entering={FadeInUp.duration(250).delay(100)}
                className="bg-surface rounded-2xl overflow-hidden border border-border-subtle"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 12,
                  maxHeight: SCREEN_HEIGHT * 0.4,
                }}
              >
                <ScrollView bounces={false}>
                  {actions.map((action, index) => (
                    <Pressable
                      key={action.id}
                      onPress={() => handleAction(action)}
                      className={`flex-row items-center px-4 py-3 ${
                        index < actions.length - 1 ? 'border-b border-border-subtle' : ''
                      } active:bg-surface-hover`}
                    >
                      <View className="w-8 items-center">
                        <Ionicons
                          name={action.icon}
                          size={20}
                          color={action.destructive ? '#C94F4F' : '#A8937F'}
                        />
                      </View>
                      <Text
                        className={`text-[15px] ml-2 ${
                          action.destructive ? 'text-status-error' : 'text-text-primary'
                        }`}
                      >
                        {action.label}
                      </Text>
                      {/* Show current state for star/pin */}
                      {action.id === 'star' && message.isStarred && (
                        <View className="ml-auto">
                          <Ionicons name="star" size={14} color="#F59E0B" />
                        </View>
                      )}
                      {action.id === 'pin' && message.isPinned && (
                        <View className="ml-auto">
                          <Ionicons name="pin" size={14} color="#D4764E" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </Animated.View>
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>
    </Pressable>
  );
}
