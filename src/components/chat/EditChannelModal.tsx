import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Channel } from '../../types';

interface Props {
  visible: boolean;
  channel: Channel | null;
  onClose: () => void;
  onUpdate: (channelId: string, updates: Partial<Pick<Channel, 'name' | 'emoji' | 'color'>>) => void;
  onDelete: (channelId: string) => void;
}

const EMOJI_OPTIONS = ['🚀', '💡', '📸', '📋', '🎯', '🏠', '💰', '🎵', '🏀', '✈️', '🎮', '📚'];

const COLOR_OPTIONS = [
  '#D4764E',
  '#C2956B',
  '#8B6F5A',
  '#2D9F6F',
  '#5B8EC9',
  '#D4964E',
  '#C94F4F',
  '#9B6DBF',
];

export function EditChannelModal({ visible, channel, onClose, onUpdate, onDelete }: Props) {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🚀');
  const [selectedColor, setSelectedColor] = useState('#D4764E');

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setSelectedEmoji(channel.emoji || '🚀');
      setSelectedColor(channel.color);
    }
  }, [channel]);

  const handleSave = () => {
    if (!channel || !name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate(channel.id, {
      name: name.trim(),
      emoji: selectedEmoji,
      color: selectedColor,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!channel) return;
    Alert.alert(
      'Delete Channel',
      `Are you sure you want to delete "${channel.name}"? This will remove the channel and all its messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete(channel.id);
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={onClose} className="mr-3">
            <Ionicons name="close" size={24} color="#A8937F" />
          </Pressable>
          <Text className="text-text-primary text-lg font-semibold flex-1">
            Edit Channel
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={!name.trim()}
            className={`px-4 py-1.5 rounded-full ${name.trim() ? 'bg-accent-primary' : 'bg-surface'}`}
          >
            <Text className={`text-sm font-semibold ${name.trim() ? 'text-white' : 'text-text-tertiary'}`}>
              Save
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
              placeholder="Channel name"
              placeholderTextColor="#A8937F"
              className="flex-1 text-text-primary text-[15px]"
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

        {/* Delete button */}
        <View className="px-4 mt-8">
          <Pressable
            onPress={handleDelete}
            className="flex-row items-center justify-center py-3 rounded-xl bg-surface border border-border-subtle"
          >
            <Ionicons name="trash-outline" size={18} color="#C94F4F" />
            <Text className="text-status-error text-[15px] font-medium ml-2">
              Delete Channel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
