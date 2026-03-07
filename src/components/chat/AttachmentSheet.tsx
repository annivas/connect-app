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
  onCreatePoll?: () => void;
  onCreateEvent?: () => void;
  onCreateNote?: () => void;
  onCreateExpense?: () => void;
  onCreateReminder?: () => void;
  isGroup?: boolean;
}

interface Action {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  groupOnly?: boolean;
}

const ACTIONS: Action[] = [
  { id: 'photo', label: 'Photos', icon: 'images', color: '#9B59B6' },
  { id: 'camera', label: 'Camera', icon: 'camera', color: '#C94F4F' },
  { id: 'location', label: 'Location', icon: 'location', color: '#2D9F6F' },
  { id: 'contact', label: 'Contact', icon: 'person', color: '#F59E0B' },
  { id: 'document', label: 'Document', icon: 'document-text', color: '#5B8EC9' },
  { id: 'song', label: 'Song', icon: 'musical-note', color: '#1DB954' },
  { id: 'poll', label: 'Poll', icon: 'bar-chart', color: '#E67E22', groupOnly: true },
  { id: 'event', label: 'Event', icon: 'calendar', color: '#D4764E', groupOnly: true },
  { id: 'note', label: 'Note', icon: 'create', color: '#C2956B' },
  { id: 'expense', label: 'Expense', icon: 'cash', color: '#27AE60' },
  { id: 'reminder', label: 'Reminder', icon: 'alarm', color: '#8E44AD' },
];

export function AttachmentSheet({
  visible,
  onClose,
  onPickCamera,
  onPickPhoto,
  onPickDocument,
  onShareLocation,
  onShareContact,
  onShareSong,
  onCreatePoll,
  onCreateEvent,
  onCreateNote,
  onCreateExpense,
  onCreateReminder,
  isGroup = false,
}: Props) {
  const visibleActions = ACTIONS.filter((a) => !a.groupOnly || isGroup);

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
        case 'poll': onCreatePoll?.(); break;
        case 'event': onCreateEvent?.(); break;
        case 'note': onCreateNote?.(); break;
        case 'expense': onCreateExpense?.(); break;
        case 'reminder': onCreateReminder?.(); break;
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

            {/* Grid of actions — 4 columns */}
            <View className="flex-row flex-wrap">
              {visibleActions.map((action) => (
                <Pressable
                  key={action.id}
                  onPress={() => handleAction(action.id)}
                  className="items-center mb-5"
                  style={{ width: '25%' }}
                >
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center mb-1.5"
                    style={{ backgroundColor: action.color + '1A' }}
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
