import React, { useState } from 'react';
import { View, Text, TextInput, Modal, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMessagesStore } from '../../stores/useMessagesStore';

interface Props {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

export function ShareLinkModal({ visible, conversationId, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const canSave = url.trim().length > 0 && title.trim().length > 0;

  const reset = () => {
    setUrl('');
    setTitle('');
    setDescription('');
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    useMessagesStore.getState().addSharedObject(conversationId, {
      type: 'link',
      title: title.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
    });

    reset();
    onClose();
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
          <Text className="text-text-primary text-[17px] font-semibold">
            Share Link
          </Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
            <Text
              className={`text-[16px] font-semibold ${
                canSave ? 'text-accent-primary' : 'text-text-tertiary'
              }`}
            >
              Share
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardDismissMode="interactive">
          {/* URL */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            URL
          </Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://example.com"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />

          {/* Title */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Link title"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
          />

          {/* Description (optional) */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Description (Optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description..."
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px]"
            multiline
            style={{ minHeight: 80 }}
            textAlignVertical="top"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
