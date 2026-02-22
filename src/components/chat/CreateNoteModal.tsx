import React, { useState } from 'react';
import { View, Text, TextInput, Modal, Pressable, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMessagesStore } from '../../stores/useMessagesStore';

interface Props {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

const NOTE_COLORS = ['#6366F1', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export function CreateNoteModal({ visible, conversationId, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = title.trim().length > 0 && !isSaving;

  const reset = () => {
    setTitle('');
    setContent('');
    setColor(NOTE_COLORS[0]);
    setIsPrivate(false);
    setIsSaving(false);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      await useMessagesStore.getState().createNote(conversationId, {
        title: title.trim(),
        content: content.trim(),
        color,
        isPrivate,
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
          <Text className="text-text-primary text-[17px] font-semibold">New Note</Text>
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
            placeholder="Note title"
            placeholderTextColor="#6B6B76"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
          />

          {/* Content */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Content
          </Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Write your note..."
            placeholderTextColor="#6B6B76"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
            multiline
            style={{ minHeight: 120 }}
            textAlignVertical="top"
          />

          {/* Color Picker */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
            Color
          </Text>
          <View className="flex-row gap-3 mb-5">
            {NOTE_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  Haptics.selectionAsync();
                  setColor(c);
                }}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: c }}
              >
                {color === c && (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                )}
              </Pressable>
            ))}
          </View>

          {/* Private Toggle */}
          <View className="flex-row items-center justify-between bg-surface rounded-xl px-4 py-3">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed-outline" size={18} color="#A0A0AB" />
              <Text className="text-text-primary text-[15px] ml-2">Private note</Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                setIsPrivate(val);
              }}
              trackColor={{ false: '#2D2D40', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
