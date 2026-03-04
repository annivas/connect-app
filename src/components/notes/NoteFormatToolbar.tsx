import React from 'react';
import { View, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NoteBlockType } from '../../types';

interface Props {
  currentBlockType: NoteBlockType;
  onChangeBlockType: (type: NoteBlockType) => void;
  onAddImage: () => void;
  onAddFile: () => void;
  onAddLink: () => void;
  keyboardVisible: boolean;
  hasFocusedBlock?: boolean;
}

interface ToolButton {
  icon: string;
  label: string;
  blockType?: NoteBlockType;
  action?: () => void;
  isActive?: boolean;
}

export function NoteFormatToolbar({
  currentBlockType,
  onChangeBlockType,
  onAddImage,
  onAddFile,
  onAddLink,
  keyboardVisible,
  hasFocusedBlock,
}: Props) {
  // Show toolbar when keyboard is visible OR a block is focused
  if (!keyboardVisible && !hasFocusedBlock) return null;

  const buttons: ToolButton[] = [
    { icon: 'text', label: 'H1', blockType: 'heading1', isActive: currentBlockType === 'heading1' },
    { icon: 'text', label: 'H2', blockType: 'heading2', isActive: currentBlockType === 'heading2' },
    { icon: 'reorder-three-outline', label: 'Body', blockType: 'paragraph', isActive: currentBlockType === 'paragraph' },
    { icon: 'list', label: 'Bullet', blockType: 'bulletList', isActive: currentBlockType === 'bulletList' },
    { icon: 'list-outline', label: 'Number', blockType: 'numberedList', isActive: currentBlockType === 'numberedList' },
    { icon: 'checkbox-outline', label: 'Check', blockType: 'checklist', isActive: currentBlockType === 'checklist' },
    { icon: 'image-outline', label: 'Photo', action: onAddImage },
    { icon: 'attach-outline', label: 'File', action: onAddFile },
    { icon: 'link-outline', label: 'Link', action: onAddLink },
  ];

  return (
    <View
      className="bg-surface-elevated border-t border-border-subtle"
      style={{ paddingBottom: Platform.OS === 'ios' ? 0 : 4 }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8, gap: 4 }}
      >
        {buttons.map((btn) => (
          <Pressable
            key={btn.label}
            onPress={() => {
              Haptics.selectionAsync();
              if (btn.blockType) {
                onChangeBlockType(btn.blockType);
              } else {
                btn.action?.();
              }
            }}
            className={`w-10 h-10 rounded-lg items-center justify-center ${
              btn.isActive ? 'bg-accent-primary/15' : ''
            }`}
          >
            {btn.label === 'H1' ? (
              <Ionicons
                name="text"
                size={20}
                color={btn.isActive ? '#D4764E' : '#7A6355'}
              />
            ) : btn.label === 'H2' ? (
              <Ionicons
                name="text"
                size={16}
                color={btn.isActive ? '#D4764E' : '#7A6355'}
              />
            ) : (
              <Ionicons
                name={btn.icon as any}
                size={22}
                color={btn.isActive ? '#D4764E' : '#7A6355'}
              />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
