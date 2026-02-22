import React, { useState } from 'react';
import { View, Text, TextInput, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { parse, isValid } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useMessagesStore } from '../../stores/useMessagesStore';

interface Props {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

type Priority = 'low' | 'medium' | 'high';

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#6B6B76' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
];

export function CreateReminderModal({ visible, conversationId, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateText, setDateText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [isSaving, setIsSaving] = useState(false);
  const [dateError, setDateError] = useState('');

  const parsedDate = parse(dateText, 'yyyy-MM-dd HH:mm', new Date());
  const isDateValid = dateText.length > 0 && isValid(parsedDate);
  const canSave = title.trim().length > 0 && isDateValid && !isSaving;

  const reset = () => {
    setTitle('');
    setDescription('');
    setDateText('');
    setPriority('medium');
    setIsSaving(false);
    setDateError('');
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleDateBlur = () => {
    if (dateText.length > 0 && !isDateValid) {
      setDateError('Use format: YYYY-MM-DD HH:mm');
    } else {
      setDateError('');
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      await useMessagesStore.getState().createReminder(conversationId, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: parsedDate.toISOString(),
        priority,
      });
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
          <Text className="text-text-primary text-[17px] font-semibold">New Reminder</Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#6366F1" />
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
            placeholder="Reminder title"
            placeholderTextColor="#6B6B76"
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
            placeholderTextColor="#6B6B76"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
            multiline
            style={{ minHeight: 80 }}
            textAlignVertical="top"
          />

          {/* Due Date */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Due Date
          </Text>
          <TextInput
            value={dateText}
            onChangeText={(text) => {
              setDateText(text);
              setDateError('');
            }}
            onBlur={handleDateBlur}
            placeholder="YYYY-MM-DD HH:mm"
            placeholderTextColor="#6B6B76"
            className={`bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-1 ${
              dateError ? 'border border-status-error' : ''
            }`}
          />
          {dateError ? (
            <Text className="text-status-error text-xs mb-4">{dateError}</Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Priority */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
            Priority
          </Text>
          <View className="flex-row gap-3 mb-5">
            {PRIORITIES.map((p) => {
              const isSelected = priority === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(p.value);
                  }}
                  className={`flex-1 py-2.5 rounded-xl items-center border-2 ${
                    isSelected ? '' : 'bg-transparent'
                  }`}
                  style={{
                    borderColor: p.color,
                    backgroundColor: isSelected ? p.color + '20' : 'transparent',
                  }}
                >
                  <Text
                    className="text-[14px] font-semibold"
                    style={{ color: p.color }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
