import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPickCamera: () => void;
  onPickPhoto: () => void;
  onPickDocument: () => void;
  onShareLocation: () => void;
  onShareContact: () => void;
  onShareSong?: () => void;
}

const ACTIONS = [
  { id: 'camera', label: 'Camera', icon: 'camera' as const, color: '#C94F4F', bg: 'bg-red-500/15' },
  { id: 'photo', label: 'Photo Library', icon: 'images' as const, color: '#C2956B', bg: 'bg-purple-500/15' },
  { id: 'document', label: 'Document', icon: 'document-text' as const, color: '#5B8EC9', bg: 'bg-blue-500/15' },
  { id: 'location', label: 'Location', icon: 'location' as const, color: '#2D9F6F', bg: 'bg-green-500/15' },
  { id: 'contact', label: 'Contact', icon: 'person' as const, color: '#F59E0B', bg: 'bg-yellow-500/15' },
  { id: 'song', label: 'Song', icon: 'musical-note' as const, color: '#1DB954', bg: 'bg-green-500/15' },
];

export function AttachmentSheet({ visible, onClose, onPickCamera, onPickPhoto, onPickDocument, onShareLocation, onShareContact, onShareSong }: Props) {
  const handleAction = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    // Small delay so the sheet closes before opening picker
    setTimeout(() => {
      switch (id) {
        case 'camera': onPickCamera(); break;
        case 'photo': onPickPhoto(); break;
        case 'document': onPickDocument(); break;
        case 'location': onShareLocation(); break;
        case 'contact': onShareContact(); break;
        case 'song': onShareSong?.(); break;
      }
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40">
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View className="bg-background-secondary rounded-t-3xl pt-3 pb-8 px-4">
            {/* Handle bar */}
            <View className="w-10 h-1 rounded-full bg-border self-center mb-4" />

            <Text className="text-text-primary text-[17px] font-semibold mb-4 ml-1">
              Share
            </Text>

            {/* Grid of actions */}
            <View className="flex-row flex-wrap justify-around">
              {ACTIONS.map((action) => (
                <Pressable
                  key={action.id}
                  onPress={() => handleAction(action.id)}
                  className="items-center w-[60px] mb-4"
                >
                  <View
                    className={`w-14 h-14 rounded-2xl items-center justify-center mb-1.5 ${action.bg}`}
                  >
                    <Ionicons name={action.icon} size={26} color={action.color} />
                  </View>
                  <Text className="text-text-secondary text-[11px] text-center">
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
