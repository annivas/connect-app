import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useAIStore } from '../../stores/useAIStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, emoji: string, color: string, aiAgentId?: string) => void;
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
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const connectedAgents = useAIStore((s) => s.agents.filter((a) => a.isConnected));

  const handleCreate = () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCreate(name.trim(), selectedEmoji, selectedColor, selectedAgentId);
    setName('');
    setSelectedEmoji('🚀');
    setSelectedColor('#D4764E');
    setSelectedAgentId(undefined);
    onClose();
  };

  const handleClose = () => {
    setName('');
    setSelectedEmoji('🚀');
    setSelectedColor('#D4764E');
    setSelectedAgentId(undefined);
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

        {/* AI Agent selection */}
        {connectedAgents.length > 0 && (
          <View className="px-4 mt-5">
            <Text className="text-text-tertiary text-[12px] font-medium uppercase tracking-wide mb-2 ml-1">
              AI Assistant (optional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {connectedAgents.map((agent) => {
                  const isSelected = selectedAgentId === agent.id;
                  return (
                    <Pressable
                      key={agent.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedAgentId(isSelected ? undefined : agent.id);
                      }}
                      className={`flex-row items-center rounded-xl px-3 py-2.5 ${
                        isSelected ? 'border-2' : 'bg-surface border border-border-subtle'
                      }`}
                      style={isSelected ? { borderColor: agent.color, backgroundColor: `${agent.color}10` } : undefined}
                    >
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          borderWidth: 1.5,
                          borderColor: agent.color,
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <Image
                          source={{ uri: agent.avatar }}
                          style={{ width: 18, height: 18 }}
                          contentFit="contain"
                          transition={200}
                        />
                      </View>
                      <Text
                        className={`text-[13px] font-medium ml-2 ${
                          isSelected ? 'text-text-primary' : 'text-text-secondary'
                        }`}
                      >
                        {agent.name}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={agent.color} style={{ marginLeft: 6 }} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            {selectedAgentId && (
              <View className="flex-row items-center mt-2 ml-1">
                <Ionicons name="sparkles" size={12} color="#D4764E" />
                <Text className="text-text-tertiary text-[11px] ml-1">
                  AI will respond to messages in this channel
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Preview */}
        <View className="px-4 mt-6">
          <Text className="text-text-tertiary text-[12px] font-medium uppercase tracking-wide mb-2 ml-1">
            Preview
          </Text>
          <View className="flex-row items-center">
            <View
              className="flex-row items-center rounded-full px-4 py-2 self-start"
              style={{ backgroundColor: selectedColor }}
            >
              <Text className="text-sm mr-1.5">{selectedEmoji}</Text>
              <Text className="text-white text-sm font-semibold">
                {name.trim() || 'Channel Name'}
              </Text>
            </View>
            {selectedAgentId && (
              <Ionicons name="sparkles" size={14} color={selectedColor} style={{ marginLeft: 8 }} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
