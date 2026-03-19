import React, { useState } from 'react';
import { View, Text, TextInput, Modal, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface EventData {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave?: (event: EventData) => void;
  onUpdate?: (eventId: string, updates: Partial<EventData>) => void;
  editingEvent?: (EventData & { id: string }) | null;
  suggestedTitle?: string;
}

export function CreateEventModal({ visible, onClose, onSave, onUpdate, editingEvent, suggestedTitle }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAndroidStartPicker, setShowAndroidStartPicker] = useState(false);
  const [showAndroidEndPicker, setShowAndroidEndPicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState<'date' | 'time'>('date');
  const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');
  const [showEndDate, setShowEndDate] = useState(false);

  const isEditing = !!editingEvent;

  React.useEffect(() => {
    if (editingEvent && visible) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description ?? '');
      setLocation(editingEvent.location ?? '');
      setStartDate(editingEvent.startDate instanceof Date ? editingEvent.startDate : new Date(editingEvent.startDate));
      if (editingEvent.endDate) {
        setEndDate(editingEvent.endDate instanceof Date ? editingEvent.endDate : new Date(editingEvent.endDate));
        setShowEndDate(true);
      }
    } else if (!editingEvent && visible && suggestedTitle) {
      setTitle(suggestedTitle);
    }
  }, [editingEvent, visible, suggestedTitle]);

  const canSave = title.trim().length > 0 && !isSaving;

  const reset = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStartDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    setEndDate(null);
    setIsSaving(false);
    setShowAndroidStartPicker(false);
    setShowAndroidEndPicker(false);
    setShowEndDate(false);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleStartDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowAndroidStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      if (Platform.OS === 'android' && startPickerMode === 'date') {
        setStartPickerMode('time');
        setShowAndroidStartPicker(true);
      }
    }
  };

  const handleEndDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowAndroidEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      if (Platform.OS === 'android' && endPickerMode === 'date') {
        setEndPickerMode('time');
        setShowAndroidEndPicker(true);
      }
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      const eventData: EventData = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate: showEndDate && endDate ? endDate : undefined,
        location: location.trim() || undefined,
      };

      if (isEditing && onUpdate) {
        onUpdate(editingEvent!.id, eventData);
      } else {
        await onSave?.(eventData);
      }
      reset();
      onClose();
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Text className="text-accent-primary text-[16px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">{isEditing ? 'Edit Event' : 'New Event'}</Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#D4764E" />
            ) : (
              <Text
                className={`text-[16px] font-semibold ${
                  canSave ? 'text-accent-primary' : 'text-text-tertiary'
                }`}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardDismissMode="interactive">
          {/* Title */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Event title"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
          />

          {/* Description */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Description (optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add details..."
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
            multiline
            style={{ minHeight: 80 }}
            textAlignVertical="top"
          />

          {/* Location */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Location (optional)
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Add location..."
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
          />

          {/* Start Date */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Start Date
          </Text>
          {Platform.OS === 'ios' ? (
            <View className="bg-surface rounded-xl mb-4 overflow-hidden">
              <DateTimePicker
                value={startDate}
                mode="datetime"
                display="spinner"
                onChange={handleStartDateChange}
                themeVariant="light"
              />
            </View>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setStartPickerMode('date');
                  setShowAndroidStartPicker(true);
                }}
                className="bg-surface rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
              >
                <Text className="text-text-primary text-[15px]">
                  {format(startDate, 'MMM d, yyyy · h:mm a')}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#D4764E" />
              </Pressable>
              {showAndroidStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode={startPickerMode}
                  display="default"
                  onChange={handleStartDateChange}
                  themeVariant="light"
                />
              )}
            </>
          )}

          {/* End Date toggle */}
          {!showEndDate ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setShowEndDate(true);
                setEndDate(new Date(startDate.getTime() + 2 * 60 * 60 * 1000));
              }}
              className="flex-row items-center mb-5"
            >
              <Ionicons name="add-circle-outline" size={18} color="#D4764E" />
              <Text className="text-accent-primary text-sm font-medium ml-2">Add end date</Text>
            </Pressable>
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                  End Date
                </Text>
                <Pressable
                  onPress={() => {
                    setShowEndDate(false);
                    setEndDate(null);
                  }}
                  hitSlop={8}
                >
                  <Text className="text-status-error text-xs font-medium">Remove</Text>
                </Pressable>
              </View>
              {Platform.OS === 'ios' ? (
                <View className="bg-surface rounded-xl mb-4 overflow-hidden">
                  <DateTimePicker
                    value={endDate ?? new Date(startDate.getTime() + 2 * 60 * 60 * 1000)}
                    mode="datetime"
                    display="spinner"
                    minimumDate={startDate}
                    onChange={handleEndDateChange}
                    themeVariant="light"
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEndPickerMode('date');
                      setShowAndroidEndPicker(true);
                    }}
                    className="bg-surface rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
                  >
                    <Text className="text-text-primary text-[15px]">
                      {format(endDate ?? startDate, 'MMM d, yyyy · h:mm a')}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color="#D4764E" />
                  </Pressable>
                  {showAndroidEndPicker && (
                    <DateTimePicker
                      value={endDate ?? new Date(startDate.getTime() + 2 * 60 * 60 * 1000)}
                      mode={endPickerMode}
                      display="default"
                      minimumDate={startDate}
                      onChange={handleEndDateChange}
                      themeVariant="light"
                    />
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
