import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, Platform } from 'react-native';
import { useToastStore } from '../../stores/useToastStore';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { GroupEvent } from '../../types';

const EVENT_TYPES: { value: GroupEvent['type']; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'hangout', label: 'Hangout', icon: 'people-outline' },
  { value: 'sports', label: 'Sports', icon: 'football-outline' },
  { value: 'trip', label: 'Trip', icon: 'airplane-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

/** Quick-pick day options relative to today */
function getDayOptions() {
  const today = new Date();
  return [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: format(addDays(today, 2), 'EEE'), date: addDays(today, 2) },
    { label: format(addDays(today, 3), 'EEE'), date: addDays(today, 3) },
    { label: format(addDays(today, 4), 'EEE'), date: addDays(today, 4) },
    { label: format(addDays(today, 5), 'EEE'), date: addDays(today, 5) },
    { label: format(addDays(today, 6), 'EEE'), date: addDays(today, 6) },
  ];
}

// Preset quick-pick slots. Index 4 = custom (user picks exact time).
const TIME_SLOTS = [
  { label: 'Morning', hour: 10, minute: 0 },
  { label: 'Afternoon', hour: 14, minute: 0 },
  { label: 'Evening', hour: 18, minute: 0 },
  { label: 'Night', hour: 21, minute: 0 },
];
const CUSTOM_INDEX = 4;

function defaultCustomTime(): Date {
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  return d;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (event: Omit<GroupEvent, 'id' | 'groupId' | 'createdBy' | 'attendees'>) => void;
  suggestedTitle?: string;
}

export function CreateEventModal({ visible, onClose, onSave, suggestedTitle }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<GroupEvent['type']>('hangout');
  const [selectedDayIndex, setSelectedDayIndex] = useState(1); // tomorrow
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(2); // evening
  const [customTime, setCustomTime] = useState<Date>(defaultCustomTime);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(suggestedTitle ?? '');
      setDescription('');
      setEventType('hangout');
      setSelectedDayIndex(1);
      setSelectedTimeIndex(2);
      setCustomTime(defaultCustomTime());
    }
  }, [visible, suggestedTitle]);

  const dayOptions = getDayOptions();
  const isCustom = selectedTimeIndex === CUSTOM_INDEX;

  /** Build the final startDate from selected day + time */
  const buildStartDate = (): Date => {
    const day = dayOptions[selectedDayIndex].date;
    const d = new Date(day);
    if (isCustom) {
      d.setHours(customTime.getHours(), customTime.getMinutes(), 0, 0);
    } else {
      const slot = TIME_SLOTS[selectedTimeIndex];
      d.setHours(slot.hour, slot.minute, 0, 0);
    }
    return d;
  };

  /** Human-readable time label for the custom button */
  const customLabel = format(customTime, 'h:mm a');

  const handleSave = () => {
    if (!title.trim()) {
      useToastStore.getState().show({ message: 'Please enter a title for the event.', type: 'warning' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: buildStartDate(),
      type: eventType,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={onClose}>
            <Text className="text-text-secondary text-[15px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">New Event</Text>
          <Pressable onPress={handleSave}>
            <Text className="text-accent-primary text-[15px] font-semibold">Create</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardDismissMode="on-drag">
          {/* Title */}
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-1.5">Title</Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4"
            value={title}
            onChangeText={setTitle}
            placeholder="Event name"
            placeholderTextColor="#A8937F"
            autoFocus
          />

          {/* Type Picker */}
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-1.5">Type</Text>
          <View className="flex-row gap-2 mb-4">
            {EVENT_TYPES.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setEventType(t.value);
                }}
                className={`flex-1 rounded-xl py-2.5 items-center ${
                  eventType === t.value ? 'bg-accent-primary' : 'bg-surface'
                }`}
              >
                <Ionicons
                  name={t.icon}
                  size={18}
                  color={eventType === t.value ? '#FFFFFF' : '#A8937F'}
                />
                <Text
                  className={`text-[11px] mt-1 ${
                    eventType === t.value ? 'text-white font-semibold' : 'text-text-secondary'
                  }`}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Day Picker */}
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-1.5">When</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            className="mb-4"
          >
            {dayOptions.map((opt, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDayIndex(i);
                }}
                className={`rounded-xl px-4 py-2.5 items-center ${
                  selectedDayIndex === i ? 'bg-accent-primary' : 'bg-surface'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedDayIndex === i ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {opt.label}
                </Text>
                <Text
                  className={`text-[10px] mt-0.5 ${
                    selectedDayIndex === i ? 'text-white/70' : 'text-text-tertiary'
                  }`}
                >
                  {format(opt.date, 'MMM d')}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Time Picker — presets + custom */}
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-1.5">Time</Text>

          {/* Preset chips row */}
          <View className="flex-row gap-2 mb-2">
            {TIME_SLOTS.map((slot, i) => (
              <Pressable
                key={slot.label}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedTimeIndex(i);
                }}
                className={`flex-1 rounded-xl py-2.5 items-center ${
                  selectedTimeIndex === i ? 'bg-accent-primary' : 'bg-surface'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    selectedTimeIndex === i ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {slot.label}
                </Text>
                <Text
                  className={`text-[10px] mt-0.5 ${
                    selectedTimeIndex === i ? 'text-white/70' : 'text-text-tertiary'
                  }`}
                >
                  {slot.hour > 12 ? `${slot.hour - 12} PM` : `${slot.hour} AM`}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom time row */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedTimeIndex(CUSTOM_INDEX);
              if (Platform.OS === 'android') setShowAndroidPicker(true);
            }}
            className={`rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between ${
              isCustom ? 'bg-accent-primary' : 'bg-surface'
            }`}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="time-outline"
                size={16}
                color={isCustom ? '#FFFFFF' : '#A8937F'}
              />
              <Text className={`text-sm font-medium ${isCustom ? 'text-white' : 'text-text-secondary'}`}>
                Custom time
              </Text>
            </View>
            <Text className={`text-sm font-semibold ${isCustom ? 'text-white' : 'text-accent-primary'}`}>
              {customLabel}
            </Text>
          </Pressable>

          {/* iOS inline time spinner — shown when Custom is selected */}
          {isCustom && Platform.OS === 'ios' && (
            <View className="bg-surface rounded-xl mb-4 overflow-hidden">
              <DateTimePicker
                value={customTime}
                mode="time"
                display="spinner"
                onChange={(_e, date) => { if (date) setCustomTime(date); }}
                themeVariant="light"
              />
            </View>
          )}

          {/* Android picker — launched as dialog */}
          {showAndroidPicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={customTime}
              mode="time"
              display="default"
              onChange={(_e, date) => {
                setShowAndroidPicker(false);
                if (date) setCustomTime(date);
              }}
            />
          )}

          {/* Description */}
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-1.5">
            Description (optional)
          </Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4"
            value={description}
            onChangeText={setDescription}
            placeholder="What's the plan?"
            placeholderTextColor="#A8937F"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
