import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, emoji: string, color: string) => void;
}

const EMOJI_OPTIONS = ['🚀', '💡', '📸', '📋', '🎯', '🏠', '💰', '🎵', '🏀', '✈️', '🎮', '📚'];

const COLOR_OPTIONS = [
  '#D4764E', // accent-primary
  '#C2956B', // accent-secondary
  '#8B6F5A', // accent-tertiary
  '#2D9F6F', // status-success
  '#5B8EC9', // status-info
  '#D4964E', // status-warning
  '#C94F4F', // status-error
  '#9B6DBF', // purple
];

export function CreateChannelModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🚀');
  const [selectedColor, setSelectedColor] = useState('#D4764E');

  const handleCreate = () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCreate(name.trim(), selectedEmoji, selectedColor);
    setName('');
    setSelectedEmoji('🚀');
    setSelectedColor('#D4764E');
    onClose();
  };

  const handleClose = () => {
    setName('');
    setSelectedEmoji('🚀');
    setSelectedColor('#D4764E');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={handleClose} className="mr-3">
            <Ionicons name="close" size={24} color="#A8937F" />
          </Pressable>
          <Text className="text-text-primary text-lg font-semibold flex-1">
            New Channel
          </Text>
          <Pressable
            onPress={handleCreate}
            disabled={!name.trim()}
            className={`px-4 py-1.5 rounded-full ${name.trim() ? 'bg-accent-primary' : 'bg-surface'}`}
          >
            <Text className={`text-sm font-semibold ${name.trim() ? 'text-white' : 'text-text-tertiary'}`}>
              Create
            </Text>
          </Pressable>
        </View>

        {/* Channel name */}
        <View className="px-4 mt-5">
          <Text className="text-text-tertiary text-[12px] font-medium uppercase tracking-wide mb-2 ml-1">
            Channel Name
          </Text>
          <View className="flex-row items-center bg-surface-elevated rounded-xl border border-border-subtle px-4 py-3">
            <Text className="text-lg mr-2">{selectedEmoji}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Startup Ideas"
              placeholderTextColor="#A8937F"
              className="flex-1 text-text-primary text-[15px]"
              autoFocus
              maxLength={30}
            />
          </View>
        </View>

        {/* Emoji picker */}
        <View className="px-4 mt-5">
          <Text className="text-text-tertiary text-[12px] font-medium uppercase tracking-wide mb-2 ml-1">
            Icon
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {EMOJI_OPTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedEmoji(emoji);
                }}
                className={`w-11 h-11 rounded-xl items-center justify-center ${
                  selectedEmoji === emoji ? 'border-2' : 'bg-surface'
                }`}
                style={selectedEmoji === emoji ? { borderColor: selectedColor } : undefined}
              >
                <Text className="text-xl">{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Color picker */}
        <View className="px-4 mt-5">
          <Text className="text-text-tertiary text-[12px] font-medium uppercase tracking-wide mb-2 ml-1">
            Color
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {COLOR_OPTIONS.map((color) => (
              <Pressable
                key={color}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedColor(color);
                }}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Preview */}
        <View className="px-4 mt-6">
          <Text className="text-text-tertiary text-[12px] font-medium uppercase tracking-wide mb-2 ml-1">
            Preview
          </Text>
          <View
            className="flex-row items-center rounded-full px-4 py-2 self-start"
            style={{ backgroundColor: selectedColor }}
          >
            <Text className="text-sm mr-1.5">{selectedEmoji}</Text>
            <Text className="text-white text-sm font-semibold">
              {name.trim() || 'Channel Name'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
