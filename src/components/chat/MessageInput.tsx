import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Keyboard, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { VoiceRecordButton } from './VoiceRecordButton';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { InlineFormatToolbar } from '../ui/InlineFormatToolbar';
import { applyInlineFormat } from '../../utils/inlineFormatting';
import type { InlineFormat } from '../../utils/inlineFormatting';

interface Props {
  conversationId?: string;
  onSend: (content: string) => void;
  onPickImage?: () => void;
  onScheduleSend?: (content: string) => void;
  onSendVoice?: (data: { duration: number; waveformSamples: number[]; uri: string }) => void;
  replyTo?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
  editingContent?: string | null;
  onSaveEdit?: (newContent: string) => void;
  onCancelEdit?: () => void;
}

export function MessageInput({ conversationId, onSend, onPickImage, onScheduleSend, onSendVoice, replyTo, onCancelReply, editingContent, onSaveEdit, onCancelEdit }: Props) {
  const initialDraft = conversationId ? useMessagesStore.getState().getDraft(conversationId) : '';
  const [text, setText] = useState(initialDraft);
  const inputRef = useRef<TextInput>(null);
  const isEditing = editingContent != null;
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [controlledSelection, setControlledSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Debounced draft saving
  const saveDraft = useCallback((value: string) => {
    if (!conversationId) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (value.trim()) {
        useMessagesStore.getState().setDraft(conversationId, value);
      } else {
        useMessagesStore.getState().clearDraft(conversationId);
      }
    }, 500);
  }, [conversationId]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleFormat = useCallback((format: InlineFormat) => {
    const result = applyInlineFormat(text, selectionRef.current, format);
    setText(result.text);
    saveDraft(result.text);
    setControlledSelection(result.selection);
    setTimeout(() => setControlledSelection(undefined), 50);
  }, [text, saveDraft]);

  const handleTextChange = (value: string) => {
    setText(value);
    saveDraft(value);
  };

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
    if (conversationId) useMessagesStore.getState().clearDraft(conversationId);
  };

  const handleSchedule = () => {
    const trimmed = text.trim();
    if (!trimmed || !onScheduleSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onScheduleSend(trimmed);
    setText('');
    if (conversationId) useMessagesStore.getState().clearDraft(conversationId);
  };

  const hasText = text.trim().length > 0;

  return (
    <View className="bg-background-secondary border-t border-border-subtle">
      {/* Inline format toolbar */}
      {keyboardVisible && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6 }}
          className="border-b border-border-subtle"
        >
          <InlineFormatToolbar onFormat={handleFormat} />
        </ScrollView>
      )}

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
            onChangeText={handleTextChange}
            selection={controlledSelection}
            onSelectionChange={(e) => {
              selectionRef.current = e.nativeEvent.selection;
            }}
            placeholder={isEditing ? 'Edit message...' : 'Message...'}
            placeholderTextColor="#A8937F"
            className="flex-1 text-text-primary text-[15px] max-h-[100px] py-1"
            multiline
            textAlignVertical="center"
          />
        </View>

        {/* Schedule send button (visible when text present and not editing) */}
        {hasText && !isEditing && onScheduleSend && (
          <Pressable
            onPress={handleSchedule}
            className="w-9 h-9 items-center justify-center mb-0.5 mr-0.5"
            hitSlop={6}
          >
            <Ionicons name="time-outline" size={22} color="#C2956B" />
          </Pressable>
        )}

        {/* Send / Voice toggle — shows mic when empty, send when has text */}
        {hasText || isEditing ? (
          <Pressable
            onPress={handleSend}
            className={`w-9 h-9 rounded-full items-center justify-center mb-0.5 ${
              isEditing ? 'bg-accent-secondary' : 'bg-accent-primary'
            }`}
          >
            <Ionicons
              name={isEditing ? 'checkmark' : 'arrow-up'}
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        ) : onSendVoice ? (
          <VoiceRecordButton onSendVoice={onSendVoice} />
        ) : (
          <Pressable disabled className="w-9 h-9 rounded-full items-center justify-center mb-0.5 bg-transparent">
            <Ionicons name="arrow-up" size={20} color="#A8937F" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
