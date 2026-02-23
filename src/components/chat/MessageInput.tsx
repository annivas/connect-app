import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  onSend: (content: string) => void;
  onPickImage?: () => void;
  onScheduleSend?: (content: string) => void;
  replyTo?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
  editingContent?: string | null;
  onSaveEdit?: (newContent: string) => void;
  onCancelEdit?: () => void;
}

export function MessageInput({ onSend, onPickImage, onScheduleSend, replyTo, onCancelReply, editingContent, onSaveEdit, onCancelEdit }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const isEditing = editingContent != null;

  // Pre-populate text when entering edit mode
  useEffect(() => {
    if (editingContent != null) {
      setText(editingContent);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [editingContent]);

  // Focus when replying
  useEffect(() => {
    if (replyTo) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [replyTo]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isEditing && onSaveEdit) {
      onSaveEdit(trimmed);
    } else {
      onSend(trimmed);
    }
    setText('');
  };

  const handleSchedule = () => {
    const trimmed = text.trim();
    if (!trimmed || !onScheduleSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onScheduleSend(trimmed);
    setText('');
  };

  const hasText = text.trim().length > 0;

  return (
    <View className="bg-background-secondary border-t border-border-subtle">
      {/* Editing banner */}
      {isEditing && (
        <View className="flex-row items-center px-3 pt-2 pb-1">
          <View className="flex-1 flex-row items-center bg-background-primary rounded-xl px-3 py-2 border-l-[3px] border-accent-secondary">
            <Ionicons name="pencil" size={14} color="#C2956B" />
            <View className="flex-1 ml-2">
              <Text className="text-accent-secondary text-[11px] font-semibold">Editing message</Text>
              <Text className="text-text-tertiary text-[12px]" numberOfLines={1}>
                {editingContent}
              </Text>
            </View>
            <Pressable
              onPress={onCancelEdit}
              hitSlop={12}
              className="ml-2 w-6 h-6 items-center justify-center rounded-full bg-surface-elevated"
            >
              <Ionicons name="close" size={14} color="#7A6355" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Reply preview banner */}
      {!isEditing && replyTo && (
        <View className="flex-row items-center px-3 pt-2 pb-1">
          <View className="flex-1 flex-row items-center bg-background-primary rounded-xl px-3 py-2 border-l-[3px] border-accent-primary">
            <Ionicons name="return-down-forward" size={14} color="#D4764E" />
            <View className="flex-1 ml-2">
              <Text className="text-accent-primary text-[11px] font-semibold" numberOfLines={1}>
                Replying to {replyTo.senderName}
              </Text>
              <Text className="text-text-tertiary text-[12px]" numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
            <Pressable
              onPress={onCancelReply}
              hitSlop={12}
              className="ml-2 w-6 h-6 items-center justify-center rounded-full bg-surface-elevated"
            >
              <Ionicons name="close" size={14} color="#7A6355" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Input row */}
      <View className="flex-row items-end px-3 py-2">
        {/* Attachment button */}
        {onPickImage && !isEditing && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPickImage();
            }}
            className="w-9 h-9 items-center justify-center mb-0.5 mr-1.5"
            hitSlop={6}
          >
            <Ionicons name="add-circle" size={28} color="#D4764E" />
          </Pressable>
        )}

        {/* Text input container */}
        <View className="flex-1 flex-row items-end bg-surface-elevated rounded-[22px] px-3.5 py-1.5 mr-2 min-h-[38px] border border-border-subtle">
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={isEditing ? 'Edit message...' : 'Message...'}
            placeholderTextColor="#A8937F"
            className="flex-1 text-text-primary text-[15px] max-h-[100px] py-1"
            multiline
            textAlignVertical="center"
          />
        </View>

        {/* Send button — long-press to schedule */}
        <Pressable
          onPress={handleSend}
          onLongPress={!isEditing && hasText && onScheduleSend ? handleSchedule : undefined}
          delayLongPress={500}
          disabled={!hasText}
          className={`w-9 h-9 rounded-full items-center justify-center mb-0.5 ${
            hasText
              ? isEditing ? 'bg-accent-secondary' : 'bg-accent-primary'
              : 'bg-transparent'
          }`}
        >
          <Ionicons
            name={isEditing ? 'checkmark' : 'arrow-up'}
            size={20}
            color={hasText ? '#FFFFFF' : '#A8937F'}
          />
        </Pressable>
      </View>
    </View>
  );
}
