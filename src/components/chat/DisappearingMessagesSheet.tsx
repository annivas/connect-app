import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { DisappearingDuration } from '../../types';

interface Props {
  visible: boolean;
  currentDuration: DisappearingDuration;
  onSelect: (duration: DisappearingDuration) => void;
  onClose: () => void;
}

const OPTIONS: { value: DisappearingDuration; label: string; description: string }[] = [
  { value: '30s', label: '30 seconds', description: 'For quick sensitive messages' },
  { value: '5m', label: '5 minutes', description: 'Brief conversations' },
  { value: '1h', label: '1 hour', description: 'Temporary discussions' },
  { value: '24h', label: '24 hours', description: 'Day-long conversations' },
  { value: '7d', label: '7 days', description: 'Weekly cleanup' },
  { value: 'off', label: 'Off', description: 'Messages stay forever' },
];

export function DisappearingMessagesSheet({ visible, currentDuration, onSelect, onClose }: Props) {
  const handleSelect = (duration: DisappearingDuration) => {
    Haptics.selectionAsync();
    onSelect(duration);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={onClose} className="mr-3">
            <Ionicons name="close" size={24} color="#A0A0AB" />
          </Pressable>
          <Text className="text-text-primary text-lg font-semibold flex-1">
            Disappearing Messages
          </Text>
        </View>

        {/* Info */}
        <View className="px-4 py-3 mx-4 mt-4 bg-surface-elevated rounded-xl">
          <View className="flex-row items-center mb-1.5">
            <Ionicons name="timer-outline" size={16} color="#6366F1" />
            <Text className="text-accent-primary text-[13px] font-semibold ml-1.5">
              How it works
            </Text>
          </View>
          <Text className="text-text-secondary text-[13px] leading-[18px]">
            When enabled, new messages sent in this chat will disappear after the
            selected time. This setting applies to all participants.
          </Text>
        </View>

        {/* Duration options */}
        <View className="mt-4 mx-4">
          <Text className="text-text-tertiary text-[12px] font-medium uppercase tracking-wide mb-2 ml-1">
            Timer duration
          </Text>
          <View className="bg-surface rounded-2xl overflow-hidden border border-border-subtle">
            {OPTIONS.map((option, index) => (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option.value)}
                className={`flex-row items-center px-4 py-3.5 ${
                  index < OPTIONS.length - 1 ? 'border-b border-border-subtle' : ''
                } active:bg-surface-hover`}
              >
                <View className="flex-1">
                  <Text className="text-text-primary text-[15px] font-medium">
                    {option.label}
                  </Text>
                  <Text className="text-text-tertiary text-[12px] mt-0.5">
                    {option.description}
                  </Text>
                </View>
                {currentDuration === option.value && (
                  <Ionicons name="checkmark-circle" size={22} color="#6366F1" />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
