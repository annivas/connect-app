import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RichStatus, FocusMode } from '../../types';

interface Props {
  visible: boolean;
  currentStatus?: RichStatus;
  onSave: (status: RichStatus) => void;
  onClear: () => void;
  onClose: () => void;
}

const PRESET_STATUSES: { emoji: string; text: string }[] = [
  { emoji: '💻', text: 'Deep work mode' },
  { emoji: '📅', text: 'In a meeting' },
  { emoji: '🏃', text: 'At the gym' },
  { emoji: '🍽️', text: 'Lunch break' },
  { emoji: '🎧', text: 'Listening to music' },
  { emoji: '✈️', text: 'Traveling' },
  { emoji: '🏠', text: 'Working from home' },
  { emoji: '📵', text: 'Offline for a bit' },
  { emoji: '🎮', text: 'Gaming' },
  { emoji: '📚', text: 'Studying' },
  { emoji: '🌴', text: 'On vacation' },
  { emoji: '🤒', text: 'Not feeling well' },
];

const DURATION_OPTIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: 'Today', minutes: 0 }, // Calculated to end of day
  { label: "Don't clear", minutes: -1 },
];

export function StatusPicker({ visible, currentStatus, onSave, onClear, onClose }: Props) {
  const [emoji, setEmoji] = useState(currentStatus?.emoji || '');
  const [text, setText] = useState(currentStatus?.text || '');
  const [selectedDuration, setSelectedDuration] = useState(4); // Default: "Don't clear"
  const [focusEnabled, setFocusEnabled] = useState(currentStatus?.focusMode?.enabled || false);
  const [autoReply, setAutoReply] = useState(currentStatus?.focusMode?.autoReply || '');

  const handlePresetSelect = (preset: { emoji: string; text: string }) => {
    Haptics.selectionAsync();
    setEmoji(preset.emoji);
    setText(preset.text);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let expiresAt: Date | undefined;
    const duration = DURATION_OPTIONS[selectedDuration];
    if (duration.minutes > 0) {
      expiresAt = new Date(Date.now() + duration.minutes * 60 * 1000);
    } else if (duration.minutes === 0) {
      // End of today
      expiresAt = new Date();
      expiresAt.setHours(23, 59, 59);
    }

    const focusMode: FocusMode | undefined = focusEnabled
      ? { enabled: true, autoReply: autoReply || undefined }
      : undefined;

    onSave({
      emoji: emoji || '💭',
      text: text || 'Busy',
      expiresAt,
      focusMode,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable
        className="flex-1 justify-end"
        onPress={onClose}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <Pressable onPress={() => {}} className="bg-background-primary rounded-t-3xl">
          <View className="p-4">
            {/* Handle bar */}
            <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />

            <Text className="text-text-primary text-lg font-bold mb-4">Set your status</Text>

            {/* Custom input */}
            <View className="flex-row items-center bg-surface rounded-2xl p-3 mb-4">
              <Text className="text-2xl mr-3">{emoji || '💭'}</Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="What's your status?"
                placeholderTextColor="#A8937F"
                className="flex-1 text-text-primary text-base"
              />
            </View>

            {/* Preset statuses */}
            <Text className="text-text-secondary text-sm font-medium mb-2">Quick pick</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
              className="mb-4"
            >
              {PRESET_STATUSES.map((preset) => (
                <Pressable
                  key={preset.text}
                  onPress={() => handlePresetSelect(preset)}
                  className="active:opacity-80"
                >
                  <View
                    className={`flex-row items-center rounded-full px-3 py-2 border ${
                      emoji === preset.emoji && text === preset.text
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border bg-surface'
                    }`}
                  >
                    <Text className="text-sm mr-1.5">{preset.emoji}</Text>
                    <Text className="text-text-primary text-xs">{preset.text}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {/* Duration picker */}
            <Text className="text-text-secondary text-sm font-medium mb-2">Clear after</Text>
            <View className="flex-row gap-2 mb-4">
              {DURATION_OPTIONS.map((option, index) => (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDuration(index);
                  }}
                  className="flex-1"
                >
                  <View
                    className={`rounded-xl py-2 items-center ${
                      selectedDuration === index
                        ? 'bg-accent-primary'
                        : 'bg-surface'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        selectedDuration === index ? 'text-white' : 'text-text-secondary'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Focus mode */}
            <View className="bg-surface rounded-2xl p-3.5 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Ionicons name="moon-outline" size={18} color="#D4964E" />
                  <Text className="text-text-primary text-sm font-medium ml-2">Focus Mode</Text>
                </View>
                <Switch
                  value={focusEnabled}
                  onValueChange={(v) => {
                    Haptics.selectionAsync();
                    setFocusEnabled(v);
                  }}
                  trackColor={{ false: '#E8D5C4', true: '#D4764E' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {focusEnabled && (
                <TextInput
                  value={autoReply}
                  onChangeText={setAutoReply}
                  placeholder="Auto-reply message (optional)"
                  placeholderTextColor="#A8937F"
                  className="text-text-secondary text-xs bg-background-primary rounded-xl px-3 py-2 mt-1"
                />
              )}
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-3">
              {currentStatus && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClear();
                    onClose();
                  }}
                  className="flex-1 active:opacity-80"
                >
                  <View className="bg-surface rounded-2xl py-3.5 items-center">
                    <Text className="text-text-secondary text-sm font-medium">Clear status</Text>
                  </View>
                </Pressable>
              )}
              <Pressable
                onPress={handleSave}
                className="flex-1 active:opacity-80"
              >
                <View className="bg-accent-primary rounded-2xl py-3.5 items-center">
                  <Text className="text-white text-sm font-bold">Save</Text>
                </View>
              </Pressable>
            </View>

            {/* Bottom padding for home indicator */}
            <View className="h-8" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
