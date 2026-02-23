import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ItineraryItem, ItineraryItemType } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (item: ItineraryItem) => void;
  onDelete?: (itemId: string) => void;
  /** If provided, we're editing this item. Otherwise it's a new item. */
  existingItem?: ItineraryItem | null;
  totalDays: number;
}

const ITEM_TYPES: { key: ItineraryItemType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'activity', label: 'Activity', icon: 'flag' },
  { key: 'accommodation', label: 'Stay', icon: 'bed' },
  { key: 'transport', label: 'Transport', icon: 'car' },
  { key: 'meal', label: 'Meal', icon: 'restaurant' },
  { key: 'other', label: 'Other', icon: 'ellipse' },
];

export function ItineraryItemModal({ visible, onClose, onSave, onDelete, existingItem, totalDays }: Props) {
  const isEditing = !!existingItem;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('');
  const [type, setType] = useState<ItineraryItemType>('activity');
  const [cost, setCost] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      if (existingItem) {
        setTitle(existingItem.title);
        setDescription(existingItem.description ?? '');
        setDay(existingItem.day);
        setTime(existingItem.time ?? '');
        setType(existingItem.type);
        setCost(existingItem.cost != null ? String(existingItem.cost) : '');
      } else {
        setTitle('');
        setDescription('');
        setDay(1);
        setTime('');
        setType('activity');
        setCost('');
      }
    }
  }, [visible, existingItem]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const item: ItineraryItem = {
      id: existingItem?.id ?? `itin-${Date.now()}`,
      day,
      time: time.trim() || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      cost: cost.trim() ? Number(cost) : undefined,
    };
    onSave(item);
    onClose();
  };

  const handleDelete = () => {
    if (!existingItem || !onDelete) return;
    Alert.alert('Delete Item', `Remove "${existingItem.title}" from the itinerary?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDelete(existingItem.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView className="flex-1 bg-background-primary" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-accent-primary text-[15px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">
            {isEditing ? 'Edit Item' : 'Add Item'}
          </Text>
          <Pressable onPress={handleSave} hitSlop={8}>
            <Text className="text-accent-primary text-[15px] font-semibold">Save</Text>
          </Pressable>
        </View>

        <View className="px-4 pt-4">
          {/* Title */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Visit Eiffel Tower"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4"
          />

          {/* Type picker */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">Type</Text>
          <View className="flex-row flex-wrap mb-4">
            {ITEM_TYPES.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => { Haptics.selectionAsync(); setType(t.key); }}
                className={`flex-row items-center px-3 py-2 rounded-full mr-2 mb-2 ${
                  type === t.key ? 'bg-accent-primary' : 'bg-surface-elevated'
                }`}
              >
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={type === t.key ? '#FFFFFF' : '#7A6355'}
                />
                <Text
                  className={`text-xs font-medium ml-1.5 ${
                    type === t.key ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Day picker */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">Day</Text>
          <View className="flex-row flex-wrap mb-4">
            {Array.from({ length: Math.max(totalDays, 1) }, (_, i) => i + 1).map((d) => (
              <Pressable
                key={d}
                onPress={() => { Haptics.selectionAsync(); setDay(d); }}
                className={`w-10 h-10 rounded-full items-center justify-center mr-2 mb-2 ${
                  day === d ? 'bg-accent-primary' : 'bg-surface-elevated'
                }`}
              >
                <Text className={`text-sm font-semibold ${day === d ? 'text-white' : 'text-text-secondary'}`}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Time */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">Time (optional)</Text>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="e.g. 09:00"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4"
          />

          {/* Description */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add details..."
            placeholderTextColor="#A8937F"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4 min-h-[80px]"
          />

          {/* Cost */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">Cost (optional)</Text>
          <TextInput
            value={cost}
            onChangeText={setCost}
            placeholder="0"
            placeholderTextColor="#A8937F"
            keyboardType="numeric"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-6"
          />

          {/* Delete button (edit mode only) */}
          {isEditing && onDelete && (
            <Pressable
              onPress={handleDelete}
              className="flex-row items-center justify-center py-3 bg-surface-elevated rounded-xl mb-8"
            >
              <Ionicons name="trash-outline" size={18} color="#C94F4F" />
              <Text className="text-status-error text-[15px] font-medium ml-2">
                Delete Item
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}
