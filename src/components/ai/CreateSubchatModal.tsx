import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  agentName: string;
  agentColor: string;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export function CreateSubchatModal({ visible, agentName, agentColor, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('');

  const handleCreate = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCreate(trimmed);
    setTitle('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-background-primary rounded-t-3xl px-4 pt-4 pb-8 border-t border-border-subtle">
          {/* Handle */}
          <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />

          <Text className="text-text-primary text-lg font-bold mb-1">
            New Subchat
          </Text>
          <Text className="text-text-secondary text-sm mb-4">
            Create a focused workspace with {agentName}
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Subchat name (e.g. Trip planning)"
            placeholderTextColor="#A8937F"
            className="bg-surface-elevated rounded-xl px-4 py-3 text-text-primary text-[15px] border border-border-subtle mb-4"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 items-center py-3 rounded-xl bg-surface"
            >
              <Text className="text-text-secondary font-semibold">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              style={{ backgroundColor: agentColor }}
              className="flex-1 items-center py-3 rounded-xl"
              disabled={!title.trim()}
            >
              <Text className="text-white font-semibold">Create</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
