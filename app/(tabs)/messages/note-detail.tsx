import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { NoteEditor, blocksToPlainText } from '../../../src/components/notes/NoteEditor';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useToastStore } from '../../../src/stores/useToastStore';
import type { Note, NoteBlock } from '../../../src/types';

export default function NoteDetailScreen() {
  const router = useRouter();
  const { noteId, conversationId, groupId, data } = useLocalSearchParams<{
    noteId?: string;
    conversationId?: string;
    groupId?: string;
    data?: string;
  }>();

  // Get live note from store
  const conversationNote = useMessagesStore(
    useShallow((s) => {
      if (!conversationId || !noteId) return undefined;
      const conv = s.getConversationById(conversationId);
      return conv?.metadata?.notes.find((n) => n.id === noteId);
    }),
  );

  const groupNote = useGroupsStore(
    useShallow((s) => {
      if (!groupId || !noteId) return undefined;
      const group = s.groups.find((g) => g.id === groupId);
      return group?.metadata?.notes.find((n) => n.id === noteId);
    }),
  );

  // Fallback: parse from route params (legacy navigation)
  const parsedNote: Note | undefined = React.useMemo(() => {
    if (!data) return undefined;
    try {
      const p = JSON.parse(data);
      return { ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) } as Note;
    } catch {
      return undefined;
    }
  }, [data]);

  const note = conversationNote ?? groupNote ?? parsedNote;

  // Local editing state
  const [title, setTitle] = useState(note?.title ?? '');
  const [blocks, setBlocks] = useState<NoteBlock[]>(
    note?.blocks ?? [{ id: `block-${Date.now()}`, type: 'paragraph', content: '' }],
  );

  // Sync from store when note first loads
  const initializedRef = useRef(false);
  useEffect(() => {
    if (note && !initializedRef.current) {
      setTitle(note.title);
      setBlocks(note.blocks ?? [{ id: `block-${Date.now()}`, type: 'paragraph', content: '' }]);
      initializedRef.current = true;
    }
  }, [note]);

  // Autosave with debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(() => {
    if (!note) return;
    const content = blocksToPlainText(blocks);
    const updates = { title, content, blocks };

    if (conversationId) {
      useMessagesStore.getState().updateNote(conversationId, note.id, updates);
    } else if (groupId) {
      useGroupsStore.getState().updateGroupNote(groupId, note.id, updates);
    }
  }, [note, title, blocks, conversationId, groupId]);

  // Keep a ref to latest doSave for the unmount cleanup
  const doSaveRef = useRef(doSave);
  useEffect(() => { doSaveRef.current = doSave; }, [doSave]);

  const scheduleAutosave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(doSave, 500);
  }, [doSave]);

  // Trigger autosave on changes (skip initial mount)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    scheduleAutosave();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, blocks, scheduleAutosave]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      doSaveRef.current();
    };
  }, []);

  const handleDelete = () => {
    if (!note) return;
    Alert.alert('Delete Note', `Delete "${note.title || 'Untitled'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (conversationId) {
            useMessagesStore.getState().deleteNote(conversationId, note.id);
          } else if (groupId) {
            useGroupsStore.getState().deleteGroupNote(groupId, note.id);
          }
          useToastStore.getState().show({ message: 'Note deleted', type: 'success' });
          router.back();
        },
      },
    ]);
  };

  const handleTogglePin = () => {
    if (!note) return;
    Haptics.selectionAsync();
    if (conversationId) {
      useMessagesStore.getState().toggleNotePin(conversationId, note.id);
    } else if (groupId) {
      useGroupsStore.getState().toggleGroupNotePin(groupId, note.id);
    }
  };

  if (!note) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Note not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <View className="flex-1 flex-row items-center ml-1">
          {note.isPrivate ? (
            <View className="flex-row items-center bg-background-tertiary rounded-full px-2.5 py-1">
              <Ionicons name="lock-closed" size={11} color="#7A6355" />
              <Text className="text-text-secondary text-[11px] font-medium ml-1">Private to you</Text>
            </View>
          ) : (
            <View className="flex-row items-center bg-accent-primary/10 rounded-full px-2.5 py-1">
              <Ionicons name="people" size={11} color="#D4764E" />
              <Text className="text-accent-primary text-[11px] font-medium ml-1">Shared</Text>
            </View>
          )}
        </View>
        <IconButton
          icon={note.isPinned ? 'pin' : 'pin-outline'}
          onPress={handleTogglePin}
          color={note.isPinned ? '#D4764E' : '#7A6355'}
        />
        <IconButton icon="trash-outline" onPress={handleDelete} color="#C94F4F" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <NoteEditor
          title={title}
          blocks={blocks}
          onTitleChange={setTitle}
          onBlocksChange={setBlocks}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
