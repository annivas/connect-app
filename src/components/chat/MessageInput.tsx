import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  onSend: (content: string) => void;
  onPickImage?: () => void;
  replyTo?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
  editingContent?: string | null;
  onSaveEdit?: (newContent: string) => void;
  onCancelEdit?: () => void;
}

export function MessageInput({ onSend, onPickImage, replyTo, onCancelReply, editingContent, onSaveEdit, onCancelEdit }: Props) {
  const [text, setText] = useState('');
  const isEditing = editingContent != null;

  // Pre-populate text when entering edit mode
  useEffect(() => {
    if (editingContent != null) {
      setText(editingContent);
    }
  }, [editingContent]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isEditing && onSaveEdit) {
      onSaveEdit(trimmed);
    } else {
      onSend(trimmed);
    }
    setText('');
  };

  const hasText = text.trim().length > 0;

  return (
    <View className="bg-background-secondary border-t border-border-subtle">
      {/* Editing banner */}
      {isEditing && (
        <View className="flex-row items-center px-4 pt-2 pb-1">
          <View className="flex-1 flex-row items-center bg-surface/50 rounded-lg px-3 py-2 border-l-2 border-accent-secondary">
            <Ionicons name="pencil" size={14} color="#8B5CF6" />
            <View className="flex-1 ml-2">
              <Text className="text-accent-secondary text-[11px] font-semibold">Editing</Text>
              <Text className="text-text-tertiary text-[12px]" numberOfLines={1}>
                {editingContent}
              </Text>
            </View>
            <Pressable onPress={onCancelEdit} hitSlop={8} className="ml-2">
              <Ionicons name="close" size={18} color="#6B6B76" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Reply preview banner */}
      {!isEditing && replyTo && (
        <View className="flex-row items-center px-4 pt-2 pb-1">
          <View className="flex-1 flex-row items-center bg-surface/50 rounded-lg px-3 py-2 border-l-2 border-accent-primary">
            <Ionicons name="return-down-forward" size={14} color="#6366F1" />
            <View className="flex-1 ml-2">
              <Text className="text-accent-primary text-[11px] font-semibold" numberOfLines={1}>
                {replyTo.senderName}
              </Text>
              <Text className="text-text-tertiary text-[12px]" numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
            <Pressable onPress={onCancelReply} hitSlop={8} className="ml-2">
              <Ionicons name="close" size={18} color="#6B6B76" />
            </Pressable>
          </View>
        </View>
      )}

      <View className="flex-row items-end px-4 py-3">
        {/* Image picker button */}
        {onPickImage && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPickImage();
            }}
            className="w-11 h-11 items-center justify-center mr-1"
            hitSlop={4}
          >
            <Ionicons name="image-outline" size={24} color="#6B6B76" />
          </Pressable>
        )}

        <View className="flex-1 flex-row items-end bg-surface rounded-3xl px-4 py-2 mr-2 min-h-[44px]">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="#6B6B76"
            className="flex-1 text-text-primary text-[15px] max-h-[100px]"
            multiline
            textAlignVertical="center"
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!hasText}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            hasText
              ? isEditing ? 'bg-accent-secondary' : 'bg-accent-primary'
              : 'bg-surface'
          }`}
        >
          <Ionicons
            name={isEditing ? 'checkmark' : 'arrow-up'}
            size={22}
            color={hasText ? '#FFFFFF' : '#6B6B76'}
          />
        </Pressable>
      </View>
    </View>
  );
}
